import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Reader} from '../read-test/reader.mjs';
import {asyncRadio} from './async-radio.mjs';
import {bridgeChallenge,bridgeResponseVariant,identifyProfile} from '../scripts/uat-protocols.mjs';
const bytes=hex=>Uint8Array.from(Buffer.from(hex,'hex'));
// Independent private-capture oracle: GM-30 Pro, November 1, 2026.
const capturedRequest=bytes('3f3f3f3f021e2e590c401b30115661310f2c5206');
const capturedReply=bytes('2121212121044e2b0d09070c0c2e1e45123e0015');
function setup(faults={}){
 const fake=asyncRadio(new Uint8Array(33344),{bridgeSetup:true,identity:'UV32PRO',chunkSize:3,...faults}),radio=new Reader();
 radio.device=fake.device;radio.char=fake.characteristic;fake.device.gatt.connected=true;
 fake.characteristic.addEventListener('characteristicvaluechanged',radio.notify);
 const wait=radio.wait.bind(radio),pause=radio.pause.bind(radio);radio.wait=n=>wait(n,80);radio.pause=ms=>pause(ms===1020?1:ms);
 return {fake,radio,close(){radio.disconnect();fake.close();}};
}
test('FF31 verification matches the independent physical GM-30 Pro capture exactly',()=>{
 assert.equal(bridgeResponseVariant(capturedRequest,capturedReply),1);
 const changed=capturedRequest.slice();changed[8]^=1;assert.equal(bridgeResponseVariant(changed,capturedReply),null);
});
test('Second documented verification variant has a distinct independently calculated oracle',()=>{
 assert.equal(bridgeResponseVariant(capturedRequest,bytes('212121212107463c18400336112e02150b020220')),2);
});
test('Bridge generation uses only the documented 115200 setup prefix and nonce range',()=>{
 for(let i=0;i<32;i++){const b=bridgeChallenge();assert.equal(b.length,20);assert.deepEqual([...b.slice(0,5)],[63,63,63,63,2]);assert.ok(b.slice(5).every(n=>n>=0&&n<99));}
});
test('Malformed requests and incomplete, extra, stale or damaged replies are not accepted',()=>{
 for(const c of [new Uint8Array(0),new Uint8Array(20),Uint8Array.of(...capturedRequest.slice(0,19),255)])assert.throws(()=>bridgeResponseVariant(c,capturedReply));
 for(const r of [capturedReply.slice(0,19),Uint8Array.of(...capturedReply,0),new Uint8Array(20),Uint8Array.of(0,...capturedReply.slice(1))])assert.equal(bridgeResponseVariant(capturedRequest,r),null);
});
test('The UV-32 UAT profile prepares FF31 once before the existing four identification commands',async()=>{
 for(const [key,identity] of [['uv32','UV32PRO']]){const h=setup({identity});try{
  const r=await identifyProfile(h.radio,key);assert.equal(r.transport.bridge.verified,true);assert.equal(r.transport.bridge.variant,1);assert.equal(r.transport.bridge.sendMethod,'writeValueWithResponse');
  assert.equal(h.fake.events.filter(x=>x==='bridge-setup').length,1);assert.ok(h.fake.events.indexOf('bridge-setup')<h.fake.events.indexOf('native-send'));assert.equal(h.fake.sent.length,4);assert.equal(h.fake.reads+h.fake.writes,0);
 }finally{h.close();}}
});
test('MINI-5 does not send the new Bluetooth setup request',async()=>{
 const h=setup({identity:'5RMINI  +L00000'});try{const r=await identifyProfile(h.radio,'mini5');assert.equal(r.transport.bridge,undefined);assert.ok(!h.fake.events.includes('bridge-setup'));assert.equal(h.fake.sent.length,4);}finally{h.close();}
});
test('Missing, nonwritable or foreign-service FF31 stops without any command',async()=>{
 for(const mode of ['missing','nonwritable','foreign']){const h=setup();try{
  const c=h.fake.characteristic,chars=await c.service.getCharacteristics();
  if(mode==='missing')h.fake.faults.bridgeSetup=false;
  else{if(mode==='nonwritable')chars[1].properties={writeWithoutResponse:true};else chars[1].service={};c.service.getCharacteristics=async()=>chars;}
  await assert.rejects(identifyProfile(h.radio,'uv32'),/FF31 Bluetooth setup is unavailable/);assert.equal(h.fake.sent.length,0);assert.ok(!h.fake.events.includes('bridge-setup'));assert.equal(h.radio.busy,false);
 }finally{h.close();}}
});
test('Silent or invalid bridge replies stop before MAGIC and are never retried',async()=>{
 for(const fault of ['silentBridge','badBridge']){const h=setup({[fault]:true});try{
  await assert.rejects(identifyProfile(h.radio,'uv32'),e=>{assert.match(e.handshakeReport.stage,/bridge verification/);assert.equal(e.handshakeReport.exchanges.length,0);assert.equal(e.handshakeReport.transport.bridge.verified,false);return true;});
  assert.equal(h.fake.events.filter(x=>x==='bridge-setup').length,1);assert.equal(h.fake.sent.length,0);assert.equal(h.radio.busy,false);
 }finally{h.close();}}
});
test('A failed FF31 send cannot start the CPS handshake',async()=>{
 const h=setup();try{const chars=await h.fake.characteristic.service.getCharacteristics();chars[1].writeValueWithResponse=async()=>{throw Error('simulated setup failure');};await assert.rejects(identifyProfile(h.radio,'uv32'),/simulated setup failure/);assert.equal(h.fake.sent.length,0);assert.equal(h.radio.busy,false);}finally{h.close();}
});
test('A stalled native FF31 send is bounded and cannot continue after timeout',async()=>{
 const h=setup();try{
  const chars=await h.fake.characteristic.service.getCharacteristics();let resolveSend;
  chars[1].writeValueWithResponse=()=>new Promise(resolve=>{resolveSend=resolve;});
  const native=h.radio.native.bind(h.radio);h.radio.native=(stage,start,ms)=>native(stage,start,stage==='Preparing Bluetooth bridge'?20:ms);
  await assert.rejects(identifyProfile(h.radio,'uv32'),/timed out|Timeout/i);
  resolveSend();await new Promise(r=>setTimeout(r,0));assert.equal(h.fake.sent.length,0);assert.equal(h.radio.busy,false);
 }finally{h.close();}
});
test('Connection change or trailing input during settling prevents the opening command',async()=>{
 for(const mutate of [r=>r.generation++,r=>r.rx.push(6),r=>r.disconnect()]){const h=setup();try{
  const pause=h.radio.pause.bind(h.radio);h.radio.pause=async ms=>{if(ms===1020)mutate(h.radio);else await pause(ms);};
  await assert.rejects(identifyProfile(h.radio,'uv32'),/connection changed|Unexpected response/);assert.equal(h.fake.sent.length,0);assert.equal(h.radio.busy,false);
 }finally{h.close();}}
});
