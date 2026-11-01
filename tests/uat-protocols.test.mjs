import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {Reader} from '../read-test/reader.mjs';
import {PROFILES,identifyProfile,isUatPage,selectSendMethod,isHandshakeCommand} from '../scripts/uat-protocols.mjs';
import {asyncRadio} from './async-radio.mjs';
const INIT='53454e4421050d010101041108050d0d01110f091209100400';
const hex=b=>Buffer.from(b).toString('hex');
function simulated(identity,chunkSize=1){
 const fake=asyncRadio(new Uint8Array(33344),{identity,chunkSize}),radio=new Reader();
 radio.device=fake.device;radio.char=fake.characteristic;fake.device.gatt.connected=true;
 fake.characteristic.addEventListener('characteristicvaluechanged',radio.notify);
 const wait=radio.wait.bind(radio);radio.wait=n=>wait(n,65);
 return {radio,fake,close(){radio.disconnect();fake.close();}};
}
test('UAT protocol facts match OLA prefixes and the CHIRP 7/15-byte distinction',()=>{
 assert.deepEqual(Object.keys(PROFILES),['mini5','gm30pro','uv32']);
 assert.deepEqual(Object.values(PROFILES).map(p=>[p.prefix,p.identityBytes]),[['5RMINI',15],['GM-30P',7],['UV32PRO',7]]);
 assert.ok(Object.isFrozen(PROFILES)&&Object.values(PROFILES).every(Object.isFrozen));
});
test('Protocol UI is restricted to the exact UAT origin and repository path',()=>{
 const u='https://k4rjm.github.io/baofeng-mini5-bt-cps-unofficial-uat/';
 assert.equal(isUatPage(u+'uat-protocols.mjs?v=20.34',u+'index.html'),true);
 for(const page of ['https://k4rjm.github.io/baofeng-mini5-bt-cps-unofficial/','https://example.com/baofeng-mini5-bt-cps-unofficial-uat/','http://k4rjm.github.io/baofeng-mini5-bt-cps-unofficial-uat/',u+'../baofeng-mini5-bt-cps-unofficial/','garbage'])assert.equal(isUatPage(u+'uat-protocols.mjs',page),false);
 assert.equal(isUatPage(u+'scripts/uat-protocols.mjs',u),false);
});
test('Each selected handshake survives fragmented BLE notifications and sends identification only',async()=>{
 for(const [key,id] of [['mini5','5RMINI  +L00000'],['gm30pro','GM-30P '],['uv32','UV32PRO']]){
  const h=simulated(id);try{
   const result=await identifyProfile(h.radio,key);
   assert.equal(result.model,PROFILES[key].prefix);assert.equal(result.matchesExpected,true);
   assert.equal(result.id.length,id.length);assert.equal(result.memoryWrites,0);assert.equal(result.memoryReads,0);
   assert.deepEqual(h.fake.sent.map(hex),[hex(Buffer.from('PROGRAMCOLORPROU')),'46','4d',INIT]);
   assert.equal(h.fake.writes,0);assert.equal(h.fake.reads,0);assert.equal(h.radio.connected,true);assert.equal(h.radio.busy,false);
  }finally{h.close();}
 }
});
test('Extended 15-byte family responses are retained before the initialization ACK',async()=>{
 for(const key of ['gm30pro','uv32']){
  const id=PROFILES[key].prefix.padEnd(8,' ')+'+L00000',h=simulated(id,13);
  try{const result=await identifyProfile(h.radio,key);assert.equal(result.id.length,15);assert.equal(result.exchanges[2].responseHex.replaceAll(' ',''),hex(Buffer.from(id)));assert.equal(h.radio.rx.length,0);}finally{h.close();}
 }
});
test('An unexpected printable model is reported without blocking the connection',async()=>{
 const h=simulated('OTHER  ');try{const r=await identifyProfile(h.radio,'gm30pro');assert.equal(r.model,'OTHER');assert.equal(r.matchesExpected,false);assert.equal(h.radio.connected,true);assert.equal(h.fake.writes,0);}finally{h.close();}
});
test('Blank, binary, truncated or partially extended identities stop before INIT',async()=>{
 for(const id of ['       ','UV32\x00RO','UV32','UV32PROx']){
  const h=simulated(id);try{await assert.rejects(identifyProfile(h.radio,'uv32'),error=>{assert.match(error.message,/model response|Timeout|identity suffix/);assert.equal(error.handshakeReport.completed,false);assert.equal(error.handshakeReport.exchanges.length,3);assert.equal(error.handshakeReport.memoryWrites,0);return true;});assert.equal(h.fake.sent.length,3);assert.equal(h.fake.writes,0);assert.equal(h.radio.busy,false);}finally{h.close();}
 }
});
test('NACK at either handshake ACK stops with no memory command',async()=>{
 for(const stage of [1,4]){
  const h=simulated('GM-30P '),request=h.radio.request.bind(h.radio);let n=0;
  h.radio.request=async(...args)=>{const result=await request(...args);return ++n===stage?Uint8Array.of(21):result;};
  try{await assert.rejects(identifyProfile(h.radio,'gm30pro'),/not acknowledged/);assert.equal(h.fake.sent.length,stage);assert.equal(h.fake.writes,0);assert.equal(h.fake.reads,0);}finally{h.close();}
 }
});
test('Busy, disconnected, invalid profile and stale-buffer checks send nothing',async()=>{
 const h=simulated('UV32PRO');try{
  await assert.rejects(identifyProfile(h.radio,'missing'),/protocol/);
  h.radio.busy=true;await assert.rejects(identifyProfile(h.radio,'uv32'),/already running/);h.radio.busy=false;
  h.radio.rx.push(6);await assert.rejects(identifyProfile(h.radio,'uv32'),/leftover/);h.radio.rx=[];
  h.radio.disconnect();await assert.rejects(identifyProfile(h.radio,'uv32'),/Connect/);assert.equal(h.fake.sent.length,0);
 }finally{h.close();}
});
test('A changed connection during identification cannot continue the handshake',async()=>{
 for(const mutate of [r=>r.generation++,r=>r.device={...r.device},r=>r.char={...r.char}]){
  const h=simulated('UV32PRO'),request=h.radio.request.bind(h.radio);h.radio.request=async(...a)=>{const v=await request(...a);mutate(h.radio);return v;};
  try{await assert.rejects(identifyProfile(h.radio,'uv32'),/connection changed/);assert.equal(h.fake.sent.length,1);assert.equal(h.radio.busy,false);}finally{h.close();}
 }
});
test('UAT packaging refuses the LIVE repository before reading or writing an artifact',()=>{
 const result=spawnSync(process.execPath,['scripts/stamp-uat.mjs'],{cwd:new URL('../',import.meta.url),env:{...process.env,GITHUB_REPOSITORY:'K4RJM/baofeng-mini5-bt-cps-unofficial'},encoding:'utf8'});
 assert.notEqual(result.status,0);assert.match(result.stderr,/restricted to the UAT repository/);
});

test('UAT read-only command allowlist cannot send memory reads, writes, reset or arbitrary bytes',()=>{
 for(const c of [Buffer.from('PROGRAMCOLORPROU'),Uint8Array.of(70),Uint8Array.of(77),Buffer.from(INIT,'hex')])assert.equal(isHandshakeCommand(c),true);
 for(const c of [[],[82,0,0,64],[87,0,0,128],[69],[17],[18],Buffer.from('PROGRAMCOLORPROU!')])assert.equal(isHandshakeCommand(c),false);
});
test('Bluetooth send selection uses only advertised capabilities and never silently falls back',()=>{
 assert.equal(selectSendMethod({write:true,writeWithoutResponse:true}),'writeValueWithoutResponse');
 assert.equal(selectSendMethod({write:true}),'writeValueWithResponse');
 assert.equal(selectSendMethod({write:true,writeWithoutResponse:true},'with-response'),'writeValueWithResponse');
 for(const [props,mode] of [[{},'auto'],[{write:true},'without-response'],[{writeWithoutResponse:true},'with-response'],[{write:true},'typo']])assert.throws(()=>selectSendMethod(props,mode));
});
test('Explicit BLE send modes keep the same four handshake commands and final ACK check',async()=>{
 for(const mode of ['with-response','without-response']){
  const h=simulated('GM-30P ');h.fake.characteristic.properties={write:true,writeWithoutResponse:true,notify:true};
  try{const r=await identifyProfile(h.radio,'gm30pro',{sendMode:mode});assert.equal(r.completed,true);assert.equal(h.fake.events.filter(e=>e==='send-'+mode).length,4);assert.equal(h.fake.events.filter(e=>e==='send-'+(mode==='with-response'?'without-response':'with-response')).length,0);assert.deepEqual(h.fake.sent.map(hex),[hex(Buffer.from('PROGRAMCOLORPROU')),'46','4d',INIT]);assert.equal(r.exchanges.every(e=>Number.isFinite(e.sendResolvedAtMs)),true);}finally{h.close();}
 }
});
test('GM-30 Pro physical symptom: silent opening command produces a stage-specific report and one attempt',async()=>{
 for(const sendMode of ['auto','with-response']){
  const h=simulated('GM-30P ');h.fake.faults.silentHandshake=true;h.fake.characteristic.properties={write:true,writeWithoutResponse:true,notify:true};
  try{await assert.rejects(identifyProfile(h.radio,'gm30pro',{sendMode}),e=>{const r=e.handshakeReport;assert.match(r.stage,/Opening command/);assert.equal(r.exchanges.length,1);assert.equal(r.exchanges[0].commandHex.replaceAll(' ',''),hex(Buffer.from('PROGRAMCOLORPROU')));assert.equal(r.transport.notificationCount,0);assert.equal(r.receivedPendingHex,'');assert.equal(r.memoryReads+r.memoryWrites,0);return true;});assert.equal(h.fake.sent.length,1);assert.equal(h.radio.busy,false);}finally{h.close();}
 }
});
test('Reports enumerate characteristics without switching paths and capture fragmented notifications',async()=>{
 const h=simulated('UV32PRO');const c=h.fake.characteristic;c.properties={write:true,writeWithoutResponse:true,notify:true};c.service.getCharacteristics=async()=>[c,{uuid:'0000ffe2-0000-1000-8000-00805f9b34fb',properties:{read:true}}];
 try{const r=await identifyProfile(h.radio,'uv32');assert.equal(r.transport.serviceUuid,'0000ffe0-0000-1000-8000-00805f9b34fb');assert.equal(r.transport.characteristics.length,2);assert.equal(r.transport.selectedCharacteristic.uuid,c.uuid);assert.equal(r.transport.notifications.length,25);assert.equal(r.transport.notificationCount,25);assert.equal(r.transport.notifications[0].hex,'06');assert.equal(r.transport.notifications.every(n=>n.bytes===1&&n.elapsedMs>=0),true);assert.equal(r.exchanges[0].completedAtMs>=r.exchanges[0].sentAtMs,true);const before=r.transport.notificationCount;c.value=new DataView(Uint8Array.of(6).buffer);c.dispatchEvent(new Event('characteristicvaluechanged'));assert.equal(r.transport.notificationCount,before,'Temporary tracing listener removed after completion');}finally{h.close();}
});
test('Unsupported explicit send method returns a diagnostic without sending any identification command',async()=>{
 const h=simulated('GM-30P ');try{await assert.rejects(identifyProfile(h.radio,'gm30pro',{sendMode:'with-response'}),e=>{assert.match(e.message,/not supported/);assert.equal(e.handshakeReport.transport.selectedCharacteristic.properties.write,false);return true;});assert.equal(h.fake.sent.length,0);}finally{h.close();}
});

// Model native delivery yielding to promise continuations between listeners.
// Script-dispatched EventTarget events do not expose this ordering in Node.
test('Native callback ordering retains the terminal notification before cleanup',async()=>{
 for(const opening of [0,6]){
  const listeners=[],sent=[];let delivery=Promise.resolve();
  const c={uuid:'ffe1',properties:{writeWithoutResponse:true,notify:true},
   addEventListener(type,fn,options){listeners.push({type,fn,capture:options===true||!!options?.capture});},
   removeEventListener(type,fn,options){const i=listeners.findIndex(x=>x.type===type&&x.fn===fn&&x.capture===(options===true||!!options?.capture));if(i>=0)listeners.splice(i,1);},
   writeValueWithoutResponse(bytes){
    sent.push([...bytes]);const reply=bytes.length===1&&bytes[0]===70?new Uint8Array(16):bytes.length===1&&bytes[0]===77?new TextEncoder().encode('UV32PRO'):Uint8Array.of(sent.length===1?opening:6);
    delivery=delivery.then(async()=>{
     await new Promise(r=>setTimeout(r,0));c.value=new DataView(reply.buffer);
     const ordered=[...listeners.filter(x=>x.capture),...listeners.filter(x=>!x.capture)];
     for(const listener of ordered){if(listeners.includes(listener))listener.fn({target:c});await new Promise(r=>setTimeout(r,0));}
    });return Promise.resolve();
   }
  };
  c.service={uuid:'ffe0',getCharacteristics:async()=>[c]};
  const radio=new Reader();radio.device={id:'NATIVE-CALLBACK-TEST',gatt:{connected:true}};radio.char=c;c.addEventListener('characteristicvaluechanged',radio.notify);
  let report;try{report=await identifyProfile(radio,'uv32');assert.equal(opening,6);}catch(e){report=e.handshakeReport;if(!report)throw e;assert.equal(opening,0);}
  await delivery;
  assert.equal(report.exchanges[0].responseHex,opening===0?'00':'06');
  assert.equal(report.transport.notificationCount,opening===0?1:4,'Every delivered response, including the terminal one, is traced');
  assert.equal(report.transport.notifications.at(-1).hex,opening===0?'00':'06');
  assert.equal(sent.length,opening===0?1:4);assert.equal(radio.busy,false);assert.equal(listeners.length,1,'Only the original receiver remains');
 }
});

test('Browser suite identifies its own revision and rejects stale or missing application builds',async()=>{
 const {browserBuildError,BROWSER_SUITE_VERSION,BROWSER_CHECK_COUNT}=await import('./browser/revision.mjs');
 assert.equal(BROWSER_CHECK_COUNT,30);assert.equal(browserBuildError('Version '+BROWSER_SUITE_VERSION),'');assert.equal(browserBuildError('UAT build '+BROWSER_SUITE_VERSION+'-UAT.123abcd'),'');
 for(const badge of ['UAT build 20.35-UAT.14530dc','Version 20.34','',null,'garbage'])assert.match(browserBuildError(badge),/does not match/);
});
