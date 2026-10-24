import {test} from 'node:test';import assert from 'node:assert/strict';
import {importRdt,parseRdt,readRdtFile,MAX_RDT_BYTES} from '../rdt-import.mjs';
import {importChannelCsv} from '../csv-import.mjs';
import {csvFixture} from './csv-fixtures.mjs';
import {rdtFixture} from './rdt-fixtures.mjs';
import {options,charset,schemas,fixture} from './fixtures.mjs';
import {appHarness} from './app-harness.mjs';
import {readDat,writeDat} from '../dat.mjs';
const settings={options,charset},file=b=>({name:'sample.rdt',size:b.length,arrayBuffer:async()=>b});
for(const model of ['D168UV','D890UV'])test(model+': RDT analog channels, independent expected RX/TX/tone values, digital filtering and VFO exclusion',()=>{
 const raw=rdtFixture({model,records:[{}, {name:'DIGITAL',mode:1},{name:'LISTEN',id:100,rxOnly:1}]}),before=raw.slice();
 const r=importRdt(raw,settings);assert.equal(r.channels.length,2);assert.equal(r.skippedDigital,1);assert.equal(r.skippedVfo,2);assert.deepEqual(r.rows.map(x=>x.line),[1,101]);
 const c=r.channels[0];assert.equal(c.rxFreq,'145.50000');assert.equal(c.txFreq,'144.90000');assert.equal(c.strRxCtsDcs,'110.9');assert.equal(c.strTxCtsDcs,'110.9');assert.equal(c.txPower,0);assert.equal(c.bandwide,0);assert.equal(r.channels[1].txFreq,'');assert.deepEqual(raw,before);
});
test('RDT locates variable-length tables without relying on sample offsets or channel names',()=>{
 for(const prefix of [23,255,388,391,7000]){const b=rdtFixture({prefix,records:[{name:'RENAMED'},{name:'X',id:31}]});assert.equal(parseRdt(b).start,prefix);assert.equal(importRdt(b,settings).channels.length,2);}
 assert.throws(()=>parseRdt(rdtFixture({prefix:8193})),/unrecognized/);
 assert.throws(()=>parseRdt(rdtFixture({tables:2})),/ambiguous/);
});
test('RDT rejects wrong model/version, corrupt lengths, truncated records, missing VFO sentinels and duplicate IDs',()=>{
 const original=rdtFixture();for(const p of [0,9,19,5]){const b=original.slice();b[p]^=1;assert.throws(()=>parseRdt(b));}
 for(const length of [0,100,350,original.length-1]){const b=original.slice(0,length);assert.throws(()=>parseRdt(b));}
 const truncated=original.slice(0,400);new DataView(truncated.buffer).setUint32(5,truncated.length-14,true);assert.throws(()=>parseRdt(truncated));
 assert.throws(()=>parseRdt(rdtFixture({records:[{id:2},{id:2}]})),/unrecognized/);
 const b=original.slice(),p=parseRdt(b);b[p.end-36]=0xff;assert.throws(()=>parseRdt(b));
});
test('RDT rejects unverified analog options and tone encodings, retaining a usable row with explicit review errors',()=>{
 for(const changes of [{fields:{14:1}},{fields:{15:2}},{fields:{17:1}},{fields:{32:1}},{fields:{33:1}},{fields:{36:1}},{tail:{2:1}},{fields:{18:3}},{fields:{19:51}},{fields:{18:2,20:19,21:2}},{fields:{18:2,20:0,21:0}}]){
  const r=importRdt(rdtFixture({records:[{},changes]}),settings);assert.equal(r.channels.length,1,JSON.stringify(changes));assert.ok(r.rows[1].error);
 }
});
test('RDT plus, split, receive-only and normal DCS preserve meaning without rounding',()=>{
 const r=importRdt(rdtFixture({records:[{dir:1},{dir:0,tx:44600000},{fields:{18:2,20:133,21:0,22:2,24:117,25:1}},{rx:14550001}]}),settings);
 assert.equal(r.channels[0].txFreq,'146.10000');assert.equal(r.channels[1].txFreq,'446.00000');assert.equal(r.channels[2].strRxCtsDcs,'D205N');assert.equal(r.channels[2].strTxCtsDcs,'D565N');assert.ok(r.rows[3].error);
});
test('RDT all-digital/mixed lists produce an empty analog preview; every nonanalog mode is filtered',()=>{
 const r=importRdt(rdtFixture({records:[1,2,3,4,5].map(mode=>({mode}))}),settings);assert.equal(r.rows.length,0);assert.equal(r.skippedDigital,5);assert.equal(r.channels.length,0);
});
test('RDT size checks run before reading and after reading',async()=>{
 await assert.rejects(()=>readRdtFile({size:MAX_RDT_BYTES+1,arrayBuffer(){throw Error('must not read');}},settings),/32 MB/);
 await assert.rejects(()=>readRdtFile({size:10,arrayBuffer:async()=>new Uint8Array(MAX_RDT_BYTES+1)},settings),/32 MB/);
});
test('digital CSV filtering covers every mode-bearing layout, preserving explicit FM capability',()=>{
 const examples=[['rb',{Modes:'DMR'}],['chirp',{Mode:'DV'}],['rt',{'Operating Mode':'DMR'}],['adms',{'5':'DN'}],['icom',{Mode:'DV'}],['anytone',{'Channel Type':'D-Digital'}],['opengd',{'Channel Type':'Digital'}],['hmk',{Mode:'DV'}],['kenwood',{Mode:'D-STAR'}]];
 for(const [id,change] of examples){const r=importChannelCsv(csvFixture(id,change),settings);assert.equal(r.skippedDigital,1,id);assert.equal(r.rows.length,0,id);assert.equal(r.channels.length,0,id);}
 for(const mode of ['DMR','NXDN','C4FM','P25','D-STAR','DPMR','A+D TX A','D+A TX D']){const r=importChannelCsv('Name,Frequency,Mode\nD,145.5,'+mode,settings);assert.equal(r.skippedDigital,1,mode);}
 assert.equal(importChannelCsv(csvFixture('rb',{Modes:'FM DMR'}),settings).channels.length,1);
 assert.equal(importChannelCsv(csvFixture('btech',{'mute(0=OFF/1=ON)':'1'}),settings).channels.length,0);
});
test('RDT Import/Append use the real handlers, preserve settings, confirm replacement, support Undo and keep write guards',async()=>{
 const h=await appHarness();try{
  await h.open();const before=await h.exported();
  for(const model of ['D168UV','D890UV']){
   h.get('file').files=[file(rdtFixture({model,records:[{}, {mode:1}]}))];await h.get('file').onchange();assert.equal(h.get('appendTitle').textContent,'Import channels');assert.equal(h.get('appendApply').disabled,true);
   assert.match(h.get('csvSummary').textContent,/1 digital filtered/);assert.equal(h.get('csvPartialRow').hidden,true);
   h.get('replaceConfirm').checked=true;h.get('replaceConfirm').onchange();h.get('appendApply').click();const after=await h.exported();assert.equal(after.channelList[0][0].rxFreq,'145.50000');
   assert.deepEqual(readDat(writeDat(after,schemas),schemas),after);for(const k of ['funCfgs','vfos','dtmfs'])assert.deepEqual(after[k],before[k]);assert.deepEqual(after.channelList[0][999],before.channelList[0][999]);h.get('undoChannels').click();assert.deepEqual(await h.exported(),before);
  }
  h.get('appendChannels').click();h.get('appendDat').files=[file(rdtFixture())];await h.get('appendDat').onchange();h.get('appendPlacement').value='101';h.get('appendPlacement').onchange();h.get('appendApply').click();assert.equal((await h.exported()).channelList[0][100].txFreq,'144.90000');h.get('undoChannels').click();assert.deepEqual(await h.exported(),before);
  h.get('file').files=[file(rdtFixture({records:[{mode:1}]}))];await h.get('file').onchange();assert.equal(h.get('appendApply').disabled,true);assert.equal(h.get('csvPage').textContent,'No analog channels to import');h.get('appendCancel').click();assert.deepEqual(await h.exported(),before);assert.equal(h.connections.length,0);
 }finally{h.close();}
});
test('CSV digital-only exclusions no longer require a partial-import checkbox, and all-digital files cannot clear channels',async()=>{
 const h=await appHarness();try{
  await h.open();const before=await h.exported(),make=text=>({name:'mix.csv',size:text.length,arrayBuffer:async()=>new TextEncoder().encode(text)});
  h.get('appendChannels').click();h.get('appendDat').files=[make(csvFixture('chirp',{},[{Mode:'DV',Location:'2'}]))];await h.get('appendDat').onchange();assert.equal(h.get('csvPartialRow').hidden,true);assert.equal(h.get('appendApply').disabled,false);assert.match(h.get('csvSummary').textContent,/1 digital filtered/);h.get('appendCancel').click();assert.deepEqual(await h.exported(),before);
  h.get('file').files=[make(csvFixture('chirp',{Mode:'DV'}))];await h.get('file').onchange();h.get('replaceConfirm').checked=true;h.get('replaceConfirm').onchange();assert.equal(h.get('appendApply').disabled,true);h.get('appendCancel').click();assert.deepEqual(await h.exported(),before);
 }finally{h.close();}
});

test('RDT replacement enforces 999 channels, late cancelled reads cannot apply, and bad files preserve workspace',async()=>{
 const h=await appHarness();try{
  await h.open();const before=await h.exported();
  const f=file(rdtFixture({records:Array.from({length:1000},()=>({}))}));h.get('file').files=[f];await h.get('file').onchange();assert.equal(h.get('appendApply').disabled,true);assert.match(h.get('appendErrors').textContent,/999/);h.get('appendCancel').click();assert.deepEqual(await h.exported(),before);
  let finish;const b=rdtFixture(),delayed=file(b);delayed.arrayBuffer=()=>new Promise(r=>finish=r);h.get('file').files=[delayed];const pending=h.get('file').onchange();h.get('appendCancel').click();finish(b);await pending;h.get('appendApply').click();assert.deepEqual(await h.exported(),before);
  h.get('file').files=[file(new Uint8Array(500))];await h.get('file').onchange();assert.equal(h.get('appendApply').disabled,true);assert.match(h.get('appendErrors').textContent,/Unsupported RDT/);assert.deepEqual(await h.exported(),before);assert.equal(h.connections.length,0);
 }finally{h.close();}
 const empty=await appHarness();try{empty.get('file').files=[file(rdtFixture())];await empty.get('file').onchange();empty.get('appendApply').click();assert.equal(empty.get('writeRadio').disabled,true);}finally{empty.close();}
});
