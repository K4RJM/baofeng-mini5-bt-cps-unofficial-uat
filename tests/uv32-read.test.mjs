import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Reader} from '../read-test/reader.mjs';
import {identifyProfile,hasUv32ReadSession,uv32ReadSessionStatus} from '../scripts/uat-protocols.mjs?v=20.43';
import {readUv32Channels,captureUv32Channels,uv32ReadDiagnostics,uv32ReadCommand,uv32Payload,uv32WireDecode,decodeUv32Channels} from '../scripts/uat-uv32-read.mjs';
import {asyncRadio} from './async-radio.mjs';
import {bytes,plain,wire,uv32Fixture} from './uv32-fixtures.mjs';
function setup(faults={}){
 const fake=asyncRadio(uv32Fixture(),{identity:'UV32PRO',bridgeSetup:true,maxWriteBytes:20,chunkSize:13,...faults}),radio=new Reader();
 radio.device=fake.device;radio.char=fake.characteristic;fake.device.gatt.connected=true;
 fake.characteristic.properties={write:true,writeWithoutResponse:true,notify:true};
 fake.characteristic.addEventListener('characteristicvaluechanged',radio.notify);
 fake.device.addEventListener('gattserverdisconnected',()=>radio.invalidate(Error('Test radio disconnected')));
 const wait=radio.wait.bind(radio);radio.wait=n=>wait(n,100);
 const pause=radio.pause.bind(radio);radio.pause=ms=>pause(ms===1020||ms===20?1:ms);
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
  const h=setup({identity});try{if(mode)await h.identify(mode);await assert.rejects(readUv32Channels(h.radio),/UV-32 read blocked/);assert.equal(h.fake.reads,0);assert.equal(h.fake.writes,0);}finally{h.close();}
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
  await assert.rejects(readUv32Channels(h.radio),/UV-32 read blocked/);assert.equal(h.fake.reads,500);
 }finally{h.close();}
});
test('A replaced connection cannot reuse a successful UV-32 handshake',async()=>{
 for(const mutate of [r=>r.generation++,r=>r.device={...r.device},r=>r.char={...r.char}]){
  const h=setup();try{await h.identify();mutate(h.radio);await assert.rejects(readUv32Channels(h.radio),/UV-32 read blocked/);assert.equal(h.fake.reads,0);}finally{h.close();}
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

test('UV-32 diagnostic snapshots identify every read guard without consuming the session or clearing data',async()=>{
 const h=setup();try{
  const absent=uv32ReadDiagnostics(h.radio);assert.equal(absent.sessionAtStart.checks.sessionPresent,false);
  await h.identify();const baseline=h.fake.sent.length;
  for(const [key,mutate,restore] of [
   ['connected',()=>h.fake.device.gatt.connected=false,()=>h.fake.device.gatt.connected=true],
   ['idle',()=>h.radio.busy=true,()=>h.radio.busy=false],
   ['notConnecting',()=>h.radio.connecting=true,()=>h.radio.connecting=false],
   ['sameDevice',()=>h.radio.device={...h.fake.device},()=>h.radio.device=h.fake.device],
   ['sameCharacteristic',()=>h.radio.char={...h.fake.characteristic},()=>h.radio.char=h.fake.characteristic],
   ['sameGeneration',()=>h.radio.generation++,()=>h.radio.generation--],
   ['emptyReceiveBuffer',()=>h.radio.rx.push(6),()=>h.radio.rx.splice(0)]
  ]){
   mutate();const status=uv32ReadSessionStatus(h.radio);
   assert.deepEqual(status.failedChecks,[key]);assert.equal(status.ready,false);assert.equal(hasUv32ReadSession(h.radio),false);
   assert.deepEqual(uv32ReadDiagnostics(h.radio).sessionAtStart.failedChecks,[key]);restore();
   assert.equal(hasUv32ReadSession(h.radio),true,'Diagnostics never consume or authorize a session');
  }
  assert.equal(h.fake.sent.length,baseline);assert.equal(h.fake.reads,0);assert.equal(h.fake.writes,0);
 }finally{h.close();}
});
test('Pre-read failures retain a zero-command report and never unlock a busy operation owned elsewhere',async()=>{
 for(const [key,mutate] of [
  ['sessionPresent',()=>{}],['idle',r=>r.busy=true],['notConnecting',r=>r.connecting=true],
  ['sameGeneration',r=>r.generation++],['sameDevice',r=>r.device={...r.device}],
  ['sameCharacteristic',r=>r.char={...r.char}],['connected',r=>r.device.gatt.connected=false]
 ]){
  const h=setup();try{
   if(key!=='sessionPresent')await h.identify();mutate(h.radio);const n=h.fake.sent.length;
   await assert.rejects(readUv32Channels(h.radio),error=>{
    const r=error.uv32ReadReport;assert.equal(r.stage,'before-read');assert.equal(r.completed,false);
    assert.equal(r.memoryReads,0);assert.equal(r.memoryWrites,0);assert.equal(r.bytes,0);assert.equal(r.wireHex,'');
    assert.ok(r.sessionAtStart.failedChecks.includes(key));assert.equal(r.lastRequestHex,undefined);return true;
   });
   assert.equal(h.radio.busy,key==='idle');assert.equal(h.fake.sent.length,n);assert.equal(h.fake.reads,0);
  }finally{h.radio.busy=false;h.radio.connecting=false;h.close();}
 }
});
test('A late response after an eligible handshake is retained and blocks reading without discard or retry',async()=>{
 const h=setup();try{
  await h.identify();assert.equal(hasUv32ReadSession(h.radio),true);const n=h.fake.sent.length;
  h.radio.receive(new DataView(Uint8Array.of(6,21).buffer));
  await assert.rejects(readUv32Channels(h.radio),error=>{
   assert.match(error.message,/Unexpected radio response bytes arrived/);
   assert.deepEqual(error.uv32ReadReport.sessionAtStart.failedChecks,['emptyReceiveBuffer']);
   assert.equal(error.uv32ReadReport.sessionAtStart.pendingHex,'0615');
   assert.equal(error.uv32ReadReport.pendingHex,'0615');assert.equal(error.uv32ReadReport.memoryReads,0);return true;
  });
  assert.deepEqual(h.radio.rx,[6,21]);assert.equal(h.fake.sent.length,n);assert.equal(h.fake.reads,0);assert.equal(h.fake.writes,0);
  assert.equal(hasUv32ReadSession(h.radio),false,'A rejected attempt cannot be reused');
  h.radio.rx.push(...new Array(300).fill(170));const snapshot=uv32ReadDiagnostics(h.radio);
  assert.equal(snapshot.sessionAtStart.pendingBytes,302);assert.equal(snapshot.sessionAtStart.pendingHex.length,512);
  assert.equal(snapshot.sessionAtStart.pendingTruncated,true);assert.equal(h.radio.rx.length,302);
  assert.doesNotThrow(()=>JSON.stringify(snapshot));
 }finally{h.close();}
});

async function connectSimulated(h){
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'navigator');
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{bluetooth:h.fake.bluetooth}});
 try{await h.radio.connect();}finally{if(descriptor)Object.defineProperty(globalThis,'navigator',descriptor);else delete globalThis.navigator;}
}
test('One UV-32 read action connects, identifies and reads before the simulated session idle response',async()=>{
 const h=setup({sessionIdleMs:50});try{
  const stages=[],r=await captureUv32Channels(h.radio,{connect:()=>connectSimulated(h),stage:s=>stages.push(s)});
  assert.equal(r.completed,true);assert.equal(r.memoryReads,500);assert.equal(r.memoryWrites,0);
  assert.equal(h.fake.sent.length,504);assert.deepEqual(h.fake.sent.slice(0,4).map(b=>b[0]),[80,70,77,83]);
  assert.equal(h.fake.sent[4][0],82);assert.equal(h.fake.events.includes('session-idle'),false);
  assert.deepEqual(stages,['Connecting for UV-32 channel read…','Identifying UV-32 for channel read…','Reading UV-32 channels…']);
  assert.ok(Number.isFinite(r.firstReadAfterHandshakeMs)&&r.firstReadAfterHandshakeMs>=0);
  assert.equal(h.radio.busy,false);
 }finally{h.close();}
});
test('An expired separate handshake is retained in diagnostics and replaced by one fresh read connection',async()=>{
 const h=setup({sessionIdleMs:20});try{
  await h.identify();await new Promise(r=>setTimeout(r,40));assert.deepEqual(h.radio.rx,[0]);
  const old=h.radio.generation,sent=h.fake.sent.length;
  const r=await captureUv32Channels(h.radio,{connect:()=>connectSimulated(h)});
  assert.equal(r.sessionBeforeConnect.pendingHex,'00');assert.equal(r.sessionBeforeConnect.checks.sessionPresent,true);
  assert.equal(r.connectionRestarted,true);assert.ok(h.radio.generation>old);
  assert.equal(r.sessionAtStart.ready,true);assert.equal(r.sessionAtStart.pendingHex,'');
  assert.equal(r.completed,true);assert.equal(h.fake.sent.length-sent,504);assert.equal(h.fake.writes,0);
 }finally{h.close();}
});
test('Model query 00 is retained with its failed handshake and no memory read or automatic retry',async()=>{
 const h=setup({modelReply:[0]});try{
  await assert.rejects(captureUv32Channels(h.radio,{connect:()=>connectSimulated(h)}),error=>{
   const r=error.uv32ReadReport;assert.equal(r.stage,'identifying');assert.equal(r.memoryReads,0);assert.equal(r.memoryWrites,0);
   assert.equal(r.handshake.stage,'Model query (M)');assert.equal(r.handshake.receivedPendingHex,'00');assert.equal(r.pendingHex,'00');
   assert.match(error.message,/expected 7 response bytes, received 1/);return true;
  });
  assert.equal(h.fake.sent.length,3);assert.equal(h.fake.reads,0);assert.equal(h.fake.writes,0);
 }finally{h.close();}
});
test('The combined UV-32 action still rejects an unexpected model and preserves its identification report',async()=>{
 const h=setup({identity:'OTHER  '});try{
  await assert.rejects(captureUv32Channels(h.radio,{connect:()=>connectSimulated(h)}),error=>{
   assert.equal(error.uv32ReadReport.handshake.model,'OTHER');assert.equal(error.uv32ReadReport.memoryReads,0);
   assert.equal(error.uv32ReadReport.sessionAtStart.checks.sessionPresent,false);return true;
  });
  assert.equal(h.fake.sent.length,4);assert.equal(h.fake.reads,0);assert.equal(h.fake.writes,0);
 }finally{h.close();}
});
test('Busy or already-cancelled combined reads send nothing and do not disconnect another operation',async()=>{
 for(const busy of [true,false]){
  const h=setup(),controller=new AbortController();try{
   h.radio.busy=busy;if(!busy)controller.abort();const events=h.fake.events.length;
   await assert.rejects(captureUv32Channels(h.radio,{connect:()=>connectSimulated(h),signal:controller.signal}));
   assert.equal(h.fake.events.length,events);assert.equal(h.radio.busy,busy);assert.equal(h.radio.connected,true);
   assert.equal(h.fake.sent.length,0);assert.equal(h.fake.reads,0);assert.equal(h.fake.writes,0);
  }finally{h.radio.busy=false;h.close();}
 }
});
test('Cancellation after UV-32 identification prevents the first memory request',async()=>{
 const h=setup(),controller=new AbortController();try{
  await assert.rejects(captureUv32Channels(h.radio,{connect:()=>connectSimulated(h),signal:controller.signal,
   stage:s=>{if(s==='Reading UV-32 channels…')controller.abort();}
  }),error=>{assert.match(error.message,/cancelled/);assert.equal(error.uv32ReadReport.handshake.model,'UV32PRO');assert.equal(error.uv32ReadReport.memoryReads,0);return true;});
  assert.equal(h.fake.sent.length,4);assert.equal(h.fake.reads,0);assert.equal(h.fake.writes,0);assert.equal(h.radio.busy,false);
 }finally{h.close();}
});

test('Paced UV-32 reads yield between blocks, retain a bounded trace and restore the original receiver',async()=>{
 const h=setup();try{
  await h.identify();const original=h.radio.receive,own=Object.hasOwn(h.radio,'receive'),delays=[],pause=h.radio.pause.bind(h.radio);
  h.radio.pause=ms=>{delays.push(ms);return pause(ms);};
  const r=await readUv32Channels(h.radio);
  assert.equal(r.completed,true);assert.equal(r.sendMethod,'writeValueWithResponse');assert.equal(r.requestedReadSendMode,'with-response');assert.equal(h.fake.events.filter(x=>x==='send-without-response').length,0);assert.equal(r.interBlockDelayMs,20);assert.equal(delays.length,499);assert.ok(delays.every(ms=>ms===20));
  assert.equal(r.packetTrace.requestCount,500);assert.equal(r.packetTrace.requests.length,12);assert.equal(r.packetTrace.droppedRequests,488);
  assert.equal(r.packetTrace.notificationCount,3000);assert.equal(r.packetTrace.notifications.length,80);assert.equal(r.packetTrace.droppedNotifications,2920);
  assert.equal(r.packetTrace.requests.at(-1).address,31936);assert.equal(r.packetTrace.requests.at(-1).validated,true);
  assert.equal(r.packetTrace.notifications.at(-1).activeRequest,500);assert.ok(r.packetTrace.notifications.every(n=>n.bytes<=13&&n.hex.length===n.bytes*2));
  assert.equal(h.radio.receive,original);assert.equal(Object.hasOwn(h.radio,'receive'),own);
 }finally{h.close();}
});
test('The physical malformed 52470680 header remains rejected and its received bytes are traced',async()=>{
 const h=setup();try{
  await h.identify();const original=h.radio.receive;let attempts=0;
  const response=bytes('52470680'+'ff'.repeat(128));
  h.fake.characteristic.writeValueWithResponse=()=>{attempts++;h.radio.receive(new DataView(response.buffer));return Promise.resolve();};
  await assert.rejects(readUv32Channels(h.radio),error=>{
   const r=error.uv32ReadReport;assert.equal(r.memoryReads,1);assert.equal(r.bytes,0);assert.equal(r.wireHex,'');
   assert.equal(r.packetTrace.requests[0].responseHeaderHex,'52470680');assert.equal(r.packetTrace.requests[0].validated,undefined);
   assert.equal(r.packetTrace.notifications[0].hex,Buffer.from(response).toString('hex'));assert.equal(r.pendingHex,'ff'.repeat(64));
   assert.equal(r.readPhase,'validating');return true;
  });
  assert.equal(attempts,1);assert.equal(h.radio.receive,original);assert.equal(h.fake.writes,0);
 }finally{h.close();}
});
test('A later read timeout cannot mislabel the preceding valid response as the failing block response',async()=>{
 const h=setup();try{
  await h.identify();const original=h.radio.receive;
  await assert.rejects(readUv32Channels(h.radio,{progress:n=>{if(n===1)h.fake.characteristic.writeValueWithResponse=()=>{h.radio.receive(new DataView(Uint8Array.of(0).buffer));return Promise.resolve();};}}),error=>{
   const r=error.uv32ReadReport;assert.equal(r.completedBlocks,1);assert.equal(r.memoryReads,2);assert.equal(r.lastRequestHex,'52004040');
   assert.equal(r.lastResponseHex,null);assert.equal(r.lastResponseAddress,null);assert.equal(r.pendingHex,'00');
   assert.equal(r.packetTrace.requests[0].responseHeaderHex,'52000040');assert.equal(r.packetTrace.requests[0].validated,true);
   assert.equal(r.packetTrace.requests[1].responseHeaderHex,undefined);assert.match(r.packetTrace.requests[1].error,/expected 68 response bytes, received 1/);
   assert.equal(r.packetTrace.notifications.at(-1).hex,'00');assert.equal(r.readPhase,'waiting');return true;
  });
  assert.equal(h.radio.receive,original);assert.equal(h.fake.reads,1);assert.equal(h.fake.writes,0);
 }finally{h.close();}
});
test('Disconnect during the inter-block pause stops before another request and restores the receiver',async()=>{
 const h=setup();try{
  await h.identify();const original=h.radio.receive,pause=h.radio.pause.bind(h.radio);
  h.radio.pause=ms=>{if(ms===20){h.radio.disconnect();return Promise.resolve();}return pause(ms);};
  await assert.rejects(readUv32Channels(h.radio),error=>{const r=error.uv32ReadReport;assert.equal(r.bytes,64);assert.equal(r.memoryReads,1);assert.equal(r.readPhase,'between-blocks');assert.equal(r.packetTrace.requests[0].validated,true);return true;});
  assert.equal(h.fake.reads,1);assert.equal(h.radio.receive,original);assert.equal(h.radio.busy,false);assert.equal(h.fake.writes,0);
 }finally{h.close();}
});

test('Without-response channel requests keep the verified with-response handshake and exact read frames',async()=>{
 const h=setup();try{
  const r=await captureUv32Channels(h.radio,{connect:()=>connectSimulated(h),readSendMode:'without-response'});
  assert.equal(r.completed,true);assert.equal(r.memoryReads,500);assert.equal(r.memoryWrites,0);assert.equal(r.bytes,32000);
  assert.equal(r.requestedReadSendMode,'without-response');assert.equal(r.sendMethod,'writeValueWithoutResponse');
  assert.equal(r.handshake.transport.sendMethod,'writeValueWithResponse');assert.equal(r.handshake.completed,true);
  assert.equal(h.fake.events.filter(x=>x==='send-with-response').length,5,'Four handshake commands, with SEND split into two portions');
  assert.equal(h.fake.events.filter(x=>x==='send-without-response').length,500);
  assert.equal(h.fake.sent.length,504);assert.equal(h.fake.writes,0);
  h.fake.sent.slice(4).forEach((command,i)=>assert.deepEqual([...command],[82,(i*64)>>8,(i*64)&255,64]));
  assert.equal(r.wireHex,Buffer.from(h.fake.raw.slice(0,32000)).toString('hex'));
  assert.ok(r.packetTrace.requests.every(x=>x.sendMethod==='writeValueWithoutResponse'&&x.validated));
  await assert.rejects(readUv32Channels(h.radio,{readSendMode:'without-response'}),/UV-32 read blocked/);
  assert.equal(h.fake.reads,500,'No reused capability');
 }finally{h.close();}
});
test('Invalid or unsupported read send modes stop without automatic selection or fallback',async()=>{
 for(const mode of ['auto','invalid','writeValue',null]){
  const h=setup();try{
   await assert.rejects(captureUv32Channels(h.radio,{connect:()=>{throw Error('Must not connect');},readSendMode:mode}),/Choose With response/);
   assert.equal(h.fake.sent.length,0);assert.equal(h.fake.reads,0);assert.equal(h.fake.writes,0);
  }finally{h.close();}
 }
 for(const missing of ['property','method']){
  const h=setup();try{
   if(missing==='property')h.fake.characteristic.properties.writeWithoutResponse=false;
   else h.fake.characteristic.writeValueWithoutResponse=undefined;
   await assert.rejects(captureUv32Channels(h.radio,{connect:()=>connectSimulated(h),readSendMode:'without-response'}),e=>{
    assert.match(e.message,/not supported|unavailable/);assert.equal(e.uv32ReadReport.memoryReads,0);
    assert.equal(e.uv32ReadReport.requestedReadSendMode,'without-response');return true;
   });
   assert.equal(h.fake.sent.length,0);assert.equal(h.fake.writes,0);
  }finally{h.close();}
 }
});
test('Native without-response failure or stall never falls back or retries a read',async()=>{
 for(const stall of [false,true]){
  const h=setup();try{
   await h.identify();const before=h.fake.sent.length;let attempts=0,finish=()=>{};
   h.fake.characteristic.writeValueWithoutResponse=()=>{attempts++;return stall?new Promise(resolve=>{finish=resolve;}):Promise.reject(Error('Test send failed'));};
   const native=h.radio.native.bind(h.radio);h.radio.native=(stage,start,ms)=>native(stage,start,stage==='Reading UV-32 channels'?20:ms);
   await assert.rejects(readUv32Channels(h.radio,{readSendMode:'without-response'}),e=>{
    assert.match(e.message,/Test send failed|timed out/);assert.equal(e.uv32ReadReport.memoryReads,1);
    assert.equal(e.uv32ReadReport.sendMethod,'writeValueWithoutResponse');assert.equal(e.uv32ReadReport.bytes,0);return true;
   });
   finish();await new Promise(resolve=>setTimeout(resolve,0));
   assert.equal(attempts,1);assert.equal(h.fake.sent.length,before);assert.equal(h.fake.reads,0);assert.equal(h.fake.writes,0);assert.equal(h.radio.busy,false);
  }finally{h.close();}
 }
});
test('Without-response reads still reject malformed, incomplete, excess and physically short replies',async()=>{
 for(const fault of ['badHeader','badReadOpcode','badReadLength','truncateRead','silentRead','extraRead','physicalShort']){
  const h=setup();try{
   await h.identify();let physicalAttempts=0;
   if(fault==='physicalShort')h.fake.characteristic.writeValueWithoutResponse=()=>{
    physicalAttempts++;const response=Uint8Array.of(82,0,0,48,...wire.slice(0,48),0);
    h.radio.receive(new DataView(response.buffer));return Promise.resolve();
   };else h.fake.faults[fault]=true;
   await assert.rejects(readUv32Channels(h.radio,{readSendMode:'without-response'}),e=>{
    const r=e.uv32ReadReport;assert.equal(r.completed,false);assert.equal(r.completedBlocks,0);assert.equal(r.bytes,0);assert.equal(r.wireHex,'');assert.equal(r.memoryReads,1);
    if(fault==='physicalShort'){assert.match(e.message,/expected 68 response bytes, received 53/);assert.ok(r.pendingHex.startsWith('52000030'));}return true;
   });
   assert.equal(fault==='physicalShort'?physicalAttempts:h.fake.reads,1);assert.equal(h.fake.writes,0);assert.equal(h.radio.busy,false);
  }finally{h.close();}
 }
});
test('Cancellation or disconnect stops without-response reading and preserves only completed blocks',async()=>{
 for(const disconnect of [false,true]){
  const h=setup(),controller=new AbortController();try{
   await h.identify();const original=h.radio.receive;
   await assert.rejects(readUv32Channels(h.radio,{readSendMode:'without-response',signal:controller.signal,progress:()=>{if(disconnect)h.radio.disconnect();else controller.abort();}}),e=>{
    assert.equal(e.uv32ReadReport.completedBlocks,1);assert.equal(e.uv32ReadReport.bytes,64);assert.equal(e.uv32ReadReport.sendMethod,'writeValueWithoutResponse');return true;
   });
   assert.equal(h.fake.reads,1);assert.equal(h.fake.writes,0);assert.equal(h.radio.receive,original);assert.equal(h.radio.busy,false);
  }finally{h.close();}
 }
});
