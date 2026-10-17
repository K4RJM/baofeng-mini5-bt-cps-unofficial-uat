import {test} from 'node:test';import assert from 'node:assert/strict';
import {Writer,makePlan,checkIdentity} from '../writer.mjs';import {fixture,options,schemas} from './fixtures.mjs';import {simulatedRadio} from './simulate.mjs';import {appHarness} from './app-harness.mjs';import {writeDat} from '../dat.mjs';
const identity=()=>({model:'5RMINI',id:[...new TextEncoder().encode('5RMINI  +L00000')],config:Array(16).fill(0)});

test('F05: exact supported model requires a complete well-formed identification response',()=>{
 assert.doesNotThrow(()=>checkIdentity(identity()));
 const wrong=[null,undefined,{}, {...identity(),model:'OTHER'},{...identity(),model:'5RMINI-extra'}, {model:'5RMINI'}, {...identity(),id:[]},{...identity(),config:[]},{...identity(),id:identity().id.slice(0,14)}, {...identity(),id:[...identity().id.slice(0,14),256]}, {...identity(),id:[...new TextEncoder().encode('OTHER   +L00000')]}, {...identity(),id:[...new TextEncoder().encode('5RMINI\t +L00000')]}];
 wrong.push({...identity(),config:Array(16)},{...identity(),id:Object.assign(Array(15),identity().id.slice(0,8))});
 for(const value of wrong)assert.throws(()=>checkIdentity(value),'Missing/malformed/wrong identification must not pass');
});

test('F05: every upload identifies the current device afresh; a prior successful read cannot authorize another model',async()=>{
 const radio=new Writer(),fault={},sim=simulatedRadio(radio,fault);const old=await radio.readRadio();assert.equal(old.identity.model,'5RMINI');
 radio.disconnect();fault.wrongModel=true;sim.connect();
 await assert.rejects(radio.upload(makePlan(fixture(),options),old,{confirmed:true}),/model/i);
 assert.equal(sim.writes().length,0);assert.equal(radio.report.stage,'blocked-before-write');assert.equal(sim.sent.filter(b=>b.length===1&&b[0]===77).length,2);
});

test('F05: device, characteristic, or connection-generation change during identity blocks all memory writes',async()=>{
 for(const mutate of [r=>{r.device={...r.device,id:'changed-radio'};},r=>{r.char={...r.char};},r=>{r.generation++;}]){
  const radio=new Writer(),sim=simulatedRadio(radio),identify=radio.identify.bind(radio);
  radio.identify=async()=>{const id=await identify();mutate(radio);return id;};
  await assert.rejects(radio.upload(makePlan(fixture(),options),null,{confirmed:true}),/connection.*changed|identity|session/i);
  assert.equal(sim.writes().length,0);assert.equal(radio.report.stage,'blocked-before-write');assert.equal(radio.busy,false);
 }
});

test('F05: failed or incomplete identification cannot send a programming frame',async()=>{
 for(const failure of ['throw','missing','malformed']){
  const radio=new Writer(),sim=simulatedRadio(radio);radio.identify=async()=>{if(failure==='throw')throw Error('Identification incomplete');return failure==='missing'?undefined:{model:'5RMINI'};};
  await assert.rejects(radio.upload(makePlan(fixture(),options),null,{confirmed:true}));assert.equal(sim.writes().length,0);assert.equal(radio.report.stage,'blocked-before-write');
 }
});

test('F05: connection change after identification cannot route a block to a replacement device',async()=>{
 const radio=new Writer(),sim=simulatedRadio(radio);let replacementWrites=0;
 const plan=makePlan(fixture(),options);
 await assert.rejects(radio.upload(plan,null,{confirmed:true,progress(stage,n){if(stage==='Writing'&&n===1){radio.device={...radio.device,id:'replacement'};radio.char={properties:{writeWithoutResponse:true},async writeValueWithoutResponse(){replacementWrites++;radio.receive(new DataView(Uint8Array.of(6).buffer));}};}}}),/connection.*changed|identity|session/i);
 assert.equal(sim.writes().length,1);assert.equal(replacementWrites,0);assert.equal(radio.report.stage,'write-incomplete-or-uncertain');assert.equal(radio.report.acknowledged,1);
});

test('F05: imported starter is only file data; wrong current radio still blocks programming',async()=>{
 const h=await appHarness();try{
  const starter=await h.exported();await h.open(starter);assert.equal(h.connections.length,0);
  h.faults.transport={wrongModel:true};h.get('writeRadio').click();h.get('hasBackup').checked=true;h.get('hasBackup').onchange();await h.get('confirmWrite').click();
  assert.equal(h.connections.length,1);assert.equal(h.connections[0].writes().length,0);assert.equal(h.radio.report.stage,'blocked-before-write');assert.match(h.get('status').textContent,/model/i);
 }finally{h.radio.disconnect();h.close();}
});

test('F05: incompatible DAT provenance is rejected without changing the workspace or contacting a radio',async()=>{
 const h=await appHarness();try{
  await h.open();const before=await h.exported(),bytes=writeDat(fixture(),schemas),bad=bytes.slice();
  const assembly=Buffer.from(bytes).indexOf('BF-5RMini_CPS');assert.ok(assembly>=0);bad[assembly]=88;
  h.get('file').files=[{name:'incompatible.dat',size:bad.length,arrayBuffer:async()=>bad}];await h.get('file').onchange();
  assert.match(h.get('status').textContent,/File not loaded/);assert.deepEqual(await h.exported(),before);assert.equal(h.connections.length,0);
 }finally{h.close();}
});
