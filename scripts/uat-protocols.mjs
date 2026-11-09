// UAT-only identification tools. Protocol facts: docs/UAT-RADIO-PROTOCOLS.md.
// Uses the existing bounded transport; sends no memory-read or memory-write command.
const MAGIC=new TextEncoder().encode('PROGRAMCOLORPROU');
const INIT=Uint8Array.from('53454e4421050d010101041108050d0d01110f091209100400'.match(/../g),x=>parseInt(x,16));
const uv32ReadSessions=new WeakMap();
export function hasUv32ReadSession(radio){
 const s=uv32ReadSessions.get(radio);return !!s&&radio.connected&&!radio.busy&&!radio.connecting&&s.device===radio.device&&s.characteristic===radio.char&&s.generation===radio.generation&&radio.rx.length===0;
}
export function consumeUv32ReadSession(radio){
 const valid=hasUv32ReadSession(radio),s=uv32ReadSessions.get(radio);uv32ReadSessions.delete(radio);
 if(!valid)throw Error('Check UV-32 radio ID with With response before reading channels');
 return s;
}
const BRIDGE_UUID='0000ff31-0000-1000-8000-00805f9b34fb';
// Independent implementation of the FF31 request/verification observed in the
// supplied Walkie-Talkie Tool 1.4.7 and matching GM-30 Pro capture. No memory command.
export function bridgeChallenge(){
 const random=crypto.getRandomValues(new Uint8Array(15));
 return Uint8Array.of(63,63,63,63,2,...random.map(n=>n%99));
}
export function bridgeResponseVariant(challenge,response){
 if(!(challenge instanceof Uint8Array)||challenge.length!==20||!challenge.slice(0,5).every((n,i)=>n===(i===4?2:63))||challenge.slice(5).some(n=>n>98))throw Error('Invalid Bluetooth bridge request');
 if(response.length!==20||!Array.from(response.slice(0,5)).every(n=>n===33))return null;
 const matches=variant=>Array.from({length:15},(_,j)=>j+5).every(i=>{
  const values=variant===1?challenge.slice(0,i+1):challenge.slice(19-i,25-i);
  const sum=values.reduce((a,b)=>a+b,0),divisor=challenge[24-i]+(variant===1?i-4:25-i);
  return response[i]===sum%divisor;
 });
 return matches(1)?1:matches(2)?2:null;
}
export const PROFILES=Object.freeze({
 mini5:Object.freeze({label:'MINI-5',prefix:'5RMINI',identityBytes:15,modelBytes:8}),
 uv32:Object.freeze({label:'UV-32',prefix:'UV32PRO',identityBytes:7,modelBytes:7})
});
export function isUatPage(moduleUrl,pageUrl){
 try{const m=new URL(moduleUrl),p=new URL(pageUrl),root='/baofeng-mini5-bt-cps-unofficial-uat/';return m.origin==='https://k4rjm.github.io'&&p.origin===m.origin&&m.pathname===root+'uat-protocols.mjs'&&p.pathname.startsWith(root);}catch{return false;}
}
const hex=b=>Array.from(b,x=>x.toString(16).padStart(2,'0')).join(' ');
const propertyNames=['read','write','writeWithoutResponse','notify','indicate','broadcast','authenticatedSignedWrites','reliableWrite','writableAuxiliaries'];
const describe=c=>({uuid:c?.uuid??null,properties:Object.fromEntries(propertyNames.map(k=>[k,!!c?.properties?.[k]]))});
export function selectSendMethod(properties,mode='auto'){
 if(!['auto','with-response','without-response'].includes(mode))throw Error('Unknown Bluetooth send method');
 if(mode==='auto')mode=properties?.writeWithoutResponse?'without-response':'with-response';
 const method=mode==='with-response'?'writeValueWithResponse':'writeValueWithoutResponse',property=mode==='with-response'?'write':'writeWithoutResponse';
 if(!properties?.[property])throw Error('Selected Bluetooth send method is not supported by this characteristic');
 return method;
}
export function isHandshakeCommand(command){return [MAGIC,Uint8Array.of(0x46),Uint8Array.of(0x4d),INIT].some(c=>c.length===command.length&&c.every((b,i)=>b===command[i]));}
export async function identifyProfile(radio,key,{sendMode='auto'}={}){
 const profile=PROFILES[key];if(!profile)throw Error('Choose a radio protocol');
 if(radio.busy||radio.connecting)throw Error('Another radio operation is already running');
 if(!radio.connected)throw Error('Connect the radio first');
 if(radio.rx.length)throw Error('Unexpected leftover response bytes; disconnect and retry');
 uv32ReadSessions.delete(radio);
 const generation=radio.generation,device=radio.device,deviceId=device.id,characteristic=radio.char,exchanges=[],started=Date.now();
 const elapsed=()=>Date.now()-started;
 const transport={serviceUuid:characteristic.service?.uuid??null,selectedCharacteristic:describe(characteristic),requestedSendMode:sendMode,sendMethod:null,characteristics:[],notifications:[],notificationCount:0,droppedNotifications:0};
 const check=()=>{if(!radio.connected||generation!==radio.generation||device!==radio.device||deviceId!==device.id||characteristic!==radio.char)throw Error('Radio connection changed during identification');};
 const notification=event=>{if(event.target!==characteristic)return;const v=event.target.value,b=new Uint8Array(v.buffer,v.byteOffset,v.byteLength);transport.notificationCount++;if(transport.notifications.length<64)transport.notifications.push({elapsedMs:elapsed(),bytes:b.length,hex:hex(b.slice(0,256)),truncated:b.length>256});else transport.droppedNotifications++;};
 let stage='Bluetooth characteristics',characteristics=[];
 async function request(command,n,label){
  stage=label;check();if(!isHandshakeCommand(command))throw Error('Only identification commands are allowed');
  const entry={stage,commandHex:hex(command),expectedBytes:n,sentAtMs:elapsed()};exchanges.push(entry);
  let response;
  if(key==='uv32'&&command.length>20){
   // The recorded phone app sends SEND as 20 + 5 bytes. Keep one logical
   // allowlisted command and one CPS ACK, with bounded sequential GATT writes.
   if(radio.rx.length)throw Error('Unexpected leftover response bytes; disconnect and retry');
   entry.chunks=[];
   for(let offset=0;offset<command.length;offset+=20){
    check();if(radio.rx.length)throw Error('Unexpected response before initialization command was fully sent');
    const bytes=command.slice(offset,offset+20);
    const part={offset,bytes:bytes.length,commandHex:hex(bytes),sentAtMs:elapsed()};
    entry.chunks.push(part);
    try{
     await radio.native('Sending Bluetooth identification',()=>characteristic[transport.sendMethod](bytes),radio.deadlines.send);check();
     part.completedAtMs=elapsed();
    }catch(error){part.error=error.message;throw error;}
   }
   entry.sendResolvedAtMs=elapsed();response=await radio.wait(n);
  }else if(sendMode==='auto')response=await radio.request(command,n);
  else{
   if(radio.rx.length)throw Error('Unexpected leftover response bytes; disconnect and retry');
   await radio.native('Sending Bluetooth identification',()=>characteristic[transport.sendMethod](command),radio.deadlines.send);check();
   entry.sendResolvedAtMs=elapsed();response=await radio.wait(n);
  }
  entry.responseHex=hex(response);entry.completedAtMs=elapsed();check();return response;
 }
 radio.busy=true;
 try{
  // Trace in the capture phase, before the receiver resolves a waiting request.
  // Native callbacks can run promise continuations before the next listener.
  characteristic.addEventListener('characteristicvaluechanged',notification,{capture:true});
  if(characteristic.service?.getCharacteristics){
   try{characteristics=await radio.native('Inspecting Bluetooth characteristics',()=>characteristic.service.getCharacteristics(),radio.deadlines.discovery);check();transport.characteristics=characteristics.map(describe);}
   catch(error){transport.discoveryError=error.message;check();}
  }else transport.discoveryError='Characteristic enumeration unavailable';
  transport.sendMethod=selectSendMethod(characteristic.properties,sendMode);
  if(key==='uv32'){
   stage='Bluetooth bridge verification (FF31)';
   const bridge=characteristics.find(c=>c.uuid.toLowerCase()===BRIDGE_UUID);
   if(!bridge||bridge.service!==characteristic.service||!bridge.properties?.write||typeof bridge.writeValueWithResponse!=='function')throw Error('FF31 Bluetooth setup is unavailable on this connection; save the handshake report');
   check();if(radio.rx.length)throw Error('Unexpected response before Bluetooth setup');
   const challenge=bridgeChallenge();
   transport.bridge={characteristicUuid:bridge.uuid,sendMethod:'writeValueWithResponse',requestHex:hex(challenge),expectedBytes:20,sentAtMs:elapsed(),verified:false};
   await radio.native('Preparing Bluetooth bridge',()=>bridge.writeValueWithResponse(challenge),radio.deadlines.send);check();
   transport.bridge.sendResolvedAtMs=elapsed();
   const response=await radio.wait(20);check();transport.bridge.responseHex=hex(response);
   const variant=bridgeResponseVariant(challenge,response);
   if(!variant)throw Error('Bluetooth bridge verification did not match this request');
   if(radio.rx.length)throw Error('Unexpected trailing Bluetooth setup data');
   transport.bridge.verified=true;transport.bridge.variant=variant;transport.bridge.completedAtMs=elapsed();
   // Captured app schedules 20 ms after verification, then 1 s before MAGIC.
   await radio.pause(1020);check();
   if(radio.rx.length)throw Error('Unexpected response after Bluetooth setup');
  }
  if((await request(MAGIC,1,'Opening command (PROGRAMCOLORPROU)'))[0]!==6)throw Error('Identification not acknowledged');
  const config=await request(Uint8Array.of(0x46),16,'Frequency-range query (F)');
  let id=await request(Uint8Array.of(0x4d),profile.identityBytes,'Model query (M)');
  if(profile.identityBytes===7){
   // CHIRP requests seven bytes. Collect an optional eight-byte BLE suffix
   // before INIT; this 250 ms UAT settling window needs hardware verification.
   await radio.pause(250);check();
   if(radio.rx.length){
    if(radio.rx.length!==8)throw Error('Incomplete or unexpected identity suffix; save the handshake report');
    id=Uint8Array.of(...id,...radio.rx.splice(0,8));exchanges.at(-1).responseHex=hex(id);
   }
  }
  const nameBytes=id.slice(0,profile.modelBytes);
  if(!nameBytes.every(b=>b>=32&&b<=126))throw Error('Malformed radio model response');
  const model=new TextDecoder().decode(nameBytes).trim();if(!model)throw Error('Empty radio model response');
  if((await request(INIT,1,'Final initialization (SEND)'))[0]!==6)throw Error('Initialization not acknowledged');
  if(radio.rx.length)throw Error('Unexpected trailing handshake data');
  const result={completed:true,stage:'complete',profile:key,profileLabel:profile.label,model,matchesExpected:model===profile.prefix,
   id:[...id],config:[...config],exchanges,transport,elapsedMs:elapsed(),memoryReads:0,memoryWrites:0,capturedAt:new Date().toISOString()};
  if(key==='uv32'&&model==='UV32PRO'&&sendMode==='with-response')uv32ReadSessions.set(radio,{device,characteristic,generation,identity:structuredClone(result)});
  return result;
 }catch(error){error.handshakeReport={completed:false,stage,profile:key,profileLabel:profile.label,exchanges,transport,elapsedMs:elapsed(),error:error.message,receivedPendingHex:hex(radio.rx),memoryReads:0,memoryWrites:0,capturedAt:new Date().toISOString()};throw error;}
 finally{characteristic.removeEventListener('characteristicvaluechanged',notification,{capture:true});radio.busy=false;}
}
export function installProtocolTools({radio,run,connect,message}){
 const page=location.href==='about:srcdoc'?document.baseURI:location.href;
 if(!isUatPage(import.meta.url,page))return null;
 const sendMode=document.getElementById('uatSendMode'),select=document.getElementById('uatProtocol'),button=document.getElementById('uatIdentify'),download=document.getElementById('uatHandshakeReport'),output=document.getElementById('uatProtocolResult');
 if(!sendMode||!select||!button||!download||!output)throw Error('UAT protocol controls missing');
 let report=null;
 select.onchange=()=>{output.textContent=PROFILES[select.value].label+' protocol selected';};
 button.onclick=()=>run(async()=>{
  const key=select.value,mode=sendMode.value,started=Date.now(),connectionLog=[],originalLog=radio.log;let phase='Bluetooth connection';
  report=null;output.textContent='Connecting for '+PROFILES[key].label+' identification...';
  radio.log=messageText=>{if(connectionLog.length<64)connectionLog.push({elapsedMs:Date.now()-started,message:String(messageText)});if(phase==='Bluetooth connection')output.textContent=String(messageText);originalLog.call(radio,messageText);};
  try{
   await connect();phase='Identification';output.textContent='Identifying '+PROFILES[key].label+'...';
   report=await identifyProfile(radio,key,{sendMode:mode});report.connectionLog=connectionLog;
   const note=report.matchesExpected?'':' / differs from selected profile';output.textContent=`Handshake complete: ${report.model} / ${report.id.length}-byte ID${note}`;message(output.textContent);radio.log(output.textContent);
  }catch(error){
   report=error.handshakeReport??{completed:false,profile:key,profileLabel:PROFILES[key].label,stage:phase,error:error.message,exchanges:[],requestedSendMode:mode,memoryReads:0,memoryWrites:0,capturedAt:new Date().toISOString()};
   report.connectionLog=connectionLog;output.textContent='Stopped at '+report.stage+': '+error.message;error.message=output.textContent;throw error;
  }finally{radio.log=originalLog;}
 });
 download.onclick=()=>{if(!report)return;const url=URL.createObjectURL(new Blob([JSON.stringify({build:document.querySelector('.build-badge')?.textContent,...report},null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='ham-rx-'+report.profile+'-handshake.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 return {sync(busy){sendMode.disabled=busy;select.disabled=busy;button.disabled=busy||!navigator.bluetooth||!window.isSecureContext;download.disabled=busy||!report;}};
}
