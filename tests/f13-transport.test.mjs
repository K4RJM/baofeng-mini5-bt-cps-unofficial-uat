import {test} from 'node:test';import assert from 'node:assert/strict';
import {Writer,makePlan} from '../writer.mjs';import {fixture,options} from './fixtures.mjs';import {asyncRadio} from './async-radio.mjs';
// Synthetic input tests protocol behavior, never decoder correctness.
const plan=makePlan(fixture(),options);
async function run(faults,fn){const fake=asyncRadio(plan.target,faults),prior=Object.getOwnPropertyDescriptor(globalThis,'navigator'),w=new Writer();Object.defineProperty(globalThis,'navigator',{configurable:true,value:{bluetooth:fake.bluetooth}});const wait=w.wait.bind(w);w.wait=n=>wait(n,150);try{await w.connect();assert.deepEqual(fake.events,['chooser','connect','service','characteristic','notifications-enabled']);assert.equal(fake.sent.length,0);await fn(w,fake);}finally{w.disconnect();fake.close();if(prior)Object.defineProperty(globalThis,'navigator',prior);else delete globalThis.navigator;}}
for(const withResponse of [false,true])test('F13 async GATT: real discovery, delayed fragmented notifications and full transaction '+withResponse,()=>run({withResponse,reboot:true},async(w,f)=>{
 const before=await w.readRadio();assert.deepEqual(before.raw,plan.target);assert.equal(f.reads,521);
 assert.ok(f.events.indexOf('native-resolved')<f.events.indexOf('notification'),'Native send settles before response event');
 await w.upload(plan,null,{confirmed:true});assert.equal(w.report.acknowledged,262);assert.equal(w.report.stage,'written-unverified');
 await new Promise(resolve=>setTimeout(resolve,10));assert.equal(w.connected,false,'Reboot is a separate disconnect event');
 await w.connect();const result=await w.verify(plan,null);assert.equal(result.differences.total,0);assert.equal(f.writes,262);assert.equal(f.reads,1042);
 assert.deepEqual(f.sent.filter(b=>b[0]===87),plan.frames);
}));
for(const [name,fault,pattern]of [['bad header',{badHeader:true},/header/i],['partial notification',{truncateRead:true},/Timeout/],['wrong identity',{wrongModel:true},/model/i]])test('F13 async GATT rejects '+name,()=>run(fault,async(w,f)=>{await assert.rejects(w.readRadio(),pattern);assert.equal(f.writes,0);assert.equal(w.busy,false);assert.equal(w.connected,false);}));
for(const fault of [{dropAck:1},{nak:1},{disconnectWrite:1}])test('F13 async GATT uncertain write stops without retry '+JSON.stringify(fault),()=>run(fault,async(w,f)=>{await assert.rejects(w.upload(plan,null,{confirmed:true}));assert.equal(f.writes,1);assert.equal(w.report.acknowledged,0);assert.equal(w.report.stage,'write-incomplete-or-uncertain');assert.equal(w.busy,false);}));
