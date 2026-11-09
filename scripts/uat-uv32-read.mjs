// UAT-only, read-only UV-32 channel capture. No encoder or memory-write operation.
// Layout/CO7 interpretation: CHIRP baofeng_uv17Pro.py, commit
// 19b5359693d37204e21ad11ce4e5613614de3886. See docs/UV32-READ.md.
// Independent implementation; CHIRP attribution and GPL-3.0 project terms apply.
import {consumeUv32ReadSession,uv32ReadSessionStatus} from './uat-protocols.mjs?v=20.40';
export const UV32_CHANNELS=1000,UV32_RECORD_BYTES=32,UV32_BLOCK_BYTES=64,UV32_CHANNEL_BYTES=32000;
export const UV32_BLOCKS=UV32_CHANNEL_BYTES/UV32_BLOCK_BYTES;
const hex=b=>Array.from(b,n=>n.toString(16).padStart(2,'0')).join('');
export function uv32ReadCommand(address){
 if(!Number.isSafeInteger(address)||address<0||address%64||address+64>32000)throw Error('Outside UV-32 channel read area');
 return Uint8Array.of(0x52,address>>8,address&255,64);
}
export function uv32Payload(response,address){
 uv32ReadCommand(address);
 if(!(response instanceof Uint8Array)||response.length!==68||response[0]!==0x52||response[1]!==(address>>8)||response[2]!== (address&255)||response[3]!==64)throw Error('Unexpected UV-32 read header or length at 0x'+address.toString(16).padStart(4,'0'));
 return response.slice(4);
}
// CHIRP's reversible CO7 wire transform resets at each 64-byte response.
export function uv32WireDecode(wire){
 if(!(wire instanceof Uint8Array)||wire.length%64)throw Error('UV-32 data must contain complete 64-byte blocks');
 const key=[67,79,32,55];
 return wire.map((b,i)=>{const k=key[i%4];return k!==32&&b!==0&&b!==255&&b!==k&&b!==(k^255)?b^k:b;});
}
const DCS=[23,25,26,31,32,36,43,47,51,53,54,65,71,72,73,74,114,115,116,122,125,131,132,134,143,145,152,155,156,162,165,172,174,205,212,223,225,226,243,244,245,246,251,252,255,261,263,265,266,271,274,306,311,315,325,331,332,343,346,351,356,364,365,371,411,412,413,423,431,432,445,446,452,454,455,462,464,465,466,503,506,516,523,526,532,546,565,606,612,624,627,631,632,645,654,662,664,703,712,723,731,732,734,743,754];
function frequency(b){
 let units=0,multiplier=1;
 for(const v of b){const lo=v&15,hi=v>>4;if(lo>9||hi>9)return null;units+=(lo+10*hi)*multiplier;multiplier*=100;}
 return Math.floor(units/100000)+'.'+String(units%100000).padStart(5,'0');
}
function tone(code){
 if(code===0||code===65535)return 'Off';
 if(code>=600&&code<=2600)return (code/10).toFixed(1);
 const reverse=code>105,index=reverse?code-106:code-1;
 return index>=0&&index<DCS.length?'D'+String(DCS[index]).padStart(3,'0')+(reverse?'R':'N'):'Unknown ('+code+')';
}
export function decodeUv32Channels(wire){
 const data=uv32WireDecode(wire),channels=[],warnings=[];let empty=0;
 for(let offset=0;offset<data.length;offset+=32){
  const b=data.slice(offset,offset+32),number=offset/32+1;
  if(number>1000)throw Error('Too many UV-32 channel records');
  if(b[0]===255){empty++;continue;}
  const rx=frequency(b.slice(0,4)),tx=b.slice(4,8).every(n=>n===255)?'Off':frequency(b.slice(4,8));
  if(rx===null||rx==='0.00000'||tx===null)warnings.push('Channel '+number+': invalid frequency bytes; check the UV-32 wire format.');
  const nameBytes=b.slice(20,32);let end=nameBytes.findIndex(n=>n===0||n===255);if(end<0)end=12;
  let name;try{name=new TextDecoder('gb18030',{fatal:true}).decode(nameBytes.slice(0,end)).trimEnd();}catch{name='[name bytes '+hex(nameBytes.slice(0,end))+']';warnings.push('Channel '+number+': name encoding needs verification.');}
  const flags=b[15],power=b[14]&3,signal=b[12];
  channels.push({number,bank:Math.floor((number-1)/100)+1,bankChannel:(number-1)%100+1,
   rx:rx??'Invalid',rxTone:tone(b[8]|b[9]<<8),tx:tx??'Invalid',txTone:tone(b[10]|b[11]<<8),
   power:['High','Low','Medium'][power]??'Unknown ('+power+')',bandwidth:flags&64?'Narrow':'Wide',
   scan:flags&4?'Add':'Skip',squelch:'Code '+((flags>>4)&3),pttId:['Off','BOT','EOT','Both'][b[13]]??'Unknown ('+b[13]+')',
   signal:signal<20?String(signal+1):'Unknown ('+signal+')',busyLock:flags&8?'On':'Off',fhss:flags&1?'On':'Off',name,recordHex:hex(b)});
 }
 return {interpretation:'CHIRP UV-32 CO7 layout; physical channel comparison pending',channels,empty,warnings};
}
// A diagnostic snapshot never consumes a handshake, clears buffered bytes, or sends commands.
export function uv32ReadDiagnostics(radio){
 return {kind:'uv32-channel-read-v1',completed:false,stage:'before-read',scope:'Channel records only; not a complete codeplug or firmware backup',
  model:'UV32PRO',sendMethod:'writeValueWithResponse',startAddress:0,endAddressExclusive:32000,
  blockBytes:64,totalBlocks:500,completedBlocks:0,memoryReads:0,memoryWrites:0,headers:[],
  bytes:0,wireHex:'',sessionAtStart:uv32ReadSessionStatus(radio),capturedAt:new Date().toISOString()};
}
export async function readUv32Channels(radio,{progress=()=>{},signal}={}){
 // Only a completed, current, With-response UV32PRO handshake can issue this capability.
 // It is consumed once; no caller-supplied identity or saved JSON grants memory access.
 const started=Date.now(),raw=new Uint8Array(32000),report=uv32ReadDiagnostics(radio);
 let session,address=0,ownsBusy=false;
 const check=()=>{if(signal?.aborted)throw Error('UV-32 channel read cancelled');if(!radio.connected||radio.generation!==session.generation||radio.device!==session.device||radio.char!==session.characteristic)throw Error('Radio connection changed during UV-32 read');};
 try{
  session=consumeUv32ReadSession(radio);report.handshake=session.identity;
  radio.busy=true;ownsBusy=true;report.stage='reading';
  for(address=0;address<32000;address+=64){
   check();if(radio.rx.length)throw Error('Unexpected buffered response before UV-32 read');
   const command=uv32ReadCommand(address);report.lastRequestHex=hex(command);report.attemptedAddress=address;report.memoryReads++;
   await radio.native('Reading UV-32 channels',()=>session.characteristic.writeValueWithResponse(command),radio.deadlines.send);check();
   const response=await radio.wait(68);check();report.lastResponseHex=hex(response);
   const payload=uv32Payload(response,address);if(radio.rx.length)throw Error('Unexpected trailing UV-32 read data');
   raw.set(payload,address);report.headers.push(hex(response.slice(0,4)));report.completedBlocks++;
   progress(report.completedBlocks,500);
  }
  // Invalid decoding is kept visible and never converted into an editable MINI-5 workspace.
  report.preview=decodeUv32Channels(raw);report.completed=true;report.stage='complete';return report;
 }catch(error){report.error=error.message;if(error.uv32SessionStatus)report.sessionAtStart=error.uv32SessionStatus;report.pendingHex=hex(Uint8Array.from(radio.rx.slice(0,256)));error.uv32ReadReport=report;throw error;}
 finally{report.wireHex=hex(raw.slice(0,report.completedBlocks*64));report.bytes=report.completedBlocks*64;report.elapsedMs=Date.now()-started;if(ownsBusy)radio.busy=false;}
}
