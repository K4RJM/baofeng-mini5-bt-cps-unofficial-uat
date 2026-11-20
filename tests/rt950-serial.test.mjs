import test from 'node:test';
import assert from 'node:assert/strict';
import {simulatedRt950Port} from './rt950-port.fixture.mjs';
import {withRt950Serial} from '../scripts/rt950-serial.mjs';
import {readImage,writeBlocks} from '../scripts/rt950-core.mjs';

const opts={rand:()=>0,allowedModels:['RT-950']};
const read=port=>withRt950Serial(port,link=>readImage(link,opts));
const write=(port,blocks,counts=[])=>withRt950Serial(port,link=>writeBlocks(link,opts,blocks,(n,total)=>counts.push([n,total])));
const data=new Uint8Array(128).fill(0xab);
test('cable reads the complete RT-950 workspace from fragmented serial responses',async()=>{
 const port=simulatedRt950Port(),image=await read(port);
 assert.deepEqual(port.parameters,{baudRate:115200,dataBits:8,parity:'none',stopBits:1,flowControl:'none'});
 assert.deepEqual(port.signals,{dataTerminalReady:false,requestToSend:false});
 assert.deepEqual(Array.from(image.ch.slice(0,8)),[0,255,66,32,88,16,2,4]);
 assert.equal(image.model,'RT-950');
 for(const [key,length] of Object.entries({ch:32768,zn:256,vfo:128,settings:128,dtmf:384,receiver:256,names:768,aprs:128}))assert.equal(image[key].length,length);
 const queries=port.frames.filter(f=>f.length===4);
 assert.equal(queries.length,272);assert.deepEqual(queries.filter(f=>f[0]===84),[[84,0,0,128]]);
 assert.equal(port.frames.some(f=>f.length===132),false);assert.deepEqual(port.frames.at(-1),[69]);assert.equal(port.closed,1);
});
test('cable writes a workspace directly, acknowledges each block and uses the APRS opcode',async()=>{
 const port=simulatedRt950Port(),counts=[];
 await write(port,[{addr:0,data},{addr:0,write:88,data}],counts);
 assert.deepEqual(counts,[[1,2],[2,2]]);
 const commands=port.frames.slice(4,-1);
 assert.equal(commands.length,2);assert.deepEqual(commands.map(f=>f.slice(0,4)),[[87,0,0,128],[88,0,0,128]]);
 assert.deepEqual(commands[0].slice(4,8),[0xe9,0xe3,0xab,0xab]);
 assert.equal(port.closed,1);
 const restored=await read(port);assert.deepEqual(restored.ch.slice(0,128),data);assert.deepEqual(restored.aprs,data);
});
test('native DAT preserves the reserved tail of a shared radio block over cable',async()=>{
 const port=simulatedRt950Port();
 await write(port,[{addr:0x7b80,preserveFrom:64,data}]);
 assert.deepEqual(port.frames[4],[82,123,128,128]);
 assert(port.frames[5].slice(68).every(b=>b===255));assert.equal(port.closed,1);
});
test('wrong model cannot reach a cable memory write',async()=>{
 const port=simulatedRt950Port({model:'OTHER'});
 await assert.rejects(write(port,[{addr:0,data}]),/model.*OTHER/);
 assert.equal(port.frames.some(f=>f.length===132),false);
 assert.deepEqual(port.frames.at(-1),[69]);assert.equal(port.closed,1);
});
test('cable rejects a negative ACK even if followed by 06, stops writing, and releases the port',async()=>{
 for(const reply of [[21],[21,6]]){
  const port=simulatedRt950Port({writeReply:reply}),counts=[];
  await assert.rejects(write(port,[{addr:0,data},{addr:128,data}],counts),/ACK|extra bytes/);
  assert.deepEqual(counts,[]);assert.equal(port.frames.filter(f=>f.length===132).length,1);assert.equal(port.closed,1);
 }
});
test('unplugged cable and bad read address produce no partial image',async()=>{
 for(const options of [{unplug:true},{badAddress:true}]){
  const port=simulatedRt950Port(options);
  await assert.rejects(read(port),/disconnected|header/);assert.equal(port.closed,1);
 }
});
test('timeout on a partial response releases the reader and port',async()=>{
 const port=simulatedRt950Port();
 await assert.rejects(withRt950Serial(port,async link=>{
  await link.write(new TextEncoder().encode('PROGRAMBT9000U'));
  await link.readExactly(2,40);
 }),/1 of 2/);
 assert.equal(port.closed,1);
});
