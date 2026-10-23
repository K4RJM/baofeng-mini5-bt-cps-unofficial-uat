import {test} from 'node:test';
import assert from 'node:assert/strict';
import {replaceImportedChannels} from '../channel-import-ui.mjs';
import {appHarness} from './app-harness.mjs';
import {fixture,channel,schemas} from './fixtures.mjs';
import {writeDat,readDat} from '../dat.mjs';
import {csvFixture} from './csv-fixtures.mjs';
const file=(text,name='list.csv')=>{const bytes=new TextEncoder().encode(text);return {name,size:bytes.length,arrayBuffer:async()=>bytes};};

test('channel-list replacement preserves settings/reserved record, fills through 999 and refuses overflow atomically',()=>{
 const original=fixture();original.channelList[0][999]=channel('RESERVED');const before=structuredClone(original);
 const list=Array.from({length:999},(_,i)=>channel('CH '+(i+1)));
 const result=replaceImportedChannels(original,list);assert.equal(result.data.channelList[0][998].name,'CH 999');
 for(const key of ['funCfgs','vfos','dtmfs'])assert.deepEqual(result.data[key],original[key]);
 assert.deepEqual(result.data.channelList[0][999],original.channelList[0][999]);assert.deepEqual(original,before);
 assert.deepEqual(readDat(writeDat(result.data,schemas),schemas),result.data);
 assert.throws(()=>replaceImportedChannels(original,[...list,channel()]),/999/);assert.throws(()=>replaceImportedChannels(original,[]),/at least one/);assert.deepEqual(original,before);
});

test('Import file previews CSV, TSV and HMK replacement, requires consent, preserves settings and has one-step Undo',async()=>{
 const h=await appHarness();try{
  const current=fixture();current.channelList[0][998]=channel('KEEP 999');current.channelList[0][999]=channel('RESERVED');await h.open(current);
  for(const [format,ext] of [['chirp','csv'],['kenwood','tsv'],['hmk','hmk']]){
   const before=await h.exported();h.tab('Optional settings');h.get('file').files=[file(csvFixture(format),'sample.'+ext)];await h.get('file').onchange();
   assert.equal(h.get('appendTitle').textContent,'Import channels');assert.equal(h.get('appendPlacementField').hidden,true);assert.equal(h.get('appendSkipRow').hidden,true);
   assert.equal(h.get('replaceConfirmRow').hidden,false);assert.equal(h.get('appendApply').disabled,true);h.get('appendApply').click();assert.deepEqual(await h.exported(),before);
   h.get('replaceConfirm').checked=true;h.get('replaceConfirm').onchange();h.get('appendApply').click();const after=await h.exported();
   assert.equal(after.channelList[0][0].rxFreq,'145.50000');assert.equal(after.channelList[0].slice(0,999).filter(c=>c.rxFreq).length,1);assert.equal(after.channelList[0][998].rxFreq,'');
   for(const k of ['funCfgs','vfos','dtmfs'])assert.deepEqual(after[k],before[k]);assert.deepEqual(after.channelList[0][999],before.channelList[0][999]);
   assert.equal(h.get('pageTitle').textContent,'Channels');h.get('undoChannels').click();assert.deepEqual(await h.exported(),before);
  }
  assert.equal(h.connections.length,0);
 }finally{h.close();}
});

test('blank CSV import keeps radio-write guard and retains duplicate rows; overflow and cancelled reads retain the workspace',async()=>{
 const h=await appHarness();try{
  h.get('file').files=[file(csvFixture('chirp',{},[{Location:'2'}]))];await h.get('file').onchange();assert.equal(h.get('replaceConfirmRow').hidden,true);h.get('appendApply').click();
  const before=await h.exported();assert.equal(before.channelList[0].slice(0,999).filter(c=>c.rxFreq).length,2);assert.equal(h.get('writeRadio').disabled,true);
  h.get('file').files=[file(csvFixture('chirp',{},Array.from({length:999},(_,i)=>({Location:String(i+2)}))))];await h.get('file').onchange();assert.equal(h.get('appendApply').disabled,true);assert.match(h.get('appendErrors').textContent,/999/);h.get('appendCancel').click();assert.deepEqual(await h.exported(),before);
  let finish;const f=file(csvFixture('chirp'));f.arrayBuffer=()=>new Promise(resolve=>finish=resolve);h.get('file').files=[f];const pending=h.get('file').onchange();h.get('appendCancel').click();finish(new TextEncoder().encode(csvFixture('chirp')));await pending;h.get('appendApply').click();assert.deepEqual(await h.exported(),before);assert.equal(h.connections.length,0);
 }finally{h.close();}
});

test('complete configuration import asks before replacing loaded work and invalid files leave it intact',async()=>{
 const h=await appHarness();try{
  await h.open();const before=await h.exported(),other=fixture();other.channelList[0][0].name='REPLACEMENT';h.faults.confirm=false;
  await h.open(other);assert.deepEqual(await h.exported(),before);assert.match(h.confirmations.at(-1),/Channels and radio settings will be replaced/);
  h.faults.confirm=true;await h.open(other);assert.deepEqual(await h.exported(),other);
  const confirmations=h.confirmations.length;h.get('file').files=[file('broken','bad.dat')];await h.get('file').onchange();assert.deepEqual(await h.exported(),other);assert.equal(h.confirmations.length,confirmations);assert.equal(h.connections.length,0);
 }finally{h.close();}
});

test('Append channels is available outside Channels and preserves existing records and settings',async()=>{
 const h=await appHarness();try{
  await h.open();const before=await h.exported();h.tab('VFO A / B');h.get('appendChannels').click();h.get('appendDat').files=[file(csvFixture('kenwood'),'sample.tsv')];await h.get('appendDat').onchange();h.get('appendPlacement').value='101';h.get('appendPlacement').onchange();h.get('appendApply').click();
  const after=await h.exported();assert.equal(h.get('pageTitle').textContent,'Channels');assert.equal(after.channelList[0][100].rxFreq,'145.50000');assert.deepEqual(after.channelList[0][0],before.channelList[0][0]);assert.deepEqual(after.vfos,before.vfos);h.get('undoChannels').click();assert.deepEqual(await h.exported(),before);assert.equal(h.connections.length,0);
 }finally{h.close();}
});
