// Format-preservation tests, not claims about radio receive/transmit capabilities.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {decodeRadio} from '../radio-decoder.mjs';
import {crypt} from '../radio-encoder.mjs';
import {makePlan} from '../writer.mjs';
import {readDat,writeDat} from '../dat.mjs';
import {fixture,options,schemas} from './fixtures.mjs';
import {appHarness} from './app-harness.mjs';

test('F07: independent decimal-byte vectors preserve the complete editor format domain',()=>{
 const vectors=[
  ['100.00000',[0x00,0x00,0x00,0x10]],
  ['146.52000',[0x00,0x20,0x65,0x14]],
  ['433.92500',[0x00,0x25,0x39,0x43]],
  ['599.99999',[0x99,0x99,0x99,0x59]],
  ['600.00000',[0x00,0x00,0x00,0x60]],
  ['650.00000',[0x00,0x00,0x00,0x65]],
  ['999.99999',[0x99,0x99,0x99,0x99]]
 ];
 for(const [value,bytes] of vectors)for(const [key,offset] of [['rxFreq',0],['txFreq',4]]){
  const plain=crypt(makePlan(fixture(),options).target);plain.set(bytes,offset);
  const raw=crypt(plain),decoded=decodeRadio(raw);
  assert.equal(decoded.channelList[0][0][key],value);
  assert.equal(decoded.channelList[0][0].name,'TEST A\0','other channel fields must survive');
  const saved=readDat(writeDat(decoded,schemas),schemas);
  assert.deepEqual(saved,decoded);assert.deepEqual(makePlan(saved,options).target,raw);
 }
});

test('F07: invalid decimal nibbles in populated-channel RX and TX are rejected',()=>{
 for(let offset=0;offset<8;offset++)for(const shift of [0,4])for(let nibble=10;nibble<=15;nibble++){
  const plain=crypt(makePlan(fixture(),options).target);
  plain[offset]=(plain[offset]&~(15<<shift))|(nibble<<shift);
  assert.throws(()=>decodeRadio(crypt(plain)),/Channel 1 (receive|transmit) frequency could not be decoded/);
 }
});

test('F07: nonempty frequencies outside the editor format cannot silently become blank',()=>{
 for(const bytes of [[0,0,0,0],[0x99,0x99,0x99,0x09]])for(const offset of [0,4]){
  const plain=crypt(makePlan(fixture(),options).target);plain.set(bytes,offset);
  assert.throws(()=>decodeRadio(crypt(plain)),/outside the supported frequency format/);
 }
});

test('F07: all-FF empty channels and receive-only TX stay empty',()=>{
 const data=fixture();data.channelList[0][0].txFreq='';
 const decoded=decodeRadio(makePlan(data,options).target);
 assert.equal(decoded.channelList[0][0].rxFreq,data.channelList[0][0].rxFreq);
 assert.equal(decoded.channelList[0][0].txFreq,'');
 assert.equal(decoded.channelList[0][1].rxFreq,'');
 assert.deepEqual(decoded.channelList[0][1],data.channelList[0][1]);
});

test('F07: write planning rejects imported channel frequencies outside the editor format',()=>{
 for(const key of ['rxFreq','txFreq'])for(const value of ['000.00000','099.99999','1000.00000','146.52','1.4652e2',null]){
  const data=fixture();data.channelList[0][0][key]=value;
  assert.throws(()=>makePlan(data,options),/frequency|empty channel/i);
 }
});

test('F07: malformed captured frequency retains the workspace and complete diagnostic bytes',async()=>{
 const h=await appHarness();try{
  await h.open();const before=await h.exported();
  const plain=crypt(makePlan(fixture(),options).target);plain[0]=0x0a;const raw=crypt(plain);
  h.radio.readRadio=async()=>({raw});
  await h.get('readRadio').click();
  assert.match(h.get('status').textContent,/Channel 1 receive frequency could not be decoded/);
  assert.deepEqual(await h.exported(),before);
  const report=await h.report();
  assert.equal(report.latestRead.rawHex.toLowerCase(),Buffer.from(raw).toString('hex'));
  assert.equal(report.latestRead.decoded,false);assert.equal(report.transport.stage,'read-decode-failed');
  assert.equal(h.get('backup').disabled,true);
  assert.equal(h.connections.reduce((n,connection)=>n+connection.writes().length,0),0);
 }finally{h.close();}
});

test('F07: imported out-of-format frequency is blocked before a Bluetooth connection',async()=>{
 const h=await appHarness();try{
  const data=fixture();data.channelList[0][0].rxFreq='099.99999';await h.open(data);
  await h.get('writeRadio').click();
  assert.equal(h.connections.length,0);
  assert.match(h.get('status').textContent,/frequency/);
  assert.notEqual(h.get('warning').open,true);
 }finally{h.close();}
});
