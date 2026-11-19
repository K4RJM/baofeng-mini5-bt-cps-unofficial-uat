// UV32PRO Bluetooth writes use the frame and chunk sizes observed in OLA.
import {identifyProfile,consumeUv32ReadSession} from './uat-protocols.mjs?v=20.46';
import {captureUv32Channels,finishUv32Session} from './uat-uv32-read.mjs';
import {changedUv32Blocks,uv32ChannelCaptureImage,uv32ImageFromHex,uv32ImageToHex} from './uat-uv32-edit.mjs';
import {openUv32Capture} from './uat-uv32-capture.mjs';
import {UV32_RECORD_BYTES,UV32_CHANNEL_BYTES,uv32WireDecode} from './uv32-codec.mjs';

const WRITE_BLOCK_BYTES=128,WRITE_CHUNK_BYTES=16;
const CHANNEL_HEX_BYTES=UV32_RECORD_BYTES*2;

function channelsMatch(expected,actual){
 if(expected.length!==actual.length)return false;
 for(let offset=0;offset<expected.length;offset+=CHANNEL_HEX_BYTES){
  const expectedRecord=expected.slice(offset,offset+CHANNEL_HEX_BYTES);
  const actualRecord=actual.slice(offset,offset+CHANNEL_HEX_BYTES);
  if(expectedRecord.startsWith('ff')&&actualRecord.startsWith('ff'))continue;
  if(expectedRecord!==actualRecord)return false;
 }
 return true;
}
const identityKey=handshake=>JSON.stringify([handshake.id,handshake.config]);

// Reopen the already-authorized device without another picker or user gesture.
// This only runs after the browser has authorized the selected device.
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
 if(!radio.connected)throw Error('Use Connect at the top before writing to the UV-32.');
 const channelOnly=baseline?.kind==='uv32-channel-read-v1';
 const original=channelOnly?uv32ChannelCaptureImage(baseline):uv32ImageFromHex(
  baseline?.kind==='uv32-cable-full-read-v1'?openUv32Capture(baseline).wireHex:baseline?.wireHex);
 const changes=changedUv32Blocks(original,editedImage);
 if(changes.some(block=>block.address>=UV32_CHANNEL_BYTES))throw Error('Write settings, VFO, DTMF and zone edits by cable');
 const wire=uv32WireDecode(editedImage).slice(0,UV32_CHANNEL_BYTES);
 const expected=uv32ImageToHex(editedImage).slice(0,UV32_CHANNEL_BYTES*2);
 // Match the empty-slot representation in the confirmed OLA upload.
 for(let offset=0;offset<wire.length;offset+=UV32_RECORD_BYTES){
  if(wire[offset]!==0xff)continue;
  wire.fill(0xff,offset,offset+UV32_RECORD_BYTES);
  wire.fill(0,offset+8,offset+16);
 }
 const totalBlocks=UV32_CHANNEL_BYTES/WRITE_BLOCK_BYTES;
 const report={kind:'uv32-bluetooth-write-v1',stage:'connecting',totalBlocks,acknowledged:0,attemptedAddress:null,verified:false};
 const device=radio.device;
 let ownsBusy=false;
 const checkCancelled=()=>{if(signal?.aborted)throw Error('Bluetooth write cancelled');};
 async function reconnect(){
  for(let attempt=1;attempt<=3;attempt++){
   checkCancelled();
   radio.disconnect();
   await radio.pause(600*attempt);
   checkCancelled();
   try{await reconnectUv32(radio,device);return;}
   catch(error){if(attempt===3||signal?.aborted||radio.unsettledNative.size)throw error;}
  }
 }
 try{
  checkCancelled();
  report.stage='identifying';
  stage('Identifying UV-32 for writing…');
  const identity=await identifyProfile(radio,'uv32',{sendMode:'without-response',writeSession:true});
  if(baseline.handshake?.id&&identityKey(identity)!==identityKey(baseline.handshake))throw Error('UV-32 identification differs from the previous Bluetooth read');
  const session=consumeUv32ReadSession(radio);
  const {characteristic,generation}=session;
  const check=()=>{
   checkCancelled();
   if(!radio.connected||radio.device!==device||radio.char!==characteristic||radio.generation!==generation)throw Error('Bluetooth link changed during the write');
  };
  if(!characteristic.properties.writeWithoutResponse||typeof characteristic.writeValueWithoutResponse!=='function')throw Error('This UV-32 Bluetooth link does not support the short writes needed for channel programming.');
  radio.busy=true;ownsBusy=true;report.stage='writing';
  progress('Writing channels',0,totalBlocks);
  for(let address=0;address<UV32_CHANNEL_BYTES;address+=WRITE_BLOCK_BYTES){
   const frame=Uint8Array.of(0x57,address>>8,address&255,WRITE_BLOCK_BYTES,...wire.subarray(address,address+WRITE_BLOCK_BYTES));
   check();
   if(radio.rx.length)throw Error('Unexpected response before sending the write block');
   report.attemptedAddress=address;
   // The radio acknowledges each complete frame before the next one starts.
   for(let offset=0;offset<frame.length;offset+=WRITE_CHUNK_BYTES){
    check();
    if(radio.rx.length)throw Error('UV-32 replied before receiving the complete write block');
    const chunk=frame.subarray(offset,offset+WRITE_CHUNK_BYTES);
    await radio.native('Sending UV-32 write data',()=>characteristic.writeValueWithoutResponse(chunk),radio.deadlines.send);
   }
   check();
   const response=await radio.wait(1);
   if(response[0]!==0x06)throw Error('Radio rejected the write block (response 0x'+response[0].toString(16).padStart(2,'0')+')');
   report.acknowledged++;
   progress('Writing channels',report.acknowledged,totalBlocks);
   if(report.acknowledged<totalBlocks){
    check();
    if(radio.rx.length)throw Error('Unexpected bytes after the write acknowledgement');
   }
  }
  checkCancelled();
  report.stage='finishing';
  stage('Closing the UV-32 programming session…');
  try{
   check();
   await finishUv32Session(radio,'write');
  }catch(error){
   checkCancelled();
   if(radio.connected)throw error;
   stage('Bluetooth ended after the last acknowledgment. Reconnecting to verify…');
  }
  radio.busy=false;ownsBusy=false;
  report.stage='read-back';
  const after=await captureUv32Channels(radio,{
   connect:reconnect,signal,interBlockDelayMs,
   stage:text=>stage('Read-back · '+text),progress:(n,total)=>progress('Read-back',n,total)
  });
  if(identityKey(after.handshake)!==identityKey(identity)||!channelsMatch(expected,after.wireHex))throw Error('Bluetooth read-back differs from the edited channel data');
  report.verified=true;
  if(!radio.connected){
   stage('Restoring the UV-32 Bluetooth connection…');
   try{await reconnect();}
   catch(error){report.connectionError=error.message;}
  }
  report.reconnected=radio.connected&&!report.connectionError;
  report.stage='complete';
  return report;
 }catch(error){
  const detail=error?.message??String(error);
  report.error=detail;
  if(error?.uv32ReadReport)report.read=error.uv32ReadReport;
  let context='No blocks sent.';
  if(report.acknowledged===report.totalBlocks){
   context=`All ${report.totalBlocks} write blocks acknowledged. Read-back was not verified.`;
   if(!radio.connected)context+=' Use Connect to reconnect.';
  }else if(report.attemptedAddress!==null){
   const address=report.attemptedAddress.toString(16).padStart(4,'0').toUpperCase();
   context=`${report.acknowledged}/${report.totalBlocks} blocks acknowledged, last attempted 0x${address}.`;
  }
  const failure=new Error(`${detail} · ${context}`,{cause:error});
  failure.uv32BluetoothWriteReport=report;
  throw failure;
 }finally{
  if(ownsBusy)radio.busy=false;
  if(!report.reconnected)radio.disconnect();
 }
}
