import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Reader} from '../read-test/reader.mjs';
import {captureUv32Channels} from '../scripts/uat-uv32-read.mjs';
import {writeUv32Bluetooth} from '../scripts/uat-uv32-write.mjs';
import {editUv32Channel,uv32ChannelCaptureImage,uv32ImageFromHex,uv32Preview,uv32ImageToHex} from '../scripts/uat-uv32-edit.mjs';
import {asyncRadio} from './async-radio.mjs';
import {uv32Fixture} from './uv32-fixtures.mjs';

const wire=new Uint8Array(0x8380).fill(255);
wire.set(uv32Fixture());
const baseline={
 kind:'uv32-cable-full-read-v1',completed:true,identity:'UV32PRO',
 regions:[[0,0x8040],[0x9000,0x40],[0xa000,0x2c0],[0xd000,0x40]],
 completedBlocks:526,totalBlocks:526,memoryReads:526,memoryWrites:0,
 wireHex:Buffer.from(wire).toString('hex')
};
const original=uv32ImageFromHex(baseline.wireHex);
const edited=editUv32Channel(editUv32Channel(original,1,{name:'BLE TEST 1'}),3,{name:'BLE TEST 3',rx:'146.52'});

async function withRadio(t,faults,check){
 const fake=asyncRadio(wire,{identity:'UV32PRO',bridgeSetup:true,withResponse:true,maxWriteBytes:68,fragmentedWrites:true,...faults});
 fake.characteristic.properties.writeWithoutResponse=true;
 const radio=new Reader();
 t.mock.method(radio,'pause',()=>Promise.resolve());
 const navigatorDescriptor=Object.getOwnPropertyDescriptor(globalThis,'navigator');
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{bluetooth:fake.bluetooth}});
 try{if(!faults.skipConnect)await radio.connect();await check(radio,fake);}
 finally{radio.disconnect();fake.close();if(navigatorDescriptor)Object.defineProperty(globalThis,'navigator',navigatorDescriptor);else delete globalThis.navigator;}
}

test('Bluetooth starts at zero and writes the channel table even when the only edit is at 0x0400',async t=>{
 await withRadio(t,{},async (radio,fake)=>{
  const bluetoothBaseline={kind:'uv32-channel-read-v1',model:'UV32PRO',completed:true,completedBlocks:500,totalBlocks:500,bytes:32000,wireHex:baseline.wireHex.slice(0,64000)};
  const channels=uv32ChannelCaptureImage(bluetoothBaseline);
  const changed=editUv32Channel(channels,33,{name:'BLE TEST 33',rx:'146.52'});
  assert.equal(changed.length,32000);
  const added=uv32Preview(changed).preview.channels.find(channel=>channel.number===33);
  assert.equal(added.rx,'146.52000');
  assert.equal(added.tx,'Off');
  const report=await writeUv32Bluetooth(radio,bluetoothBaseline,changed);
  assert.equal(report.stage,'complete');
  assert.equal(report.acknowledged,250);
  assert.equal(fake.reads,0);
  assert.equal(fake.writes,250);
  assert.equal(fake.events.filter(event=>event==='chooser').length,1);
  assert.equal(fake.events.filter(event=>event==='connect').length,1);
  assert.equal(radio.connected,true);
  assert.equal(report.connected,true);
  assert.equal(fake.sent.find(command=>[0x52,0x57].includes(command[0]))[0],0x57);
  const frames=fake.sent.filter(frame=>frame[0]===0x57);
  assert.deepEqual(frames.map(frame=>frame[1]*256+frame[2]),Array.from({length:250},(_,i)=>i*128));
  const target=Buffer.from(uv32ImageToHex(changed),'hex');
  for(let offset=0;offset<target.length;offset+=32){
   if(target[offset]===255)target.fill(0,offset+8,offset+16);
  }
  for(const index of [0,8,249]){
   const address=index*128;
   const frame=Uint8Array.of(0x57,address>>8,address&255,128,...target.subarray(address,address+128));
   assert.deepEqual(frames[index],frame);
   const first=fake.packets.findIndex(packet=>Buffer.from(packet).equals(Buffer.from(frame.subarray(0,16))));
   assert.ok(first>=0);
   const chunks=fake.packets.slice(first,first+9);
   assert.deepEqual(chunks.map(packet=>packet.length),[16,16,16,16,16,16,16,16,4]);
   assert.deepEqual(Buffer.concat(chunks),Buffer.from(frame));
  }
  assert.deepEqual(Buffer.from(fake.raw).subarray(0,32000),target);
  assert.deepEqual(fake.raw.subarray(32000),wire.subarray(32000));
  const end=fake.sent.findIndex(frame=>frame.length===1&&frame[0]===0x45);
  assert.equal(fake.sent.slice(0,end).filter(frame=>frame[0]===0x57).length,250);
  assert.equal(fake.sent.findIndex(frame=>frame[0]===0x52),-1);
  assert.deepEqual(fake.packets.slice(0,5).map(packet=>packet.length),[16,1,1,16,9]);
  assert.equal(fake.events.slice(0,fake.events.indexOf('bridge-setup',fake.events.indexOf('bridge-setup')+1)).includes('send-with-response'),false);
 });
});

test('An unchanged file writes directly using an existing Bluetooth connection',async t=>{
 await withRadio(t,{},async (radio,fake)=>{
  await radio.connect();
  const report=await writeUv32Bluetooth(radio,{wireHex:baseline.wireHex},original);
  assert.equal(report.stage,'complete');
  assert.equal(fake.writes,250);
  assert.equal(fake.sent.find(command=>[0x52,0x57].includes(command[0]))[0],0x57);
  assert.equal(fake.events.filter(event=>event==='chooser').length,1);
 });
});

test('Settings edits and a different previous Bluetooth identity send no channel writes',async t=>{
 await withRadio(t,{},async (radio,fake)=>{
  const settings=edited.slice();settings[0x8040]^=1;
  await assert.rejects(writeUv32Bluetooth(radio,baseline,settings),/by cable/);
  assert.equal(fake.reads,0);
  const previous={kind:'uv32-channel-read-v1',model:'UV32PRO',completed:true,completedBlocks:500,totalBlocks:500,bytes:32000,wireHex:baseline.wireHex.slice(0,64000),handshake:{id:[0],config:[0]}};
  await assert.rejects(writeUv32Bluetooth(radio,previous,edited.slice(0,32000)),/differs from the previous Bluetooth read.*No blocks sent/);
  assert.equal(fake.reads,0);
  assert.equal(fake.writes,0);
 });
});

test('A rejected write stops before any later block and reports the attempted address',async t=>{
 await withRadio(t,{nak:1,nakByte:0},async(radio,fake)=>{
  await assert.rejects(writeUv32Bluetooth(radio,baseline,edited),error=>{
   assert.match(error.message,/rejected the write block \(response 0x00\).*0\/250 blocks acknowledged/);
   assert.equal(error.uv32BluetoothWriteReport.attemptedAddress,0);
   return true;
  });
  assert.equal(fake.writes,1);
  assert.equal(fake.reads,0);
  assert.equal(radio.connected,false);
 });
});

test('A browser Bluetooth error keeps its message and original cause',async t=>{
 await withRadio(t,{},async(radio,fake)=>{
  const original=new DOMException('Bluetooth write exceeds the supported length','NetworkError');
  const send=fake.characteristic.writeValueWithoutResponse.bind(fake.characteristic);
  t.mock.method(fake.characteristic,'writeValueWithoutResponse',bytes=>{
   if(bytes[0]===0x57)throw original;
   return send(bytes);
  });
  await assert.rejects(writeUv32Bluetooth(radio,baseline,edited),error=>{
   assert.equal(error.cause,original);
   assert.match(error.message,/Bluetooth write exceeds the supported length.*last attempted 0x0000/);
   assert.equal(error.uv32BluetoothWriteReport.acknowledged,0);
   return true;
  });
  assert.equal(fake.writes,0);
 });
});

test('A write needs an existing connection and never opens the Bluetooth chooser',async t=>{
 await withRadio(t,{skipConnect:true},async(radio,fake)=>{
  await assert.rejects(writeUv32Bluetooth(radio,baseline,edited),/Use Connect at the top/);
  assert.deepEqual(fake.events,[]);
 });
});

test('A disconnect after the final acknowledgement completes without reopening the radio',async t=>{
 await withRadio(t,{disconnectOnFinish:true},async(radio,fake)=>{
  const report=await writeUv32Bluetooth(radio,baseline,edited);
  assert.equal(report.acknowledged,250);
  assert.equal(report.stage,'complete');
  assert.equal(report.connected,false);
  assert.equal(fake.writes,250);
  assert.equal(fake.reads,0);
  assert.equal(fake.events.filter(event=>event==='chooser').length,1);
  assert.equal(radio.connected,false);
  assert.equal(fake.events.filter(event=>event==='connect').length,1);
 });
});

test('Missing optional idle notification does not turn acknowledged blocks into a failed write',async t=>{
 await withRadio(t,{omitIdle:true},async(radio,fake)=>{
  const wait=radio.wait.bind(radio);
  t.mock.method(radio,'wait',(n,ms)=>wait(n,ms===5000?30:ms));
  const result=await writeUv32Bluetooth(radio,baseline,edited);
  assert.equal(result.acknowledged,250);
  assert.equal(result.connected,true);
  assert.equal(fake.reads,0);
 });
});

test('Top Connect, Read, then Write uses one Bluetooth connection without a second read',async t=>{
 await withRadio(t,{},async(radio,fake)=>{
  const generation=radio.generation;
  const read=await captureUv32Channels(radio,{blockBytes:128,readSendMode:'without-response',connect:()=>assert.fail('Already connected')});
  assert.equal(read.closeError,undefined);
  assert.equal(read.totalBlocks,250);
  assert.equal(read.wireHex,baseline.wireHex.slice(0,64000));
  assert.deepEqual(fake.sent.filter(b=>b[0]===0x52).map(b=>[b[1]*256+b[2],b[3]]),Array.from({length:250},(_,i)=>[i*128,128]));
  assert.equal(fake.sent.at(-1)[0],0x45);
  const start=fake.sent.length;
  const report=await writeUv32Bluetooth(radio,read,uv32ChannelCaptureImage(read));
  assert.deepEqual(fake.sent.slice(start,start+5).map(command=>command[0]),[0x50,0x46,0x4d,0x53,0x57]);
  assert.equal(report.stage,'complete');
  assert.equal(fake.writes,250);
  assert.equal(fake.reads,250);
  assert.equal(fake.events.filter(event=>event==='chooser').length,1);
  assert.equal(fake.events.includes('disconnect'),false);
  assert.equal(radio.generation,generation);
 });
});
