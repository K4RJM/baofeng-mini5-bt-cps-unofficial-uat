import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Reader} from '../read-test/reader.mjs';
import {identifyProfile,hasUv32ReadSession} from '../scripts/uat-protocols.mjs?v=20.39';
import {readUv32Channels,uv32ReadCommand,uv32Payload,uv32WireDecode,decodeUv32Channels} from '../scripts/uat-uv32-read.mjs';
import {asyncRadio} from './async-radio.mjs';
import {bytes,plain,wire,uv32Fixture} from './uv32-fixtures.mjs';
function setup(faults={}){
 const fake=asyncRadio(uv32Fixture(),{identity:'UV32PRO',bridgeSetup:true,maxWriteBytes:20,chunkSize:13,...faults}),radio=new Reader();
 radio.device=fake.device;radio.char=fake.characteristic;fake.device.gatt.connected=true;
 fake.characteristic.properties={write:true,writeWithoutResponse:true,notify:true};
 fake.characteristic.addEventListener('characteristicvaluechanged',radio.notify);
 fake.device.addEventListener('gattserverdisconnected',()=>radio.invalidate(Error('Test radio disconnected')));
 const wait=radio.wait.bind(radio);radio.wait=n=>wait(n,100);
 const pause=radio.pause.bind(radio);radio.pause=ms=>pause(ms===1020?1:ms);
 return {fake,radio,async identify(mode='with-response'){return identifyProfile(radio,'uv32',{sendMode:mode});},close(){radio.disconnect();fake.close();}};
}
test('UV-32 read allowlist covers exactly 500 aligned channel blocks and rejects other addresses',()=>{
 const requests=Array.from({length:500},(_,i)=>uv32ReadCommand(i*64));
 assert.deepEqual([...requests[0]],[82,0,0,64]);assert.deepEqual([...requests.at(-1)],[82,124,192,64]);
 for(const address of [-1,1,32,31999,32000,0x8000,0x9000,NaN,Infinity,'0'])assert.throws(()=>uv32ReadCommand(address),/Outside/);
});
test('UV-32 response validation rejects opcode, address, length and trailing/truncated variants',()=>{
 const reply=Uint8Array.of(82,0,64,64,...new Uint8Array(64));
 assert.equal(uv32Payload(reply,64).length,64);
 for(const [offset,value] of [[0,87],[1,1],[2,0],[3,128]]){const bad=reply.slice();bad[offset]=value;assert.throws(()=>uv32Payload(bad,64));}
 assert.throws(()=>uv32Payload(reply.slice(0,67),64));assert.throws(()=>uv32Payload(Uint8Array.of(...reply,6),64));
});
test('UV-32 CO7 decoder matches hardcoded public CHIRP records, including untransformed exceptions',()=>{
 assert.deepEqual(uv32WireDecode(wire),plain);
 const special=new Uint8Array(64);special.set([67,79,32,55,188,176,255,200,0,255,123,0]);
 assert.deepEqual(uv32WireDecode(special).slice(0,12),special.slice(0,12));
 assert.throws(()=>uv32WireDecode(wire.slice(1)));
});
test('Public parent-driver records decode to independent expected channel fields',()=>{
 const d=decodeUv32Channels(wire);
 assert.equal(d.channels.length,2);assert.equal(d.warnings.length,0);
 assert.deepEqual(d.channels.map(c=>[c.number,c.rx,c.tx,c.name,c.power,c.scan]),[[1,'160.65000','156.05000','VHF 1','High','Skip'],[2,'160.70000','156.10000','VHF 2','Low','Skip']]);
 const empty=decodeUv32Channels(new Uint8Array(64).fill(255));assert.equal(empty.empty,2);assert.deepEqual(empty.channels,[]);
});
test('UV-32 fields preserve unknown codes and frequency failures without modulo correction',()=>{
 const record=plain.slice();record[8]=0x55;record[9]=4;record[10]=106;record[11]=0;record[12]=254;record[13]=255;record[14]=2;record[15]=0x6d;
 // The CO7 operation is symmetric; this test isolates field decoding, with the
 // independent hardcoded wire oracle above covering the transformation itself.
 const c=decodeUv32Channels(uv32WireDecode(record)).channels[0];
 assert.equal(c.rxTone,'110.9');assert.equal(c.txTone,'D023R');assert.equal(c.power,'Medium');assert.equal(c.bandwidth,'Narrow');
 assert.equal(c.squelch,'Code 2');assert.equal(c.scan,'Add');assert.equal(c.busyLock,'On');assert.equal(c.fhss,'On');
 assert.equal(c.signal,'Unknown (254)');assert.equal(c.pttId,'Unknown (255)');
 record[0]=0xab;const bad=decodeUv32Channels(uv32WireDecode(record));assert.equal(bad.channels[0].rx,'Invalid');assert.ok(bad.warnings.length);
});
test('UV-32 channel read requires a fresh exact identity and explicit With response capability',async()=>{
 for(const [identity,mode] of [['UV32PRO',null],['OTHER  ','with-response'],['UV32PRO','auto']]){
  const h=setup({identity});try{if(mode)await h.identify(mode);await assert.rejects(readUv32Channels(h.radio),/Check UV-32/);assert.equal(h.fake.reads,0);assert.equal(h.fake.writes,0);}finally{h.close();}
 }
});
test('Complete UV-32 read captures 1000 records with exact addresses, no write/reset/exit and one-use session',async()=>{
 const h=setup();try{
  await h.identify();assert.equal(hasUv32ReadSession(h.radio),true);const n=h.fake.sent.length,progress=[];
  const r=await readUv32Channels(h.radio,{progress:(n,t)=>progress.push([n,t])});
  assert.equal(r.completed,true);assert.equal(r.bytes,32000);assert.equal(r.wireHex.length,64000);assert.equal(r.completedBlocks,500);assert.equal(r.memoryWrites,0);assert.equal(r.memoryReads,500);
  assert.deepEqual(r.preview.channels.map(c=>c.number),[1,2,1000]);assert.equal(r.preview.channels.at(-1).bank,10);assert.equal(r.preview.channels.at(-1).bankChannel,100);
  const commands=h.fake.sent.slice(n);assert.equal(commands.length,500);commands.forEach((cmd,i)=>assert.deepEqual([...cmd],[82,(i*64)>>8,(i*64)&255,64]));
  assert.deepEqual(progress.at(-1),[500,500]);assert.equal(h.fake.writes,0);assert.equal(h.radio.busy,false);
  await assert.rejects(readUv32Channels(h.radio),/Check UV-32/);assert.equal(h.fake.reads,500);
 }finally{h.close();}
});
test('A replaced connection cannot reuse a successful UV-32 handshake',async()=>{
 for(const mutate of [r=>r.generation++,r=>r.device={...r.device},r=>r.char={...r.char}]){
  const h=setup();try{await h.identify();mutate(h.radio);await assert.rejects(readUv32Channels(h.radio),/Check UV-32/);assert.equal(h.fake.reads,0);}finally{h.close();}
 }
});
test('Malformed, truncated, silent or excessive UV-32 responses stop at the first read without retry',async()=>{
 for(const fault of ['badHeader','badReadOpcode','badReadLength','truncateRead','silentRead','extraRead']){
  const h=setup();try{await h.identify();h.fake.faults[fault]=true;
   await assert.rejects(readUv32Channels(h.radio),e=>{assert.equal(e.uv32ReadReport.completed,false);assert.equal(e.uv32ReadReport.completedBlocks,0);assert.equal(e.uv32ReadReport.bytes,0);assert.equal(e.uv32ReadReport.wireHex,'');return true;});
   assert.equal(h.fake.reads,1);assert.equal(h.fake.writes,0);assert.equal(h.radio.busy,false);
  }finally{h.close();}
 }
});
test('Disconnect after a valid block preserves only validated partial capture and unlocks UI state',async()=>{
 const h=setup({disconnectRead:2});try{await h.identify();
  await assert.rejects(readUv32Channels(h.radio),e=>{assert.equal(e.uv32ReadReport.completed,false);assert.equal(e.uv32ReadReport.bytes,64);assert.equal(e.uv32ReadReport.wireHex,Buffer.from(wire).toString('hex'));return true;});
  assert.equal(h.fake.reads,2);assert.equal(h.fake.writes,0);assert.equal(h.radio.busy,false);
 }finally{h.close();}
});
test('Cancelling a UV-32 capture stops before the next block and preserves validated data',async()=>{
 const h=setup(),controller=new AbortController();try{await h.identify();
  await assert.rejects(readUv32Channels(h.radio,{signal:controller.signal,progress:()=>controller.abort()}),e=>{assert.match(e.message,/cancelled/);assert.equal(e.uv32ReadReport.bytes,64);return true;});
  assert.equal(h.fake.reads,1);assert.equal(h.radio.busy,false);assert.equal(h.fake.writes,0);
 }finally{h.close();}
});
test('A native UV-32 read stall is bounded and late completion never resumes the download',async()=>{
 const h=setup();try{
  await h.identify();let resolveSend;h.fake.characteristic.writeValueWithResponse=()=>new Promise(resolve=>{resolveSend=resolve;});
  const native=h.radio.native.bind(h.radio);h.radio.native=(stage,start,ms)=>native(stage,start,stage==='Reading UV-32 channels'?20:ms);
  await assert.rejects(readUv32Channels(h.radio),e=>{assert.match(e.message,/timed out/);assert.equal(e.uv32ReadReport.memoryReads,1);assert.equal(e.uv32ReadReport.bytes,0);return true;});
  resolveSend();await new Promise(r=>setTimeout(r,0));assert.equal(h.fake.reads,0);assert.equal(h.fake.writes,0);assert.equal(h.radio.busy,false);
 }finally{h.close();}
});
