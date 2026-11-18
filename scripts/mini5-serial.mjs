import {REGIONS,SIZE,compare,offset,hex} from '../read-test/memory.mjs';
import {checkIdentity,makePlan} from '../writer.mjs';
import {offlineFrames} from '../radio-encoder.mjs';

const BLOCK_SIZE=64;
const TOTAL_BLOCKS=SIZE/BLOCK_SIZE;
const MAGIC=new TextEncoder().encode('PROGRAMCOLORPROU');
const INIT=Uint8Array.from('53454e4421050d010101041108050d0d01110f091209100400'.match(/../g),byte=>parseInt(byte,16));

async function withMini5Port(port,operation,{timeoutMs=4000}={}){
 await port.open({baudRate:115200,dataBits:8,stopBits:1,parity:'none',flowControl:'none'});
 let reader,writer;
 try{
  reader=port.readable.getReader();
  writer=port.writable.getWriter();
  let pending=new Uint8Array();
  async function timed(promise,remaining,message){
   let timer;
   try{
    return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(message)),remaining);})]);
   }finally{clearTimeout(timer);}
  }
  async function exact(count){
   const end=Date.now()+timeoutMs;
   while(pending.length<count){
    const remaining=end-Date.now();
    const message=`MINI-5 cable timed out waiting for ${count} bytes (received ${pending.length}).`;
    if(remaining<=0)throw Error(message);
    const {done,value}=await timed(reader.read(),remaining,message);
    if(done)throw Error('MINI-5 programming cable disconnected.');
    const next=new Uint8Array(pending.length+value.length);
    next.set(pending);next.set(value,pending.length);pending=next;
   }
   const response=pending.slice(0,count);
   pending=pending.slice(count);
   return response;
  }
  const send=bytes=>timed(writer.write(bytes),timeoutMs,'MINI-5 cable send timed out.');
  const request=async (bytes,count)=>{
   if(pending.length)throw Error('Unexpected extra bytes from the MINI-5 cable.');
   await send(bytes);
   const response=await exact(count);
   if(pending.length)throw Error('Unexpected extra bytes from the MINI-5 cable.');
   return response;
  };
  if((await request(MAGIC,1))[0]!==6)throw Error('MINI-5 cable handshake was rejected.');
  const config=await request(Uint8Array.of(0x46),16);
  const id=await request(Uint8Array.of(0x4d),15);
  const identity={model:new TextDecoder().decode(id.subarray(0,8)).trim(),id:[...id],config:[...config]};
  checkIdentity(identity);
  if((await request(INIT,1))[0]!==6||pending.length)throw Error('MINI-5 cable initialization was rejected.');
  return await operation(request,identity);
 }finally{
  if(reader){try{await reader.cancel();}catch{}reader.releaseLock();}
  writer?.releaseLock();
  await port.close();
 }
}

export async function readMini5Serial(port,{progress=()=>{},timeoutMs}={}){
 return withMini5Port(port,async(request,identity)=>{
  const raw=new Uint8Array(SIZE);
  let completed=0;
  for(const region of REGIONS)for(let address=region.start;address<region.start+region.size;address+=BLOCK_SIZE){
   const header=[0x52,address>>8,address&255,BLOCK_SIZE];
   const reply=await request(Uint8Array.from(header),BLOCK_SIZE+4);
   if(!header.every((value,index)=>reply[index]===value))throw Error('Unexpected MINI-5 read response at 0x'+hex(address));
   raw.set(reply.subarray(4),offset(address));
   progress(++completed,TOTAL_BLOCKS);
  }
  return {raw,identity,capturedAt:new Date().toISOString()};
 },{timeoutMs});
}

export async function writeMini5Serial(port,data,options,{progress=()=>{},timeoutMs}={}){
 makePlan(data,options); // Reuse the application’s existing data validation.
 const frames=offlineFrames(data);
 const target=new Uint8Array(SIZE);
 for(const frame of frames)target.set(frame.subarray(4),offset(frame[1]*256+frame[2]));
 let attempted=false,acknowledged=0;
 try{
  const writtenIdentity=await withMini5Port(port,async(request,identity)=>{
   for(const frame of frames){
    attempted=true;
    if((await request(frame,1))[0]!==6)throw Error('MINI-5 rejected cable write at 0x'+hex(frame[1]*256+frame[2]));
    progress('Writing radio',++acknowledged,TOTAL_BLOCKS);
   }
   return identity;
  },{timeoutMs});
  const result=await readMini5Serial(port,{timeoutMs,progress:(n,total)=>progress('Verifying radio',n,total)});
  if(result.identity.id.some((value,index)=>value!==writtenIdentity.id[index]))throw Error('MINI-5 identity changed before cable verification.');
  if(compare(target,result.raw).total)throw Error('MINI-5 cable read-back differs from the write.');
  return result;
 }catch(error){
  if(attempted)throw Error(`${error.message} ${acknowledged}/${TOTAL_BLOCKS} blocks acknowledged. Read the radio before trying again.`,{cause:error});
  throw error;
 }
}
