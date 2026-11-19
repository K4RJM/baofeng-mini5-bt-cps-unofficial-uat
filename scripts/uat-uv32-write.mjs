// UV32PRO Bluetooth writes use the frame and chunk sizes observed in OLA.
import {identifyProfile,consumeUv32ReadSession} from './uat-protocols.mjs?v=20.46';
import {finishUv32Session} from './uat-uv32-read.mjs';
import {changedUv32Blocks,uv32ChannelCaptureImage,uv32ImageFromHex} from './uat-uv32-edit.mjs';
import {openUv32Capture} from './uat-uv32-capture.mjs';
import {UV32_RECORD_BYTES,UV32_CHANNEL_BYTES,uv32WireDecode} from './uv32-codec.mjs';

const WRITE_BLOCK_BYTES=128,WRITE_CHUNK_BYTES=16;
const identityKey=handshake=>JSON.stringify([handshake.id,handshake.config]);

export async function writeUv32Bluetooth(radio,baseline,editedImage,{
 signal, stage=()=>{}, progress=()=>{}
}={}){
 if(radio.busy||radio.connecting)throw Error('Another radio operation is already running');
 if(!radio.connected)throw Error('Use Connect at the top before writing to the UV-32.');
 const channelOnly=baseline?.kind==='uv32-channel-read-v1';
 const original=channelOnly?uv32ChannelCaptureImage(baseline):uv32ImageFromHex(
  baseline?.kind==='uv32-cable-full-read-v1'?openUv32Capture(baseline).wireHex:baseline?.wireHex);
 const changes=changedUv32Blocks(original,editedImage);
 if(changes.some(block=>block.address>=UV32_CHANNEL_BYTES))throw Error('Write settings, VFO, DTMF and zone edits by cable');
 const wire=uv32WireDecode(editedImage).slice(0,UV32_CHANNEL_BYTES);
 // Match the empty-slot representation in the confirmed OLA upload.
 for(let offset=0;offset<wire.length;offset+=UV32_RECORD_BYTES){
  if(wire[offset]!==0xff)continue;
  wire.fill(0xff,offset,offset+UV32_RECORD_BYTES);
  wire.fill(0,offset+8,offset+16);
 }
 const totalBlocks=UV32_CHANNEL_BYTES/WRITE_BLOCK_BYTES;
 const report={kind:'uv32-bluetooth-write-v1',stage:'connecting',totalBlocks,acknowledged:0,attemptedAddress:null};
 const device=radio.device;
 let ownsBusy=false;
 const checkCancelled=()=>{if(signal?.aborted)throw Error('Bluetooth write cancelled');};
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
  }
  report.connected=radio.connected;
  report.stage='complete';
  return report;
 }catch(error){
  const detail=error?.message??String(error);
  report.error=detail;
  let context='No blocks sent.';
  if(report.acknowledged===report.totalBlocks){
   context=`All ${report.totalBlocks} write blocks acknowledged.`;
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
  if(report.stage!=='complete')radio.disconnect();
 }
}
