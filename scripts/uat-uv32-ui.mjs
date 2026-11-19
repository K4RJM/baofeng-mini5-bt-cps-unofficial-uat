// UAT UV-32 controls live in the existing Ham-Rx header and left sidebar.
// A UV-32 read populates its own main workspace without loading MINI-5 data.
import {readUv32SerialImage,writeUv32SerialImage} from './uat-uv32-serial.mjs?v=20.66';
import {openUv32Capture} from './uat-uv32-capture.mjs?v=20.70';
import {createUv32Workspace} from './uat-uv32-workspace.mjs?v=20.70';
import {readUv32ChirpImage,saveUv32ChirpImage,importUv32ChannelPlan,uv32ChannelList} from './uv32-files.mjs';
import {readUv32Dat,writeUv32Dat} from './uv32-dat.mjs';
import {applyUv32Dat,datChannelsForUv32,updateUv32Dat} from './uv32-dat-image.mjs';
import {uv32ChannelCaptureImage,uv32ImageFromHex,uv32ImageToHex,uv32Preview,editUv32Channel,moveUv32Channel,insertUv32Channel,editUv32ZoneName,editUv32Dtmf,editUv32Setting,editUv32Vfo,changedUv32Blocks} from './uat-uv32-edit.mjs?v=20.56';

export function installUv32Reader({radio,run,connect,message,refresh,renderMini5,workspaceStatus,bluetooth,fileTools}){
 const d=document,$=id=>d.getElementById(id),select=$('uatProtocol');
 const read=$('uatUv32Read'),cableRead=$('uatUv32CableRead'),cableWrite=$('uatUv32CableWrite'),view=$('uatUv32View'),save=$('uatUv32Save'),cancel=$('uatUv32Cancel'),importButton=$('uatUv32Import'),importInput=$('uatUv32ImportFile'),output=$('uatProtocolResult');
 const bluetoothControls=[read];
 if([select,cableRead,cableWrite,view,save,cancel,importButton,importInput,output,...(bluetooth?bluetoothControls:[])].some(x=>!x))throw Error('UV-32 controls missing');
 let capture=null,preview=null,editedImage=null,controller=null,undo=[];
 let readBackup=null,fileOnly=false,datOnly=false,datTemplate=null;
 const channelOnly=()=>capture?.kind==='uv32-channel-read-v1';
 const originalImage=()=>channelOnly()?uv32ChannelCaptureImage(capture):uv32ImageFromHex(capture.wireHex);
 const workspace=createUv32Workspace({document:d,select,getCapture:()=>preview,canUndo:()=>undo.length>0,onUndo:()=>{
  if(!undo.length)return;editedImage=undo.pop();preview={...capture,...uv32Preview(editedImage),wireHex:uv32ImageToHex(editedImage)};note(`UV-32 edits: ${changedUv32Blocks(originalImage(),editedImage).length} memory blocks changed`);refresh();
 },onError:text=>note(text),onEdit:(kind,payload)=>{
  if(!editedImage||!capture)throw Error('Read the UV-32 before editing');
  const actions={channel:()=>editUv32Channel(editedImage,payload.number,payload.patch),deleteMany:()=>payload.numbers.reduce((image,number)=>editUv32Channel(image,number,{delete:true}),editedImage),move:()=>moveUv32Channel(editedImage,payload.from,payload.to),insert:()=>insertUv32Channel(editedImage,payload.number),zone:()=>editUv32ZoneName(editedImage,payload.number,payload.value),dtmf:()=>editUv32Dtmf(editedImage,payload),setting:()=>editUv32Setting(editedImage,payload.name,payload.value),vfo:()=>editUv32Vfo(editedImage,payload.side,payload.field,payload.value)};
  if(!actions[kind])throw Error('Unknown UV-32 edit');const next=actions[kind]();if(next.some((value,index)=>value!==editedImage[index])){undo.push(editedImage);if(undo.length>30)undo.shift();}editedImage=next;
  const decoded=uv32Preview(editedImage);preview={...capture,...decoded,wireHex:uv32ImageToHex(editedImage)};
  note(`UV-32 edits: ${changedUv32Blocks(originalImage(),editedImage).length} memory blocks changed`);refresh();
 }});
 const note=text=>{output.textContent=text;message(text);};
 const exportImage=(image,name)=>fileTools.save(saveUv32ChirpImage(image),name,'application/octet-stream');
 const addFileButton=(id,label,before)=>{
  const button=d.createElement('button');button.type='button';button.id=id;button.textContent=label;button.hidden=true;
  before.insertAdjacentElement('beforebegin',button);return button;
 };
 const appendFile=addFileButton('uv32AppendFile','＋ Append channels',cableRead);
 const saveDat=addFileButton('uv32SaveDat','↧ Save .dat copy',cableRead);
 const bluetoothWrite=bluetooth&&addFileButton('uatUv32BluetoothWrite','↑ Write UV-32 Bluetooth',cableWrite);
 const gpsWarning=bluetooth&&d.createElement('p');
 if(gpsWarning){
  gpsWarning.style.color='light-dark(#d00000, #ff4545)';
  gpsWarning.textContent='Turn GPS off on the UV-32 before reading or writing over Bluetooth.';
  gpsWarning.hidden=true;
  read.insertAdjacentElement('beforebegin',gpsWarning);
 }
 const blockedBluetoothWrite=()=>{
  if(!navigator.bluetooth||!window.isSecureContext)return 'Use a browser with Web Bluetooth.';
  if(!(channelOnly()||capture?.readout)||!editedImage)return 'Open a UV-32 file or read the radio before writing.';
  const blocks=changedUv32Blocks(originalImage(),editedImage);
  if(blocks.some(block=>block.address>=32000))return 'Use the cable to write changes to settings, VFO, DTMF, or zone names.';
  return '';
 };
 const templateInput=d.createElement('input');
 templateInput.type='file';templateInput.accept='.dat';templateInput.hidden=true;
 saveDat.insertAdjacentElement('afterend',templateInput);
 const loadDat=async file=>{
  if(file.size>=2000000)throw Error('UV-32 CPS DAT must be smaller than 2 MB.');
  return readUv32Dat(new Uint8Array(await file.arrayBuffer()));
 };
 const exportDat=template=>{
  const bytes=writeUv32Dat(updateUv32Dat(template,editedImage));
  readUv32Dat(bytes);
  fileTools.save(bytes,'uv32-edited.dat','application/octet-stream');
  note('Saved UV-32 CPS DAT copy. CPS-only settings were preserved from the template.');
 };
 saveDat.onclick=()=>{
  if(!editedImage)return;
  try{
   if(datTemplate)exportDat(datTemplate);
   else{note('Choose an existing stock UV-32 DAT to preserve its factory-only settings in the exported copy.');templateInput.click();}
  }catch(error){note(error.message);}
 };
 templateInput.onchange=async ()=>{
  const file=templateInput.files?.[0];templateInput.value='';
  if(!file)return;
  try{const template=await loadDat(file);if(select.value!=='uv32')return;exportDat(template);datTemplate=template;}
  catch(error){note(error.message);}
 };
 cableRead.insertAdjacentElement('beforebegin',save);
 const backupFile=addFileButton('uv32ReadBackup','↧ Save read backup',view);
 backupFile.onclick=()=>{if(readBackup)exportImage(readBackup,'uv32-original-radio-backup.img');};
 const stageImage=(next,keepUndo=true)=>{
  if(keepUndo){undo.push(editedImage);if(undo.length>30)undo.shift();}
  else undo=[];
  editedImage=next;preview={...capture,...uv32Preview(next),wireHex:uv32ImageToHex(next)};
  workspace.reset();refresh();
 };
 const loadImg=async file=>{
  if(file.size>100000)throw Error('CHIRP image is larger than expected.');
  return readUv32ChirpImage(new Uint8Array(await file.arrayBuffer()));
 };
 const openChannels=(replacing,initialFile)=>{
  if(!editedImage||!capture?.readout)throw Error('Read the UV-32 or open a UV-32 CHIRP image first.');
  fileTools.openChannelAppend({
   mode:replacing?'replace':'append',initialFile,capacity:1000,
   getData:()=>({channelList:[uv32ChannelList(editedImage)]}),
   readFile:async (file,settings)=>{
    if(/\.(img|dat)$/i.test(file.name)){
     const isDat=/\.dat$/i.test(file.name);
     const source=isDat?datChannelsForUv32(await loadDat(file)):await loadImg(file);
     const channels=uv32ChannelList(source).filter(channel=>channel.rxFreq);
     return {kind:'csv',format:isDat?'UV-32 factory CPS DAT':'UV-32 CHIRP image',channels,rows:channels.map((channel,i)=>({line:i+1,channel,sourceName:channel.name,notes:[]})),emptyRows:0,notes:['Populated UV-32 channel records are copied. Current radio settings stay in place.']};
    }
    return fileTools.readChannelFile(file,settings);
   },
   onApply:(_data,plan)=>{
    if(select.value!=='uv32')throw Error('Switch to the UV-32 workspace to apply this import.');
    stageImage(importUv32ChannelPlan(editedImage,plan,replacing));
    note(plan.channels.length+' channels '+(replacing?'imported':'appended')+' into the UV-32 workspace');
   }
  });
 };
 appendFile.onclick=()=>{try{openChannels(false);}catch(error){note(error.message);}};
 {
  importButton.textContent='↥ Import file';
  importInput.accept='.dat,.img,.csv,.tsv,.hmk,.rdt,.json';
 }
 importButton.onclick=()=>importInput.click();
 importInput.onchange=async()=>{const file=importInput.files?.[0];importInput.value='';if(!file)return;
  try{
   if(/\.(csv|tsv|hmk|rdt)$/i.test(file.name)){openChannels(true,file);return;}
   if(/\.(img|dat)$/i.test(file.name)){
    const template=/\.dat$/i.test(file.name)?await loadDat(file):null;
    if(select.value!=='uv32')return;
    const format=template?'CPS DAT':'CHIRP image';
    const next=template?applyUv32Dat(template,channelOnly()?null:editedImage):await loadImg(file);
    if(select.value!=='uv32')return;
    if(editedImage&&channelOnly()&&!window.confirm('Replace the Bluetooth channel workspace with this file?'))return;
    if(editedImage&&!channelOnly()){
     if(!window.confirm('Replace the UV-32 workspace with this '+format+'?'))return;
     stageImage(next,false);
     if(!template)datOnly=false;
    }
    else{
     const decoded=uv32Preview(next);capture={...decoded,wireHex:uv32ImageToHex(next)};editedImage=next;preview=capture;fileOnly=true;datOnly=!!template;undo=[];
     workspace.reset();refresh();
    }
    if(template)datTemplate=template;
    refresh();
    note(fileOnly?'Opened UV-32 '+format+'. Use Bluetooth to write the channel table.':'Imported UV-32 '+format+'. Use the cable to program settings as well as channels.');
    return;
   }
   if(file.size>250000)throw Error('UV-32 capture is larger than expected');const loaded=openUv32Capture(await file.text());
   if(select.value!=='uv32')return;
   if(editedImage&&!window.confirm('Replace the UV-32 workspace with this capture?'))return;
   capture=loaded.sourceWireHex?openUv32Capture({...loaded,wireHex:loaded.sourceWireHex}):loaded;
   editedImage=uv32ImageFromHex(loaded.wireHex);fileOnly=false;datOnly=false;undo=[];preview=loaded;workspace.reset();note('Opened full UV-32 cable capture: '+loaded.preview.channels.length+' populated channels');refresh();
  }
  catch(error){note(error.message);refresh();}
 };
 view.onclick=()=>workspace.render();
 save.onclick=()=>{if(editedImage&&capture?.readout&&!datOnly)exportImage(editedImage,'uv32-edited.img');};
 cancel.onclick=()=>{controller?.abort();cancel.disabled=true;note('Stopping UV-32 operation after the current request…');};
 if(bluetooth)read.onclick=()=>run(async()=>{
  controller=new AbortController();note('Reading UV-32 channels…');refresh();
  try{
   const result=await bluetooth.captureUv32Channels(radio,{connect,signal:controller.signal,stage:note,
    progress:(n,total)=>{const p=$('progress');p.max=total;p.value=n;note(`Reading UV-32 channels · block ${n}/${total}`);}
   });
   editedImage=uv32ChannelCaptureImage(result);capture=result;preview=result;fileOnly=false;datOnly=false;undo=[];
   workspace.reset();note('UV-32 read complete. Edit channels, then choose Write UV-32 Bluetooth.');
  }catch(error){note(error.message);throw error;}
  finally{controller=null;refresh();}
 });
 cableRead.onclick=()=>run(async()=>{
  if(!navigator.serial||!window.isSecureContext)throw Error('Cable reading requires Web Serial in a secure browser');
  if(radio.connected)throw Error('Disconnect Bluetooth before starting a cable read');
  controller=new AbortController();note('Choose the UV-32 programming cable…');refresh();
  try{const port=await navigator.serial.requestPort();note('Reading UV-32 through the cable…');
   capture=await readUv32SerialImage(port,{signal:controller.signal,progress:(n,total)=>{const p=$('progress');p.max=total;p.value=n;note(`UV-32 cable: block ${n}/${total} · read only`);}});
   editedImage=uv32ImageFromHex(capture.wireHex);readBackup=editedImage.slice();fileOnly=false;datOnly=false;undo=[];preview=capture;workspace.reset();note('UV-32 cable read complete: '+capture.preview.channels.length+' populated channels');
  }catch(error){output.textContent=error.message;throw error;}
  finally{controller=null;refresh();}
 });
 if(bluetooth){
  bluetoothWrite.onclick=()=>run(async()=>{
   const blocked=blockedBluetoothWrite();
   if(blocked)throw Error(blocked);
   const baseline=capture,staged=editedImage;
   controller=new AbortController();
   note('Starting UV-32 Bluetooth channel write…');refresh();
   try{
    const report=await bluetooth.writeUv32Bluetooth(radio,baseline,staged,{
     signal:controller.signal,stage:note,
     progress:(stage,n,total)=>{const p=$('progress');p.max=total;p.value=n;note(`UV-32 Bluetooth ${stage}: block ${n}/${total}`);}
    });
    const updated={...baseline,...uv32Preview(staged),wireHex:uv32ImageToHex(staged)};
    capture=channelOnly()||fileOnly?updated:openUv32Capture(updated);preview=capture;undo=[];
    note(`UV-32 Bluetooth write complete. All ${report.acknowledged} channel blocks acknowledged and channels verified.`);
    workspace.render();
   }catch(error){
    note(error.message);throw error;
   }finally{controller=null;refresh();}
  });
 }
 cableWrite.onclick=()=>{
  if(!navigator.serial||!window.isSecureContext){note('Cable writing requires Web Serial in a secure browser');return;}
  if(radio.connected){note('Disconnect Bluetooth before starting a cable write');return;}
  if(!capture?.readout||!editedImage||fileOnly){note('Read the target UV-32 by cable first');return;}
  // Web Serial must be requested directly in the button's user activation.
  const portPromise=navigator.serial.requestPort();
  return run(async()=>{
  controller=new AbortController();note('Choose the UV-32 programming cable…');refresh();
  try{const port=await portPromise;note('Writing and verifying the complete UV-32 image…');await writeUv32SerialImage(port,capture,editedImage,{signal:controller.signal,progress:(stage,n,total)=>{const p=$('progress');p.max=total;p.value=n;note(`UV-32 ${stage}: block ${n}/${total}`);}});
   capture=openUv32Capture({...capture,wireHex:uv32ImageToHex(editedImage)});preview=capture;undo=[];note('UV-32 cable write completed and read-back verified');workspace.render();
  }catch(error){note(error.message);throw error;}
  finally{controller=null;refresh();}
  });
 };
 select.addEventListener('change',()=>{if(select.value==='uv32'){workspace.reset();refresh();note('UV-32 · Ready to read or open a capture');}else{workspace.restoreBrand();renderMini5();refresh();workspaceStatus();}});
 return {openHelp(){if(select.value!=='uv32')return false;workspace.openHelp();return true;},sync(busy){const uv=select.value==='uv32';
  for(const id of ['uatUv32CableRead','uatUv32CableWrite','uatUv32View','uatUv32Save','uatUv32Import'])$(id).hidden=!uv;
  view.hidden=true;
  for(const button of [appendFile,saveDat,backupFile])button.hidden=!uv;
  appendFile.disabled=busy||!editedImage||channelOnly();backupFile.disabled=busy||!readBackup;
  saveDat.disabled=busy||!editedImage||channelOnly();
  saveDat.title=datTemplate?'Save a UV-32 factory CPS DAT copy':'Save a UV-32 CPS DAT copy using an existing stock DAT for factory-only fields';
  if(bluetooth){
   read.hidden=!uv;
   read.disabled=busy||!navigator.bluetooth||!window.isSecureContext;
   gpsWarning.hidden=!uv;
   const writeBlocked=uv?blockedBluetoothWrite():'';
   bluetoothWrite.hidden=!uv;
   bluetoothWrite.disabled=busy||!!writeBlocked;
   bluetoothWrite.title=writeBlocked||'Write the channel table over Bluetooth and verify it afterward.';
  }
  for(const id of ['open','appendChannels','save','saveImg','readRadio','writeRadio','readMini5Cable','writeMini5Cable','verify','backup'])$(id).hidden=uv;
  select.disabled=busy;importButton.disabled=busy;
  $('connect').hidden=uv&&!bluetooth&&!radio.connected;
  $('linkDot').toggleAttribute('hidden',uv&&!bluetooth);
  cableRead.disabled=busy||!!radio.connected||!navigator.serial||!window.isSecureContext;
  cableWrite.disabled=busy||!!radio.connected||!navigator.serial||!window.isSecureContext||!editedImage||!capture?.readout||fileOnly;
  view.disabled=busy||!preview;save.disabled=busy||!editedImage||!capture?.readout||datOnly;
  save.title=datOnly?'Open a complete UV-32 CHIRP image or read the radio before exporting a CHIRP image.':'Save a complete UV-32 CHIRP image';
  save.textContent='↧ Save CHIRP .img';
  cancel.hidden=!controller;cancel.disabled=!controller||controller.signal.aborted;
  if(uv){
   for(const id of ['readRadio','writeRadio','verify'])$(id).disabled=true;
   $('sourceTag').textContent=preview?(preview.readout?'UV-32 full read':'UV-32 channel read'):'Blank UV-32 workspace';
   $('connectionHint').textContent=bluetooth?'UV-32 Bluetooth programming':radio.connected?'Disconnect MINI-5 to use the UV-32 cable':'UV-32 cable programming';
   if(!bluetooth&&!radio.connected)$('connection').textContent=navigator.serial&&window.isSecureContext?'USB programming cable':'Cable unavailable in this browser';
  }
 }};
}
