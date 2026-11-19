import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Reader} from '../read-test/reader.mjs';
import {captureUv32Channels} from '../scripts/uat-uv32-read.mjs';
import {writeUv32Bluetooth} from '../scripts/uat-uv32-write.mjs';
import {editUv32Setting,editUv32Vfo,editUv32Dtmf,editUv32ZoneName,editUv32Channel,uv32ChannelCaptureImage,uv32ImageFromHex,uv32Preview,uv32ImageToHex} from '../scripts/uat-uv32-edit.mjs';
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
  const settings=edited.slice();settings[0x803f]^=1;
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

test('Bluetooth captures the ten names, renames banks 1 and 10, and preserves adjacent radio bytes',async t=>{
 await withRadio(t,{},async(radio,fake)=>{
  // Fill the non-name area with a pattern to catch overwrites on the last block.
  for(let i=0;i<32;i++)fake.raw[0x8320+i]=i+1;
  const originalTail=fake.raw.slice(0x8320),read=await captureUv32Channels(radio,{blockBytes:128,readSendMode:'without-response',includeSettings:true});
  assert.equal(fake.reads,258);assert.equal(read.settingsHex.length,0x680);
  assert.deepEqual(fake.sent.filter(b=>b[0]===0x52).slice(-2).map(b=>[...b]),[[0x52,0xa2,0,128],[0x52,0xa2,128,128]]);
  const before=uv32ChannelCaptureImage(read);
  const next=editUv32ZoneName(editUv32ZoneName(before,1,'Home'),10,'Travel');
  assert.deepEqual([uv32Preview(next).readout.zones[0].name,uv32Preview(next).readout.zones[9].name],['Home','Travel']);
  const report=await writeUv32Bluetooth(radio,read,next);
  assert.equal(report.acknowledged,252);assert.equal(report.renamedBanks,2);assert.equal(fake.reads,258);
  assert.deepEqual(fake.raw.subarray(0x8320),originalTail);
  assert.ok(fake.bankTail.every(v=>v===0xd3));
  const stored=uv32ImageFromHex(Buffer.from(fake.raw).toString('hex'));
  assert.deepEqual(uv32Preview(stored).readout.zones,uv32Preview(next).readout.zones);
 });
});

test('Renaming from a file preserves other bank names from the target radio',async t=>{
 await withRadio(t,{},async(radio,fake)=>{
  fake.raw.fill(0x49,0x8290,0x82a0);
  const renamed=editUv32ZoneName(original,1,'Local');
  const report=await writeUv32Bluetooth(radio,baseline,renamed);
  assert.equal(report.acknowledged,251);
  const commands=fake.sent.filter(b=>b[0]===0x52);
  assert.deepEqual(commands.map(b=>[...b]),[[0x52,0xa2,0x00,128]]);
  assert.equal(fake.sent.at(-1)[0],0x45);
  assert.ok(fake.raw.slice(0x8290,0x82a0).every(v=>v===0x49));
 });
});

test('Bluetooth settings, VFO and DTMF come from the radio and edited fields persist after a write',async t=>{
 await withRadio(t,{},async(radio,fake)=>{
  let known=editUv32Dtmf(original,{number:1,field:'code',value:'20202'});
  known=editUv32Dtmf(known,{field:'localId',value:'12300'});
  known=editUv32Vfo(known,'B','Frequency MHz','146.52000');
  known=editUv32Setting(known,'SQL','2');fake.raw.set(Buffer.from(uv32ImageToHex(known),'hex'));
  const opts={blockBytes:128,readSendMode:'without-response',includeSettings:true};
  const read=await captureUv32Channels(radio,opts),image=uv32ChannelCaptureImage(read),values=uv32Preview(image).readout;
  assert.deepEqual(values,uv32Preview(known).readout);assert.equal(values.dtmf.localId,'12300');assert.equal(values.dtmf.entries[0].code,'20202');
  let edited=editUv32Dtmf(image,{number:3,field:'name',value:'LOCAL'});
  edited=editUv32Vfo(edited,'B','Bandwidth','Wide');edited=editUv32Setting(edited,'SQL','3');
  const result=await writeUv32Bluetooth(radio,read,edited);
  assert.equal(result.acknowledged,253);assert.equal(fake.reads,258);
  const again=uv32ChannelCaptureImage(await captureUv32Channels(radio,opts));
  assert.deepEqual(uv32Preview(again).readout,uv32Preview(edited).readout);
 });
});

test('A file can program its DTMF and bank names without a preliminary manual read or a file edit',async t=>{
 await withRadio(t,{},async(radio,fake)=>{
  let image=editUv32Dtmf(original,{field:'localId',value:'12300'});image=editUv32ZoneName(image,10,'Travel');
  const input={wireHex:uv32ImageToHex(image)};
  const report=await writeUv32Bluetooth(radio,input,image,{fileSettings:new Set([57])});
  assert.equal(report.acknowledged,252);
  assert.deepEqual(fake.sent.filter(b=>b[0]===0x52).map(b=>b[1]*256+b[2]),[0x8000,0x9000,0xa000,0xa080,0xa100,0xa200,0xa280]);
  const stored=uv32Preview(uv32ImageFromHex(Buffer.from(fake.raw).toString('hex'))).readout;
  assert.equal(stored.dtmf.localId,'12300');assert.equal(stored.zones[9].name,'Travel');assert.ok(fake.bankTail.every(v=>v===0xd3));
 });
});

test('Imported channel lists write all channels without a prior read or configuration changes',async t=>{
 await withRadio(t,{},async (radio,fake)=>{
  const image=original.slice(0,32000),file={kind:'uv32-channel-file',wireHex:uv32ImageToHex(image)};
  const report=await writeUv32Bluetooth(radio,file,image);
  assert.equal(report.acknowledged,250);
  assert.equal(fake.reads,0);
  assert.equal(fake.writes,250);
 });
});
