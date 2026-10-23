import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readCsvFile,importChannelCsv,parseCsv,MAX_CSV_BYTES} from '../csv-import.mjs';
import {csvFixture,csvHeads,csvValues} from './csv-fixtures.mjs';
import {options,charset,schemas,fixture} from './fixtures.mjs';
import {writeDat,readDat} from '../dat.mjs';
import {appendChannels} from '../channel-import.mjs';
import {makePlan} from '../writer.mjs';
import {appHarness} from './app-harness.mjs';
const settings={options,charset},load=(id,changes={},extra=[])=>importChannelCsv(csvFixture(id,changes,extra),settings);
const file=(text,name='channels.csv')=>{const b=new TextEncoder().encode(text);return {name,size:b.length,arrayBuffer:async()=>b};};

for(const id of Object.keys(csvHeads))test(id+': independent expected frequencies, tones, power and append round trip',()=>{
 const report=load(id);assert.equal(report.rows.length,1);assert.equal(report.channels.length,1,JSON.stringify(report.rows));
 const c=report.channels[0];assert.equal(c.rxFreq,'145.50000');assert.equal(c.txFreq,'144.90000');assert.equal(c.name,'CSV TEST');
 assert.equal(c.strRxCtsDcs,'110.9');assert.equal(c.strTxCtsDcs,'110.9');assert.equal(c.bandwide,0);assert.equal(c.scanAdd,1);
 assert.equal(c.txPower,['adms','anytone','btech'].includes(id)?0:1);
 const current=fixture(),out=appendChannels(current,report.channels,{placement:'101'}).data;
 for(const k of ['vfos','funCfgs','dtmfs'])assert.deepEqual(out[k],current[k]);
 assert.deepEqual(out.channelList[0][999],current.channelList[0][999]);assert.deepEqual(readDat(writeDat(out,schemas),schemas),out);
 assert.equal(makePlan(out,options).frames.length,262);
});

test('CSV parser supports BOM, CRLF, tabs, semicolons, escaped quotes, multiline fields and rejects malformed quoting',()=>{
 for(const d of [',',';','\t']){const r=parseCsv('\uFEFFa'+d+'b\r\n"one'+d+'two"'+d+'"line1\nline2 ""quoted"""\r\n');assert.equal(r.rows[1].cells[0],'one'+d+'two');assert.equal(r.rows[1].cells[1],'line1\nline2 "quoted"');}
 for(const s of ['a,b\n"broken,b','a,b\n"x"junk,y','a,b\na"b,c'])assert.throws(()=>parseCsv(s));
 assert.throws(()=>parseCsv('a,b\n\u0000,x'),/binary/);
 assert.throws(()=>parseCsv('a,b\n'+('x'.repeat(4097))+',z'),/4096/);
 assert.throws(()=>parseCsv(('a,b\n').repeat(5003)),/5000/);
 assert.throws(()=>parseCsv(Array.from({length:129},()=>1).join(',')),/columns/);
});
test('header case, spacing, order and harmless duplicate unused columns are tolerated',()=>{
 const heads=[...csvHeads.anytone].reverse(),values=csvValues.anytone;
 const text=heads.map(h=>' '+h.toUpperCase()+' ').join(',')+'\n'+heads.map(h=>values[h]||'').join(',');
 assert.equal(importChannelCsv(text,settings).channels.length,1);
 const doubled=csvFixture('chirp').replace('"Frequency",','"Frequency","Frequency",').replace('"145.500000",','"145.500000","146.520000",');
 assert.match(importChannelCsv(doubled,settings).rows[0].error,/Duplicate column/);
 assert.throws(()=>importChannelCsv('Name,Other\na,b',settings),/not recognized/);
 assert.equal(importChannelCsv(csvFixture('chirp').replace('"145.500000",',''),settings).channels.length,0);
});
test('generic named columns support alternate labels and units, expose mappings, and reject ambiguity',()=>{
 const text='Channel_Name;RX_Frequency_Hz;TX_Frequency_Hz;RX_Tone;TX_Tone;Mode;Power;Scan\nGENERIC;145500000;144900000;110.9;110.9;FM;Low;Yes';
 const r=importChannelCsv(text,settings);assert.equal(r.channels.length,1,JSON.stringify(r.rows));assert.equal(r.format,'Common channel columns');assert.match(r.notes[0],/Mapped columns/);assert.equal(r.channels[0].txFreq,'144.90000');
 const ro=importChannelCsv('Name,Frequency\nLISTEN,145.5',settings);assert.equal(ro.channels[0].txFreq,'');assert.match(ro.rows[0].notes.join(' '),/transmit disabled/);
 assert.throws(()=>importChannelCsv('Name,Frequency,RX Frequency\nT,145.5,146.52',settings),/Ambiguous/);
 assert.equal(importChannelCsv('Name,Frequency,Mode\nT,145.5,DMR',settings).channels.length,0);
 assert.throws(()=>importChannelCsv('Name,Frequency,Tone Mode\nT,145.5,Tone',settings),/Tone-mode columns/);
});
test('CHIRP TSQL, transmit-only tones, DCS polarity and cross tones follow CHIRP semantics',()=>{
 let c=load('chirp',{rToneFreq:'88.5',cToneFreq:'110.9'}).channels[0];assert.equal(c.strTxCtsDcs,'110.9');assert.equal(c.strRxCtsDcs,'110.9');
 c=load('chirp',{Tone:'Tone'}).channels[0];assert.equal(c.strRxCtsDcs,'OFF');assert.equal(c.strTxCtsDcs,'110.9');
 c=load('chirp',{Tone:'DTCS',DtcsCode:'23',RxDtcsCode:'025',DtcsPolarity:'NR'}).channels[0];assert.equal(c.strTxCtsDcs,'D023N');assert.equal(c.strRxCtsDcs,'D023I');
 c=load('chirp',{Tone:'Cross',CrossMode:'Tone->DTCS',RxDtcsCode:'025',DtcsPolarity:'NR'}).channels[0];assert.equal(c.strTxCtsDcs,'110.9');assert.equal(c.strRxCtsDcs,'D025I');
 assert.equal(load('chirp',{Tone:'Cross',CrossMode:'UNKNOWN'}).channels.length,0);
 assert.equal(load('chirp',{Tone:'TSQL',cToneFreq:'110.95'}).channels.length,0);
});
test('offset, split and receive-only fields keep explicit transmit semantics',()=>{
 assert.equal(load('chirp',{Duplex:'+',Offset:'0.6'}).channels[0].txFreq,'146.10000');
 assert.equal(load('chirp',{Duplex:'',Offset:'0.6'}).channels[0].txFreq,'145.50000');
 assert.equal(load('chirp',{Duplex:'split',Offset:'446.000'}).channels[0].txFreq,'446.00000');
 assert.equal(load('chirp',{Duplex:'off'}).channels[0].txFreq,'');
 for(const [id,change] of [['opengd',{'Rx Only':'Yes'}],['anytone',{'PTT Prohibit':'On'}],['btech',{'tx_dis(0=OFF/1=ON)':'1'}]])assert.equal(load(id,change).channels[0].txFreq,'');
 assert.equal(load('hmk',{'Tx Freq.':'00146.100000'}).channels.length,0);
 assert.equal(load('adms',{'2':'146.10000'}).channels.length,0);
});
test('digital-only, AM, active reverse, unknown tones and off-grid channels are excluded without rounding',()=>{
 for(const [id,change] of [['rb',{Modes:'DMR'}],['chirp',{Mode:'AM'}],['opengd',{'Channel Type':'Digital'}],['anytone',{'Channel Type':'D-Digital'}],['anytone',{Reverse:'On'}],['kenwood',{Mode:'DV'}],['hmk',{'Rev.':'On'}],['rt',{Comment:'Modes: DMR'}],['btech',{'mute(0=OFF/1=ON)':'1'}]])assert.equal(load(id,change).channels.length,0,id);
 assert.equal(load('rb',{Modes:'FM P-25'}).channels.length,1);
 for(const f of ['145.50001','145.500001','174.000000','520','1e8','=1+1'])assert.equal(load('chirp',{Frequency:f}).channels.length,0,f);
 assert.equal(load('rb',{'Uplink Tone':'not a tone'}).channels.length,0);
 assert.equal(load('btech',{'tx_sub_audio(CTCSS=freq/DCS=number)':'25000'}).channels.length,0);
 assert.equal(load('btech',{'tx_sub_audio(CTCSS=freq/DCS=number)':'DCS 023N'}).channels[0].strTxCtsDcs,'D023N');
});
test('names are shortened by encoded bytes with a notice, power fallback is explicit, blank ADMS slots are ignored',()=>{
 const r=load('chirp',{Name:'LONG CHANNEL NAME'});assert.equal(r.channels[0].name,'LONG CHANNEL');assert.match(r.rows[0].notes.join(' '),/shortened/);
 const wide=load('chirp',{Name:'测试测试测试测试'});assert.equal(wide.channels[0].name,'测试测试测试');
 assert.equal(load('chirp',{Name:'BAD😀'}).channels.length,0);
 assert.equal(importChannelCsv(csvFixture('opengd'),{...settings,defaultPower:0}).channels[0].txPower,0);
 const blank=Object.fromEntries(csvHeads.adms.map(h=>[h,'']));blank['0']='2';blank['53']='0';const a=load('adms',{},[blank]);assert.equal(a.emptyRows,1);assert.equal(a.channels.length,1);
});
test('bounded file reads support UTF-16 Kenwood and Windows-1252, and reject oversized content before reading',async()=>{
 let reads=0;await assert.rejects(readCsvFile({size:MAX_CSV_BYTES,arrayBuffer(){reads++;}},settings));assert.equal(reads,0);
 const text=csvFixture('kenwood'),raw=Buffer.concat([Buffer.from([255,254]),Buffer.from(text,'utf16le')]);
 const r=await readCsvFile({size:raw.length,arrayBuffer:async()=>raw},settings);assert.equal(r.channels.length,1);assert.equal(r.encoding,'UTF-16 LE');
 const latin=Buffer.from(csvFixture('chirp',{Name:'CAFÉ'}),'latin1');const l=await readCsvFile({size:latin.length,arrayBuffer:async()=>latin},settings);assert.equal(l.encoding,'Windows-1252');
});
test('actual import preview requires acknowledgement for rejected rows, preserves settings and supports selection/Undo',async()=>{
 const h=await appHarness();try{
  await h.open();const before=await h.exported();h.button('Import / append').click();
  h.get('appendDat').files=[file(csvFixture('chirp',{},[{Location:'2',Mode:'DV'}]))];await h.get('appendDat').onchange();
  assert.equal(h.get('csvReview').hidden,false);assert.equal(h.get('appendApply').disabled,true);assert.match(h.get('csvSummary').textContent,/1 valid · 1 excluded/);assert.deepEqual(await h.exported(),before);
  h.get('csvPartial').checked=true;h.get('csvPartial').onchange();h.get('appendPlacement').value='101';h.get('appendPlacement').onchange();assert.equal(h.get('appendApply').disabled,false);
  h.get('csvPower').value='0';await h.get('csvPower').onchange();h.get('appendApply').click();const after=await h.exported();
  assert.equal(after.channelList[0][100].rxFreq,'145.50000');assert.equal(after.channelList[0][100].txPower,0);
  for(const k of ['vfos','funCfgs','dtmfs'])assert.deepEqual(after[k],before[k]);assert.deepEqual(after.channelList[0][999],before.channelList[0][999]);
  h.get('undoChannels').click();assert.deepEqual(await h.exported(),before);assert.equal(h.connections.length,0);
 }finally{h.close();}
});
test('blank-workspace CSV import does not grant radio-write permission; cancellation and malformed replacement retain workspace',async()=>{
 const h=await appHarness();try{
  h.button('Import / append').click();h.get('appendDat').files=[file(csvFixture('kenwood'),'channels.tsv')];await h.get('appendDat').onchange();h.get('appendApply').click();
  assert.equal((await h.exported()).channelList[0][0].rxFreq,'145.50000');assert.equal(h.get('writeRadio').disabled,true);const before=await h.exported();
  h.button('Import / append').click();let finish;const f=file(csvFixture('hmk'),'channels.hmk');f.arrayBuffer=()=>new Promise(r=>finish=r);h.get('appendDat').files=[f];const pending=h.get('appendDat').onchange();h.get('appendCancel').click();finish(new TextEncoder().encode(csvFixture('hmk')));await pending;h.get('appendApply').click();assert.deepEqual(await h.exported(),before);
  h.button('Import / append').click();h.get('appendDat').files=[file('wrong,columns\n1,2')];await h.get('appendDat').onchange();assert.equal(h.get('appendApply').disabled,true);assert.deepEqual(await h.exported(),before);assert.equal(h.connections.length,0);
 }finally{h.close();}
});
