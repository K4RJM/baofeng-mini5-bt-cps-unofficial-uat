// UAT UV-32 controls live in the existing Ham-Rx header and left sidebar.
// A UV-32 read populates its own main workspace without loading MINI-5 data.
import {readUv32SerialImage,writeUv32SerialImage} from './uat-uv32-serial.mjs?v=20.66';
import {openUv32Capture} from './uat-uv32-capture.mjs?v=20.70';
import {createUv32Workspace} from './uat-uv32-workspace.mjs?v=20.70';
import {uv32ImageFromHex,uv32ImageToHex,uv32Preview,editUv32Channel,moveUv32Channel,insertUv32Channel,editUv32ZoneName,editUv32Dtmf,editUv32Setting,editUv32Vfo,changedUv32Blocks} from './uat-uv32-edit.mjs?v=20.56';

export function installUv32Reader({radio,run,connect,message,refresh,renderMini5,workspaceStatus,bluetooth}){
 const d=document,$=id=>d.getElementById(id),select=$('uatProtocol'),mode=$('uatSendMode'),readSend=$('uatUv32ReadSend'),readPace=$('uatUv32ReadPace'),sweep=$('uatUv32Sweep');
 const read=$('uatUv32Read'),cableRead=$('uatUv32CableRead'),cableWrite=$('uatUv32CableWrite'),view=$('uatUv32View'),save=$('uatUv32Save'),cancel=$('uatUv32Cancel'),importButton=$('uatUv32Import'),importInput=$('uatUv32ImportFile'),output=$('uatProtocolResult');
 const bluetoothControls=[read,readSend,readPace,sweep,mode];
 if([select,cableRead,cableWrite,view,save,cancel,importButton,importInput,output,...(bluetooth?bluetoothControls:[])].some(x=>!x))throw Error('UV-32 controls missing');
 const traceSave=d.createElement('button');traceSave.id='uatUv32Trace';traceSave.type='button';traceSave.textContent='↧ Save cable trace';traceSave.title='Download the raw Web Serial commands, received chunks, assembled responses, and timing from the latest cable operation.';save.insertAdjacentElement('afterend',traceSave);
 let capture=null,preview=null,editedImage=null,controller=null,undo=[],lastCableTrace=null;
 const beginCableTrace=operation=>{const started=performance.now();lastCableTrace={kind:'uv32-web-serial-trace-v1',operation,capturedAt:new Date().toISOString(),completed:false,droppedEvents:0,events:[]};return event=>{if(lastCableTrace.events.length<20000)lastCableTrace.events.push({...event,atMs:Math.round(performance.now()-started)});else lastCableTrace.droppedEvents++;};};
 const workspace=createUv32Workspace({document:d,select,getCapture:()=>preview,canUndo:()=>undo.length>0,onUndo:()=>{
  if(!undo.length)return;editedImage=undo.pop();preview={...capture,...uv32Preview(editedImage),wireHex:uv32ImageToHex(editedImage)};note(`UV-32 edits: ${changedUv32Blocks(uv32ImageFromHex(capture.wireHex),editedImage).length} memory blocks changed`);refresh();
 },onError:text=>note(text),onEdit:(kind,payload)=>{
  if(!editedImage||!capture?.readout)throw Error('Open or read a complete UV-32 image before editing');
  const actions={channel:()=>editUv32Channel(editedImage,payload.number,payload.patch),deleteMany:()=>payload.numbers.reduce((image,number)=>editUv32Channel(image,number,{delete:true}),editedImage),move:()=>moveUv32Channel(editedImage,payload.from,payload.to),insert:()=>insertUv32Channel(editedImage,payload.number),zone:()=>editUv32ZoneName(editedImage,payload.number,payload.value),dtmf:()=>editUv32Dtmf(editedImage,payload),setting:()=>editUv32Setting(editedImage,payload.name,payload.value),vfo:()=>editUv32Vfo(editedImage,payload.side,payload.field,payload.value)};
  if(!actions[kind])throw Error('Unknown UV-32 edit');const next=actions[kind]();if(next.some((value,index)=>value!==editedImage[index])){undo.push(editedImage);if(undo.length>30)undo.shift();}editedImage=next;
  const decoded=uv32Preview(editedImage);preview={...capture,...decoded,wireHex:uv32ImageToHex(editedImage)};
  note(`UV-32 edits: ${changedUv32Blocks(uv32ImageFromHex(capture.wireHex),editedImage).length} memory blocks changed`);refresh();
 }});
 const note=text=>{output.textContent=text;message(text);};
 const download=(report,fileName)=>{const build=d.querySelector('.build-badge')?.textContent;
  const payload={build,...report,selectedProtocol:select.value,...(bluetooth&&{requestedSendMode:mode.value,sessionAtDownload:bluetooth.uv32ReadSessionStatus(radio)})};
  const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'})),a=d.createElement('a');
  a.href=url;a.download=fileName??(report.memoryReads===0?'ham-rx-uv32-read-diagnostics.json':report.kind==='uv32-cable-full-read-v1'?'ham-rx-uv32-full-read'+(report.completed?'':'-partial')+'.json':'ham-rx-uv32-channels'+(report.completed?'':'-partial')+'.json');d.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 };
 traceSave.onclick=()=>{if(lastCableTrace?.events.length)download(lastCableTrace,'ham-rx-uv32-cable-trace.json');};
 importButton.onclick=()=>importInput.click();
 importInput.onchange=async()=>{const file=importInput.files?.[0];importInput.value='';if(!file)return;
  try{if(file.size>250000)throw Error('UV-32 capture is larger than expected');const loaded=openUv32Capture(await file.text());capture=loaded.sourceWireHex?openUv32Capture({...loaded,wireHex:loaded.sourceWireHex}):loaded;editedImage=uv32ImageFromHex(loaded.wireHex);undo=[];preview=loaded;workspace.reset();note('Opened full UV-32 cable capture: '+loaded.preview.channels.length+' populated channels');refresh();}
  catch(error){note(error.message);refresh();}
 };
 view.onclick=()=>workspace.render();
 save.onclick=()=>{
  const edited=preview?.readout&&editedImage&&capture&&changedUv32Blocks(uv32ImageFromHex(capture.wireHex),editedImage).length;
  const report=edited?{...preview,sourceWireHex:capture.wireHex}:capture??bluetooth?.uv32ReadDiagnostics(radio,{readSendMode:readSend?.value,interBlockDelayMs:Number(readPace?.value)});
  if(report)download(report,edited?'ham-rx-uv32-edited-capture.json':undefined);
 };
 cancel.onclick=()=>{controller?.abort();cancel.disabled=true;note('Stopping UV-32 operation after the current request…');};
 if(bluetooth)read.onclick=()=>run(async()=>{
  const uiSessionAtClick=bluetooth.uv32ReadSessionStatus(radio),readSendMode=readSend.value,diagnosticSweep=sweep.checked,interBlockDelayMs=Number(readPace.value);
  controller=new AbortController();note('Reading UV-32 channels…');refresh();
  try{capture=await bluetooth.captureUv32Channels(radio,{connect,readSendMode,diagnosticSweep,interBlockDelayMs,signal:controller.signal,
   stage:note,progress:(n,total)=>{const p=$('progress');p.max=total;p.value=n;},status:state=>{
    const address='0x'+state.address.toString(16).padStart(4,'0').toUpperCase();note(`UV-32 ${state.phase}: block ${state.block}/${state.total} (${address}) · valid ${state.valid} · errors ${state.errors}`);
   }});capture.uiSessionAtClick=uiSessionAtClick;
   if(capture.completed){preview=capture;editedImage=null;workspace.reset();note('UV-32 channel read complete: '+capture.preview.channels.length+' populated channels');}
   else note('Diagnostic sweep finished: '+capture.completedBlocks+' / 500 valid blocks, '+capture.anomalies.length+' anomaly(s). Save the capture for diagnosis.');
  }catch(error){if(error.uv32ReadReport){capture=error.uv32ReadReport;capture.uiSessionAtClick=uiSessionAtClick;if(capture.memoryReads>0){
    const block=capture.attemptedAddress/64+1,address='0x'+capture.attemptedAddress.toString(16).padStart(4,'0').toUpperCase();
    error.message+=` — block ${block}/500 (${address}) · valid ${capture.completedBlocks} · errors ${capture.anomalies?.length??1}`;
   }}output.textContent=error.message;throw error;}
  finally{controller=null;refresh();}
 });
 cableRead.onclick=()=>run(async()=>{
  if(!navigator.serial||!window.isSecureContext)throw Error('Cable reading requires Web Serial in a secure browser');
  if(radio.connected)throw Error('Disconnect Bluetooth before starting a cable read');
  controller=new AbortController();const onTrace=beginCableTrace('read');note('Choose the UV-32 programming cable…');refresh();
  try{const port=await navigator.serial.requestPort();note('Reading UV-32 through the cable…');
   capture=await readUv32SerialImage(port,{signal:controller.signal,onTrace,progress:(n,total)=>{const p=$('progress');p.max=total;p.value=n;note(`UV-32 cable: block ${n}/${total} · read only`);}});
   lastCableTrace.completed=true;
   editedImage=uv32ImageFromHex(capture.wireHex);undo=[];preview=capture;workspace.reset();note('UV-32 cable read complete: '+capture.preview.channels.length+' populated channels');
  }catch(error){lastCableTrace.error=error.message;if(error.uv32ReadReport)capture=error.uv32ReadReport;output.textContent=error.message;throw error;}
  finally{controller=null;refresh();}
 });
 cableWrite.onclick=()=>{
  if(!navigator.serial||!window.isSecureContext){note('Cable writing requires Web Serial in a secure browser');return;}
  if(radio.connected){note('Disconnect Bluetooth before starting a cable write');return;}
  if(!capture?.readout||!editedImage){note('Open a complete UV-32 capture first');return;}
  // Web Serial must be requested directly in the button's user activation.
  const portPromise=navigator.serial.requestPort();
  return run(async()=>{
  controller=new AbortController();const onTrace=beginCableTrace('write');note('Choose the UV-32 programming cable…');refresh();
  try{const port=await portPromise;note('Writing and verifying the complete UV-32 image…');const result=await writeUv32SerialImage(port,capture,editedImage,{signal:controller.signal,onTrace,progress:(stage,n,total)=>{const p=$('progress');p.max=total;p.value=n;note(`UV-32 ${stage}: block ${n}/${total}`);}});
   lastCableTrace.completed=true;
   capture=openUv32Capture({...capture,wireHex:uv32ImageToHex(editedImage)});preview=capture;undo=[];note('UV-32 cable write completed and read-back verified');workspace.render();download({...result,originalCapturedAt:capture.capturedAt},'ham-rx-uv32-write-report.json');
  }catch(error){
   lastCableTrace.error=error.message;
   if(error.uv32WriteReport){download({...error.uv32WriteReport,build:'20.57'},'ham-rx-uv32-write-failure.json');note(error.message+' · Read the radio again before another write.');}
   else note(error.message);throw error;
  }
  finally{controller=null;refresh();}
  });
 };
 select.addEventListener('change',()=>{if(select.value==='uv32'){if(bluetooth)mode.value='with-response';workspace.reset();refresh();note('UV-32 · Ready to read or open a capture');}else{workspace.restoreBrand();renderMini5();refresh();workspaceStatus();}});
 if(bluetooth){mode.addEventListener('change',refresh);readSend.addEventListener('change',refresh);}
 return {openHelp(){if(select.value!=='uv32')return false;workspace.openHelp();return true;},sync(busy){const uv=select.value==='uv32';
  for(const id of ['uatUv32CableRead','uatUv32CableWrite','uatUv32View','uatUv32Save','uatUv32Import'])$(id).hidden=!uv;
  if(bluetooth){
   for(const id of ['uatUv32Read','uatUv32ReadSendControl','uatUv32ReadPaceControl','uatUv32SweepControl'])$(id).hidden=!uv;
   readSend.disabled=busy;readPace.disabled=busy;sweep.disabled=busy;
   read.disabled=busy||!navigator.bluetooth||!window.isSecureContext;
  }
  for(const id of ['open','appendChannels','save','saveImg','readRadio','writeRadio','verify','backup'])$(id).hidden=uv;
  select.disabled=busy;importButton.disabled=busy;
  $('connect').hidden=uv&&!bluetooth&&!radio.connected;
  $('linkDot').hidden=uv&&!bluetooth&&!radio.connected;
  cableRead.disabled=busy||!!radio.connected||!navigator.serial||!window.isSecureContext;
  cableWrite.disabled=busy||!!radio.connected||!navigator.serial||!window.isSecureContext||!editedImage||!capture?.readout;
  view.disabled=busy||!preview;save.disabled=busy||(!bluetooth&&!capture);
  traceSave.hidden=!uv;traceSave.disabled=busy||!lastCableTrace?.events.length;
  save.textContent=!bluetooth||capture?.memoryReads>0?'↧ Save UV-32 capture':'↧ Save read diagnostics';
  cancel.hidden=!controller;cancel.disabled=!controller||controller.signal.aborted;
  if(uv){
   for(const id of ['readRadio','writeRadio','verify'])$(id).disabled=true;
   $('sourceTag').textContent=preview?(preview.readout?'UV-32 full read':'UV-32 channel read'):'Blank UV-32 workspace';
   $('connectionHint').textContent=bluetooth?'UV-32 Bluetooth programming':radio.connected?'Disconnect MINI-5 to use the UV-32 cable':'UV-32 cable programming';
   if(!bluetooth&&!radio.connected)$('connection').textContent=navigator.serial&&window.isSecureContext?'USB programming cable':'Cable unavailable in this browser';
  }
 }};
}
