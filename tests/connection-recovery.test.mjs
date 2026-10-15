import {test} from 'node:test';import assert from 'node:assert/strict';
import {releaseAfterAcknowledgedWrite} from '../connection-recovery.mjs';import {Writer,makePlan} from '../writer.mjs';import {fixture,options} from './fixtures.mjs';import {simulatedRadio} from './simulate.mjs';
test('cleanup follows the final ACK, sends no extra radio bytes and retains verification data',async()=>{
 const radio=new Writer(),sim=simulatedRadio(radio),plan=makePlan(fixture(),options),logs=[];radio.log=s=>logs.push(s);
 await radio.upload(plan,null,{confirmed:true});const count=sim.sent.length,report=radio.report;
 releaseAfterAcknowledgedWrite(radio);
 assert.equal(sim.sent.length,count);assert.deepEqual(sim.writes(),plan.frames);assert.equal(sim.writes().length,262);
 assert.equal(radio.connected,false);assert.equal(radio.char,null);assert.equal(radio.report,report);assert.equal(report.stage,'written-unverified');assert.equal(report.verified,false);assert.equal(report.acknowledged,262);assert.equal(report.browserLinkCleanup.outcome,'browser-disconnect-requested');assert.match(logs[0],/finish rebooting/);
 sim.connect();const result=await radio.verify(plan,null);assert.equal(result.differences.total,0);assert.equal(sim.writes().length,262);
});
test('cleanup cannot interrupt an active or uncertain write and never retries it',async()=>{
 for(const fault of [{missingAck:261},{badAck:261},{sendFailure:261}]){
  const radio=new Writer(),sim=simulatedRadio(radio,fault);await assert.rejects(radio.upload(makePlan(fixture(),options),null,{confirmed:true}));const count=sim.sent.length;
  assert.throws(()=>releaseAfterAcknowledgedWrite(radio),/all 262 acknowledgements/);assert.equal(sim.sent.length,count);assert.equal(sim.writes().length,262);assert.equal(radio.report.stage,'write-incomplete-or-uncertain');
 }
 let disconnected=0;assert.throws(()=>releaseAfterAcknowledgedWrite({busy:true,report:{stage:'written-unverified',totalBlocks:262,acknowledged:262},disconnect(){disconnected++;}}));assert.equal(disconnected,0);
});
test('an already rebooted radio can be cleaned and a host cleanup failure does not erase the acknowledged outcome',()=>{
 for(const fails of [false,true]){let calls=0;const logs=[],radio={busy:false,report:{stage:'written-unverified',totalBlocks:262,acknowledged:262,verified:false},disconnect(){calls++;if(fails)throw Error('Host cleanup failed');},log:s=>logs.push(s)};
  releaseAfterAcknowledgedWrite(radio);assert.equal(calls,1);assert.equal(radio.report.acknowledged,262);assert.equal(radio.report.stage,'written-unverified');assert.equal(radio.report.browserLinkCleanup.outcome,fails?'cleanup-failed':'browser-disconnect-requested');assert.equal(logs.length,1);
 }
});
