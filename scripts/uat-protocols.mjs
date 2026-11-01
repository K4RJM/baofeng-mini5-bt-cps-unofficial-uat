// UAT-only identification tools. Protocol facts: docs/UAT-RADIO-PROTOCOLS.md.
// Uses the existing bounded transport; sends no memory-read or memory-write command.
const MAGIC=new TextEncoder().encode('PROGRAMCOLORPROU');
const INIT=Uint8Array.from('53454e4421050d010101041108050d0d01110f091209100400'.match(/../g),x=>parseInt(x,16));
export const PROFILES=Object.freeze({
 mini5:Object.freeze({label:'MINI-5',prefix:'5RMINI',identityBytes:15,modelBytes:8}),
 gm30pro:Object.freeze({label:'GM-30 Pro',prefix:'GM-30P',identityBytes:7,modelBytes:7}),
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
 const generation=radio.generation,device=radio.device,deviceId=device.id,characteristic=radio.char,exchanges=[],started=Date.now();
 const elapsed=()=>Date.now()-started;
 const transport={serviceUuid:characteristic.service?.uuid??null,selectedCharacteristic:describe(characteristic),requestedSendMode:sendMode,sendMethod:null,characteristics:[],notifications:[],notificationCount:0,droppedNotifications:0};
 const check=()=>{if(!radio.connected||generation!==radio.generation||device!==radio.device||deviceId!==device.id||characteristic!==radio.char)throw Error('Radio connection changed during identification');};
 const notification=event=>{if(event.target!==characteristic)return;const v=event.target.value,b=new Uint8Array(v.buffer,v.byteOffset,v.byteLength);transport.notificationCount++;if(transport.notifications.length<64)transport.notifications.push({elapsedMs:elapsed(),bytes:b.length,hex:hex(b.slice(0,256)),truncated:b.length>256});else transport.droppedNotifications++;};
 let stage='Bluetooth characteristics';
 async function request(command,n,label){
  stage=label;check();if(!isHandshakeCommand(command))throw Error('Only identification commands are allowed');
  const entry={stage,commandHex:hex(command),expectedBytes:n,sentAtMs:elapsed()};exchanges.push(entry);
  let response;
  if(sendMode==='auto')response=await radio.request(command,n);
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
   try{const chars=await radio.native('Inspecting Bluetooth characteristics',()=>characteristic.service.getCharacteristics(),radio.deadlines.discovery);check();transport.characteristics=chars.map(describe);}
   catch(error){transport.discoveryError=error.message;check();}
  }else transport.discoveryError='Characteristic enumeration unavailable';
  transport.sendMethod=selectSendMethod(characteristic.properties,sendMode);
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
  return {completed:true,stage:'complete',profile:key,profileLabel:profile.label,model,matchesExpected:model===profile.prefix,
   id:[...id],config:[...config],exchanges,transport,elapsedMs:elapsed(),memoryReads:0,memoryWrites:0,capturedAt:new Date().toISOString()};
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
