import test from 'node:test';
import assert from 'node:assert/strict';
import {blankImage,openBackup,saveBackup} from '../scripts/rt950-channels.mjs';
import {rt950Models} from '../scripts/rt950-models.mjs';
import {webBluetoothLink} from '../scripts/rt950-core.mjs';

test('each model keeps its own workspace identity independently of the shared radio identifier',()=>{
 for(const profile of Object.values(rt950Models))for(const model of profile.models)for(const layout of ['960','990']){
  const image={...blankImage(),model};
  const text=saveBackup(image,layout,profile);
  const stored=JSON.parse(text);
  assert.equal(stored.model,model);
  assert.equal(stored.radioProfile,profile.id);
  const restored=openBackup(text,'960',profile);
  assert.equal(restored.layout,layout);
  assert.deepEqual(restored.image,image);
  const other=profile===rt950Models.bj9000?rt950Models.rt950pro:rt950Models.bj9000;
  assert.throws(()=>openBackup(text,layout,other),/belongs to/);
  delete stored.radioProfile;
  assert.equal(openBackup(JSON.stringify(stored),layout,profile).image.model,model);
  stored.model='OTHER';
  assert.throws(()=>openBackup(JSON.stringify(stored),layout,profile),/identifier/);
 }
});

test('Bluetooth picker discovers BJ, RT and BT broadcasts and radios advertising the shared service',async()=>{
 let options;
 const nav=globalThis.navigator??{};
 const hadNavigator=!!globalThis.navigator;
 if(!hadNavigator)Object.defineProperty(globalThis,'navigator',{value:nav,configurable:true});
 Object.defineProperty(nav,'bluetooth',{configurable:true,value:{requestDevice:async opts=>{
  options=opts;throw Error('Picker cancelled');
 }}});
 try{
  await assert.rejects(webBluetoothLink(()=>{}).choose(false),/Picker cancelled/);
  assert.deepEqual(options.filters.filter(f=>f.namePrefix).map(f=>f.namePrefix).sort(),['BJ','BT','RT']);
  assert(options.filters.some(f=>f.services?.includes(0xffe0)));
 }finally{delete nav.bluetooth;if(!hadNavigator)delete globalThis.navigator;}
});
