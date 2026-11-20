// RT-950 Pro CPS 1.3.3 opens a serial port at 115200 8N1 with no flow control.
// The programming frames and memory map are shared with the Bluetooth workspace.
async function timed(promise,ms,message){
 let timer;
 try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(message)),ms);})]);}
 finally{clearTimeout(timer);}
}

export async function withRt950Serial(port,operation){
 await port.open({baudRate:115200,dataBits:8,parity:'none',stopBits:1,flowControl:'none'});
 let reader,writer,failed=false;
 try{
  await port.setSignals({dataTerminalReady:false,requestToSend:false});
  reader=port.readable.getReader();
  writer=port.writable.getWriter();
  const link={
   async write(bytes){
    await timed(writer.write(bytes),3000,'RT-950 Pro cable send timed out.');
   },
   async readExactly(count,timeoutMs){
    const result=new Uint8Array(count),deadline=Date.now()+timeoutMs;
    let received=0;
    while(received<count){
     const remaining=deadline-Date.now();
     const message='RT-950 Pro cable timed out after '+received+' of '+count+' response bytes.';
     if(remaining<=0)throw Error(message);
     const {done,value}=await timed(reader.read(),remaining,message);
     if(done)throw Error('RT-950 Pro cable disconnected.');
     if(received+value.length>count)throw Error('Unexpected extra bytes in the RT-950 Pro cable response.');
     result.set(value,received);received+=value.length;
    }
    return result;
   }
  };
  return await operation(link);
 }catch(error){failed=true;throw error;}
 finally{
  // A port unplug can reject cleanup as well. Keep the original transfer error.
  if(reader){try{await reader.cancel();}catch{}finally{reader.releaseLock();}}
  if(writer){try{if(failed)await writer.abort();}catch{}finally{writer.releaseLock();}}
  try{await port.close();}catch(error){if(!failed)throw error;}
 }
}
