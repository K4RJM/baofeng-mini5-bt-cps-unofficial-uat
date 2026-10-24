import {emptyChannel} from './channels.mjs';
import {channelFrequencyError} from './validation.mjs';

// File conversion only. These adapters never contact a service or radio.
export const MAX_CSV_BYTES=2_000_000;
const MAX_ROWS=5000,MAX_COLUMNS=128,MAX_CELL=4096;
const key=s=>s.trim().toLowerCase().replace(/[^a-z0-9]/g,'');
const upper=s=>String(s??'').trim().toUpperCase();
const off=s=>['','OFF','NONE','0','CSQ','NO'].includes(upper(s));
function fail(message){throw Error(message);}
const genericAliases={
 rx:['RX Frequency','RxFreq','Receive Frequency','Frequency','Output Frequency','Output Freq','RX MHz','Frequency MHz','Receive Frequency MHz','Rx Frequency Hz','RX Hz'],
 tx:['TX Frequency','TxFreq','Transmit Frequency','Input Frequency','Input Freq','TX MHz','Transmit Frequency MHz','Tx Frequency Hz','TX Hz'],
 name:['Name','Channel Name','CHName','Callsign','Call'],mode:['Mode','Operating Mode','Channel Type'],
 txTone:['TX Tone','TX CTCSS','CTCSS/DCS Encode','Uplink Tone'],rxTone:['RX Tone','RX CTCSS','CTCSS/DCS Decode','Downlink Tone'],
 power:['Power','TX Power','Transmit Power'],bw:['Bandwidth','Bandwidth kHz','Band Width','BW'],
 dir:['Duplex','Offset Direction','Shift'],offset:['Offset','Offset Frequency'],rxOnly:['RX Only','PTT Prohibit','TX Disable'],
 skip:['Skip','Scan Skip'],scan:['Scan','Scan Add','Include in scan']
};
function genericMapping(heads){
 const mapping={};for(const [field,aliases] of Object.entries(genericAliases)){
  const found=heads.map((h,i)=>aliases.some(a=>key(a)===h)?i:-1).filter(i=>i>=0);
  if(found.length>1)fail('Ambiguous '+field+' columns. Keep one source column for this field.');if(found.length)mapping[field]=found[0];
 }return mapping;
}

export function parseCsv(text){
 if(typeof text!=='string'||text.length>MAX_CSV_BYTES)fail('CSV must be smaller than 2 MB.');
 text=text.replace(/^\uFEFF/,'');if(!text.trim())fail('The CSV file is empty.');
 if(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(text))fail('CSV contains binary or unsupported control characters.');
 const first=text.split(/\r?\n/)[0];let quoted=false;const counts={',':0,';':0,'\t':0};
 for(let i=0;i<first.length;i++){const c=first[i];if(c==='"'){if(quoted&&first[i+1]==='"')i++;else quoted=!quoted;}else if(!quoted&&c in counts)counts[c]++;}
 const delimiter=Object.keys(counts).sort((a,b)=>counts[b]-counts[a])[0];
 let rows=[],cells=[],cell='',state='start',line=1,startLine=1;
 const pushCell=()=>{if(cell.length>MAX_CELL)fail('CSV cell exceeds 4096 characters.');cells.push(cell);cell='';state='start';if(cells.length>MAX_COLUMNS)fail('CSV has too many columns.');};
 const pushRow=()=>{pushCell();if(cells.some(c=>c.trim()))rows.push({line:startLine,cells});cells=[];if(rows.length>MAX_ROWS+1)fail('CSV has more than 5000 rows.');};
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(state==='quoted'){
   if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else state='closed';}
   else{cell+=c;if(c==='\n')line++;}if(cell.length>MAX_CELL)fail('CSV cell exceeds 4096 characters.');continue;
  }
  if(c===delimiter){pushCell();continue;}
  if(c==='\r'||c==='\n'){if(c==='\r'&&text[i+1]==='\n')i++;pushRow();line++;startLine=line;continue;}
  if(state==='closed'){if(c===' '||c==='\t')continue;fail('Unexpected text after a quoted field at line '+line+'.');}
  if(c==='"'){if(state!=='start')fail('Unexpected quote at line '+line+'.');state='quoted';continue;}
  state='plain';cell+=c;if(cell.length>MAX_CELL)fail('CSV cell exceeds 4096 characters.');
 }
 if(state==='quoted')fail('Unclosed quoted field at line '+startLine+'.');
 if(cell||cells.length||state==='closed')pushRow();
 if(!rows.length)fail('The CSV file is empty.');return {rows,delimiter};
}

function identify(rows){
 const heads=rows[0].cells.map(key),has=(...names)=>names.every(n=>heads.includes(key(n)));
 let id,label;
 if(has('title','tx_freq','rx_freq','tx_sub_audio(CTCSS=freq/DCS=number)'))[id,label]=['btech','BTECH UV-PRO / GMRS-PRO'];
 else if(has('Output Freq','Input Freq','Call','Modes'))[id,label]=['rb','RepeaterBook'];
 else if(has('Location','Name','Frequency','Duplex','Tone'))[id,label]=['chirp','CHIRP'];
 else if(has('Ch No','Frequency','Dup','Repeater Tone','TSQL Frequency'))[id,label]=['icom','Icom ID-31'];
 else if(has('Channel Name','Receive Frequency','Transmit Frequency','CTCSS/DCS Decode','Channel Type'))[id,label]=['anytone','AnyTone'];
 else if(has('Channel Name','Rx Frequency','Tx Frequency','RX Tone','Channel Type'))[id,label]=['opengd','OpenGD77'];
 else if(has('Receive Frequency','Transmit Frequency','Name','Tone Mode'))[id,label]=['rt','RT Systems'];
 else if(has('!!Ch','Rx Freq.','Tx Freq.','T/CT/DCS','M.Name'))[id,label]=['hmk','Kenwood HMK'];
 else if(has('Callsign','Frequency','Shift','Offset','Uplink Tone','Downlink Tone','World Region'))[id,label]=['kenwood','Kenwood DR repeater TSV'];
 else if(rows.every(r=>r.cells.length===54&&/^\d+$/.test(r.cells[0])&&(!r.cells[1]||/^\d+(\.\d+)?$/.test(r.cells[1]))))return {id:'adms',label:'Yaesu ADMS-7 (54 columns)',records:rows,heads:null};
 else{
  const mapping=genericMapping(heads);if(mapping.rx===undefined||mapping.name===undefined)fail('Channel-file layout not recognized. Include a named receive-frequency and channel-name column, or export a supported radio layout.');
  if(has('Tone Mode')||has('Tone')||has('T/CT/DCS'))fail('Tone-mode columns need a recognized radio layout; use separate RX Tone and TX Tone columns for generic CSV.');
  return {id:'generic',label:'Common channel columns',heads,records:rows.slice(1),mapping,originalHeads:rows[0].cells};
 }
 const required={rb:['Uplink Tone','Downlink Tone'],chirp:['Mode','Offset','rToneFreq','cToneFreq'],icom:['Mode','Offset','TONE'],rt:['CTCSS','Rx CTCSS','DCS','Rx DCS'],anytone:['Transmit Frequency','CTCSS/DCS Encode','Band Width','PTT Prohibit'],opengd:['TX Tone','Bandwidth (kHz)','Rx Only'],btech:['rx_sub_audio(CTCSS=freq/DCS=number)','tx_dis(0=OFF/1=ON)','mute(0=OFF/1=ON)','rx_modulation(0=FM/1=AM)','tx_modulation(0=FM/1=AM)','bandwidth(12500/25000)']}[id];
 for(const field of (required||{hmk:['Mode','Offset','Shift/Split','TO Freq.','CT Freq.','DCS Code','Rev.','L.Out'],kenwood:['Mode','Lockout']}[id]))if(!has(field))fail('Missing '+label+' column: '+field+'.');
 return {id,label,heads,records:rows.slice(1)};
}
function reader(heads,cells){return name=>{
 const k=key(name),matches=heads.reduce((a,x,i)=>(x===k&&a.push(i),a),[]);
 if(matches.length>1)fail('Duplicate column: '+name+'.');return matches.length?cells[matches[0]].trim():'';
};}
function frequency(value,hz=false){
 let v=String(value).trim().replace(hz?/\s*Hz$/i:/\s*MHz$/i,'');
 if(hz){if(!/^\d{1,10}$/.test(v)||Number(v)%10)fail('Frequency in Hz must be an exact multiple of 10.');return Number(v)/10;}
 if(!/^\d{1,7}(\.\d{1,9})?$/.test(v))fail('Invalid MHz frequency: '+value+'.');
 const [whole,frac='']=v.split('.');if(/[^0]/.test(frac.slice(5)))fail('Frequency has unsupported precision; it was not rounded.');
 return Number(whole)*100000+Number(frac.slice(0,5).padEnd(5,'0'));
}
const mhz=n=>(Math.floor(n/100000)+'.'+String(n%100000).padStart(5,'0'));
function checkedFrequency(n){const value=mhz(n),error=channelFrequencyError(value);if(error)fail(error);return value;}
function directTx(value,hz,notes){if(off(value)){notes.push('Transmit disabled.');return '';}return checkedFrequency(frequency(value,hz));}
function duplexTx(rx,dir,offset,notes){
 const d=upper(dir);if(['OFF','TX OFF'].includes(d)){notes.push('Transmit disabled.');return '';}
 if(['','SIMPLEX','OFF-RPT'].includes(d))return checkedFrequency(rx);
 if(['SPLIT'].includes(d))return checkedFrequency(frequency(offset));
 if(['+','DUP+','+RPT'].includes(d))return checkedFrequency(rx+frequency(offset));
 if(['-','DUP-','-RPT'].includes(d))return checkedFrequency(rx-frequency(offset));
 fail('Unsupported offset direction: '+dir+'.');
}
function enabled(value,label){const v=upper(value);if(['1','YES','ON','TRUE'].includes(v))return true;if(off(v)||v==='FALSE')return false;fail('Unsupported '+label+': '+value+'.');}
function tone(value,choices,{dcs=false,polarity='N',btech=false}={}){
 let v=upper(value).replace(/\s*HZ$/,'').trim();if(off(v))return 'OFF';
 if(btech&&/^\d+$/.test(v)){const n=Number(v)/100;if(choices.has(n.toFixed(1)))v=n.toFixed(1);else fail('Unrecognized numeric BTECH tone; use an explicit DCS code.');}
 const m=v.match(/^(?:DCS\s*|D)(\d{1,3})([NI])?$/)|| (dcs?v.match(/^(\d{1,3})([NI])?$/):null);
 if(m)v='D'+m[1].padStart(3,'0')+(m[2]||polarity);
 else if(/^\d{2,3}(\.\d+)?$/.test(v)){if(Number(v)!==Number(Number(v).toFixed(1)))fail('Unsupported CTCSS precision.');v=Number(v).toFixed(1);}
 else fail('Unsupported tone: '+value+'.');
 if(!choices.has(v))fail('Tone is not supported by MINI-5: '+value+'.');return v;
}
function tonesByMode(mode,{tx,rx,dc,rdc,pol='NN',cross=''},choices){
 const m=upper(mode).replace(/[\s_-]/g,'');let t='OFF',r='OFF';
 const ct=v=>{if(off(v))fail('Active tone mode is missing its tone.');return tone(v,choices);};
 const ds=(v,p)=>{if(off(v))fail('Active DCS mode is missing its code.');return tone(v,choices,{dcs:true,polarity:p});};
 if(['','NONE','OFF'].includes(m))return [t,r];
 pol=upper(pol).replace('BOTH-N','NN').replace('BOTH-R','II').replaceAll('R','I');
 if(!/^[NI]{2}$/.test(pol))fail('Unsupported DCS polarity: '+pol+'.');
 if(['TONE','TONEENC','TONE(T)'].includes(m))t=ct(tx);
 else if(['TSQL','TONESQL','TONE(T)/TSQL(R)'].includes(m)){t=ct(tx);r=ct(rx||tx);}
 else if(['DTCS','DCS'].includes(m)){t=ds(dc,pol[0]);r=ds(rdc||dc,pol[1]);}
 else if(m==='CROSS'){
  const parts=cross.split('->');if(parts.length!==2||parts.some(x=>!['','Tone','DTCS'].includes(x)))fail('Unsupported cross-tone mode.');
  t=parts[0]==='Tone'?ct(tx):parts[0]==='DTCS'?ds(dc,pol[0]):'OFF';
  r=parts[1]==='Tone'?ct(rx):parts[1]==='DTCS'?ds(rdc||dc,pol[1]):'OFF';
 }else fail('Unsupported tone mode: '+mode+'.');return [t,r];
}
function nameFor(value,charset,notes){
 let out='',bytes=0;for(const char of value.trim()){
  const cp=char.codePointAt(0),range=charset.find(([a,b])=>cp>=a&&cp<=b);if(!range)fail('Name contains characters MINI-5 cannot store.');
  if(bytes+range[2]>12){notes.push('Name shortened to 12 encoded bytes.');break;}out+=char;bytes+=range[2];
 }return out;
}
function power(value,defaultPower,notes){const p=upper(value);if(['HIGH','H'].includes(p))return 0;if(['LOW','L'].includes(p))return 1;
 notes.push((p?'Power “'+value+'” has no exact MINI-5 equivalent':'Power not specified')+'; using '+(defaultPower?'Low':'High')+'.');return defaultPower;
}
function bandwidth(value,notes){const v=upper(value).replace(/[\s]/g,'');if(['FM','25','25K','25.0KHZ','25KHZ','25000','WIDE'].includes(v))return 0;if(['NFM','FMN','FMNARROW','12.5','12.5K','12.5KHZ','12500','NARROW'].includes(v))return 1;
 if(!v){notes.push('Bandwidth not specified; using Wide FM.');return 0;}fail('Unsupported bandwidth or mode: '+value+'.');
}
function analog(mode,mixed,notes){const m=upper(mode);if(['FM','NFM','FMN','FM NARROW','ANALOG','ANALOGUE','A-ANALOG'].includes(m))return;
 if(mixed&&/(^|\s)FM(?=\s|$)/.test(m)){notes.push('Mixed-mode repeater: FM only.');return;}
 if(/(?:^|[^A-Z0-9])(?:D-DIGITAL|DIGITAL|DMR|DV|D-STAR|DSTAR|C4FM|DN|VW|NXDN|P25|DPMR|YSF|FUSION)(?:$|[^A-Z0-9])/.test(m)||['A+D TX A','D+A TX D'].includes(m)){const error=Error('Digital channel filtered out.');error.skipDigital=true;throw error;}
 fail('Unsupported non-FM mode: '+(mode||'unspecified')+'.');}

function convert(profile,cells,options,charset,defaultPower){
 const notes=[],ch=emptyChannel(),choices=new Set(options['KDH.Channel'].strRxCtsDcs.map(x=>x[0]));
 const g=profile.heads?reader(profile.heads,cells):i=>(cells[i]||'').trim(),id=profile.id;
 let rx,tx,name,mode,bw,p,scan='',txTone='OFF',rxTone='OFF',rxOnly=false;
 if(id==='rb'){
  rx=g('Output Freq');tx=g('Input Freq');name=g('Call');mode=g('Modes');analog(mode,true,notes);bw='FM';
  txTone=tone(g('Uplink Tone'),choices);rxTone=tone(g('Downlink Tone'),choices);
 }else if(id==='chirp'||id==='icom'){
  rx=g('Frequency');name=g('Name');mode=g('Mode');analog(mode,false,notes);bw=mode;p=g('Power');scan=g('Skip');
  const chirp=id==='chirp',toneMode=g(chirp?'Tone':'TONE');
  // CHIRP TSQL uses cToneFreq on both sides; DTCS uses DtcsCode on both.
  [txTone,rxTone]=tonesByMode(toneMode,{tx:g(chirp?(upper(toneMode)==='TSQL'?'cToneFreq':'rToneFreq'):'Repeater Tone'),rx:g(chirp?'cToneFreq':'TSQL Frequency'),dc:g(chirp?'DtcsCode':'DTCS Code'),rdc:chirp&&upper(toneMode)==='DTCS'?g('DtcsCode'):g('RxDtcsCode'),pol:g(chirp?'DtcsPolarity':'DTCS Polarity')||'NN',cross:g('CrossMode')},choices);
  tx=duplexTx(frequency(rx),g(chirp?'Duplex':'Dup'),g('Offset'),notes);
 }else if(id==='rt'){
  rx=g('Receive Frequency');tx=g('Transmit Frequency');name=g('Name');mode=g('Operating Mode')||'FM';analog(mode,false,notes);bw=mode;p=g('Power');scan=g('Skip');
  const commentModes=g('Comment').match(/Modes:\s*(.+)$/i);if(commentModes)analog(commentModes[1],true,notes);
  if(!g('Operating Mode'))notes.push('No operating-mode column; importing as FM.');
  [txTone,rxTone]=tonesByMode(g('Tone Mode'),{tx:g('CTCSS'),rx:g('Rx CTCSS'),dc:g('DCS'),rdc:g('Rx DCS'),pol:'NN'},choices);
 }else if(id==='adms'){
  rx=g(1);tx=g(2);name=g(6);mode=g(5);analog(mode,false,notes);bw=mode;p=g(11);scan=g(12);
  [txTone,rxTone]=tonesByMode(g(7),{tx:g(8),rx:g(8),dc:g(9)},choices);
 }else if(id==='anytone'||id==='opengd'){
  const a=id==='anytone';rx=g(a?'Receive Frequency':'Rx Frequency');tx=g(a?'Transmit Frequency':'Tx Frequency');name=g('Channel Name');mode=g('Channel Type');analog(mode,false,notes);bw=g(a?'Band Width':'Bandwidth (kHz)');p=g(a?'Transmit Power':'Power');
  rxOnly=enabled(g(a?'PTT Prohibit':'Rx Only'),'receive-only setting');
  txTone=tone(g(a?'CTCSS/DCS Encode':'TX Tone'),choices);rxTone=tone(g(a?'CTCSS/DCS Decode':'RX Tone'),choices);
  scan=a?'':(enabled(g('All Skip'),'scan skip')?'S':'');
  if(a&&g('Scan List')&&!off(g('Scan List')))notes.push('Scan-list membership is not imported.');
  if(a&&(!off(g('PTT ID'))||!off(g('Optional Signal'))))fail('Active AnyTone optional/PTT signaling cannot be converted.');
  if(a&&!off(g('Busy Lock/TX Permit')))fail('AnyTone transmit permission needs manual configuration.');
  if(a&&enabled(g('Talk Around(Simplex)'),'talk around'))fail('Active talk-around needs manual configuration.');
  if(a&&enabled(g('Reverse'),'reverse'))fail('Active AnyTone reverse needs manual configuration.');
 }else if(id==='generic'){
  const m=profile.mapping,v=k=>m[k]===undefined?'':cells[m[k]].trim();
  const hz=k=>m[k]!==undefined&&/hz$/.test(profile.heads[m[k]])&&!/mhz$/.test(profile.heads[m[k]]);
  rx=mhz(frequency(v('rx'),hz('rx')));name=v('name');mode=v('mode')||'FM';analog(mode,false,notes);bw=v('bw')||mode;p=v('power');
  if(!v('mode'))notes.push('Mode not specified; importing as FM.');
  rxOnly=enabled(v('rxOnly'),'receive-only setting');
  if(m.tx!==undefined)tx=directTx(v('tx'),hz('tx'),notes);
  else if(m.dir!==undefined)tx=duplexTx(frequency(rx),v('dir'),v('offset'),notes);
  else{tx='';notes.push('No TX frequency or duplex column; transmit disabled.');}
  txTone=tone(v('txTone'),choices);rxTone=tone(v('rxTone'),choices);
  if(m.scan!==undefined)scan=enabled(v('scan'),'scan inclusion')?'':'S';else scan=v('skip');
 }else if(id==='hmk'||id==='kenwood'){
  const hmk=id==='hmk';rx=g(hmk?'Rx Freq.':'Frequency');name=g(hmk?'M.Name':'Callsign')||g('Name');mode=g('Mode');analog(mode,false,notes);bw=mode;scan=g(hmk?'L.Out':'Lockout');
  const dir=g(hmk?'Shift/Split':'Shift');
  if(hmk){
   if(enabled(g('Rev.'),'reverse'))fail('Active Kenwood reverse needs manual configuration.');
   const tm=upper(g('T/CT/DCS')),mapped={T:'Tone',CT:'TSQL',DCS:'DCS',OFF:'Off'}[tm];if(mapped===undefined)fail('Unsupported Kenwood tone mode.');
   [txTone,rxTone]=tonesByMode(mapped,{tx:g(tm==='CT'?'CT Freq.':'TO Freq.'),rx:g('CT Freq.'),dc:g('DCS Code')},choices);
   tx=directTx(g('Tx Freq.'),false,notes);
   if(upper(dir)!=='S'&&tx!==duplexTx(frequency(rx),dir,g('Offset'),[]))fail('Kenwood transmit frequency conflicts with its offset.');
  }else{tx=duplexTx(frequency(rx),dir,g('Offset'),notes);txTone=tone(g('Uplink Tone'),choices);rxTone=tone(g('Downlink Tone'),choices);}
 }else if(id==='btech'){
  rx=g('rx_freq');tx=g('tx_freq');name=g('title');bw=g('bandwidth(12500/25000)');p=g('tx_power(H/M/L)');
  if(enabled(g('mute(0=OFF/1=ON)'),'mute'))fail('Muted/digital-only BTECH row is not an analog channel.');
  if(enabled(g('rx_modulation(0=FM/1=AM)'),'RX modulation')||enabled(g('tx_modulation(0=FM/1=AM)'),'TX modulation'))fail('AM channels are not supported.');
  if(enabled(g('talk around(0=OFF/1=ON)'),'talk around'))fail('Active talk-around needs manual configuration.');
  rxOnly=enabled(g('tx_dis(0=OFF/1=ON)'),'transmit disable');scan=enabled(g('scan(0=OFF/1=ON)'),'scan')?'':'S';
  txTone=tone(g('tx_sub_audio(CTCSS=freq/DCS=number)'),choices,{btech:true});rxTone=tone(g('rx_sub_audio(CTCSS=freq/DCS=number)'),choices,{btech:true});
 }
 ch.rxFreq=checkedFrequency(frequency(rx,id==='btech'));
 ch.txFreq=rxOnly?'':(['chirp','icom','hmk','kenwood','generic'].includes(id)?tx:directTx(tx,id==='btech',notes));if(rxOnly)notes.push('Transmit disabled by source.');
 if(id==='adms'&&ch.txFreq!==duplexTx(frequency(rx),g(4),g(3),[]))fail('ADMS transmit frequency conflicts with its offset.');
 ch.name=nameFor(name,charset,notes);ch.strRxCtsDcs=rxTone;ch.strTxCtsDcs=txTone;ch.txPower=power(p,defaultPower,notes);ch.bandwide=bandwidth(bw,notes);
 if(['','OFF','0','NO'].includes(upper(scan)))ch.scanAdd=1;else if(['S','SKIP','ON','1','YES','P','PSKIP'].includes(upper(scan)))ch.scanAdd=0;else fail('Unsupported scan setting: '+scan+'.');
 return {channel:ch,notes,sourceName:name};
}

export function importChannelCsv(text,{options,charset,defaultPower=1}={}){
 if(!options?.['KDH.Channel']||!charset)fail('Channel choices are not loaded.');if(![0,1].includes(defaultPower))fail('Choose High or Low for unspecified power.');
 if(typeof text!=='string'||text.length>MAX_CSV_BYTES)fail('Channel file must be smaller than 2 MB.');
 let lineOffset=0;const clean=text.replace(/^\uFEFF/,'');
 if(clean.startsWith('KENWOOD MCP FOR AMATEUR MOBILE TRANSCEIVER')){
  const lines=clean.split(/\r\n|\n|\r/),start=lines.findIndex(l=>l.trim()==='// Memory Channels');if(start<0)fail('Kenwood HMK memory section is missing.');
  const end=lines.findIndex((l,i)=>i>start&&l.startsWith('//'));lineOffset=start+1;text=lines.slice(start+1,end<0?undefined:end).join('\n');
 }
 const parsed=parseCsv(text),profile=identify(parsed.rows);let emptyRows=0,skippedDigital=0;
 const rows=[];for(const record of profile.records){
  // ADMS exports include numbered blank memory rows; don't turn them into errors.
  if(profile.id==='adms'&&!record.cells[1]&&record.cells.slice(1,53).every(c=>!c.trim())){emptyRows++;continue;}
  try{if(profile.heads&&record.cells.length!==profile.heads.length)fail('Column count does not match the header.');const converted=convert(profile,record.cells,options,charset,defaultPower);rows.push({line:record.line+lineOffset,...converted,error:''});}
  catch(e){if(e.skipDigital){skippedDigital++;continue;}rows.push({line:record.line+lineOffset,sourceName:'',channel:null,notes:[],error:e.message});}
 }
 if(!rows.length&&!skippedDigital)fail('No populated channel rows were found.');
 const notes=['Digital channels are filtered out automatically. Only analog channel fields are imported. Source channel numbers, comments, locations, contacts, zones and digital settings are not copied.','Missing scan inclusion defaults to Include. Missing or unrepresentable power uses the selected fallback. Other MINI-5 signaling options start Off.'];
 if(profile.mapping)notes.unshift('Mapped columns: '+Object.entries(profile.mapping).map(([k,i])=>k+' = '+profile.originalHeads[i]).join('; ')+'.');
 return {kind:'csv',format:profile.label,rows,emptyRows,skippedDigital,channels:rows.filter(r=>r.channel).map(r=>r.channel),notes};
}

export async function readCsvFile(file,settings){
 if(!file||!Number.isFinite(file.size)||file.size>=MAX_CSV_BYTES)fail('CSV must be smaller than 2 MB.');
 const bytes=new Uint8Array(await file.arrayBuffer());if(bytes.length>=MAX_CSV_BYTES)fail('CSV must be smaller than 2 MB.');
 let text,encoding='UTF-8';
 if(bytes[0]===255&&bytes[1]===254){text=new TextDecoder('utf-16le',{fatal:true}).decode(bytes);encoding='UTF-16 LE';}
 else if(bytes[0]===254&&bytes[1]===255){text=new TextDecoder('utf-16be',{fatal:true}).decode(bytes);encoding='UTF-16 BE';}
 else{try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{text=new TextDecoder('windows-1252').decode(bytes);encoding='Windows-1252';}}
 const result=importChannelCsv(text,settings);return {...result,encoding};
}
