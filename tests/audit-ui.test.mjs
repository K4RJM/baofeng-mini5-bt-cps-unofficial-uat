import {test} from 'node:test';
import assert from 'node:assert/strict';
import {appHarness} from './app-harness.mjs';
import {fixture} from './fixtures.mjs';

test('F05 OPEN: reimporting an app-generated starter does not establish hardware provenance',{todo:'Needs an explicit supported-radio and file-provenance policy'},async()=>{
 const h=await appHarness();try{
  assert.equal(h.get('writeRadio').disabled,true);const starter=await h.exported();await h.open(starter);
  assert.equal(h.connections.length,0);assert.equal(h.get('writeRadio').disabled,true);
 }finally{h.close();}
});

test('F09: channel Undo preserves later optional, VFO and DTMF edits and reserved record',async()=>{
 const h=await appHarness();try{
  const original=fixture();original.channelList[0][999].name='RESERVED';await h.open(original);
  h.row(0).onclick({target:h.row(0)});h.enter('name','CHANGED');h.get('apply').click();
  h.tab('Optional settings');h.enter('sql','4','content');
  h.tab('VFO A / B');h.enter('vfoAFreq','146.55000','content');
  h.tab('DTMF');h.enter('localID','321','content');const before=await h.exported();
  assert.equal(before.funCfgs.sql,4);assert.equal(before.vfos.vfoAFreq,'146.55000');assert.equal(before.dtmfs.localID,'321');
  h.tab('Channels');h.button('Undo').click();const after=await h.exported();
  assert.deepEqual(after.channelList,original.channelList);
  for(const key of ['funCfgs','vfos','dtmfs'])assert.deepEqual(after[key],before[key],key);
  assert.equal(h.connections.length,0);
 }finally{h.close();}
});
test('F12: staged changes protect against tab closure even before field blur',async()=>{
 const h=await appHarness();try{
  await h.open();h.row(0).onclick({target:h.row(0)});assert.equal(h.unloadBlocked(),false);
  const name=h.field('name','fields'),original=name.value;name.value='UNAPPLIED';
  assert.equal(h.unloadBlocked(),true);name.value=original;assert.equal(h.unloadBlocked(),false);
  h.enter('name','APPLIED');h.get('apply').click();assert.equal(h.unloadBlocked(),true);
  h.get('save').click();assert.equal(h.unloadBlocked(),true,'download request does not prove that a file was saved');
  assert.match(h.get('status').textContent,/Download requested/);
 }finally{h.close();}
});
test('F04: oversized Open and Append files are rejected before reading their contents',async()=>{
 const h=await appHarness();try{
  await h.open();const before=await h.exported();let reads=0;
  const oversized={name:'large.dat',size:2000000,arrayBuffer:async()=>{reads++;throw Error('must not read');}};
  h.get('file').files=[oversized];await h.get('file').onchange();assert.equal(reads,0);
  assert.match(h.get('status').textContent,/smaller than 2 MB/);assert.deepEqual(await h.exported(),before);
  h.button('Append .dat').click();h.get('appendDat').files=[oversized];await h.get('appendDat').onchange();
  assert.equal(reads,0);assert.equal(h.get('appendApply').disabled,true);assert.match(h.get('appendErrors').textContent,/smaller than 2 MB/);
 }finally{h.close();}
});
test('F11: a complete read remains downloadable in diagnostics if decoding fails',async()=>{
 const h=await appHarness();try{
  await h.open();const before=await h.exported();h.faults.decode=true;
  await h.get('readRadio').click();assert.match(h.get('status').textContent,/Injected decode failure/);
  assert.deepEqual(await h.exported(),before);assert.equal(h.get('backup').disabled,true);
  const report=await h.report();assert.equal(report.latestRead.rawHex.length,33344*2);
  assert.equal(report.latestRead.decoded,false);assert.match(report.latestRead.error,/Injected decode failure/);
  assert.equal(report.transport.stage,'read-decode-failed');assert.equal(h.connections[0].writes().length,0);
 }finally{h.close();}
});
test('F11: opening another source clears active write report while retaining diagnostic history',async()=>{
 const h=await appHarness();try{
  await h.open();h.radio.report={stage:'written-unverified',acknowledged:262,totalBlocks:262,deviceId:'earlier'};
  await h.open();assert.equal(h.radio.report.stage,'idle');assert.equal(h.get('verify').disabled,true);
  const report=await h.report();assert.equal(report.previousTransport.stage,'written-unverified');
  h.radio.onDisconnect();assert.doesNotMatch(h.get('status').textContent,/reboot expected/);
 }finally{h.close();}
});
