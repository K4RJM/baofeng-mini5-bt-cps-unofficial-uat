import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {Reader} from '../read-test/reader.mjs';
import {PROFILES,identifyProfile,isUatPage} from '../scripts/uat-protocols.mjs';
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
