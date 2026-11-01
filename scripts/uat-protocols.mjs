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
export async function identifyProfile(radio,key){
 const profile=PROFILES[key];if(!profile)throw Error('Choose a radio protocol');
 if(radio.busy||radio.connecting)throw Error('Another radio operation is already running');
 if(!radio.connected)throw Error('Connect the radio first');
 if(radio.rx.length)throw Error('Unexpected leftover response bytes; disconnect and retry');
 const generation=radio.generation,device=radio.device,characteristic=radio.char,exchanges=[];
 const check=()=>{if(!radio.connected||generation!==radio.generation||device!==radio.device||characteristic!==radio.char)throw Error('Radio connection changed during identification');};
 async function request(command,n){check();const entry={commandHex:hex(command),expectedBytes:n};exchanges.push(entry);const response=await radio.request(command,n);entry.responseHex=hex(response);check();return response;}
 radio.busy=true;
 try{
  if((await request(MAGIC,1))[0]!==6)throw Error('Identification not acknowledged');
  const config=await request(Uint8Array.of(0x46),16);
  let id=await request(Uint8Array.of(0x4d),profile.identityBytes);
  if(profile.identityBytes===7){
   // CHIRP expects seven bytes for these two families. BLE firmware may append
   // an eight-byte suffix: collect it before INIT, never mistake it for the ACK.
   // This 250 ms diagnostic settling window needs physical-radio verification.
   await radio.pause(250);check();
   if(radio.rx.length){
    if(radio.rx.length!==8)throw Error('Incomplete or unexpected identity suffix; save the connection log');
    id=Uint8Array.of(...id,...radio.rx.splice(0,8));exchanges.at(-1).responseHex=hex(id);
   }
  }
  const nameBytes=id.slice(0,profile.modelBytes);
  if(!nameBytes.every(b=>b>=32&&b<=126))throw Error('Malformed radio model response');
  const model=new TextDecoder().decode(nameBytes).trim();if(!model)throw Error('Empty radio model response');
  // A different printable model is evidence to report, not a connection block.
  if((await request(INIT,1))[0]!==6)throw Error('Initialization not acknowledged');
  if(radio.rx.length)throw Error('Unexpected trailing handshake data');
  return {completed:true,profile:key,profileLabel:profile.label,model,matchesExpected:model===profile.prefix,
   id:[...id],config:[...config],exchanges,memoryReads:0,memoryWrites:0,capturedAt:new Date().toISOString()};
 }catch(error){error.handshakeReport={completed:false,profile:key,profileLabel:profile.label,exchanges,error:error.message,receivedPendingHex:hex(radio.rx),memoryReads:0,memoryWrites:0,capturedAt:new Date().toISOString()};throw error;}finally{radio.busy=false;}
}
export function installProtocolTools({radio,run,connect,message}){
 const page=location.href==='about:srcdoc'?document.baseURI:location.href;
 if(!isUatPage(import.meta.url,page))return null;
 const select=document.getElementById('uatProtocol'),button=document.getElementById('uatIdentify'),download=document.getElementById('uatHandshakeReport'),output=document.getElementById('uatProtocolResult');
 if(!select||!button||!download||!output)throw Error('UAT protocol controls missing');
 let report=null;
 select.onchange=()=>{output.textContent=PROFILES[select.value].label+' protocol selected';};
 button.onclick=()=>run(async()=>{
  const key=select.value;report=null;output.textContent='Identifying '+PROFILES[key].label+'…';
  try{await connect();report=await identifyProfile(radio,key);const note=report.matchesExpected?'':' · differs from selected profile';output.textContent=`Handshake complete: ${report.model} · ${report.id.length}-byte ID${note}`;message(output.textContent);radio.log(output.textContent);}
  catch(error){report=error.handshakeReport??null;output.textContent='Handshake stopped: '+error.message;throw error;}
 });
 download.onclick=()=>{if(!report)return;const url=URL.createObjectURL(new Blob([JSON.stringify({build:document.querySelector('.build-badge')?.textContent,...report},null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='ham-rx-'+report.profile+'-handshake.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 return {sync(busy){select.disabled=busy;button.disabled=busy||!navigator.bluetooth||!window.isSecureContext;download.disabled=busy||!report;}};
}
