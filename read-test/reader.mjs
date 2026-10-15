// Read-only diagnostic transport, based on the existing Mini 5 Studio handshake.
// No W command, upload method, arbitrary-address interface, or write self-test.
import {REGIONS,SIZE,validRead,hex} from './memory.mjs';
const enc=new TextEncoder();
const MAGIC=enc.encode('PROGRAMCOLORPROU');
const INIT=Uint8Array.from('53454e4421050d010101041108050d0d01110f091209100400'.match(/../g),x=>parseInt(x,16));
const same=(a,b)=>a.length===b.length&&a.every((x,i)=>x===b[i]);
export function allowedCommand(b){return same(b,MAGIC)||same(b,INIT)||(b.length===1&&[0x46,0x4d,0x45].includes(b[0]))||(b.length===4&&b[0]===0x52&&validRead((b[1]<<8)|b[2],b[3]));}
export class Reader {
  constructor(){this.rx=[];this.waiter=null;this.busy=false;this.connecting=false;this.generation=0;this.device=null;this.char=null;this.log=()=>{};this.onDisconnect=()=>{};this.notify=e=>{if(e.target===this.char)this.receive(e.target.value);};}
  get connected(){return !!this.device?.gatt?.connected&&!!this.char;}
  async connect({pickAny=false}={}){
    if(this.busy||this.connecting)throw Error('Another radio operation is already running');
    if(!navigator.bluetooth)throw Error('Use Chrome or Edge on localhost with Bluetooth available');
    if(this.connected)return;
    this.disconnect();this.connecting=true;const token=this.generation;
    const check=()=>{if(token!==this.generation)throw Error('Connection cancelled');};
    let stage='Choosing radio',device;
    try{
      this.log(stage);
      device=await navigator.bluetooth.requestDevice(pickAny?{acceptAllDevices:true,optionalServices:[0xffe0]}:{filters:[{services:[0xffe0]}],optionalServices:[0xffe0]});check();this.device=device;
      this.disconnected=()=>{if(this.device!==device||device.gatt.connected)return;this.clearCharacteristic();this.fail(Error('Bluetooth link ended; the current operation stopped'));this.onDisconnect();};
      device.addEventListener('gattserverdisconnected',this.disconnected);
      for(let attempt=1;attempt<=3;attempt++){
        try{
          check();stage=`Connecting Bluetooth (${attempt}/3)`;this.log(stage);
          const server=await device.gatt.connect();check();
          stage='Finding radio service';this.log(stage);if(!device.gatt.connected)throw Error('Link ended before service discovery');
          const service=await server.getPrimaryService(0xffe0);check();
          stage='Finding data connection';this.log(stage);const characteristic=await service.getCharacteristic(0xffe1);check();
          stage='Enabling radio responses';this.log(stage);await characteristic.startNotifications();check();
          if(!device.gatt.connected)throw Error('Link ended during notification setup');
          this.char=characteristic;this.char.addEventListener('characteristicvaluechanged',this.notify);this.rx=[];
          this.log('Bluetooth ready — no programming commands sent');return;
        }catch(e){
          check();this.clearCharacteristic();
          const transient=e.name==='NetworkError'||!device.gatt.connected;
          if(device.gatt.connected)device.gatt.disconnect();
          if(!transient||attempt===3)throw e;
          this.log(`${stage} failed: ${e.message}. Retrying connection setup only…`);
          await new Promise(r=>setTimeout(r,600));check();
        }
      }
    }catch(e){if(token===this.generation)this.disconnect();throw Error(`${stage}: ${e.message}`);}
    finally{this.connecting=false;}
  }
  clearCharacteristic(){this.char?.removeEventListener?.('characteristicvaluechanged',this.notify);this.char=null;}
  disconnect(){this.generation++;this.fail(Error('Radio operation cancelled'));this.clearCharacteristic();if(this.device&&this.disconnected)this.device.removeEventListener?.('gattserverdisconnected',this.disconnected);this.disconnected=null;if(this.device?.gatt?.connected)this.device.gatt.disconnect();this.rx=[];}
  fail(e){if(this.waiter){const w=this.waiter;this.waiter=null;clearTimeout(w.timer);w.reject(e);}}
  receive(view){const bytes=new Uint8Array(view.buffer,view.byteOffset,view.byteLength);if(this.rx.length+bytes.length>4096){this.fail(Error('Unexpected excess response data'));return;}this.rx.push(...bytes);this.serve();}
  serve(){if(this.waiter&&this.rx.length>=this.waiter.n){const w=this.waiter;this.waiter=null;clearTimeout(w.timer);w.resolve(Uint8Array.from(this.rx.splice(0,w.n)));}}
  wait(n,ms=4000){if(this.waiter)throw Error('Overlapping response waits');return new Promise((resolve,reject)=>{const w={n,resolve,reject,timer:null};this.waiter=w;w.timer=setTimeout(()=>{if(this.waiter===w){this.waiter=null;reject(Error(`Timeout: expected ${n} response bytes, received ${this.rx.length}`));}},ms);this.serve();});}
  async send(bytes){
    if(!allowedCommand(bytes))throw Error('Blocked: only identification, known-range reads and exit are permitted');
    if(!this.char)throw Error('Radio is not connected');
    // Do not resend automatically after an ambiguous send failure.
    if(this.char.properties.writeWithoutResponse)await this.char.writeValueWithoutResponse(bytes);
    else if(this.char.properties.write)await this.char.writeValueWithResponse(bytes);
    else throw Error('Bluetooth characteristic does not support sending read requests');
  }
  async request(cmd,n){if(this.rx.length)throw Error('Unexpected leftover response bytes; disconnect and retry');await this.send(cmd);return this.wait(n);}
  async identify(){
    this.rx=[];
    if((await this.request(MAGIC,1))[0]!==6)throw Error('Identification not acknowledged');
    const config=await this.request(Uint8Array.of(0x46),16);
    const id=await this.request(Uint8Array.of(0x4d),15);
    const model=new TextDecoder().decode(id.subarray(0,8)).trim();
    if(model!=='5RMINI')throw Error(`Unexpected radio model ${JSON.stringify(model)}; no memory was read`);
    if((await this.request(INIT,1))[0]!==6)throw Error('Read initialization not acknowledged');
    return {model,id:[...id],config:[...config]};
  }
  async block(addr){
    if(!validRead(addr,64))throw Error('Address outside approved read map');
    const response=await this.request(Uint8Array.of(0x52,addr>>8,addr&255,64),68);
    // The supplied real capture has opcode 0x52 on all 521 responses.
    // Reject other variants pending investigation, rather than guessing compatibility.
    if(response[0]!==0x52||((response[1]<<8)|response[2])!==addr||response[3]!==64)
      throw Error(`Unexpected header at ${hex(addr)}: ${[...response.subarray(0,4)].map(x=>x.toString(16).padStart(2,'0')).join(' ')}. Stop; do not relax validation without inspecting the protocol.`);
    return {payload:response.slice(4),header:[...response.subarray(0,4)]};
  }
  async download(progress=()=>{}){
    if(this.busy)throw Error('A download is already running');if(!this.connected)throw Error('Connect the radio first');
    this.busy=true;const raw=new Uint8Array(SIZE);let used=0;const headers=[];
    try{
      const identity=await this.identify();
      for(const r of REGIONS)for(let a=r.start;a<r.start+r.size;a+=64){const b=await this.block(a);headers.push(b.header);raw.set(b.payload,used);used+=64;progress(used/SIZE);}
      if(used!==SIZE||this.rx.length)throw Error('Incomplete capture or unexpected trailing response');
      await this.send(Uint8Array.of(0x45)); // CPS Read sends E when finished.
      return {raw,metadata:{...identity,capturedAt:new Date().toISOString(),bytes:used,blocks:headers.length,headers,scope:'CPS-known clone data only, not firmware',memoryWrites:0}};
    }finally{this.busy=false;this.disconnect();}
  }
}
