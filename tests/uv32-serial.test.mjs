import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readUv32Serial,UV32_SERIAL_BAUD} from '../scripts/uat-uv32-serial.mjs';

function fakePort({badAt=-1,identity='UV32PRO'}={}){
 const replies=[],writes=[];let closed=false,locked=false;
 const port={
  async open(options){assert.equal(options.baudRate,115200);locked=true;},
  readable:{getReader(){return {async read(){if(!replies.length)throw Error('No simulated reply');return {done:false,value:replies.shift()};},async cancel(){},releaseLock(){}};}},
  writable:{getWriter(){return {async write(bytes){
   const b=Uint8Array.from(bytes);writes.push(b);
   if(writes.length===1)replies.push(Uint8Array.of(6));
   else if(writes.length===2)replies.push(new Uint8Array(16));
   else if(writes.length===3)replies.push(new TextEncoder().encode(identity));
   else if(writes.length===4)replies.push(Uint8Array.of(6));
   else{const address=b[1]*256+b[2],block=address/64;assert.deepEqual([...b],[0x52,b[1],b[2],64]);
    replies.push(Uint8Array.of(block===badAt?0:0x52,b[1],b[2],64,...new Array(64).fill(255)));}
  },releaseLock(){}};}},
  async close(){closed=true;locked=false;}
 };
 return {port,writes,get closed(){return closed;},get locked(){return locked;}};
}

test('UV-32 cable reads 500 validated blocks, closes port, never writes memory',async()=>{
 const f=fakePort(),report=await readUv32Serial(f.port);
 assert.equal(UV32_SERIAL_BAUD,115200);assert.equal(report.completedBlocks,500);
 assert.equal(report.memoryReads,500);assert.equal(report.memoryWrites,0);
 assert.equal(report.bytes,32000);assert.equal(report.preview.empty,1000);
 assert.equal(f.writes.length,504);assert.equal(f.writes.some(b=>b[0]===0x57),false);
 assert.equal(f.closed,true);assert.equal(f.locked,false);
});

test('UV-32 cable rejects wrong model before memory access',async()=>{
 const f=fakePort({identity:'OTHER  '});
 await assert.rejects(readUv32Serial(f.port),error=>{assert.match(error.message,/model mismatch/);assert.equal(error.uv32ReadReport.memoryReads,0);return true;});
 assert.equal(f.closed,true);
});

test('UV-32 cable rejects a malformed block and never continues reading',async()=>{
 const f=fakePort({badAt:3});
 await assert.rejects(readUv32Serial(f.port),error=>{assert.match(error.message,/header/);assert.equal(error.uv32ReadReport.completedBlocks,3);assert.equal(error.uv32ReadReport.memoryReads,4);return true;});
 assert.equal(f.writes.length,8);assert.equal(f.closed,true);
});
