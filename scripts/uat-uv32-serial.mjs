// UAT-only UV-32 cable read. No memory-write command is exposed here.
// Protocol reference: CHIRP baofeng_uv17Pro.py (UV32 -> UV17ProGPS).
import {UV32_BLOCKS,UV32_CHANNEL_BYTES,uv32ReadCommand,uv32Payload,decodeUv32Channels,uv32WireDecode} from './uat-uv32-read.mjs?v=20.54b';
import {decodeUv32Image} from './uat-uv32-image.mjs';
import {openUv32Capture} from './uat-uv32-capture.mjs';
import {uv32ImageFromHex,uv32ImageToHex,changedUv32Blocks} from './uat-uv32-edit.mjs';

export const UV32_SERIAL_BAUD=115200;
// CHIRP UV32 inherits these four discontiguous UV17ProGPS read regions.
export const UV32_SERIAL_REGIONS=Object.freeze([[0x0000,0x8040],[0x9000,0x0040],[0xa000,0x02c0],[0xd000,0x0040]]);
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

// Complete CHIRP-region capture. This is still a read-only evidence artifact;
// individual settings must be decoded and checked against factory CPS.
export async function readUv32SerialImage(port,options={}){
 const regions=UV32_SERIAL_REGIONS;
 return readUv32SerialRegions(port,regions,options);
}

async function readUv32SerialRegions(port,regions,{signal,progress=()=>{},timeoutMs=4000}={}){
 if(!port||!Number.isFinite(timeoutMs)||timeoutMs<1)throw Error('A serial port and positive timeout are required');
 const totalBlocks=regions.reduce((n,[,size])=>n+size/64,0),parts=[];
 const report={kind:'uv32-cable-full-read-v1',transport:'Web Serial',baudRate:UV32_SERIAL_BAUD,
  completed:false,stage:'before-read',regions,completedBlocks:0,totalBlocks,memoryReads:0,memoryWrites:0,
  capturedAt:new Date().toISOString(),wireHex:''};
 let reader,writer,opened=false,pending=[];
 const check=()=>{if(signal?.aborted)throw Error('UV-32 cable read cancelled');};
 const exact=async count=>{const out=[];const end=Date.now()+timeoutMs;
  while(out.length<count){check();while(pending.length&&out.length<count)out.push(pending.shift());if(out.length===count)break;
   if(Date.now()>=end)throw Error(`Cable timeout: expected ${count} bytes, received ${out.length}`);
   let timer;try{const r=await Promise.race([reader.read(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(`Cable timeout: expected ${count} bytes, received ${out.length}`)),end-Date.now());})]);if(r.done)throw Error('Cable disconnected during UV-32 read');pending.push(...r.value);}finally{clearTimeout(timer);}
  }return Uint8Array.from(out);
 };
 const send=async b=>{check();await writer.write(b);check();};
 try{
  await port.open({baudRate:UV32_SERIAL_BAUD,dataBits:8,stopBits:1,parity:'none',flowControl:'none'});opened=true;
  reader=port.readable.getReader();writer=port.writable.getWriter();
  report.stage='identifying';await send(magic);if((await exact(1))[0]!==6)throw Error('UV-32 cable identification not acknowledged');
  await send(Uint8Array.of(0x46));report.frequencyResponseHex=hex(await exact(16));
  await send(Uint8Array.of(0x4d));report.identity=new TextDecoder('ascii').decode(await exact(7));
  if(report.identity!=='UV32PRO')throw Error('UV-32 cable model mismatch: '+report.identity);
  await send(init);if((await exact(1))[0]!==6)throw Error('UV-32 cable initialization not acknowledged');
  report.stage='reading';
  for(const [start,size] of regions)for(let address=start;address<start+size;address+=64){
   check();report.attemptedAddress=address;report.memoryReads++;
   await send(Uint8Array.of(0x52,address>>8,address&255,64));
   const response=await exact(68);
   if(response[0]!==0x52||response[1]!==address>>8||response[2]!==(address&255)||response[3]!==64)throw Error('Unexpected UV-32 read header at 0x'+address.toString(16));
   parts.push(response.slice(4));report.completedBlocks++;progress(report.completedBlocks,totalBlocks,address);
  }
  const wire=Uint8Array.from(parts.flatMap(b=>Array.from(b)));
  report.wireHex=hex(wire);report.bytes=wire.length;report.preview=decodeUv32Channels(wire.slice(0,UV32_CHANNEL_BYTES));
  report.readout=decodeUv32Image(uv32WireDecode(wire));
  report.completed=true;report.stage='complete';return report;
 }catch(error){report.error=error.message;error.uv32ReadReport=report;throw error;}
 finally{try{await reader?.cancel();}catch{}try{reader?.releaseLock();}catch{}try{writer?.releaseLock();}catch{}if(opened)try{await port.close();}catch{}}
}

// CHIRP's UV-32 upload sends every 64-byte block in the four image regions.
// A fresh, exact read prevents a stale capture from overwriting a changed radio.
export async function writeUv32SerialImage(port,baseline,editedImage,{signal,progress=()=>{},timeoutMs=4000}={}){
 const source=openUv32Capture(baseline),original=uv32ImageFromHex(source.wireHex);
 const editedHex=uv32ImageToHex(editedImage),changes=changedUv32Blocks(original,editedImage);
 if(!changes.length)throw Error('No UV-32 edits to write');
 const report={kind:'uv32-cable-write-v1',stage:'preflight',completed:false,identity:null,changedBlocks:changes.length,completedBlocks:0,totalBlocks:526,readBackVerified:false};
 const check=()=>{if(signal?.aborted)throw Error('UV-32 write cancelled');};
 let reader,writer,opened=false,pending=[];
 const exact=async count=>{const out=[];const end=Date.now()+timeoutMs;while(out.length<count){check();while(pending.length&&out.length<count)out.push(pending.shift());if(out.length===count)break;const remaining=end-Date.now();if(remaining<=0)throw Error(`Cable timeout: expected ${count} bytes, received ${out.length}`);let timer;try{const r=await Promise.race([reader.read(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(`Cable timeout: expected ${count} bytes, received ${out.length}`)),remaining);})]);if(r.done)throw Error('Cable disconnected during UV-32 write');pending.push(...r.value);}finally{clearTimeout(timer);}}return Uint8Array.from(out);};
 const send=async bytes=>{check();await writer.write(bytes);check();};
 try{
  const fresh=await readUv32SerialImage(port,{signal,timeoutMs,progress:(n,total)=>progress('preflight',n,total)});
  if(fresh.wireHex!==source.wireHex)throw Error('Radio changed since this capture. Read it again before writing.');
  report.stage='identifying';
  await port.open({baudRate:UV32_SERIAL_BAUD,dataBits:8,stopBits:1,parity:'none',flowControl:'none'});opened=true;
  reader=port.readable.getReader();writer=port.writable.getWriter();
  await send(magic);if((await exact(1))[0]!==6)throw Error('UV-32 cable identification not acknowledged');
  await send(Uint8Array.of(0x46));await exact(16);
  await send(Uint8Array.of(0x4d));report.identity=new TextDecoder('ascii').decode(await exact(7));
  if(report.identity!=='UV32PRO')throw Error('UV-32 cable model mismatch: '+report.identity);
  await send(init);if((await exact(1))[0]!==6)throw Error('UV-32 cable initialization not acknowledged');
  report.stage='writing';const wire=Uint8Array.from(editedHex.match(/../g),x=>parseInt(x,16));let offset=0;
  for(const [start,size] of UV32_SERIAL_REGIONS)for(let address=start;address<start+size;address+=64){
   check();report.attemptedAddress=address;
   const frame=new Uint8Array(68);frame.set([0x57,address>>8,address&255,64]);frame.set(wire.slice(offset,offset+64),4);
   await send(frame);if((await exact(1))[0]!==6)throw Error('UV-32 rejected write at 0x'+address.toString(16).padStart(4,'0'));
   offset+=64;report.completedBlocks++;progress('write',report.completedBlocks,526,address);
  }
 }catch(error){report.error=error.message;error.uv32WriteReport=report;throw error;}
 finally{try{await reader?.cancel();}catch{}try{reader?.releaseLock();}catch{}try{writer?.releaseLock();}catch{}if(opened)try{await port.close();}catch{}}
 try{
  report.stage='verifying';const readBack=await readUv32SerialImage(port,{signal,timeoutMs,progress:(n,total)=>progress('verify',n,total)});
  if(readBack.wireHex!==editedHex)throw Error('UV-32 read-back differs from the edited image');
  report.completed=true;report.readBackVerified=true;report.stage='complete';return report;
 }catch(error){report.error=error.message;error.uv32WriteReport=report;throw error;}
}
