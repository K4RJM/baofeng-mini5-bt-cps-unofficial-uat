import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Writer,makePlan} from '../writer.mjs';
import {Reader} from '../read-test/reader.mjs';
import {fixture,options} from './fixtures.mjs';
import {simulatedRadio} from './simulate.mjs';
import {appHarness} from './app-harness.mjs';

const deadlines={chooser:25,connect:25,discovery:25,notifications:25,send:25};
const plan=makePlan(fixture(),options);
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const outcome=p=>p.then(value=>({value}),error=>({error}));
async function bounded(p){let timer;try{return await Promise.race([p,new Promise(resolve=>{timer=setTimeout(()=>resolve({unsettled:true}),500);})]);}finally{clearTimeout(timer);}}
const tick=()=>new Promise(resolve=>setImmediate(resolve));

// Exercise the real connection method and browser-shaped objects; no radio/simulator shortcut.
function setup(blocked){
 const held=deferred(),entered=deferred(),calls=[];let hold=true;
 const device=new EventTarget(),characteristic=new EventTarget();device.id='f10-test-radio';
 characteristic.properties={writeWithoutResponse:true};
 const step=async(name,value)=>{calls.push(name);if(hold&&name===blocked){entered.resolve();await held.promise;}return value;};
 characteristic.startNotifications=()=>step('notifications',characteristic);
 characteristic.writeValueWithoutResponse=async()=>{calls.push('send');};
 const service={getCharacteristic:()=>step('characteristic',characteristic)};
 const server={getPrimaryService:()=>step('service',service)};
 device.gatt={connected:false,async connect(){await step('connect');this.connected=true;return server;},disconnect(){this.connected=false;device.dispatchEvent(new Event('gattserverdisconnected'));}};
 const prior=Object.getOwnPropertyDescriptor(globalThis,'navigator');
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{bluetooth:{requestDevice:()=>step('chooser',device)}}});
 return {held,entered,calls,device,characteristic,release(){hold=false;held.resolve();},close(){hold=false;held.resolve();if(prior)Object.defineProperty(globalThis,'navigator',prior);else delete globalThis.navigator;}};
}

for(const stage of ['chooser','connect','service','characteristic','notifications'])for(const ending of ['timeout','cancel','link-loss']){
 if(stage==='chooser'&&ending==='link-loss')continue;
 test(`F10 setup ${stage}: ${ending} settles, late completion cannot advance`,async()=>{
  const h=setup(stage),r=new Reader({deadlines});let operation;
  try{
   operation=outcome(r.connect());await h.entered.promise;
   if(ending==='cancel')r.disconnect();
   if(ending==='link-loss'){h.device.gatt.connected=false;h.device.dispatchEvent(new Event('gattserverdisconnected'));}
   const result=await bounded(operation);
   assert.equal(result.unsettled,undefined,'Native browser promise left connection pending');
   assert.ok(result.error);assert.match(result.error.message,ending==='timeout'?/timed out/i:/cancel|link ended/i);
   assert.equal(r.connecting,false);assert.equal(r.connected,false);assert.equal(r.char,null);
   const count=h.calls.length;
   await assert.rejects(r.connect(),/previous.*pending|not settled/i);
   assert.equal(h.calls.length,count,'No overlapping native Bluetooth attempt');
   h.release();await tick();await tick();
   assert.equal(h.calls.length,count,'Late completion must not run discovery/notifications');
   assert.equal(h.device.gatt.connected,false,'Late connect must release its abandoned link');
   await r.connect();assert.equal(r.connected,true);assert.equal(h.calls.includes('send'),false,'Connect sends no programming commands');
  }finally{r.disconnect();h.close();await operation;}
 });
}

test('F10 setup: immediate network failures still stop after exactly three attempts',async()=>{
 const h=setup('none'),r=new Reader({deadlines});let attempts=0;
 h.device.gatt.connect=async()=>{attempts++;throw Object.assign(Error('Unavailable'),{name:'NetworkError'});};
 try{await assert.rejects(r.connect(),/Unavailable/);assert.equal(attempts,3);assert.equal(r.connecting,false);assert.equal(r.connected,false);}
 finally{r.disconnect();h.close();}
});

for(const ending of ['resolve','reject'])for(const writeMode of ['writeWithoutResponse','write']){
 test(`F10 write ${writeMode}: deadline holds uncertainty after late ${ending}, even with an ACK buffered`,async()=>{
  const r=new Writer({deadlines}),s=simulatedRadio(r),held=deferred(),entered=deferred();
  const send=r.char.writeValueWithoutResponse.bind(r.char);
  const native=async bytes=>{await send(bytes);if(bytes[0]===87){entered.resolve();return held.promise;}};
  r.char.properties={[writeMode]:true};r.char[writeMode==='write'?'writeValueWithResponse':'writeValueWithoutResponse']=native;
  const operation=outcome(r.upload(plan,null,{confirmed:true}));
  try{
   await entered.promise;const result=await bounded(operation);assert.equal(result.unsettled,undefined);assert.match(result.error.message,/timed out/i);
   assert.equal(r.busy,false);assert.equal(r.connected,false);assert.equal(r.waiter,null);
   assert.equal(r.report.stage,'write-incomplete-or-uncertain');assert.equal(r.report.attempted,1);assert.equal(r.report.acknowledged,0);assert.equal(s.writes().length,1);
   held[ending](ending==='reject'?Error('Late native rejection'):undefined);await tick();await tick();
   assert.equal(s.writes().length,1);assert.equal(r.report.stage,'write-incomplete-or-uncertain');
  }finally{held.reject(Error('Test cleanup'));await operation;r.disconnect();}
 });
}

for(const phase of ['identify','read','verify'])test(`F10 ${phase}: stalled native send fails without memory writes`,async()=>{
 const r=new Writer({deadlines}),s=simulatedRadio(r),held=deferred(),entered=deferred(),send=r.char.writeValueWithoutResponse.bind(r.char);
 r.char.writeValueWithoutResponse=bytes=>{if(bytes[0]===(phase==='identify'?80:82)){entered.resolve();return held.promise;}return send(bytes);};
 const operation=outcome(phase==='verify'?r.verify(plan,null):r.readRadio());
 try{await entered.promise;const result=await bounded(operation);assert.equal(result.unsettled,undefined);assert.match(result.error.message,/timed out/i);assert.equal(r.busy,false);assert.equal(r.connected,false);const count=s.sent.length;held.resolve();await tick();assert.equal(s.sent.length,count);assert.equal(s.writes().length,0);}
 finally{held.reject(Error('Test cleanup'));await operation;r.disconnect();}
});

for(const stage of ['send','response'])test(`F10 cancellation while waiting for ${stage} stops the write without retry`,async()=>{
 const r=new Writer({deadlines:{...deadlines,send:2000}}),s=simulatedRadio(r,{missingAck:0}),held=deferred(),entered=deferred(),send=r.char.writeValueWithoutResponse.bind(r.char);
 r.char.writeValueWithoutResponse=async bytes=>{await send(bytes);if(bytes[0]===87){entered.resolve();if(stage==='send')return held.promise;}};
 const operation=outcome(r.upload(plan,null,{confirmed:true}));
 try{await entered.promise;await tick();r.disconnect();const result=await bounded(operation);assert.equal(result.unsettled,undefined);assert.match(result.error.message,/cancel/i);assert.equal(r.busy,false);assert.equal(r.report.stage,'write-incomplete-or-uncertain');held.resolve();await tick();assert.equal(s.writes().length,1);}
 finally{held.reject(Error('Test cleanup'));await operation;r.disconnect();}
});

test('F10 successful repeated reads and full write retain the exact command sequence',async()=>{
 const r=new Writer({deadlines}),s=simulatedRadio(r);
 await r.readRadio();await r.readRadio();
 assert.equal(s.sent.filter(b=>b[0]===82).length,1042);assert.equal(s.sent.filter(b=>new TextDecoder().decode(b)==='PROGRAMCOLORPROU').length,2);assert.equal(s.sent.filter(b=>b[0]===69).length,0);
 const before=s.sent.length;await r.upload(plan,null,{confirmed:true});
 assert.deepEqual(s.writes(),plan.frames);assert.equal(s.sent.length-before,266);assert.equal(r.report.stage,'written-unverified');r.disconnect();
});

test('F10 app controls recover after a stalled write and another write stays locked',async()=>{
 const h=await appHarness(),held=deferred(),entered=deferred();let operation;
 try{
  await h.open();await h.get('connect').click();h.radio.deadlines={...deadlines};
  const send=h.radio.char.writeValueWithoutResponse.bind(h.radio.char);
  h.radio.char.writeValueWithoutResponse=bytes=>{if(bytes[0]===87){entered.resolve();return held.promise;}return send(bytes);};
  h.get('writeRadio').click();h.get('hasBackup').checked=true;h.get('hasBackup').onchange();operation=outcome(h.get('confirmWrite').click());
  await entered.promise;assert.equal(h.get('open').disabled,true);
  const result=await bounded(operation);assert.equal(result.unsettled,undefined);assert.match(h.get('status').textContent,/incomplete or uncertain.*timed out/is);
  assert.equal(h.get('open').disabled,false);assert.equal(h.get('save').disabled,false);assert.equal(h.get('readRadio').disabled,false);assert.equal(h.get('writeRadio').disabled,true);assert.equal(h.get('content').inert,false);
  held.resolve();await tick();assert.equal(h.connections[0].writes().length,0);
 }finally{held.reject(Error('Test cleanup'));if(operation)await operation;h.radio.disconnect();h.close();}
});

test('F10 cancellation during setup retry delay stops promptly without another attempt',async()=>{
 const h=setup('none'),r=new Reader({deadlines}),retry=deferred();let attempts=0;
 h.device.gatt.connect=async()=>{attempts++;throw Object.assign(Error('Unavailable'),{name:'NetworkError'});};
 r.log=text=>{if(text.includes('Retrying'))retry.resolve();};const operation=outcome(r.connect());
 try{await retry.promise;r.disconnect();const result=await bounded(operation);assert.equal(result.unsettled,undefined);assert.ok(result.error);assert.equal(attempts,1);assert.equal(r.pendingNative.size,0);}
 finally{r.disconnect();h.close();await operation;}
});

test('F10 old notification and disconnect callbacks cannot affect a new connection',async()=>{
 const h=setup('none'),r=new Reader({deadlines});
 try{
  await r.connect();const oldNotify=r.notify,oldDisconnect=r.disconnected;r.disconnect();await r.connect();
  const token=r.generation;h.characteristic.value=new DataView(Uint8Array.of(6).buffer);
  oldNotify({target:h.characteristic});assert.equal(r.rx.length,0);
  h.device.gatt.connected=false;oldDisconnect();assert.equal(r.generation,token);h.device.gatt.connected=true;
  r.notify({target:h.characteristic});assert.deepEqual(r.rx,[6]);
 }finally{r.disconnect();h.close();}
});

test('F10 final native send timeout cannot be mislabeled as a completed write',async()=>{
 const r=new Writer({deadlines}),s=simulatedRadio(r),held=deferred(),send=r.char.writeValueWithoutResponse.bind(r.char);let writes=0;
 r.char.writeValueWithoutResponse=async bytes=>{await send(bytes);if(bytes[0]===87&&++writes===262)return held.promise;};
 const operation=outcome(r.upload(plan,null,{confirmed:true}));
 try{const result=await bounded(operation);assert.equal(result.unsettled,undefined);assert.ok(result.error);assert.equal(r.report.attempted,262);assert.equal(r.report.acknowledged,261);assert.equal(r.report.stage,'write-incomplete-or-uncertain');held.resolve();await tick();assert.equal(s.writes().length,262);assert.equal(r.report.verified,false);}
 finally{held.resolve();await operation;r.disconnect();}
});

test('F10 app controls recover after a discovery timeout with no programming commands',async()=>{
 const h=await appHarness(),gatt=setup('service');let operation;
 try{
  h.radio.deadlines={...deadlines};h.radio.connect=Reader.prototype.connect.bind(h.radio);
  operation=outcome(h.get('connect').click());await gatt.entered.promise;assert.equal(h.get('open').disabled,true);
  const result=await bounded(operation);assert.equal(result.unsettled,undefined);assert.match(h.get('status').textContent,/Finding radio service.*timed out/i);
  assert.equal(h.get('open').disabled,false);assert.equal(h.get('connect').disabled,false);assert.equal(h.get('content').inert,false);assert.equal(gatt.calls.includes('send'),false);
 }finally{h.radio.disconnect();gatt.close();if(operation)await operation;h.close();}
});
