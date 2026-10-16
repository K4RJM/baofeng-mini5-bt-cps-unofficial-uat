import {test} from 'node:test';import assert from 'node:assert/strict';
import {decodeRadio} from '../radio-decoder.mjs';import {makePlan} from '../writer.mjs';import {fixture,options} from './fixtures.mjs';import {appHarness} from './app-harness.mjs';

test('F06 independent physical capture: channel 71 retains exact stored programming data',()=>{
 const captured=Buffer.from('006f6523006f65230000000000000100ffffffff057f3663061c54ffffffffff','hex');
 const raw=makePlan(fixture(),options).target;raw.set(captured,70*32);
 const decoded=decodeRadio(raw),c=decoded.channelList[0][70];
 assert.deepEqual([c.name,c.rxFreq,c.txFreq,c.txPower,c.strRxCtsDcs,c.strTxCtsDcs],['F06TEST','146.52000','146.52000',1,'OFF','OFF']);
 assert.deepEqual(Buffer.from(makePlan(decoded,options).target.subarray(70*32,71*32)),captured);
});

test('F06 application flow: acknowledged reboot stays unverified until explicit reconnect and readback',async()=>{
 const h=await appHarness();try{
  const data=fixture();data.channelList[0][70]={...data.channelList[0][0],name:'F06TEST',txPower:1};await h.open(data);
  h.get('writeRadio').click();assert.equal(h.get('warning').open,true);
  h.get('hasBackup').checked=true;h.get('hasBackup').onchange();await h.get('confirmWrite').click();
  const sim=h.connections[0];assert.equal(sim.writes().length,262);assert.equal(h.radio.connected,false);assert.equal(h.radio.report.acknowledged,262);
  assert.equal(h.radio.report.stage,'written-unverified');assert.equal(h.radio.report.verified,false);assert.equal(h.get('writeRadio').disabled,true);
  h.radio.onDisconnect();assert.match(h.get('status').textContent,/reboot expected/);assert.equal(h.radio.report.stage,'written-unverified');
  let reconnects=0;h.radio.connect=async()=>{reconnects++;sim.connect();};
  h.get('verify').click();assert.equal(h.get('resetSession').open,true);assert.equal(h.get('resetRebootReady').hidden,false);assert.equal(reconnects,0);
  await h.get('resetRebootReady').click();assert.equal(reconnects,1);assert.equal(h.radio.report.stage,'verified');assert.equal(h.radio.report.verified,true);
  assert.match(h.get('status').textContent,/VERIFIED: all 33,344 bytes/);assert.equal(sim.writes().length,262,'readback never retries a write');
 }finally{h.radio.disconnect();h.close();}
});
