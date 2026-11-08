import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Reader} from '../read-test/reader.mjs';
import {asyncRadio} from './async-radio.mjs';
import {identifyProfile,bridgeResponseVariant} from '../scripts/uat-protocols.mjs';
const bytes=h=>Uint8Array.from(Buffer.from(h,'hex'));
const INIT=bytes('53454e4421050d010101041108050d0d01110f091209100400');
function setup(faults={}){
 const fake=asyncRadio(new Uint8Array(33344),{identity:'UV32PRO',bridgeSetup:true,maxWriteBytes:20,...faults}),radio=new Reader();
 radio.device=fake.device;radio.char=fake.characteristic;fake.device.gatt.connected=true;
 fake.characteristic.addEventListener('characteristicvaluechanged',radio.notify);
 fake.characteristic.properties={write:true,writeWithoutResponse:true,notify:true};
 const wait=radio.wait.bind(radio),pause=radio.pause.bind(radio);
 radio.wait=n=>wait(n,80);radio.pause=ms=>pause(ms===1020?1:ms);
 return {fake,radio,close(){radio.disconnect();fake.close();}};
}
test('UV-32 physical capture confirms the bridge calculation independently of the GM-30 oracle',()=>{
 const request=bytes('3f3f3f3f023525591e01540c0f1541381d1f0c11');
 const reply=bytes('21212121210108190125330000080309203f183a');
 assert.equal(bridgeResponseVariant(request,reply),1);
 assert.equal(Buffer.from('5556333250524f','hex').toString(),'UV32PRO');
});
test('Existing unchunked transport reproduces the 25-byte SEND failure on a 20-byte peripheral',async()=>{
 const h=setup();try{await assert.rejects(h.radio.send(INIT),/GATT operation failed/);assert.deepEqual(h.fake.packets.map(b=>b.length),[25]);assert.equal(h.fake.sent.length,0);}finally{h.close();}
});
test('UV-32 sends exact initialization bytes sequentially as 20 + 5 with one final ACK in every send mode',async()=>{
 for(const sendMode of ['auto','with-response','without-response']){
  const h=setup();try{
   const r=await identifyProfile(h.radio,'uv32',{sendMode});
   assert.equal(r.completed,true);assert.equal(r.model,'UV32PRO');
   assert.deepEqual(h.fake.packets.map(b=>b.length),[16,1,1,20,5]);
   assert.deepEqual(Uint8Array.of(...h.fake.packets[3],...h.fake.packets[4]),INIT);
   assert.equal(h.fake.sent.length,4);assert.equal(h.fake.reads+h.fake.writes,0);
   assert.equal(r.exchanges.length,4);const end=r.exchanges[3];
   assert.equal(end.responseHex,'06');assert.deepEqual(end.chunks.map(p=>[p.offset,p.bytes]),[[0,20],[20,5]]);
   assert.ok(end.chunks.every(p=>Number.isFinite(p.completedAtMs)));
   assert.ok(end.chunks[1].sentAtMs>=end.chunks[0].completedAtMs);
   assert.equal(h.fake.events.filter(e=>e==='send-'+(sendMode==='with-response'?'with-response':'without-response')).length,5);
  }finally{h.close();}
 }
});
test('MINI-5 identification retains its original single 25-byte initialization send',async()=>{
 const h=setup({identity:'5RMINI  +L00000',maxWriteBytes:0});try{
  const r=await identifyProfile(h.radio,'mini5');
  assert.deepEqual(h.fake.packets.map(b=>b.length),[16,1,1,25]);
  assert.equal(r.transport.bridge,undefined);assert.equal(r.exchanges[3].chunks,undefined);
  assert.equal(h.fake.events.includes('bridge-setup'),false);
 }finally{h.close();}
});
test('Failure of either initialization chunk stops without replaying or sending later chunks',async()=>{
 for(const failNativeSend of [4,5]){
  const h=setup({failNativeSend});try{
   await assert.rejects(identifyProfile(h.radio,'uv32'),e=>{
    assert.equal(e.handshakeReport.stage,'Final initialization (SEND)');
    const end=e.handshakeReport.exchanges[3];
    assert.equal(end.responseHex,undefined);assert.equal(end.chunks.length,failNativeSend-3);
    assert.match(end.chunks.at(-1).error,/native send failure/);return true;
   });
   assert.equal(h.fake.packets.length,failNativeSend);assert.equal(h.fake.sent.length,3);
   assert.equal(h.fake.reads+h.fake.writes,0);assert.equal(h.radio.busy,false);
  }finally{h.close();}
 }
});
test('A stalled initialization chunk remains bounded and late completion cannot continue it',async()=>{
 for(const stopAt of [4,5]){
  const h=setup();let release;try{
   let calls=0;const original=h.fake.characteristic.writeValueWithoutResponse;
   h.fake.characteristic.writeValueWithoutResponse=b=>++calls===stopAt?new Promise(resolve=>{release=resolve;}):original(b);
   const native=h.radio.native.bind(h.radio);h.radio.native=(stage,start,ms)=>native(stage,start,stage==='Sending Bluetooth identification'?25:ms);
   await assert.rejects(identifyProfile(h.radio,'uv32'),/timed out|Timeout/);
   release();await new Promise(r=>setTimeout(r,0));
   assert.equal(calls,stopAt);assert.equal(h.fake.sent.length,3);assert.equal(h.radio.busy,false);
  }finally{h.close();}
 }
});
test('A changed connection or early response after the first chunk prevents the second chunk',async()=>{
 for(const mutate of [r=>r.generation++,r=>r.rx.push(6)]){
  const h=setup();try{
   const original=h.fake.characteristic.writeValueWithoutResponse;
   h.fake.characteristic.writeValueWithoutResponse=async b=>{await original(b);if(b.length===20&&b[0]===83)mutate(h.radio);};
   await assert.rejects(identifyProfile(h.radio,'uv32'),/connection changed|before initialization/);
   assert.equal(h.fake.packets.length,4);assert.equal(h.fake.sent.length,3);assert.equal(h.radio.busy,false);
  }finally{h.close();}
 }
});
test('NACK and missing CPS ACK after both chunks remain failures with no retry',async()=>{
 for(const faults of [{initReply:21},{silentInit:true}]){
  const h=setup(faults);try{
   await assert.rejects(identifyProfile(h.radio,'uv32'),e=>{
    assert.match(e.message,/not acknowledged|Timeout/);
    assert.equal(e.handshakeReport.completed,false);assert.equal(e.handshakeReport.exchanges[3].chunks.length,2);return true;
   });
   assert.equal(h.fake.packets.length,5);assert.equal(h.fake.sent.length,4);assert.equal(h.fake.reads+h.fake.writes,0);
  }finally{h.close();}
 }
});
