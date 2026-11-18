import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Reader} from '../read-test/reader.mjs';
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
 try{await check(radio,fake);}
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
  assert.equal(report.verified,true);
  assert.equal(report.acknowledged,500);
  assert.equal(fake.reads,500);
  assert.equal(fake.writes,500);
  assert.equal(fake.events.filter(event=>event==='chooser').length,1);
  assert.equal(fake.events.filter(event=>event==='connect').length,2);
  assert.equal(fake.sent.find(command=>[0x52,0x57].includes(command[0]))[0],0x57);
  const frames=fake.sent.filter(frame=>frame[0]===0x57);
  assert.deepEqual(frames.map(frame=>frame[1]*256+frame[2]),Array.from({length:500},(_,i)=>i*64));
  const target=Buffer.from(uv32ImageToHex(changed),'hex');
  for(const index of [0,16,499]){
   const address=index*64;
   const frame=Uint8Array.of(0x57,address>>8,address&255,64,...target.subarray(address,address+64));
   assert.deepEqual(frames[index],frame);
   const first=fake.packets.findIndex(packet=>Buffer.from(packet).equals(Buffer.from(frame.subarray(0,20))));
   assert.ok(first>=0);
   assert.deepEqual(Buffer.concat(fake.packets.slice(first,first+4)),Buffer.from(frame));
  }
  assert.deepEqual(Buffer.from(fake.raw).subarray(0,32000),target);
  assert.deepEqual(fake.raw.subarray(32000),wire.subarray(32000));
 });
});

test('An unchanged file writes directly using an existing Bluetooth connection',async t=>{
 await withRadio(t,{},async (radio,fake)=>{
  await radio.connect();
  const report=await writeUv32Bluetooth(radio,{wireHex:baseline.wireHex},original);
  assert.equal(report.verified,true);
  assert.equal(fake.writes,500);
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
   assert.match(error.message,/rejected the write block \(response 0x00\).*0\/500 blocks acknowledged/);
   assert.equal(error.uv32BluetoothWriteReport.attemptedAddress,0);
   assert.equal(error.uv32BluetoothWriteReport.verified,false);
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

test('A discovery disconnect reuses the selected radio without another chooser',async t=>{
 await withRadio(t,{identity:'OTHER??'},async (radio,fake)=>{
  let attempts=0;
  Object.defineProperty(fake.faults,'disconnectDiscovery',{get:()=>attempts++===0});
  await assert.rejects(writeUv32Bluetooth(radio,baseline,edited),/No unused UV32PRO|does not match|did not identify|UV-32 read blocked/);
  assert.equal(fake.events.filter(event=>event==='chooser').length,1);
  assert.equal(fake.events.filter(event=>event==='connect').length,2);
  assert.equal(fake.writes,0);
 });
});

test('An acknowledged write with a differing read-back is never reported as verified',async t=>{
 await withRadio(t,{},async(radio,fake)=>{
  await assert.rejects(writeUv32Bluetooth(radio,baseline,edited,{
   progress:(stage,n)=>{if(stage==='Writing channels'&&n===500)fake.raw[64]^=1;}
  }),error=>{
   assert.match(error.message,/read-back differs/);
   assert.equal(error.uv32BluetoothWriteReport.acknowledged,500);
   assert.equal(error.uv32BluetoothWriteReport.verified,false);
   return true;
  });
  assert.equal(fake.writes,500);
  assert.equal(fake.reads,500);
 });
});
