// Test-only browser-shaped GATT peripheral. Never delegates to navigator.bluetooth.
// Input bytes are supplied by the test; no production encoder, decoder or memory-map import.
export function asyncRadio(initial, faults={}) {
 if (!(initial instanceof Uint8Array) || initial.length!==33344) throw Error('Test image must contain 33344 bytes');
 const raw=initial.slice(),sent=[],packets=[],events=[],timers=new Set();let writes=0,reads=0,closed=false,held=[],pendingInit=[];
 const init=Uint8Array.from('53454e4421050d010101041108050d0d01110f091209100400'.match(/../g),b=>parseInt(b,16));
 const device=new EventTarget(),characteristic=new EventTarget();device.id='F13-FAKE-ONLY';
 const later=fn=>{const t=setTimeout(()=>{timers.delete(t);if(!closed)fn();},0);timers.add(t);};
 const index=a=>a<0x8040?a:a<0x9040?0x8040+a-0x9000:0x8080+a-0xa000;
 function notify(bytes){
  // A nonzero DataView byteOffset catches accidental use of its entire backing buffer.
  for(let i=0;i<bytes.length;i+=faults.chunkSize||13){const part=bytes.slice(i,i+(faults.chunkSize||13)),backing=new Uint8Array(part.length+4).fill(0xa5);backing.set(part,2);characteristic.value=new DataView(backing.buffer,2,part.length);events.push('notification');characteristic.dispatchEvent(new Event('characteristicvaluechanged'));}
 }
 function reply(b){
  if(!device.gatt.connected)return;
  if(faults.silentHandshake&&b[0]!==82&&b[0]!==87)return;
  let bytes;
  if(b[0]===82){reads++;const a=b[1]*256+b[2];bytes=Uint8Array.of(82,b[1],b[2]^(faults.badHeader?1:0),64,...raw.slice(index(a),index(a)+64));if(faults.badReadOpcode)bytes[0]=0x57;if(faults.badReadLength)bytes[3]=128;if(faults.extraRead)bytes=Uint8Array.of(...bytes,6);if(faults.truncateRead)bytes=bytes.slice(0,10);if(faults.silentRead)return;if(faults.disconnectRead===reads){device.gatt.disconnect();return;}}
  else if(b[0]===87){writes++;const a=b[1]*256+b[2],end=a<0x8040?0x8040:a<0x9040?0x9040:0xa1c0;raw.set(b.slice(4,4+Math.min(128,end-a)),index(a));if(faults.disconnectWrite===writes){device.gatt.disconnect();return;}if(faults.dropAck===writes)return;bytes=Uint8Array.of(faults.nak===writes?21:6);}
  else if(b.length===1&&b[0]===70)bytes=new Uint8Array(16);
  else if(b.length===1&&b[0]===77)bytes=new TextEncoder().encode(faults.identity??(faults.wrongModel?'OTHER   +L00000':'5RMINI  +L00000'));
  else if(new TextDecoder().decode(b)==='PROGRAMCOLORPROU'||Array.from(b).map(n=>n.toString(16).padStart(2,'0')).join('')==='53454e4421050d010101041108050d0d01110f091209100400')bytes=Uint8Array.of(6);
  else throw Error('Unexpected test command');
  if(b[0]===82&&faults.holdRead){held.push(()=>notify(bytes));return;}
  if(new TextDecoder().decode(b)==='PROGRAMCOLORPROU'&&faults.openingReply!==undefined)bytes=Uint8Array.of(faults.openingReply);
  if(b[0]===83&&faults.silentInit)return;
  if(b[0]===83&&faults.initReply!==undefined)bytes=Uint8Array.of(faults.initReply);
  notify(bytes);if(b[0]===87&&writes===262&&faults.reboot)later(()=>device.gatt.disconnect());
 }
 async function send(value){
  if(!device.gatt.connected)throw Error('Test link is disconnected');
  let b=value.slice();packets.push(b);events.push('native-send');
  if(faults.maxWriteBytes&&b.length>faults.maxWriteBytes)throw Error('GATT operation failed for unknown reason.');
  if(faults.failNativeSend===packets.length)throw Error('Simulated native send failure');
  if(pendingInit.length||(b[0]===83&&b.length<init.length)){
   pendingInit.push(...b);
   if(pendingInit.length>init.length||!pendingInit.every((v,i)=>v===init[i]))throw Error('Unexpected fragmented test command');
   if(pendingInit.length<init.length){events.push('native-resolved');return;}
   b=Uint8Array.from(pendingInit);pendingInit=[];
  }
  sent.push(b);later(()=>reply(b));events.push('native-resolved');
 }
 characteristic.properties=faults.withResponse?{write:true}:{writeWithoutResponse:true};
 characteristic.writeValueWithoutResponse=b=>{events.push('send-without-response');return send(b);};characteristic.writeValueWithResponse=b=>{events.push('send-with-response');return send(b);};
 characteristic.startNotifications=async()=>{events.push('notifications-enabled');return characteristic;};
 const bridge={uuid:'0000ff31-0000-1000-8000-00805f9b34fb',properties:{write:true},writeValueWithResponse:async b=>{
  events.push('bridge-setup');if(!device.gatt.connected)throw Error('Test link is disconnected');
  if(b.length!==20||b[4]!==2||!b.slice(0,4).every(n=>n===63)||b.slice(5).some(n=>n>98))throw Error('Unexpected bridge request');
  if(faults.silentBridge)return;
  // Test peripheral calculates its reply independently of production helpers.
  const response=new Uint8Array(20).fill(33);
  for(let i=5;i<20;i++){let sum=0;for(let j=0;j<=i;j++)sum+=b[j];response[i]=sum%(b[24-i]+i-4);}
  if(faults.badBridge)response[19]^=1;
  later(()=>notify(response));
 }};
 const service={uuid:'0000ffe0-0000-1000-8000-00805f9b34fb',getCharacteristics:async()=>{events.push('list-characteristics');return faults.bridgeSetup?[characteristic,bridge]:[characteristic];},getCharacteristic:async uuid=>{if(uuid!==0xffe1)throw Error('Wrong characteristic');events.push('characteristic');return characteristic;}};
 bridge.service=service;
 characteristic.uuid='0000ffe1-0000-1000-8000-00805f9b34fb';characteristic.service=service;
 const server={getPrimaryService:async uuid=>{if(uuid!==0xffe0)throw Error('Wrong service');events.push('service');if(faults.disconnectDiscovery){device.gatt.disconnect();throw Error('Bluetooth link ended during service discovery');}return service;}};
 device.gatt={connected:false,async connect(){events.push('connect');this.connected=true;return server;},disconnect(){if(!this.connected)return;events.push('disconnect');this.connected=false;device.dispatchEvent(new Event('gattserverdisconnected'));}};
 return {raw,sent,packets,events,faults,device,characteristic,bluetooth:{async requestDevice(){events.push('chooser');return device;}},get writes(){return writes;},get reads(){return reads;},release(){faults.holdRead=false;for(const fn of held.splice(0))later(fn);},close(){device.gatt.disconnect();closed=true;for(const timer of timers)clearTimeout(timer);timers.clear();held=[];pendingInit=[];}};
}
