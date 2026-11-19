// UV32PRO Bluetooth writes use the frame and chunk sizes observed in OLA.
import {identifyProfile,consumeUv32ReadSession} from './uat-protocols.mjs?v=20.46';
import {finishUv32Session,cachedUv32ConfigBlocks,readUv32ConfigBlocks,rememberUv32ConfigBlocks} from './uat-uv32-read.mjs';
import {uv32BluetoothFieldChanges,uv32WorkspaceImage} from './uat-uv32-edit.mjs';
import {openUv32Capture} from './uat-uv32-capture.mjs';
import {UV32_RECORD_BYTES,UV32_CHANNEL_BYTES,uv32WireDecode} from './uv32-codec.mjs';

const WRITE_BLOCK_BYTES=128,WRITE_CHUNK_BYTES=16;
const identityKey=handshake=>JSON.stringify([handshake.id,handshake.config]);

export async function writeUv32Bluetooth(radio,baseline,editedImage,{
 signal, stage=()=>{}, progress=()=>{},fileSettings=null
}={}){
 if(radio.busy||radio.connecting)throw Error('Another radio operation is already running');
 if(!radio.connected)throw Error('Use Connect at the top before writing to the UV-32.');
 const original=uv32WorkspaceImage(baseline?.kind==='uv32-cable-full-read-v1'?openUv32Capture(baseline):baseline);
 const patches=uv32BluetoothFieldChanges(original,editedImage,fileSettings);
 const addresses=[...new Set(patches.map(patch=>patch.address))];
 const wire=uv32WireDecode(editedImage).slice(0,UV32_CHANNEL_BYTES);
 // Match the empty-slot representation in the confirmed OLA upload.
 for(let offset=0;offset<wire.length;offset+=UV32_RECORD_BYTES){
  if(wire[offset]!==0xff)continue;
  wire.fill(0xff,offset,offset+UV32_RECORD_BYTES);
  wire.fill(0,offset+8,offset+16);
 }
 const totalBlocks=UV32_CHANNEL_BYTES/WRITE_BLOCK_BYTES+addresses.length;
 const report={kind:'uv32-bluetooth-write-v1',stage:'connecting',totalBlocks,acknowledged:0,attemptedAddress:null};
 const device=radio.device;
 let ownsBusy=false;
 const checkCancelled=()=>{if(signal?.aborted)throw Error('Bluetooth write cancelled');};
 try{
  checkCancelled();
  const saved=new Map(cachedUv32ConfigBlocks(radio));
  const missing=addresses.filter(a=>!saved.has(a));
  if(missing.length){
   stage('Getting the current bytes around the edited fields…');
   await identifyProfile(radio,'uv32',{sendMode:'with-response'});
   consumeUv32ReadSession(radio);
   radio.busy=true;ownsBusy=true;
   for(const [a,bytes] of await readUv32ConfigBlocks(radio,missing,signal))saved.set(a,bytes);
   await finishUv32Session(radio,'read');
   radio.busy=false;ownsBusy=false;
  }
  checkCancelled();
  if(radio.device!==device||!radio.connected)throw Error('UV-32 connection changed before writing');
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
  const frames=new Map();
  for(let address=0;address<UV32_CHANNEL_BYTES;address+=WRITE_BLOCK_BYTES)frames.set(address,wire.subarray(address,address+WRITE_BLOCK_BYTES));
  let renamedBanks=0;
  for(const address of addresses){
   const decoded=uv32WireDecode(saved.get(address));
   for(const patch of patches){
    if(patch.address!==address)continue;
    if(patch.bank&&patch.bytes.some((v,i)=>decoded[patch.offset+i]!==v))renamedBanks++;
    patch.bytes.forEach((byte,i)=>{const at=patch.offset+i;decoded[at]=(decoded[at]&~patch.mask)|(byte&patch.mask);});
   }
   const payload=uv32WireDecode(decoded);
   if(payload.some((v,i)=>v!==saved.get(address)[i]))frames.set(address,payload);
   saved.set(address,payload);
  }
  report.totalBlocks=frames.size;
  progress('Writing',0,report.totalBlocks);
  for(const [address,payload] of frames){
   const frame=Uint8Array.of(0x57,address>>8,address&255,WRITE_BLOCK_BYTES,...payload);
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
   progress('Writing',report.acknowledged,report.totalBlocks);
   if(report.acknowledged<report.totalBlocks){
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
  if(radio.connected&&patches.length)rememberUv32ConfigBlocks(radio,saved);
  report.renamedBanks=renamedBanks;
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
