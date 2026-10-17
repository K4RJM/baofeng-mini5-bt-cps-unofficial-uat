// Test-only browser-shaped GATT peripheral. Never delegates to navigator.bluetooth.
// Input bytes are supplied by the test; no production encoder, decoder or memory-map import.
export function asyncRadio(initial, faults={}) {
 if (!(initial instanceof Uint8Array) || initial.length!==33344) throw Error('Test image must contain 33344 bytes');
 const raw=initial.slice(),sent=[],events=[],timers=new Set();let writes=0,reads=0,closed=false,held=[];
 const device=new EventTarget(),characteristic=new EventTarget();device.id='F13-FAKE-ONLY';
 const later=fn=>{const t=setTimeout(()=>{timers.delete(t);if(!closed)fn();},0);timers.add(t);};
 const index=a=>a<0x8040?a:a<0x9040?0x8040+a-0x9000:0x8080+a-0xa000;
 function notify(bytes){
  // A nonzero DataView byteOffset catches accidental use of its entire backing buffer.
  for(let i=0;i<bytes.length;i+=faults.chunkSize||13){const part=bytes.slice(i,i+(faults.chunkSize||13)),backing=new Uint8Array(part.length+4).fill(0xa5);backing.set(part,2);characteristic.value=new DataView(backing.buffer,2,part.length);events.push('notification');characteristic.dispatchEvent(new Event('characteristicvaluechanged'));}
 }
 function reply(b){
  if(!device.gatt.connected)return;
  let bytes;
  if(b[0]===82){reads++;const a=b[1]*256+b[2];bytes=Uint8Array.of(82,b[1],b[2]^(faults.badHeader?1:0),64,...raw.slice(index(a),index(a)+64));if(faults.truncateRead)bytes=bytes.slice(0,10);}
  else if(b[0]===87){writes++;const a=b[1]*256+b[2],end=a<0x8040?0x8040:a<0x9040?0x9040:0xa1c0;raw.set(b.slice(4,4+Math.min(128,end-a)),index(a));if(faults.disconnectWrite===writes){device.gatt.disconnect();return;}if(faults.dropAck===writes)return;bytes=Uint8Array.of(faults.nak===writes?21:6);}
  else if(b.length===1&&b[0]===70)bytes=new Uint8Array(16);
  else if(b.length===1&&b[0]===77)bytes=new TextEncoder().encode(faults.wrongModel?'OTHER   +L00000':'5RMINI  +L00000');
  else if(new TextDecoder().decode(b)==='PROGRAMCOLORPROU'||Array.from(b).map(n=>n.toString(16).padStart(2,'0')).join('')==='53454e4421050d010101041108050d0d01110f091209100400')bytes=Uint8Array.of(6);
  else throw Error('Unexpected test command');
  if(b[0]===82&&faults.holdRead){held.push(()=>notify(bytes));return;}
  notify(bytes);if(b[0]===87&&writes===262&&faults.reboot)later(()=>device.gatt.disconnect());
 }
 async function send(value){if(!device.gatt.connected)throw Error('Test link is disconnected');const b=value.slice();sent.push(b);events.push('native-send');later(()=>reply(b));events.push('native-resolved');}
 characteristic.properties=faults.withResponse?{write:true}:{writeWithoutResponse:true};
 characteristic.writeValueWithoutResponse=send;characteristic.writeValueWithResponse=send;
 characteristic.startNotifications=async()=>{events.push('notifications-enabled');return characteristic;};
 const service={getCharacteristic:async uuid=>{if(uuid!==0xffe1)throw Error('Wrong characteristic');events.push('characteristic');return characteristic;}};
 const server={getPrimaryService:async uuid=>{if(uuid!==0xffe0)throw Error('Wrong service');events.push('service');return service;}};
 device.gatt={connected:false,async connect(){events.push('connect');this.connected=true;return server;},disconnect(){if(!this.connected)return;events.push('disconnect');this.connected=false;device.dispatchEvent(new Event('gattserverdisconnected'));}};
 return {raw,sent,events,faults,device,characteristic,bluetooth:{async requestDevice(){events.push('chooser');return device;}},get writes(){return writes;},get reads(){return reads;},release(){faults.holdRead=false;for(const fn of held.splice(0))later(fn);},close(){device.gatt.disconnect();closed=true;for(const timer of timers)clearTimeout(timer);timers.clear();held=[];}};
}
