// UAT UV-32 controls live in the existing Ham-Rx header and left sidebar.
// A UV-32 read populates its own main workspace without loading MINI-5 data.
import {uv32ReadSessionStatus,isUatPage} from './uat-protocols.mjs?v=20.46';
import {captureUv32Channels,uv32ReadDiagnostics} from './uat-uv32-read.mjs?v=20.48';
import {readUv32SerialImage} from './uat-uv32-serial.mjs?v=20.48';
import {openUv32Capture} from './uat-uv32-capture.mjs?v=20.49';
import {createUv32Workspace} from './uat-uv32-workspace.mjs?v=20.53';

export function installUv32Reader({radio,run,connect,message,refresh,renderMini5,workspaceStatus}){
 const page=location.href==='about:srcdoc'?document.baseURI:location.href;
 if(!isUatPage(new URL('./uat-protocols.mjs',import.meta.url).href,page))return null;
 const d=document,$=id=>d.getElementById(id),select=$('uatProtocol'),mode=$('uatSendMode'),readSend=$('uatUv32ReadSend'),sweep=$('uatUv32Sweep');
 const read=$('uatUv32Read'),cableRead=$('uatUv32CableRead'),view=$('uatUv32View'),save=$('uatUv32Save'),cancel=$('uatUv32Cancel'),importButton=$('uatUv32Import'),importInput=$('uatUv32ImportFile'),output=$('uatProtocolResult');
 if([select,mode,readSend,sweep,read,cableRead,view,save,cancel,importButton,importInput,output].some(x=>!x))throw Error('UV-32 controls missing');
 let capture=null,preview=null,controller=null;
 const workspace=createUv32Workspace({document:d,select,getCapture:()=>preview});
 const note=text=>{output.textContent=text;message(text);};
 const download=report=>{const build=d.querySelector('.build-badge')?.textContent;
  const payload={build,...report,selectedProtocol:select.value,requestedSendMode:mode.value,sessionAtDownload:uv32ReadSessionStatus(radio)};
  const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'})),a=d.createElement('a');
  a.href=url;a.download=report.memoryReads===0?'ham-rx-uv32-read-diagnostics.json':report.kind==='uv32-cable-full-read-v1'?'ham-rx-uv32-full-read'+(report.completed?'':'-partial')+'.json':'ham-rx-uv32-channels'+(report.completed?'':'-partial')+'.json';d.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 };
 importButton.onclick=()=>importInput.click();
 importInput.onchange=async()=>{const file=importInput.files?.[0];importInput.value='';if(!file)return;
  try{if(file.size>250000)throw Error('UV-32 capture is larger than expected');const loaded=openUv32Capture(await file.text());capture=loaded;preview=loaded;workspace.reset();note('Opened full UV-32 cable capture: '+loaded.preview.channels.length+' populated channels');refresh();}
  catch(error){note(error.message);refresh();}
 };
 view.onclick=()=>workspace.render();
 save.onclick=()=>download(capture??uv32ReadDiagnostics(radio,{readSendMode:readSend.value}));
 cancel.onclick=()=>{controller?.abort();cancel.disabled=true;note('Stopping UV-32 read after the current request…');};
 read.onclick=()=>run(async()=>{
  const uiSessionAtClick=uv32ReadSessionStatus(radio),readSendMode=readSend.value,diagnosticSweep=sweep.checked;
  controller=new AbortController();note('Reading UV-32 channels…');refresh();
  try{capture=await captureUv32Channels(radio,{connect,readSendMode,diagnosticSweep,signal:controller.signal,
   stage:note,progress:(n,total)=>{const p=$('progress');p.max=total;p.value=n;},status:state=>{
    const address='0x'+state.address.toString(16).padStart(4,'0').toUpperCase();note(`UV-32 ${state.phase}: block ${state.block}/${state.total} (${address}) · valid ${state.valid} · errors ${state.errors}`);
   }});capture.uiSessionAtClick=uiSessionAtClick;
   if(capture.completed){preview=capture;workspace.reset();note('UV-32 channel read complete: '+capture.preview.channels.length+' populated channels');}
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
  controller=new AbortController();note('Choose the UV-32 programming cable…');refresh();
  try{const port=await navigator.serial.requestPort();note('Reading UV-32 through the cable…');
   capture=await readUv32SerialImage(port,{signal:controller.signal,progress:(n,total)=>{const p=$('progress');p.max=total;p.value=n;note(`UV-32 cable: block ${n}/${total} · read only`);}});
   preview=capture;workspace.reset();note('UV-32 cable read complete: '+capture.preview.channels.length+' populated channels');
  }catch(error){if(error.uv32ReadReport)capture=error.uv32ReadReport;output.textContent=error.message;throw error;}
  finally{controller=null;refresh();}
 });
 select.addEventListener('change',()=>{if(select.value==='uv32'){mode.value='with-response';workspace.reset();refresh();note('UV-32 · Ready to read · read only');}else{workspace.restoreBrand();renderMini5();refresh();workspaceStatus();}});
 mode.addEventListener('change',refresh);readSend.addEventListener('change',refresh);
 return {sync(busy){const uv=select.value==='uv32';
  for(const id of ['uatUv32Read','uatUv32CableRead','uatUv32View','uatUv32Save','uatUv32Import','uatUv32ReadSendControl','uatUv32SweepControl'])$(id).hidden=!uv;
  for(const id of ['open','appendChannels','save','saveImg','readRadio','writeRadio','verify','backup'])$(id).hidden=uv;
  readSend.disabled=busy;sweep.disabled=busy;importButton.disabled=busy;
  read.disabled=busy||!navigator.bluetooth||!window.isSecureContext;
  cableRead.disabled=busy||!!radio.connected||!navigator.serial||!window.isSecureContext;
  view.disabled=busy||!preview;save.disabled=busy;
  save.textContent=capture&&capture.memoryReads>0?'↧ Save UV-32 capture':'↧ Save read diagnostics';
  cancel.hidden=!controller;cancel.disabled=!controller||controller.signal.aborted;
  if(uv){for(const id of ['readRadio','writeRadio','verify'])$(id).disabled=true;$('sourceTag').textContent=preview?(preview.readout?'UV-32 full read':'UV-32 channel read'):'Blank UV-32 workspace';$('connectionHint').textContent='UV-32 Bluetooth programming';}
 }};
}
