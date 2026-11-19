import {REGIONS,SIZE,compare,offset,hex} from '../read-test/memory.mjs';
import {makePlan} from '../writer.mjs';
import {offlineFrames} from '../radio-encoder.mjs';

const BLOCK_SIZE=64;
const TOTAL_BLOCKS=SIZE/BLOCK_SIZE;
const READ_ADDRESSES=REGIONS.flatMap(({start,size})=>
 Array.from({length:size/BLOCK_SIZE},(_,index)=>start+index*BLOCK_SIZE));
const EXIT_READ=Uint8Array.of(0x45);
const MAX_BLOCK_RETRIES=5;
const MODEL_SETTLE_MS=100;
const CABLE_QUIET_MS=15;
class CableReceiveTimeout extends Error {}
const MAGIC=new TextEncoder().encode('PROGRAMCOLORPROU');
const INIT=Uint8Array.from('53454e4421050d010101041108050d0d01110f091209100400'.match(/../g),byte=>parseInt(byte,16));

async function withMini5Port(port,operation,{timeoutMs=1000}={}){
 await port.open({baudRate:115200,dataBits:8,stopBits:1,parity:'none',flowControl:'none'});
 let reader,writer;
 try{
  await port.setSignals({requestToSend:true,dataTerminalReady:true});
  reader=port.readable.getReader();
  writer=port.writable.getWriter();
  let pending=new Uint8Array();
  async function timed(promise,remaining,message,ErrorType=Error){
   let timer;
   try{
    return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new ErrorType(message)),remaining);})]);
   }finally{clearTimeout(timer);}
  }
  let outstandingRead;
  async function receive(waitMs,message){
   // A timeout leaves the native read outstanding. Reuse it so two callers can never consume each other's reply.
   outstandingRead??=reader.read();
   const {done,value}=await timed(outstandingRead,waitMs,message,CableReceiveTimeout);
   outstandingRead=null;
   if(done)throw Error('MINI-5 programming cable disconnected.');
   if(value.length){
    const next=new Uint8Array(pending.length+value.length);
    next.set(pending);next.set(value,pending.length);pending=next;
   }
  }
  async function exact(count,stage){
   const deadline=Date.now()+timeoutMs;
   while(pending.length<count){
    const remaining=deadline-Date.now();
    const message=`MINI-5 cable timed out during ${stage} (received ${pending.length} of ${count} bytes).`;
    if(remaining<=0)throw new CableReceiveTimeout(message);
    await receive(remaining,message);
   }
   const response=pending.slice(0,count);
   pending=pending.slice(count);
   return response;
  }
  async function takeBurst(stage){
   const deadline=Date.now()+timeoutMs;
   for(;;){
    const remaining=deadline-Date.now();
    if(pending.length>256||remaining<=0)throw Error('MINI-5 cable did not become quiet during '+stage+'.');
    try{await receive(Math.min(CABLE_QUIET_MS,remaining),stage);}
    catch(error){
     if(!(error instanceof CableReceiveTimeout))throw error;
     const burst=pending;pending=new Uint8Array();return burst;
    }
   }
  }
  const send=bytes=>timed(writer.write(bytes),timeoutMs,'MINI-5 cable send timed out.');
  // Some two-pin cable interfaces return the entire outgoing command before the radio replies.
  // Establish this once on the distinctive identification string. A read reply can itself start with the request header.
  let echoes=false;
  function checkBoundary(stage){
   if(pending.length)throw Error(`MINI-5 cable returned ${pending.length} unexpected bytes during ${stage}.`);
  }
  async function checkEcho(command,stage){
   const echoed=await exact(command.length,stage+' cable echo');
   if(!command.every((byte,i)=>byte===echoed[i]))throw Error('MINI-5 cable echo did not match the command during '+stage+'.');
  }
  await send(MAGIC);
  let ack=(await exact(1,'identification'))[0];
  if(ack===MAGIC[0]){
   await checkEcho(MAGIC.subarray(1),'identification');
   echoes=true;
   ack=(await exact(1,'radio acknowledgment after the cable echo'))[0];
  }
  if(ack!==6)throw Error('MINI-5 cable handshake was rejected.');
  checkBoundary('identification');
  const request=async (bytes,count,stage)=>{
   checkBoundary(stage);
   await send(bytes);
   if(echoes)await checkEcho(bytes,stage);
   const response=await exact(count,stage);
   checkBoundary(stage);
   return response;
  };
  const config=await request(Uint8Array.of(0x46),16,'frequency query');
  const modelQuery=Uint8Array.of(0x4d);
  await send(modelQuery);
  await new Promise(resolve=>setTimeout(resolve,MODEL_SETTLE_MS));
  if(echoes)await checkEcho(modelQuery,'model identification');
  const modelBytes=await exact(8,'model identification');
  const model=new TextDecoder().decode(modelBytes).trim();
  if(model!=='5RMINI')throw Error('The selected device did not identify as 5RMINI.');
  const id=[...modelBytes,...await takeBurst('model identification')];
  const identity={model,id,config:[...config]};
  if((await request(INIT,1,'initialization'))[0]!==6)throw Error('MINI-5 cable initialization was rejected.');
  async function readBlock(address,onRetry){
   const header=Uint8Array.of(0x52,address>>8,address&255,BLOCK_SIZE),stage='read at 0x'+hex(address);
   for(let attempt=0;;attempt++){
    try{
     const reply=await request(header,BLOCK_SIZE+4,stage);
     if(!header.every((byte,i)=>reply[i]===byte))throw Error('Unexpected MINI-5 read response at 0x'+hex(address));
     return reply.subarray(4);
    }catch(error){
     if(!(error instanceof CableReceiveTimeout))throw error;
     if(attempt===MAX_BLOCK_RETRIES)throw Error(error.message+' The block remained incomplete after '+attempt+' retries.',{cause:error});
     onRetry(attempt+1);
     // Consume the old fragment and any delayed tail before resending the same address.
     await takeBurst('read retry');
    }
   }
  }
  return await operation({request,identity,readBlock,exitRead:()=>send(EXIT_READ)});
 }finally{
  if(reader){try{await reader.cancel();}catch{}reader.releaseLock();}
  writer?.releaseLock();
  await port.close();
 }
}

export async function readMini5Serial(port,{progress=()=>{},timeoutMs}={}){
 return withMini5Port(port,async({identity,readBlock,exitRead})=>{
  const raw=new Uint8Array(SIZE);
  let completed=0;
  try{
   for(const address of READ_ADDRESSES){
    const block=await readBlock(address,retry=>progress(completed,TOTAL_BLOCKS,'Retrying MINI-5 cable read at 0x'+hex(address)+' ('+retry+'/'+MAX_BLOCK_RETRIES+')'));
    raw.set(block,offset(address));
    progress(++completed,TOTAL_BLOCKS);
   }
  }catch(error){
   await exitRead().catch(()=>{});
   throw error;
  }
  await exitRead();
  return {raw,identity,capturedAt:new Date().toISOString()};
 },{timeoutMs});
}

export async function writeMini5Serial(port,data,options,{progress=()=>{},timeoutMs,verifyAfterWrite=true}={}){
 makePlan(data,options); // Reuse the application’s existing data validation.
 const frames=offlineFrames(data);
 let attempted=false,acknowledged=0;
 try{
  const writtenIdentity=await withMini5Port(port,async({request,identity})=>{
   for(const frame of frames){
    attempted=true;
    if((await request(frame,1,'write at 0x'+hex(frame[1]*256+frame[2])))[0]!==6)throw Error('MINI-5 rejected cable write at 0x'+hex(frame[1]*256+frame[2]));
    progress('Writing radio',++acknowledged,TOTAL_BLOCKS);
   }
   return identity;
  },{timeoutMs});
  if(!verifyAfterWrite)return {identity:writtenIdentity,acknowledged};
  const target=new Uint8Array(SIZE);
  for(const frame of frames)target.set(frame.subarray(4),offset(frame[1]*256+frame[2]));
  const result=await readMini5Serial(port,{timeoutMs,progress:(n,total,recovery)=>progress(recovery??'Verifying radio',n,total)});
  if(result.identity.id.length!==writtenIdentity.id.length||result.identity.id.some((value,index)=>value!==writtenIdentity.id[index]))throw Error('MINI-5 identity changed before cable verification.');
  if(compare(target,result.raw).total)throw Error('MINI-5 cable read-back differs from the write.');
  return result;
 }catch(error){
  if(attempted)throw Error(`${error.message} ${acknowledged}/${TOTAL_BLOCKS} blocks acknowledged. Read the radio before trying again.`,{cause:error});
  throw error;
 }
}
