import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Reader} from '../read-test/reader.mjs';
import {writeUv32Bluetooth} from '../scripts/uat-uv32-write.mjs';
import {editUv32Channel,uv32ChannelCaptureImage,uv32ImageFromHex,uv32ImageToHex} from '../scripts/uat-uv32-edit.mjs';
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
const edited=editUv32Channel(editUv32Channel(original,1,{name:'BLE TEST 1'}),3,{name:'BLE TEST 3',rx:'146.52000'});
const expected=Buffer.from(uv32ImageToHex(edited),'hex');

async function withRadio(t,faults,check){
 const fake=asyncRadio(wire,{identity:'UV32PRO',bridgeSetup:true,withResponse:true,maxWriteBytes:20,fragmentedWrites:true,...faults});
 const radio=new Reader();
 t.mock.method(radio,'pause',()=>Promise.resolve());
 const navigatorDescriptor=Object.getOwnPropertyDescriptor(globalThis,'navigator');
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{bluetooth:fake.bluetooth}});
 try{await check(radio,fake);}
 finally{radio.disconnect();fake.close();if(navigatorDescriptor)Object.defineProperty(globalThis,'navigator',navigatorDescriptor);else delete globalThis.navigator;}
}

test('Bluetooth writes only changed channel blocks in 20-byte packets and independently reads back all channels',async t=>{
 await withRadio(t,{},async (radio,fake)=>{
  const bluetoothBaseline={kind:'uv32-channel-read-v1',model:'UV32PRO',completed:true,completedBlocks:500,totalBlocks:500,bytes:32000,wireHex:baseline.wireHex.slice(0,64000)};
  const channels=uv32ChannelCaptureImage(bluetoothBaseline);
  const changed=editUv32Channel(editUv32Channel(channels,1,{name:'BLE TEST 1'}),3,{name:'BLE TEST 3',rx:'146.52000'});
  assert.equal(changed.length,32000);
  const report=await writeUv32Bluetooth(radio,bluetoothBaseline,changed);
  assert.equal(report.verified,true);
  assert.equal(report.acknowledged,2);
  assert.equal(fake.reads,1000);
  assert.equal(fake.writes,2);
  assert.equal(fake.events.filter(event=>event==='chooser').length,1);
  assert.equal(fake.events.filter(event=>event==='connect').length,3);
  const frames=fake.sent.filter(frame=>frame[0]===0x57);
  for(const [index,address] of [0,64].entries()){
   const frame=Uint8Array.of(0x57,0,address,64,...expected.subarray(address,address+64));
   assert.deepEqual(frames[index],frame);
   const start=fake.packets.findIndex(packet=>Buffer.from(packet).equals(Buffer.from(frame.subarray(0,20))));
   assert.ok(start>=0);
   assert.deepEqual(fake.packets.slice(start,start+4).map(packet=>packet.length),[20,20,20,8]);
  }
  assert.deepEqual(Buffer.from(fake.raw),expected);
 });
});

test('Stale cable baseline and edits outside channel memory send no Bluetooth writes',async t=>{
 await withRadio(t,{},async (radio,fake)=>{
  const settings=edited.slice();settings[0x8040]^=1;
  await assert.rejects(writeUv32Bluetooth(radio,baseline,settings),/by cable/);
  assert.equal(fake.reads,0);
  fake.raw[0]^=1;
  await assert.rejects(writeUv32Bluetooth(radio,baseline,edited),/differ from the previous read.*No blocks sent/);
  assert.equal(fake.writes,0);
 });
});

test('A rejected write stops before any later block and reports the attempted address',async t=>{
 await withRadio(t,{nak:1},async(radio,fake)=>{
  await assert.rejects(writeUv32Bluetooth(radio,baseline,edited),error=>{
   assert.match(error.message,/rejected the write block.*0\/2 blocks acknowledged/);
   assert.equal(error.uv32BluetoothWriteReport.attemptedAddress,0);
   assert.equal(error.uv32BluetoothWriteReport.verified,false);
   return true;
  });
  assert.equal(fake.writes,1);
  assert.equal(fake.reads,500);
  assert.equal(radio.connected,false);
 });
});

test('An acknowledged write with a differing read-back is never reported as verified',async t=>{
 await withRadio(t,{},async(radio,fake)=>{
  await assert.rejects(writeUv32Bluetooth(radio,baseline,edited,{
   progress:(stage,n)=>{if(stage==='Writing'&&n===2)fake.raw[64]^=1;}
  }),error=>{
   assert.match(error.message,/read-back differs/);
   assert.equal(error.uv32BluetoothWriteReport.acknowledged,2);
   assert.equal(error.uv32BluetoothWriteReport.verified,false);
   return true;
  });
  assert.equal(fake.writes,2);
  assert.equal(fake.reads,1000);
 });
});
