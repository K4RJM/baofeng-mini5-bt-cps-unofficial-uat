// Factory-CPS channel input evidence, not a claim of measured RF performance.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateEdits} from '../validation.mjs';
import {makePlan} from '../writer.mjs';
import {decodeRadio} from '../radio-decoder.mjs';
import {readDat,writeDat} from '../dat.mjs';
import {fixture,options,charset,schemas} from './fixtures.mjs';
import {appHarness} from './app-harness.mjs';

test('F07 channel policy: both RX and TX accept recorded band edges and exact 1.25 kHz steps',()=>{
 for(const key of ['rxFreq','txFreq'])for(const value of ['136.00000','136.00125','146.52000','173.99750','173.99875','400.00000','400.00125','446.00625','519.99750','519.99875']){
  const base=fixture(),data=structuredClone(base);data.channelList[0][0][key]=value;
  assert.deepEqual(validateEdits(data,base,options,charset),[],key+' '+value);
  assert.equal(decodeRadio(makePlan(data,options).target).channelList[0][0][key],value);
 }
});

test('F07 channel policy: both RX and TX reject adjacent out-of-band values and recorded rejected regions',()=>{
 for(const key of ['rxFreq','txFreq'])for(const value of ['100.00000','118.00000','135.99875','135.99999','173.99876','174.00000','350.00000','399.00000','399.99875','399.99999','519.99876','520.00000','650.00000','999.99999']){
  const base=fixture(),data=structuredClone(base);data.channelList[0][0][key]=value;const before=structuredClone(data);
  assert.ok(validateEdits(data,base,options,charset).length,key+' '+value);
  assert.throws(()=>makePlan(data,options),/Channel 1.*frequency/i);
  assert.deepEqual(data,before,'rejection must preserve the input');
 }
});

test('F07 channel policy: every off-grid remainder is rejected without rounding',()=>{
 for(const key of ['rxFreq','txFreq'])for(let remainder=1;remainder<125;remainder++){
  const units=14652000+remainder,value=String(units).slice(0,3)+'.'+String(units).slice(3);
  const base=fixture(),data=structuredClone(base);data.channelList[0][0][key]=value;
  assert.match(validateEdits(data,base,options,charset).join('\n'),/1\.25 kHz/,key+' '+value);
  assert.throws(()=>makePlan(data,options),/1\.25 kHz/);
  assert.equal(data.channelList[0][0][key],value);
 }
});

test('F07 channel policy: imported out-of-band and off-grid records remain exportable but cannot reach a write confirmation',async()=>{
 const h=await appHarness();try{
  for(const key of ['rxFreq','txFreq'])for(const value of ['118.00000','350.00000','520.00000','146.52001']){
   const data=fixture();data.channelList[0][0][key]=value;await h.open(data);
   assert.deepEqual(await h.exported(),data);
   await h.get('writeRadio').click();
   assert.equal(h.connections.length,0);assert.notEqual(h.get('warning').open,true);
   assert.match(h.get('status').textContent,/Channel 1.*frequency/i);
   assert.deepEqual(await h.exported(),data);
  }
 }finally{h.close();}
});

test('F07 channel policy: unchanged imported frequencies survive other edits and native DAT export',()=>{
 const base=fixture();base.channelList[0][0].rxFreq='650.00000';base.channelList[0][0].txFreq='146.52001';
 const edited=structuredClone(base);edited.channelList[0][0].name='KEPT';
 assert.deepEqual(validateEdits(edited,base,options,charset),[]);
 assert.deepEqual(readDat(writeDat(edited,schemas),schemas),edited);
 assert.throws(()=>makePlan(edited,options),/Channel 1.*frequency/i);
});

test('F07 channel policy: apply and next reject off-grid edits; short valid frequency entry still pads zeros',async()=>{
 const h=await appHarness();try{
  await h.open();const before=await h.exported();h.row(0).querySelectorAll('button').find(b=>b.textContent==='Edit').click();
  h.enter('rxFreq','146.52001');h.get('apply').click();
  assert.equal(h.get('editor').open,true);assert.match(h.get('editErrors').textContent,/1\.25 kHz/);
  assert.equal(h.field('rxFreq','fields').value,'146.52001');
  h.get('editNext').click();assert.equal(h.get('editorTitle').textContent,'Edit channel 1');
  h.get('cancel').click();assert.deepEqual(await h.exported(),before);
  h.row(0).querySelectorAll('button').find(b=>b.textContent==='Edit').click();h.enter('rxFreq','146.55');h.get('apply').click();
  assert.equal(h.get('editor').open,false);assert.equal((await h.exported()).channelList[0][0].rxFreq,'146.55000');
  assert.equal(h.connections.length,0);
 }finally{h.close();}
});

test('F07 channel policy: empty channels and blank receive-only TX remain supported',()=>{
 const base=fixture(),data=structuredClone(base);data.channelList[0][0].txFreq='';
 assert.deepEqual(validateEdits(data,base,options,charset),[]);
 const decoded=decodeRadio(makePlan(data,options).target);
 assert.equal(decoded.channelList[0][0].txFreq,'');assert.equal(decoded.channelList[0][1].rxFreq,'');
 data.channelList[0][0].rxFreq='';data.channelList[0][0].txFreq='146.52000';
 assert.ok(validateEdits(data,base,options,charset).length);assert.throws(()=>makePlan(data,options),/empty channel/i);
});

test('F07 channel policy: VFO A and B retain their separate existing frequency rules',()=>{
 for(const side of ['A','B'])for(const value of ['350.00000','399.99999']){
  const base=fixture(),data=structuredClone(base);data.vfos['vfo'+side+'Freq']=value;
  assert.deepEqual(validateEdits(data,base,options,charset),[]);
  assert.equal(decodeRadio(makePlan(data,options).target).vfos['vfo'+side+'Freq'],value);
 }
});
