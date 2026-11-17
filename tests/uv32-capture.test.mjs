import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openUv32Capture} from '../scripts/uat-uv32-capture.mjs';

const regions=[[0,0x8040],[0x9000,0x40],[0xa000,0x2c0],[0xd000,0x40]];
const report=()=>({kind:'uv32-cable-full-read-v1',completed:true,identity:'UV32PRO',regions,
 completedBlocks:526,totalBlocks:526,memoryReads:526,memoryWrites:0,wireHex:'ff'.repeat(33664),
 preview:{channels:[{name:'forged'}]},readout:{zones:[{name:'forged'}]}});

test('full UV-32 capture is decoded from memory, not saved display fields',()=>{
 const opened=openUv32Capture(JSON.stringify(report()));
 assert.equal(opened.bytes,33664);
 assert.equal(opened.preview.channels.length,0);
 assert.notEqual(opened.readout.zones[0].name,'forged');
});

test('partial, mismatched, or malformed UV-32 captures cannot enter the workspace',()=>{
 for(const change of [r=>r.completed=false,r=>r.identity='5RMINI',r=>r.memoryWrites=1,
  r=>r.regions[0][1]=0x8000,r=>r.wireHex='gg'.repeat(33664),r=>r.wireHex='ff']){
  const r=report();change(r);assert.throws(()=>openUv32Capture(r));
 }
});
