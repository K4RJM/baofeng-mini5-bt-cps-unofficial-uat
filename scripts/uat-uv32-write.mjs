// UAT only. The cable write frame is carried over the verified UV32PRO BLE session.
import {identifyProfile,consumeUv32ReadSession} from './uat-protocols.mjs?v=20.46';
import {captureUv32Channels} from './uat-uv32-read.mjs';
import {changedUv32Blocks,uv32ChannelCaptureImage,uv32ImageFromHex,uv32ImageToHex} from './uat-uv32-edit.mjs';
import {openUv32Capture} from './uat-uv32-capture.mjs';
import {UV32_BLOCK_BYTES,UV32_CHANNEL_BYTES,uv32WireDecode} from './uv32-codec.mjs';

const ADDRESS_HEX_BYTES=UV32_CHANNEL_BYTES*2;
const identityKey=handshake=>JSON.stringify([handshake.id,handshake.config]);

// Reopen the already-authorized device without another picker or user gesture.
// This only runs after the shared reader has connected to and identified a UV-32.
async function reconnectUv32(radio,device){
 if(!device||radio.device!==device||radio.connected||radio.busy||radio.connecting||radio.unsettledNative.size)
  throw Error('Cannot reopen the verified UV-32 Bluetooth connection');
 const generation=radio.generation;
 const check=()=>{
  if(radio.generation!==generation||radio.device!==device||!device.gatt.connected)
   throw Error('UV-32 Bluetooth link changed during reconnection');
 };
 radio.connecting=true;
 try{
  radio.disconnected=()=>{
   if(radio.generation!==generation||radio.device!==device||device.gatt.connected)return;
   radio.invalidate(Error('UV-32 Bluetooth link ended'));
   radio.onDisconnect();
  };
  device.addEventListener('gattserverdisconnected',radio.disconnected);
  const server=await radio.native('Reconnecting UV-32',()=>device.gatt.connect(),radio.deadlines.connect,()=>{
   if(device.gatt.connected)device.gatt.disconnect();
  });check();
  const service=await radio.native('Finding UV-32 service',()=>server.getPrimaryService(0xffe0),radio.deadlines.discovery);check();
  const characteristic=await radio.native('Finding UV-32 data connection',()=>service.getCharacteristic(0xffe1),radio.deadlines.discovery);check();
  await radio.native('Enabling UV-32 responses',()=>characteristic.startNotifications(),radio.deadlines.notifications);check();
  radio.char=characteristic;
  radio.notify=event=>{
   if(radio.generation===generation&&event.target===characteristic)radio.receive(event.target.value);
  };
  characteristic.addEventListener('characteristicvaluechanged',radio.notify);
 }catch(error){
  radio.disconnect();
  throw error;
 }finally{radio.connecting=false;}
}

export async function writeUv32Bluetooth(radio,baseline,editedImage,{
 signal, stage=()=>{}, progress=()=>{}, interBlockDelayMs
}={}){
 if(radio.busy||radio.connecting)throw Error('Another radio operation is already running');
 const channelOnly=baseline?.kind==='uv32-channel-read-v1';
 const original=channelOnly?uv32ChannelCaptureImage(baseline):uv32ImageFromHex(
  baseline?.kind==='uv32-cable-full-read-v1'?openUv32Capture(baseline).wireHex:baseline?.wireHex);
 const changes=changedUv32Blocks(original,editedImage);
 if(changes.some(block=>block.address>=UV32_CHANNEL_BYTES))throw Error('Write settings, VFO, DTMF and zone edits by cable');
 const wire=uv32WireDecode(editedImage);
 const expected=uv32ImageToHex(editedImage).slice(0,ADDRESS_HEX_BYTES);
 // OLA's UV32PRO upload starts the channel range at zero and advances in
 // 64-byte blocks. A sparse write beginning at the first changed block is
 // rejected on the physical radio. Stay within the channel capture.
 const totalBlocks=UV32_CHANNEL_BYTES/UV32_BLOCK_BYTES;
 const report={kind:'uv32-bluetooth-write-v1',stage:'connecting',totalBlocks,acknowledged:0,attemptedAddress:null,verified:false};
 let device,ownsBusy=false;
 const checkCancelled=()=>{if(signal?.aborted)throw Error('Bluetooth write cancelled');};
 const reconnect=()=>reconnectUv32(radio,device);
 const read=(label,connectRadio)=>captureUv32Channels(radio,{
  connect:connectRadio,signal,interBlockDelayMs,
  stage:text=>stage(label+' · '+text),progress:(n,total)=>progress(label,n,total)
 });
 try{
  checkCancelled();
  stage('Connecting to UV-32 for writing…');
  if(baseline.handshake&&radio.connected)radio.disconnect();
  await radio.connect();
  device=radio.device;
  checkCancelled();
  report.stage='identifying';
  stage('Identifying UV-32 for writing…');
  const identity=await identifyProfile(radio,'uv32',{sendMode:'with-response'});
  if(baseline.handshake?.id&&identityKey(identity)!==identityKey(baseline.handshake))throw Error('UV-32 identification differs from the previous Bluetooth read');
  const session=consumeUv32ReadSession(radio);
  const {characteristic,generation}=session;
  const check=()=>{
   checkCancelled();
   if(!radio.connected||radio.device!==device||radio.char!==characteristic||radio.generation!==generation)throw Error('Bluetooth link changed during the write');
  };
  if(!characteristic.properties.write||typeof characteristic.writeValueWithResponse!=='function')throw Error('Bluetooth writing with response is unavailable');
  radio.busy=true;ownsBusy=true;report.stage='writing';
  progress('Writing channels',0,totalBlocks);
  for(let address=0;address<UV32_CHANNEL_BYTES;address+=UV32_BLOCK_BYTES){
   const frame=Uint8Array.of(0x57,address>>8,address&255,UV32_BLOCK_BYTES,...wire.subarray(address,address+UV32_BLOCK_BYTES));
   check();
   if(radio.rx.length)throw Error('Unexpected response before sending the write block');
   report.attemptedAddress=address;
   // Send the complete CPS frame as one characteristic value. Splitting it
   // into separate characteristic writes produced 0x00 even at address zero.
   await radio.native('Sending complete UV-32 write block',()=>characteristic.writeValueWithResponse(frame),radio.deadlines.send);
   check();
   const response=await radio.wait(1);
   if(response[0]!==0x06)throw Error('Radio rejected the write block (response 0x'+response[0].toString(16).padStart(2,'0')+')');
   await radio.pause(20);
   check();
   if(radio.rx.length)throw Error('Unexpected bytes after the write acknowledgement');
   report.acknowledged++;
  progress('Writing channels',report.acknowledged,totalBlocks);
  }
  radio.busy=false;ownsBusy=false;
  report.stage='read-back';
  const after=await read('Read-back',reconnect);
  if(identityKey(after.handshake)!==identityKey(identity)||after.wireHex!==expected)throw Error('Bluetooth read-back differs from the edited channel data');
  report.verified=true;report.stage='complete';
  return report;
 }catch(error){
  const detail=error?.message??String(error);
  report.error=detail;
  if(error?.uv32ReadReport)report.read=error.uv32ReadReport;
  let context='No blocks sent.';
  if(report.attemptedAddress!==null){
   const address=report.attemptedAddress.toString(16).padStart(4,'0').toUpperCase();
   context=`${report.acknowledged}/${report.totalBlocks} blocks acknowledged, last attempted 0x${address}.`;
  }
  const failure=new Error(`${detail} · ${context}`,{cause:error});
  failure.uv32BluetoothWriteReport=report;
  throw failure;
 }finally{
  if(ownsBusy)radio.busy=false;
  if(radio.connected)radio.disconnect();
 }
}
