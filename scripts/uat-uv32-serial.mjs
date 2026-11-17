// UAT-only UV-32 cable read. No memory-write command is exposed here.
// Protocol reference: CHIRP baofeng_uv17Pro.py (UV32 -> UV17ProGPS).
import {UV32_BLOCKS,UV32_CHANNEL_BYTES,uv32ReadCommand,uv32Payload,decodeUv32Channels} from './uat-uv32-read.mjs';

export const UV32_SERIAL_BAUD=115200;
const magic=new TextEncoder().encode('PROGRAMCOLORPROU');
const init=Uint8Array.of(0x53,0x45,0x4e,0x44,0x21,0x05,0x0d,0x01,0x01,0x01,0x04,0x11,0x08,0x05,0x0d,0x0d,0x01,0x11,0x0f,0x09,0x12,0x09,0x10,0x04,0x00);
const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');

export async function readUv32Serial(port,{signal,progress=()=>{},timeoutMs=4000}={}){
 if(!port||!Number.isFinite(timeoutMs)||timeoutMs<1)throw Error('A serial port and positive timeout are required');
 if(signal?.aborted)throw Error('UV-32 cable read cancelled');
 const report={kind:'uv32-cable-channel-read-v1',transport:'Web Serial',baudRate:UV32_SERIAL_BAUD,completed:false,
  scope:'Channel records only; not a complete codeplug or firmware backup',completedBlocks:0,memoryReads:0,memoryWrites:0,
  capturedAt:new Date().toISOString(),wireHex:''};
 let reader,writer,pending=[],readError;
 const check=()=>{if(signal?.aborted)throw Error('UV-32 cable read cancelled');};
 const take=async count=>{
  const bytes=[];const deadline=Date.now()+timeoutMs;
  while(bytes.length<count){
   check();
   while(pending.length&&bytes.length<count)bytes.push(pending.shift());
   if(bytes.length===count)break;
   const remaining=deadline-Date.now();
   if(remaining<=0)throw Error(`Cable timeout: expected ${count} bytes, received ${bytes.length}`);
   // Cancel the outstanding read on timeout so close() cannot hang.
   let timer;const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(`Cable timeout: expected ${count} bytes, received ${bytes.length}`)),remaining);});
   try{const result=await Promise.race([reader.read(),timeout]);if(result.done)throw Error('Cable disconnected during UV-32 read');pending.push(...result.value);}
   finally{clearTimeout(timer);}
  }
  return Uint8Array.from(bytes);
 };
 const send=async bytes=>{check();await writer.write(bytes);check();};
 try{
  await port.open({baudRate:UV32_SERIAL_BAUD,dataBits:8,stopBits:1,parity:'none',flowControl:'none'});
  reader=port.readable.getReader();writer=port.writable.getWriter();
  report.stage='identifying';await send(magic);
  const ack=await take(1);if(ack[0]!==6)throw Error('UV-32 cable identification not acknowledged');
  report.stage='initializing';await send(Uint8Array.of(0x46));report.frequencyResponseHex=hex(await take(16));
  await send(Uint8Array.of(0x4d));const identity=await take(7);
  report.identity=new TextDecoder('ascii').decode(identity);
  if(report.identity!=='UV32PRO')throw Error('UV-32 cable model mismatch: '+report.identity);
  await send(init);const ready=await take(1);if(ready[0]!==6)throw Error('UV-32 cable initialization not acknowledged');
  report.stage='reading';const wire=new Uint8Array(UV32_CHANNEL_BYTES);
  for(let block=0;block<UV32_BLOCKS;block++){
   check();const address=block*64;report.attemptedAddress=address;report.memoryReads++;
   await send(uv32ReadCommand(address));
   const response=await take(68);wire.set(uv32Payload(response,address),address);
   report.completedBlocks++;progress(block+1,UV32_BLOCKS);
  }
  report.wireHex=hex(wire);report.bytes=wire.length;report.preview=decodeUv32Channels(wire);
  report.completed=true;report.stage='complete';return report;
 }catch(error){readError=error;report.error=error.message;error.uv32ReadReport=report;throw error;}
 finally{
  // A failed or cancelled read never produces a partial image. The caller may
  // retain only validated blocks in a future diagnostic report.
  try{await reader?.cancel();}catch{}try{reader?.releaseLock();}catch{}
  try{writer?.releaseLock();}catch{}try{await port.close();}catch(error){if(!readError)throw error;}
 }
}
