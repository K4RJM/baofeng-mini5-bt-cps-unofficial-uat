import {rt950Models} from './rt950-models.mjs';
import {CH_LEN, EMPTY_REC, LAYOUTS, REC, ZN_LEN, backupJSON, buildRecord, decFreq, encFreq, encName, eq, hex, parseCSV, zoneFromFilename, sections, segmentKey, tone, toneBytes} from './rt950-core.mjs';
import {overlaySettings} from './rt950-sections.mjs';

export const powers=['High','Medium','Low'];
export const modes=['FM','NFM','AM'];
const layoutFor=id=>{
 const layout=LAYOUTS[id];
 if(!layout)throw Error('Choose the firmware layout from the radio’s About menu.');
 return layout;
};
export function blankImage(){
 const ch=new Uint8Array(CH_LEN).fill(255);
 for(let i=0;i<990;i++)ch.set(EMPTY_REC,i*REC);
 return {model:'RT-950',ch,zn:new Uint8Array(ZN_LEN).fill(255)};
}
export function record(image,layout,slot){
 const {zones,per}=layoutFor(layout);
 if(!Number.isInteger(slot)||slot<0||slot>=zones*per)throw Error('Channel is outside this firmware layout.');
 return image.ch.subarray(slot*REC,(slot+1)*REC);
}
const nameBytes=name=>{
 if(!/^[ -~]{0,12}$/.test(name))throw Error('Use up to 12 printable ASCII characters for the name.');
 return encName(name);
};
function frequency(value){
 if(!/^\d{1,3}(?:\.\d+)?$/.test(String(value))||Number(value)<18||Number(value)>=1000)throw Error('Enter a frequency from 18 to below 1000 MHz.');
 if(!Number.isInteger(Math.round(Number(value)*1e8)/1000))throw Error('Use a 10 Hz frequency step (five decimal places in MHz).');
 return encFreq(value);
}
const nameDecoder=new TextDecoder('gb18030');
function label(bytes){
 const end=bytes.findIndex(b=>!b||b===255);
 const str=bytes.subarray(0,end<0?bytes.length:end);
 return nameDecoder.decode(str);
}
export function channel(bytes){
 const flags=bytes[15],rx=decFreq(bytes.subarray(0,4)),tx=decFreq(bytes.subarray(4,8));
 return {name:label(bytes.subarray(20)),rx:rx?.toFixed(5)??'',tx:flags&2?tx?.toFixed(5)??'':'',rxTone:tone(bytes.subarray(8,10)),txTone:tone(bytes.subarray(10,12)),mode:flags&1?'AM':flags&64?'NFM':'FM',power:powers[bytes[14]&15]??('Raw '+(bytes[14]&15)),scan:!!(flags&4)};
}
export const channelMenus={
 signal:Array.from({length:15},(_,i)=>String(i+1)),ptt:['Off','BOT','EOT','Both'],
 scramble:['Off',...Array.from({length:8},(_,i)=>'Scramble '+(i+1))],learn:['Off','On'],
 bandwidth:['Wide','Narrow'],encryption:['Off','Encryption 1','Encryption 2','Encryption 3'],
 lock:['Off','On'],rxMode:['FM','AM']
};
const channelBits={signal:[12,15,0],ptt:[13,15,0],scramble:[14,240,4],learn:[15,128,7],
 bandwidth:[15,64,6],encryption:[15,48,4],lock:[15,8,3],rxMode:[15,1,0]};
export function fullChannel(bytes){
 const row=channel(bytes);
 for(const [key,[offset,mask,shift]] of Object.entries(channelBits)){
  const index=(bytes[offset]&mask)>>shift;
  row[key]=channelMenus[key][index]??('Raw '+index);
 }
 row.fhss=bytes[19]===160?Array.from([bytes[18]&127,bytes[17],bytes[16]],v=>v.toString(16).padStart(2,'0')).join('').toUpperCase():'';
 return row;
}
export function editRecord(bytes,patch){
 const isEmpty=!channel(bytes).rx;
 const next=isEmpty?buildRecord({Frequency:patch.rx,Duplex:'off'}):bytes.slice();
 for(const [key,value] of Object.entries(patch)){
  switch(key){
   case 'name': next.set(nameBytes(value),20);break;
   case 'rx': next.set(frequency(value));break;
   case 'tx':
    if(value){next.set(frequency(value),4);next[15]|=2;}
    else{next[15]&=~2;if(isEmpty)next.set(next.subarray(0,4),4);}
    break;
   case 'rxTone': case 'txTone': next.set(toneBytes(value),key==='rxTone'?8:10);break;
   case 'power': if(!powers.includes(value))throw Error('Choose a power level.');next[14]=(next[14]&240)|powers.indexOf(value);break;
   case 'mode': if(!modes.includes(value))throw Error('Choose FM, NFM or AM.');next[15]=(next[15]&~65)|(value==='AM'?1:value==='NFM'?64:0);break;
   case 'scan': next[15]=(next[15]&~4)|(value?4:0);break;
   case 'fhss': {
    if(!value){next.fill(255,16,20);break;}
    if(!/^[0-7][0-9a-f]{5}$/i.test(value))throw Error('Enter six hexadecimal digits from 000000 to 7FFFFF.');
    const n=parseInt(value,16);next.set([n&255,(n>>8)&255,n>>16,160],16);break;
   }
   default: {
    if(!Object.hasOwn(channelBits,key))throw Error('Unknown channel field.');
    const [offset,mask,shift]=channelBits[key],index=channelMenus[key].indexOf(value);
    if(index<0)throw Error('Choose a supported '+key+' value.');
    next[offset]=(next[offset]&~mask)|(index<<shift);
   }
  }
 }
 return next;
}
export function zoneName(image,layout,zone){
 return layoutFor(layout).zoneNames?label(image.zn.subarray((zone-1)*16,zone*16)):'';
}
export function exportZoneCsv(image,layout,zone){
 const {zones,per}=layoutFor(layout);
 if(zone!==null&&(!Number.isInteger(zone)||zone<1||zone>zones))throw Error('Choose a valid zone.');
 const rows=[['Location','Name','Frequency','Duplex','Offset','Tone','rToneFreq','cToneFreq','DtcsCode','DtcsPolarity','RxDtcsCode','CrossMode','Mode','Skip','Power']];
 const kind=t=>t==='Off'?'':t.startsWith('D')?'DTCS':'Tone';
 const start=zone===null?0:(zone-1)*per,count=zone===null?zones*per:per;
 for(let n=0;n<count;n++){
  const c=channel(record(image,layout,start+n));
  if(!c.rx)continue;
  const rx=kind(c.rxTone),tx=kind(c.txTone);
  let mode='';
  if(tx||rx){
   if(tx==='Tone'&&!rx)mode='Tone';
   else if(tx==='Tone'&&rx==='Tone'&&c.txTone===c.rxTone)mode='TSQL';
   else if(tx==='DTCS'&&rx==='DTCS'&&c.txTone.slice(1,4)===c.rxTone.slice(1,4))mode='DTCS';
   else mode='Cross';
  }
  const duplex=!c.tx?'off':c.tx===c.rx?'':'split';
  rows.push([n+1,c.name,c.rx,duplex,duplex==='split'?c.tx:'0',mode,tx==='Tone'?c.txTone:'88.5',rx==='Tone'?c.rxTone:'88.5',
   tx==='DTCS'?c.txTone.slice(1,4):'023',(c.txTone.endsWith('I')?'R':'N')+(c.rxTone.endsWith('I')?'R':'N'),
   rx==='DTCS'?c.rxTone.slice(1,4):'023',tx+'->'+rx,c.mode,c.scan?'':'S',c.power]);
 }
 const escape=v=>'"'+String(v).replaceAll('"','""')+'"';
 return rows.map(row=>row.map(escape).join(',')).join('\r\n')+'\r\n';
}
export function renameZone(image,layout,zone,name){
 const {zones,zoneNames}=layoutFor(layout);
 if(!zoneNames||!Number.isInteger(zone)||zone<1||zone>zones)throw Error('This firmware uses fixed zone names.');
 const bytes=nameBytes(name),start=(zone-1)*16;
 image.zn.fill(255,start,start+16);
 image.zn.set(bytes,start);
}
// Import only mapped data. Retain the destination radio’s unrelated bytes, including
// the two non-channel records in the block shared with channels 989 and 990.
export function overlayChanges(target,before,after,layout){
 const result={...target,ch:target.ch.slice(),zn:target.zn.slice()};
 for(const section of sections)if(target[section.key])result[section.key]=target[section.key].slice();
 overlaySettings(result,before,after);
 const {zones,per,zoneNames}=layoutFor(layout);
 for(let i=0;i<zones*per;i++){
  const a=record(before,layout,i),b=record(after,layout,i),out=record(result,layout,i);
  if(eq(a,b))continue;
  const empty=channel(b).rx==='';
  if(empty&&!b.subarray(0,4).every(v=>v===255)&&!b.subarray(0,4).every(v=>v===0))throw Error('Invalid receive frequency in channel '+(i+1)+'.');
  if(!empty&&(b[15]&2)&&!decFreq(b.subarray(4,8)))throw Error('Invalid transmit frequency in channel '+(i+1)+'.');
  if(empty){if(channel(a).rx)out.set(EMPTY_REC);continue;}
  const includeAll=!channel(a).rx;
  if(!channel(out).rx)out.set(buildRecord({Frequency:channel(b).rx,Duplex:'off'}));
  for(const [start,end] of [[0,4],[4,8],[8,10],[10,12],[20,32]]){
   if(includeAll||!eq(a.subarray(start,end),b.subarray(start,end)))out.set(b.subarray(start,end),start);
  }
  for(const [offset,mask] of [...Object.values(channelBits),[14,15],[15,2],[15,4]]){
   if(includeAll||((a[offset]^b[offset])&mask))out[offset]=(out[offset]&~mask)|(b[offset]&mask);
  }
  if((b[19]===160||a[19]===160)&&!eq(a.subarray(16,20),b.subarray(16,20)))out.set(b.subarray(16,20),16);
 }
 if(zoneNames)for(let z=0;z<zones;z++){
  const start=z*16,end=start+16;
  if(!eq(before.zn.subarray(start,end),after.zn.subarray(start,end)))result.zn.set(after.zn.subarray(start,end),start);
 }
 return result;
}
export function saveBackup(image,layout,profile=rt950Models.rt950pro){
 layoutFor(layout);
 return JSON.stringify({...JSON.parse(backupJSON(image).text),radioProfile:profile.id,firmwareLayout:layout,...(image.factoryDat?{factoryDat:true}:{}),...(image.overflow?.length?{overCapacity:image.overflow}:{})});
}
export function openBackup(text,fallback,profile=rt950Models.rt950pro){
 const obj=JSON.parse(text);
 if(obj.radioProfile!==undefined&&obj.radioProfile!==profile.id)throw Error('This backup belongs to '+(rt950Models[obj.radioProfile]?.name||'another radio')+'. Choose that radio to open it.');
 if(!profile.models.includes(obj.model))throw Error('The backup model identifier does not match '+profile.name+'.');
 const layout=obj.firmwareLayout??fallback;
 layoutFor(layout);
 const decode=(key,len)=>{
  const s=obj.segments?.[key];
  if(typeof s!=='string'||s.length!==len*2||!/^[0-9a-f]+$/i.test(s))throw Error('Incomplete backup segment '+key+'.');
  return hex(s);
 };
 const image={model:obj.model,ch:decode('0000',CH_LEN),zn:decode('C000',ZN_LEN)};
 if(obj.factoryDat===true)image.factoryDat=true;
 if(obj.overCapacity!==undefined){
  if(!Array.isArray(obj.overCapacity)||obj.overCapacity.some(s=>typeof s!=='string'||!/^[a-f0-9]{64}$/i.test(s)||!channel(hex(s)).rx))throw Error('Invalid over-capacity channels in this workspace.');
  image.overflow=obj.overCapacity;
 }
 for(const r of sections)if(Object.hasOwn(obj.segments,segmentKey(r)))image[r.key]=decode(segmentKey(r),r.length);
 return {layout,image};
}
export function appendCsv(image,layout,startZone,text,filename){
 const {zones,per,zoneNames:canRename}=layoutFor(layout);
 const named=zoneFromFilename(filename),z=named?.zone??startZone;
 if(z<1||z>zones)throw Error('CSV zone is outside the selected firmware layout.');
 const rows=parseCSV(text);
 const next={...image,ch:image.ch.slice(),zn:image.zn.slice()};
 let slot=(z-1)*per,count=0,skipped=0;
 for(const row of rows){
  if(!row.Frequency)continue;
  if(!modes.includes((row.Mode||'FM').toUpperCase())){skipped++;continue;}
  while(slot<(named?z*per:zones*per)&&channel(record(next,layout,slot)).rx)slot++;
  if(slot>=(named?z*per:zones*per))throw Error('The selected channels do not fit in the available slots. No channels were added.');
  frequency(row.Frequency);
  if(row.Offset&&!/^\d+(?:\.\d+)?$/.test(row.Offset))throw Error('Invalid CSV offset for '+row.Name);
  if(row.Power&&!['HIGH','MID','MEDIUM','LOW'].includes(row.Power.toUpperCase()))throw Error('Unknown power level for '+row.Name+'. Use High, Medium or Low.');
  nameBytes(row.Name||'');
  const decoded=buildRecord(row);
  if(decoded[15]&2)frequency(channel(decoded).tx);
  record(next,layout,slot++).set(decoded);
  count++;
 }
 if(!count)throw Error('No supported analog channels found.');
 if(named&&canRename&&!zoneName(next,layout,z))renameZone(next,layout,z,named.name);
 return {image:next,count,skipped,zone:z};
}
