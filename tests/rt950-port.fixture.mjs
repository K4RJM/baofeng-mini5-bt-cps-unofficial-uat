// Independent serial peer for the factory CPS 1.3.3 sequence, usable in Node and a browser.
export function simulatedRt950Port(options={}){
 const port={frames:[],opened:0,closed:0};
 const memory=new Map();
 let input,phase,key;
 const text=new TextEncoder();
 const keys=['BHT ','CO 7','A ES',' EIY','M PQ','XN Y','RVB ',' HQP','W RC','MS N',' SAT','K DH','ZO R','C SL','6RB ',' JCG','PN V','J PK','EK L','I LZ'];
 function code(payload){
  for(let i=0;i<payload.length;i++){
   const k=key[i%4],v=payload[i];
   if(k!==32&&![0,255,k,255-k].includes(v))payload[i]=k^v;
  }
 }
 const respond=bytes=>{
  const all=Uint8Array.from(bytes);
  input.enqueue(all.slice(0,1));if(all.length>1)input.enqueue(all.slice(1,4));
  if(all.length>4)input.enqueue(all.slice(4));
 };
 port.open=async parameters=>{
  port.parameters=parameters;port.opened++;phase=0;
  port.readable=new ReadableStream({start(controller){input=controller;}});
  port.writable=new WritableStream({write(bytes){
   const data=Array.from(bytes),[op,hi,lo,size]=data,addr=hi*256+lo;
   port.frames.push(data);
   if(op===0x45&&data.length===1){phase=0;return;}
   if(phase===0&&new TextDecoder().decode(bytes)==='PROGRAMBT9000U'){phase++;respond([6]);return;}
   if(phase===1&&op===70&&data.length===1){phase++;respond(new Uint8Array(16));return;}
   if(phase===2&&op===77&&data.length===1){phase++;respond(text.encode((options.model??'RT-950').padEnd(12,' ')));return;}
   if(phase===3&&data.length===25&&new TextDecoder().decode(bytes.slice(0,4))==='SEND'){
    const code=data[4],index=5+2*(code%16)+(code>=32?1:0);
    key=text.encode(keys[data[index]]);phase++;respond([6]);return;
   }
   if(phase!==4||size!==128)throw Error('Unexpected factory command');
   if((op===82||op===84)&&data.length===4){
    if(options.unplug){input.close();return;}
    const payload=new Uint8Array(128).fill(255);
    if(!options.empty&&addr===0)payload.set([0,255,66,32,88,16,2,4]);
    const stored=memory.get(op+'/'+addr);
    if(stored)payload.set(stored);
    code(payload);
    respond([op,hi,options.badAddress?lo^1:lo,128,...payload]);return;
   }
   if((op===87||op===88)&&data.length===132){
    const reply=options.writeReply??[6];
    if(reply[0]===6){const payload=bytes.slice(4);code(payload);memory.set((op===87?82:84)+'/'+addr,payload);}
    respond(reply);return;
   }
   throw Error('Unexpected transfer');
  }});
 };
 port.setSignals=async signals=>{port.signals=signals;};
 port.close=async()=>{
  if(port.readable.locked||port.writable.locked)throw Error('Streams still locked');
  port.closed++;
 };
 return port;
}
