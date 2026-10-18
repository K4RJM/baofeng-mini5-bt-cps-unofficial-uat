import {test} from 'node:test';import assert from 'node:assert/strict';
import {appHarness} from './app-harness.mjs';import {fixture} from './fixtures.mjs';
test('factory-order channel display maps stored values without changing the native configuration',async()=>{
 const h=await appHarness();try{
  const data=fixture();Object.assign(data.channelList[0][0],{name:'ROW TEST',rxFreq:'146.52000',txFreq:'146.52000',strRxCtsDcs:'OFF',strTxCtsDcs:'100.0',txPower:1,bandwide:1,scanAdd:1,sqMode:1,pttid:3,signalGroup:19,busyLock:1,fhss:1});
  await h.open(data);const cells=h.row(0).querySelectorAll('td');
  assert.deepEqual(cells.slice(1,-1).map(c=>c.textContent),['1','146.52000','Off','146.52000','100.0 Hz','Low','Narrow','Include','On','Both','20','On','On','ROW TEST']);
  const ins=h.row(0).querySelectorAll('button').find(b=>b.textContent==='Ins Ch');assert.equal(ins.title,'Insert new channel above');ins.click();assert.equal(h.get('editorTitle').textContent,'Add above channel 1');h.get('cancel').click();
  assert.deepEqual(await h.exported(),data);assert.equal(h.connections.length,0);
 }finally{h.close();}
});
