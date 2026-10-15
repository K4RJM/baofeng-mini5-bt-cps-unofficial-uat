import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makePlan} from '../writer.mjs';
import {decodeRadio,radioDat} from '../radio-decoder.mjs';
import {crypt} from '../radio-encoder.mjs';
import {readDat,writeDat} from '../dat.mjs';
import {fixture,options,schemas} from './fixtures.mjs';

// Compact capture offsets: radio 0x9000 is stored at 0x8040.
const fields=[
 ['funCfgs','pttDly',0x804c,29],
 ['vfos','vfopttid',0x804b,4],
 ['vfos','vfoASQMode',0x801b,3],
 ['vfos','vfoBSQMode',0x803b,3]
];
for(const [section,key,offset,count]of fields)test('F02: every supported '+key+' code preserves the complete canonical image',()=>{
 const original=makePlan(fixture(),options).target;
 for(let code=0;code<count;code++){
  assert.ok(options[section==='funCfgs'?'KDH.Function':'KDH.VFOInfos'][key].some(([v])=>v===code));
  const plain=crypt(original);plain[offset]=code;const raw=crypt(plain);
  const decoded=decodeRadio(raw),expected=decodeRadio(original);expected[section][key]=code;
  assert.deepEqual(decoded,expected,'Only the target setting may change');
  assert.equal(decoded[section][key],code);
  assert.deepEqual(readDat(radioDat(raw,schemas),schemas),decoded);
  assert.deepEqual(makePlan(readDat(writeDat(decoded,schemas),schemas),options).target,raw,'DAT and radio rebuild must preserve every canonical byte');
 }
});

test('F02: confirmed high codes decode from fixed transport bytes independently of encoder output',()=>{
 const raw=makePlan(fixture(),options).target;
 // Plain codes 28, 3 and 2 at the confirmed addresses. CO 7 transport
 // transforms them to 0x5f, 0x34 and 0x35 respectively; not generated here.
 raw[0x804c]=0x5f;raw[0x804b]=0x34;raw[0x801b]=0x35;
 const data=decodeRadio(raw);
 assert.equal(data.funCfgs.pttDly,28);assert.equal(data.vfos.vfopttid,3);assert.equal(data.vfos.vfoASQMode,2);
 assert.equal(options['KDH.Function'].pttDly.find(([v])=>v===28)[1],'3000 ms');
 assert.deepEqual(makePlan(data,options).target,raw);
});

test('F02: unknown stored codes are preserved in DAT and rejected by the existing write validator',()=>{
 for(const [section,key,offset,count]of fields)for(const code of [count,127,255]){
  const plain=crypt(makePlan(fixture(),options).target);plain[offset]=code;
  const decoded=decodeRadio(crypt(plain));assert.equal(decoded[section][key],code);
  assert.equal(readDat(writeDat(decoded,schemas),schemas)[section][key],code);
  assert.throws(()=>makePlan(decoded,options),new RegExp('Unrecognized CPS value: '+key));
 }
});

test('F02: supported settings coexist without cross-field or byte changes',()=>{
 for(const delay of [0,6,7,14,21,28])for(let id=0;id<4;id++)for(let a=0;a<3;a++)for(let b=0;b<3;b++){
  const data=fixture();data.funCfgs.pttDly=delay;Object.assign(data.vfos,{vfopttid:id,vfoASQMode:a,vfoBSQMode:b});
  const raw=makePlan(data,options).target,decoded=decodeRadio(raw);
  assert.deepEqual([decoded.funCfgs.pttDly,decoded.vfos.vfopttid,decoded.vfos.vfoASQMode,decoded.vfos.vfoBSQMode],[delay,id,a,b]);
  assert.deepEqual(makePlan(decoded,options).target,raw);
 }
});
