// Experimental CPS-range writer. Never retries an ambiguous memory write.
import {Reader,allowedCommand} from './read-test/reader.mjs';
import {SIZE,offset,compare} from './read-test/memory.mjs';
import {addresses,offlineFrames,encodeName} from './radio-encoder.mjs?v=20.20';
import {channelFrequencyError} from './validation.mjs?v=20.14';

const equal=(a,b)=>a.length===b.length&&a.every((x,i)=>x===b[i]);
// CHIRP UV5RMini BLE upload uses 128-byte payloads and FF-pads each region end.
// Approved extra ranges: 8040-807F, 9040-907F, A1C0-A1FF (192 bytes total).
export const bleRegions=Object.freeze([[0,0x8040],[0x9000,0x40],[0xa000,0x1c0]].map(Object.freeze));
export const bleAddresses=Object.freeze(bleRegions.flatMap(([start,size])=>Array.from({length:Math.ceil(size/128)},(_,i)=>start+i*128)));
function bluetoothPlan(raw){
 const target=raw.slice();target[offset(0x9022)]=1; // Keep Wireless CPS enabled; absent from native DAT schema.
 const frames=bleRegions.flatMap(([start,size])=>Array.from({length:Math.ceil(size/128)},(_,i)=>{
  const a=start+i*128,n=Math.min(128,start+size-a),f=new Uint8Array(132).fill(255);
  f.set([87,a>>8,a&255,128]);f.set(target.subarray(offset(a),offset(a)+n),4);return f;
 }));validateFrames(frames);return {frames,target};
}
export function checkIdentity(id){
 if(id?.model!=='5RMINI')throw Error('The selected device did not identify as 5RMINI');
 const bytes=(value,n)=>Array.isArray(value)&&value.length===n&&Array.from(value).every(b=>Number.isInteger(b)&&b>=0&&b<=255);
 if(!bytes(id.id,15)||!bytes(id.config,16)||![53,82,77,73,78,73,32,32].every((b,i)=>id.id[i]===b))throw Error('Incomplete or malformed 5RMINI identification; programming is blocked');
}
export function planFromRead(raw){
 if(!(raw instanceof Uint8Array)||raw.length!==SIZE)throw Error('Incomplete radio read');
 return bluetoothPlan(raw);
}
export function makePlan(data,options){
 if(data?.channelList?.length!==1||data.channelList[0].length!==1000)throw Error('Expected the native CPS record layout');
 function choices(o){for(const [key,values] of Object.entries(options[o.$type]||{}))if(!values.some(([v])=>v===o[key]))throw Error(`Unrecognized CPS value: ${key}`);}
 function name(s,max){if(typeof s!=='string'||encodeName(s).length>max)throw Error('Name exceeds its CPS byte limit or cannot be encoded');}
 // Check every imported/read channel before encoding or connecting; never normalize it.
 for(const [i,c] of data.channelList[0].entries()){
  if(c.rxFreq===''){if(c.txFreq!=='')throw Error('An empty channel has a transmit frequency');continue;}
  for(const [key,label] of [['rxFreq','receive'],['txFreq','transmit']]){const error=channelFrequencyError(c[key]);if(error)throw Error(`Channel ${i+1} ${label} frequency: ${error}`);}
  choices(c);name(c.name,12);
 }
 choices(data.funCfgs);choices(data.vfos);choices(data.dtmfs);
 for(const k of ['vfoABusylock','vfoBBusyLock','busyLock'])if(![0,1].includes(data.vfos[k]))throw Error('Unrecognized VFO busy-lock value');
 for(const k of ['vfoScanRang_L','vfoScanRang_H'])if(!/^\d{1,3}$/.test(data.vfos[k])||Number(data.vfos[k])<1)throw Error('Invalid VFO scan limit');
 if(Number(data.vfos.vfoScanRang_L)>Number(data.vfos.vfoScanRang_H))throw Error('Reversed VFO scan limits');
 if(data.vfos.vfoAOffset?.[7]!==data.vfos.vfoBOffset?.[7])throw Error('CPS has a VFO B offset encoding quirk when the final A/B offset digits differ. This test build blocks that case.');
 if(data.dtmfs.group?.length!==20||data.dtmfs.groupName?.length!==20)throw Error('Invalid DTMF group count');
 data.dtmfs.groupName.forEach(s=>name(s,10));
 const frames=offlineFrames(data);
 const target=new Uint8Array(SIZE);frames.forEach(f=>target.set(f.subarray(4),offset((f[1]<<8)|f[2])));
 return bluetoothPlan(target);
}
export function validateFrames(frames){
 if(!Array.isArray(frames)||frames.length!==bleAddresses.length)throw Error('Incomplete write plan');
 frames.forEach((f,i)=>{const a=bleAddresses[i];if(!(f instanceof Uint8Array)||f.length!==132||f[0]!==87||f[3]!==128||((f[1]<<8)|f[2])!==a)throw Error('Write plan has an invalid address, order, or block length');
  const [start,size]=bleRegions.find(([s,n])=>a>=s&&a<s+n),n=Math.min(128,start+size-a);
  if(f.subarray(4+n).some(v=>v!==255))throw Error('Invalid Bluetooth end padding');
 });
 if(frames[bleAddresses.indexOf(0x9000)][4+0x22]!==1)throw Error('Wireless CPS must stay enabled');
}
export class Writer extends Reader {
 #permit=null;
 constructor(){super();this.report={stage:'idle',attempted:0,acknowledged:0,verified:false};}
 async send(bytes){
  if(allowedCommand(bytes))return super.send(bytes);
  if(!this.#permit||!equal(bytes,this.#permit))throw Error('Write blocked outside the approved transaction');
  if(!this.char||!this.connected)throw Error('Connection ended before the block could be sent');
  this.#permit=null; // One use only, including an ambiguous transport failure.
  if(this.char.properties.writeWithoutResponse)await this.char.writeValueWithoutResponse(bytes);
  else if(this.char.properties.write)await this.char.writeValueWithResponse(bytes);
  else throw Error('Bluetooth characteristic cannot send data');
 }
 async capture(progress){const raw=new Uint8Array(SIZE);for(let i=0;i<addresses.length;i++){const b=await this.block(addresses[i]);raw.set(b.payload,offset(addresses[i]));progress?.(i+1,521);}if(this.rx.length)throw Error('Unexpected trailing response bytes');return raw;}
 async readRadio(progress){
  if(this.busy)throw Error('Another operation is running');
  this.busy=true;
  try{const identity=await this.identify();checkIdentity(identity);const raw=await this.capture(progress);return {raw,identity,deviceId:this.device.id,capturedAt:new Date().toISOString()};}
  catch(e){this.disconnect();throw e;}
  finally{this.busy=false;}
 }
 async upload(plan,backup,{confirmed=false,progress=()=>{}}={}){
  if(this.busy)throw Error('Another operation is running');
  if(!confirmed)throw Error('The warning must be accepted for this write');
  validateFrames(plan.frames);
  // Snapshot all mutable input before awaiting; never allow a mid-write edit.
  const frames=plan.frames.map(f=>f.slice());
  // Identity belongs to this exact browser connection, never to a loaded file or earlier read.
  const session={device:this.device,deviceId:this.device?.id,char:this.char,generation:this.generation};
  const sameSession=()=>{if(!this.connected||this.device!==session.device||this.device?.id!==session.deviceId||this.char!==session.char||this.generation!==session.generation)throw Error('Radio connection changed; fresh identity verification is required');};
  this.busy=true;this.report={stage:'write-handshake',attempted:0,acknowledged:0,verified:false,deviceId:this.device?.id,startedAt:new Date().toISOString(),preWriteRead:false};
  try{
   this.report.totalBlocks=frames.length;this.report.payloadBytes=128;this.report.extraPaddingBytes=192;this.report.wirelessCpsEnabled=true;
   progress('Starting write session',0,frames.length);
   sameSession();
   checkIdentity(await this.identify());
   sameSession();
   this.report.stage='writing';
   for(let i=0;i<frames.length;i++){
    sameSession();
    this.report.lastAddress=bleAddresses[i];this.#permit=frames[i];this.report.attempted++;
    const ack=await this.request(frames[i],1);
    if(ack[0]!==6||this.rx.length)throw Error(`Invalid write acknowledgement at 0x${bleAddresses[i].toString(16)}`);
    this.report.acknowledged++;progress('Writing',i+1,frames.length);
   }
   // Native CPS Write finishes after the last ACK; no speculative extra command.
   this.report.stage='written-unverified';this.report.writeOutcome='all-blocks-acknowledged';return {...this.report};
  }catch(e){this.report.stage=this.report.attempted?'write-incomplete-or-uncertain':'blocked-before-write';this.report.writeOutcome=this.report.stage;this.report.error=e.message;this.disconnect();throw e;}
  finally{this.#permit=null;this.busy=false;}
 }
 async verify(plan,backup,progress){
  if(this.busy)throw Error('Another operation is running');
  if(this.report.deviceId&&this.device?.id!==this.report.deviceId)throw Error('Select the radio that received this write for verification');
  this.busy=true;this.report.verified=false;this.report.stage='verifying';
  try{checkIdentity(await this.identify());const raw=await this.capture(progress);const differences=compare(plan.target,raw),backupDifferences=backup?.deviceId===this.device?.id?compare(backup.raw,raw):null;this.report.verified=differences.total===0;this.report.stage=this.report.verified?'verified':backupDifferences?.total===0?'readback-matches-backup':'readback-mismatch';this.report.readbackDifferences=differences;this.report.backupDifferences=backupDifferences;return {raw,differences,backupDifferences};}
  catch(e){this.report.stage='verification-failed';this.report.error=e.message;this.disconnect();throw e;}
  finally{this.busy=false;}
 }
}
export function verificationMessage(report,result){
 const writes=`Write status: ${report.acknowledged} of ${report.totalBlocks??bleAddresses.length} blocks acknowledged (${report.attempted} attempted).`;
 if(result.differences.total===0)return `${writes}\nVERIFIED: all 33,344 bytes in the CPS write ranges match the planned data. This verifies stored bytes, not every radio operating function.`;
 if(result.backupDifferences?.total===0)return `${writes}\nRead-back completed and exactly matches the original backup. The intended programming change is NOT present. ${result.differences.total} byte(s) differ from the planned data. Save the report; do not repeat the write automatically.`;
 return `${writes}\nRead-back completed: ${result.differences.total} byte(s) differ from the plan.${result.backupDifferences?` ${result.backupDifferences.total} byte(s) differ from the original read.`:' No pre-write read was taken for comparison.'} Programming is NOT verified. Save the report.`;
}
