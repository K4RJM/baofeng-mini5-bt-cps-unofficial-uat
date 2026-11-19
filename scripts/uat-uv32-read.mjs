// UAT-only, read-only UV-32 channel capture. No encoder or memory-write operation.
// Layout/CO7 interpretation: CHIRP baofeng_uv17Pro.py, commit
// 19b5359693d37204e21ad11ce4e5613614de3886. See docs/UV32-READ.md.
// Independent implementation; CHIRP attribution and GPL-3.0 project terms apply.
import {consumeUv32ReadSession,uv32ReadSessionStatus,identifyProfile,selectSendMethod} from './uat-protocols.mjs?v=20.46';
import {UV32_CHANNEL_BYTES,uv32ReadCommand,uv32Payload,decodeUv32Channels} from './uv32-codec.mjs';
export {UV32_CHANNELS,UV32_RECORD_BYTES,UV32_BLOCK_BYTES,UV32_CHANNEL_BYTES,UV32_BLOCKS,uv32ReadCommand,uv32Payload,uv32WireDecode,DCS,decodeUv32Channels} from './uv32-codec.mjs';
export const UV32_INTER_BLOCK_MS=20; // UAT transport-pacing candidate; physical benefit unverified.
export const UV32_READ_PACES=Object.freeze([20,100,250]);
const hex=b=>Array.from(b,n=>n.toString(16).padStart(2,'0')).join('');
function assertReadSendMode(mode){
 if(!['with-response','without-response'].includes(mode))throw Error('Choose With response or Without response for UV-32 read requests');
}
function assertReadPace(ms){if(!UV32_READ_PACES.includes(ms))throw Error('Choose a supported UV-32 Bluetooth read pace');}
function readSendMethod(characteristic,mode){
 assertReadSendMode(mode);
 const method=selectSendMethod(characteristic?.properties,mode);
 if(typeof characteristic?.[method]!=='function')throw Error('Selected UV-32 read send method is unavailable');
 return method;
}
// A diagnostic snapshot never consumes a handshake, clears buffered bytes, or sends commands.
export function uv32ReadDiagnostics(radio,{readSendMode='with-response',blockBytes=64,interBlockDelayMs=UV32_INTER_BLOCK_MS}={}){
 uv32ReadCommand(0,blockBytes);
 return {kind:'uv32-channel-read-v1',completed:false,stage:'before-read',scope:'Channel records only; not a complete codeplug or firmware backup',
  model:'UV32PRO',requestedReadSendMode:readSendMode,handshakeSendMethod:'writeValueWithResponse',sendMethod:null,startAddress:0,endAddressExclusive:32000,
  blockBytes,totalBlocks:UV32_CHANNEL_BYTES/blockBytes,completedBlocks:0,memoryReads:0,memoryWrites:0,headers:[],
  bytes:0,wireHex:'',interBlockDelayMs,strayStatuses:[],sessionAtStart:uv32ReadSessionStatus(radio),capturedAt:new Date().toISOString()};
}
export async function readUv32Channels(radio,{progress=()=>{},status=()=>{},signal,readSendMode='with-response',blockBytes=64,diagnosticSweep=false,interBlockDelayMs=UV32_INTER_BLOCK_MS}={}){
 // Only a completed, current, With-response UV32PRO handshake can issue this capability.
 // It is consumed once; no caller-supplied identity or saved JSON grants memory access.
 assertReadPace(interBlockDelayMs);
 const started=Date.now(),raw=new Uint8Array(32000),report=uv32ReadDiagnostics(radio,{readSendMode,blockBytes,interBlockDelayMs});
 if(diagnosticSweep){report.diagnosticSweep=true;report.anomalies=[];report.validatedBlocks=[];}
 let session,address=0,ownsBusy=false,currentRequest=null,receiver=null;
 const originalReceive=radio.receive,receiveDescriptor=Object.getOwnPropertyDescriptor(radio,'receive');
 const check=()=>{if(signal?.aborted)throw Error('UV-32 channel read cancelled');if(!radio.connected||radio.generation!==session.generation||radio.device!==session.device||radio.char!==session.characteristic)throw Error('Radio connection changed during UV-32 read');};
 try{
  session=consumeUv32ReadSession(radio);report.handshake=session.identity;
  const sendMethod=readSendMethod(session.characteristic,readSendMode);report.sendMethod=sendMethod;
  radio.busy=true;ownsBusy=true;report.stage='reading';
  const trace=report.packetTrace={requests:[],notifications:[],requestCount:0,notificationCount:0,droppedRequests:0,droppedNotifications:0};
  const retain=(key,entry,limit)=>{trace[key].push(entry);if(trace[key].length>limit){trace[key].shift();trace[key==='requests'?'droppedRequests':'droppedNotifications']++;}};
  // Trace at the existing receiver entry, before it resolves a pending wait.
  // Pass the original DataView through unchanged and restore the method in finally.
  receiver=function(view){
   const bytes=new Uint8Array(view.buffer,view.byteOffset,view.byteLength);trace.notificationCount++;
   retain('notifications',{atMs:Date.now()-started,activeRequest:report.memoryReads,bytes:bytes.length,hex:hex(bytes.slice(0,256)),truncated:bytes.length>256},80);
   return originalReceive.call(this,view);
  };
  radio.receive=receiver;
  const settle=async()=>{
   // A malformed reply may be followed by a delayed status byte. Never
   // interpret bytes from that request as the next block's response.
   report.readPhase='diagnostic-settle';
   await radio.pause(3500);check();
   let count=trace.notificationCount;
   await radio.pause(500);check();
   if(trace.notificationCount!==count){count=trace.notificationCount;await radio.pause(500);check();
    if(trace.notificationCount!==count)throw Error('UV-32 response stream did not settle');}
   return hex(Uint8Array.from(radio.rx.splice(0)));
  };
  for(address=0;address<32000;address+=blockBytes){
   check();
   if(address>0){report.readPhase='between-blocks';await radio.pause(interBlockDelayMs);check();}
   if(diagnosticSweep&&radio.rx.length){
    const pendingHex=hex(Uint8Array.from(radio.rx.slice(0,256)));
    const discardedHex=await settle();
    report.anomalies.push({address,kind:'unsolicited-before-request',pendingHex,discardedHex});
   }
   if(!diagnosticSweep&&radio.rx.length){
    const pendingHex=hex(Uint8Array.from(radio.rx.slice(0,256)));
    if(!/^(06|0600)$/.test(pendingHex))throw Error('Unexpected buffered response before UV-32 read');
    if(report.strayStatuses.length>=8)throw Error('UV-32 response stream has too many stray status bytes');
    radio.rx.splice(0);
    report.strayStatuses.push({afterBlock:report.completedBlocks,beforeAddress:address,hex:pendingHex,handledAtMs:Date.now()-started});
   }
   if(radio.rx.length)throw Error('Unexpected buffered response before UV-32 read');
   if(address===0)report.firstReadAfterHandshakeMs=Date.now()-Date.parse(session.identity.capturedAt);
   const command=uv32ReadCommand(address,blockBytes);report.lastRequestHex=hex(command);report.attemptedAddress=address;report.memoryReads++;
   status({phase:'requesting',block:address/blockBytes+1,total:report.totalBlocks,address,valid:report.completedBlocks,errors:report.anomalies?.length??0});
   report.lastResponseHex=null;report.lastResponseAddress=null;report.readPhase='sending';
   currentRequest={number:report.memoryReads,address,hex:hex(command),sendMethod,sentAtMs:Date.now()-started};trace.requestCount++;
   retain('requests',currentRequest,12);
   try{
    await radio.native('Reading UV-32 channels',()=>session.characteristic[sendMethod](command),radio.deadlines.send);check();
    currentRequest.sendResolvedAtMs=Date.now()-started;report.readPhase='waiting';
    const response=await radio.wait(4+blockBytes);check();report.lastResponseHex=hex(response);report.lastResponseAddress=address;
    currentRequest.responseAtMs=Date.now()-started;currentRequest.responseBytes=response.length;currentRequest.responseHeaderHex=hex(response.slice(0,4));report.readPhase='validating';
    const payload=uv32Payload(response,address,blockBytes);if(radio.rx.length)throw Error('Unexpected trailing UV-32 read data');
    raw.set(payload,address);report.headers.push(hex(response.slice(0,4)));report.completedBlocks++;
    if(diagnosticSweep)report.validatedBlocks.push({address,wireHex:hex(payload)});
    currentRequest.validated=true;currentRequest=null;progress(address/blockBytes+1,report.totalBlocks);
    status({phase:'validated',block:address/blockBytes+1,total:report.totalBlocks,address,valid:report.completedBlocks,errors:report.anomalies?.length??0});
   }catch(error){
    if(!diagnosticSweep||signal?.aborted||!radio.connected||radio.generation!==session.generation)throw error;
    if(!/^(Unexpected UV-32 read header or length|Unexpected trailing UV-32 read data|Timeout: expected (?:68|132) response bytes)/.test(error.message))throw error;
    currentRequest.error=error.message;
    const anomaly={address,kind:'invalid-block',requestHex:hex(command),responseHex:report.lastResponseHex,error:error.message};
    report.anomalies.push(anomaly);
    status({phase:'error',block:address/blockBytes+1,total:report.totalBlocks,address,valid:report.completedBlocks,errors:report.anomalies.length});
    if(report.anomalies.length>=10)throw Error('UV-32 diagnostic sweep stopped after 10 anomalies');
    anomaly.discardedHex=await settle();currentRequest=null;progress(address/blockBytes+1,report.totalBlocks);
   }
  }
  // A sweep with any invalid block is evidence only, never a complete image.
  if(diagnosticSweep&&report.completedBlocks!==report.totalBlocks){report.stage='diagnostic-complete';report.readPhase='complete-with-gaps';return report;}
  report.preview=decodeUv32Channels(raw);report.completed=true;report.stage='complete';report.readPhase='complete';return report;
 }catch(error){if(currentRequest)currentRequest.error=error.message;report.error=error.message;if(error.uv32SessionStatus)report.sessionAtStart=error.uv32SessionStatus;report.pendingHex=hex(Uint8Array.from(radio.rx.slice(0,256)));report.linkAtFailure={connected:radio.connected,gattConnected:!!radio.device?.gatt?.connected,generation:radio.generation};error.uv32ReadReport=report;throw error;}
 finally{if(receiver&&radio.receive===receiver){if(receiveDescriptor)Object.defineProperty(radio,'receive',receiveDescriptor);else delete radio.receive;}report.wireHex=diagnosticSweep&&!report.completed?'':hex(raw.slice(0,report.completedBlocks*blockBytes));report.bytes=report.completedBlocks*blockBytes;report.elapsedMs=Date.now()-started;if(ownsBusy)radio.busy=false;}
}

// OLA sends E after the last block, then waits for the bridge's separate idle
// notification (about three seconds in the captured UV-32 session).
export async function finishUv32Session(radio,operation){
 const characteristic=radio.char,generation=radio.generation;
 const check=()=>{if(!radio.connected||radio.char!==characteristic||radio.generation!==generation)throw Error('UV-32 Bluetooth link ended while closing the '+operation);};
 check();
 if(radio.rx.length)throw Error('Unexpected bytes before closing the UV-32 '+operation);
 await radio.native('Closing UV-32 '+operation,()=>characteristic.writeValueWithoutResponse(Uint8Array.of(0x45)),radio.deadlines.send);
 check();
 const [ack]=await radio.wait(1);
 if(operation==='write'&&ack===0xff){
  if((await radio.wait(1))[0]!==0)throw Error('Unexpected UV-32 write completion response');
 }else if(ack!==0x06)throw Error('UV-32 did not acknowledge the end of the '+operation);
 let idle;
 try{[idle]=await radio.wait(1,5000);}
 catch(error){
  check();
  if(error.message==='Timeout: expected 1 response bytes, received 0')return;
  throw error;
 }
 check();
 if(idle!==0||radio.rx.length)throw Error('Unexpected UV-32 status after '+operation);
}
export async function captureUv32Channels(radio,{connect=()=>radio.connect(),progress,status,signal,stage=()=>{},readSendMode='with-response',blockBytes=64,diagnosticSweep=false,interBlockDelayMs=UV32_INTER_BLOCK_MS}={}){
 const report=uv32ReadDiagnostics(radio,{readSendMode,blockBytes,interBlockDelayMs}),started=Date.now();
 const before=report.sessionAtStart;
 const cancelled=()=>{if(signal?.aborted)throw Error('UV-32 channel read cancelled');};
 try{
  if(radio.busy||radio.connecting)throw Error('Another radio operation is already running');
  cancelled();assertReadSendMode(readSendMode);assertReadPace(interBlockDelayMs);
  report.stage='connecting';stage('Connecting for UV-32 channel read…');
  report.connectionRestarted=!!(radio.rx.length||before.checks.sessionPresent||(!radio.connected&&radio.char));
  if(report.connectionRestarted)radio.disconnect();
  if(!radio.connected)await connect();
  cancelled();
  report.sendMethod=readSendMethod(radio.char,readSendMode);
  report.stage='identifying';stage('Identifying UV-32 for channel read…');
  report.handshake=await identifyProfile(radio,'uv32',{sendMode:'with-response'});
  cancelled();
  report.stage='reading';stage('Reading UV-32 channels…');
  const capture=await readUv32Channels(radio,{progress,status,signal,readSendMode,blockBytes,diagnosticSweep,interBlockDelayMs});
  if(capture.completed){
   stage('Closing the UV-32 channel read…');
   radio.busy=true;
   try{await finishUv32Session(radio,'read');}
   catch(error){
    // All channel blocks have already been validated. Retain them if the link ends.
    capture.closeError=error.message;
    radio.disconnect();
   }finally{radio.busy=false;}
  }
  cancelled();
  capture.sessionBeforeConnect=before;capture.connectionRestarted=report.connectionRestarted;
  capture.operationElapsedMs=Date.now()-started;return capture;
 }catch(error){
  const failed=error.uv32ReadReport??report;
  if(!failed.handshake)failed.handshake=error.handshakeReport??report.handshake??null;
  failed.sessionBeforeConnect=before;failed.connectionRestarted=report.connectionRestarted??false;
  failed.error=error.message;failed.pendingHex=hex(Uint8Array.from(radio.rx.slice(0,256)));
  failed.operationElapsedMs=Date.now()-started;error.uv32ReadReport=failed;throw error;
 }
}
