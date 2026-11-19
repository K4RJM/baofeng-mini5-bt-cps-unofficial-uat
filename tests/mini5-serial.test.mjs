import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readMini5Serial,writeMini5Serial} from '../scripts/mini5-serial.mjs';
import {offlineFrames} from '../radio-encoder.mjs';
import {offset,SIZE} from '../read-test/memory.mjs';
import {fixture,options} from './fixtures.mjs';

function mockCable({model='5RMINI  +L00000',rejectBlock=0,corruptReadback=false,echo=false,splitEcho=false,badEcho=false,echoOnly=false,readReply,secondId}={}){
 const memory=new Uint8Array(SIZE).fill(255),frames=[],commands=[];
 let reads=0,opened=0,pending=[],waiting=null;
 const port={
  async open(settings){assert.equal(settings.baudRate,115200);opened++;},
  async close(){assert.equal(waiting,null);pending=[];},
  readable:{getReader(){return {async read(){if(pending.length)return {value:pending.shift()};return new Promise(resolve=>{waiting=resolve;});},
   async cancel(){waiting?.({done:true});waiting=null;},releaseLock(){}};}},
  writable:{getWriter(){return {async write(command){
   commands.push(command);
   const address=command[1]*256+command[2];
   let response;
   if(command[0]===0x45){if(echo)pending.push(command.slice());return;}
   if(command.length===16||command[0]===0x53)response=Uint8Array.of(6);
   else if(command[0]===0x46)response=new Uint8Array(16);
   else if(command[0]===0x4d)response=new TextEncoder().encode(opened>1&&secondId?secondId:model);
   else if(command[0]===0x52){
    reads++;
    response=Uint8Array.of(...command,...memory.subarray(offset(address),offset(address)+64));
    if(corruptReadback&&opened>1&&address===0)response[4]^=1;
    if(readReply)response=readReply(response,address,opened);
   }else if(command[0]===0x57){
    frames.push(command);
    if(rejectBlock===frames.length)response=Uint8Array.of(0);
    else{memory.set(command.subarray(4),offset(address));response=Uint8Array.of(6);}
   }else throw Error('Unexpected mock command');
   if(echo){
    const copy=command.slice();
    if(badEcho&&command[0]===0x57)copy[4]^=1;
    response=echoOnly?copy:Uint8Array.of(...copy,...response);
    if(!splitEcho){pending.push(response);return;}
   }
   pending.push(response.slice(0,3));
   if(response.length>3)pending.push(response.slice(3));
  },releaseLock(){}};}}
 };
 return {port,frames,commands,memory,get reads(){return reads;},get opened(){return opened;}};
}

test('MINI-5 cable writes all factory-sized frames and verifies using a fresh cable read',async()=>{
 const radio=mockCable(),data=fixture();
 const result=await writeMini5Serial(radio.port,data,options);
 assert.deepEqual(radio.frames,offlineFrames(data));
 assert.equal(radio.opened,2);
 assert.equal(radio.reads,521);
 assert.deepEqual(result.raw,radio.memory);
});

test('MINI-5 cable rejects another model before reading or writing memory',async()=>{
 const radio=mockCable({model:'UV32PRO XXXXXXX'});
 await assert.rejects(readMini5Serial(radio.port),/did not identify as 5RMINI/);
 await assert.rejects(writeMini5Serial(radio.port,fixture(),options),/did not identify as 5RMINI/);
 assert.equal(radio.reads,0);
 assert.equal(radio.frames.length,0);
});

test('MINI-5 cable stops on a rejected block and reports read-back mismatch',async()=>{
 const rejected=mockCable({rejectBlock:2});
 await assert.rejects(writeMini5Serial(rejected.port,fixture(),options),/1\/521 blocks acknowledged/);
 assert.equal(rejected.frames.length,2);
 assert.equal(rejected.reads,0);
 const mismatch=mockCable({corruptReadback:true});
 await assert.rejects(writeMini5Serial(mismatch.port,fixture(),options),/read-back differs/);
});

test('MINI-5 cable separates complete and split transmit echoes from radio replies',async()=>{
 for(const splitEcho of [false,true]){
  const radio=mockCable({echo:true,splitEcho});
  const first=await readMini5Serial(radio.port);
  assert.deepEqual(first.raw,radio.memory);
  const result=await writeMini5Serial(radio.port,fixture(),options);
  assert.equal(radio.reads,1042);
  assert.equal(radio.frames.length,521);
  assert.deepEqual(result.raw,radio.memory);
 }
});

test('a cable echo alone cannot identify the radio or acknowledge a write',async()=>{
 const silent=mockCable({echo:true,echoOnly:true});
 await assert.rejects(writeMini5Serial(silent.port,fixture(),options,{timeoutMs:25}),/radio acknowledgment after the cable echo/);
 assert.equal(silent.frames.length,0);
 const damaged=mockCable({echo:true,badEcho:true});
 await assert.rejects(writeMini5Serial(damaged.port,fixture(),options),/echo did not match.*0\/521 blocks acknowledged/);
 assert.equal(damaged.frames.length,1);
 const rejected=mockCable({echo:true,rejectBlock:2});
 await assert.rejects(writeMini5Serial(rejected.port,fixture(),options),/1\/521 blocks acknowledged/);
 assert.equal(rejected.frames.length,2);
});

test('MINI-5 resumes a three-byte read at 0x0100 without mixing sessions or replaying a write',async()=>{
 for(const echo of [false,true]){
  const radio=mockCable({echo,splitEcho:true,readReply:(reply,address,session)=>
   address===0x0100&&session===1?reply.slice(0,3):reply});
  for(let i=0;i<SIZE;i++)radio.memory[i]=(i*13+i%257)&255;
  const retries=[];
  const result=await readMini5Serial(radio.port,{timeoutMs:40,progress:(n,total,status)=>{if(status)retries.push(n);}});
  assert.deepEqual(result.raw,radio.memory);
  assert.deepEqual(retries,[4]);
  assert.equal(radio.opened,2);
  assert.equal(radio.reads,522);
  assert.equal(radio.frames.length,0);
  const addresses=radio.commands.filter(cmd=>cmd[0]===0x52).map(cmd=>cmd[1]*256+cmd[2]);
  assert.deepEqual(addresses.slice(0,7),[0,64,128,192,256,256,320]);
  assert.equal(radio.commands.filter(cmd=>cmd[0]===0x45).length,2);
 }
 const verify=mockCable({readReply:(reply,address,session)=>
  address===256&&session===2?reply.slice(0,3):reply});
 const written=await writeMini5Serial(verify.port,fixture(),options,{timeoutMs:40});
 assert.deepEqual(written.raw,verify.memory);
 assert.equal(verify.frames.length,521);
});

test('MINI-5 stops on persistent truncation, changed identity, or a mismatched block header',async()=>{
 const partial=(reply,address)=>address===256?reply.slice(0,3):reply;
 const stalled=mockCable({readReply:partial});
 await assert.rejects(readMini5Serial(stalled.port,{timeoutMs:40}),/0x0100.*3 of 68 bytes.*after 2 retries/);
 assert.equal(stalled.opened,3);assert.equal(stalled.reads,7);
 const changed=mockCable({readReply:partial,secondId:'5RMINI  +L00001'});
 await assert.rejects(readMini5Serial(changed.port,{timeoutMs:40}),/identification changed/);
 assert.equal(changed.reads,5);
 const malformed=mockCable({readReply:reply=>{reply[1]^=1;return reply;}});
 await assert.rejects(readMini5Serial(malformed.port),/Unexpected MINI-5 read response/);
 assert.equal(malformed.opened,1);assert.equal(malformed.reads,1);
});
