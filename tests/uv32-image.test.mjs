import {test} from 'node:test';
import assert from 'node:assert/strict';
import {decodeUv32Image,UV32_IMAGE_BYTES} from '../scripts/uat-uv32-image.mjs';

test('UV-32 full image separates function, VFO, DTMF, and zone regions',()=>{
 const bytes=new Uint8Array(UV32_IMAGE_BYTES).fill(255);
 bytes[0x8040]=2;bytes[0x8040+4]=1;bytes[0x8040+26]=0x10;
 bytes.set([4,4,6,0,0,0,0,0],0x8000);
 bytes.set([0,1,2,0,2],0x8080);bytes[0x8087]=3;bytes[0x8088]=3;
 bytes.set([2,0,2,0,2,65,66,67,0],0x80a0);
 bytes.set([90,79,78,69,32,48,49,0],0x8280);
 const result=decodeUv32Image(bytes);
 assert.deepEqual(result.functionFields.slice(0,1),[['SQL','2']]);
 assert.deepEqual(result.vfoA[0],['Frequency MHz','446.00000']);
 assert.deepEqual(result.functionFields.find(x=>x[0]==='Dual Standby'),['Dual Standby','On']);
 assert.deepEqual(result.functionFields.find(x=>x[0]==='Work Modes'),['Work Modes','A 0, B 1']);
 assert.equal(result.dtmf.localId,'01202');
 assert.equal(result.dtmf.codeTime,'300 ms');
 assert.deepEqual(result.dtmf.entries[0],{number:1,code:'20202',name:'ABC'});
 assert.equal(result.zones[0].name,'ZONE 01');
 assert.equal(result.zones.length,10);
});

test('UV-32 settings decoder refuses a channel-only capture',()=>{
 assert.throws(()=>decodeUv32Image(new Uint8Array(32000)),/full 33664-byte/);
});
