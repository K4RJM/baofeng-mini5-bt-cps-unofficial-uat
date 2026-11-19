// UAT UV-32 controls live in the existing Ham-Rx header and left sidebar.
// A UV-32 read populates its own main workspace without loading MINI-5 data.
import {readUv32SerialImage,writeUv32SerialImage} from './uat-uv32-serial.mjs?v=20.66';
import {openUv32Capture} from './uat-uv32-capture.mjs?v=20.70';
import {createUv32Workspace} from './uat-uv32-workspace.mjs?v=20.70';
import {readUv32ChirpImage,saveUv32ChirpImage,planUv32Import,stageUv32Import,editPendingUv32Channel,removeUv32Channels,uv32ChannelList} from './uv32-files.mjs';
import {readUv32Dat,writeUv32Dat} from './uv32-dat.mjs';
import {applyUv32Dat,datChannelsForUv32,updateUv32Dat,UV32_DAT_SETTING_OFFSETS} from './uv32-dat-image.mjs';
import {UV32_CHANNEL_BYTES} from './uv32-codec.mjs';
import {uv32ChannelFrequencyError,uv32WorkspaceImage,uv32ChannelCaptureImage,uv32ImageFromHex,uv32ImageToHex,uv32Preview,editUv32Channel,moveUv32Channel,insertUv32Channel,editUv32ZoneName,editUv32Dtmf,editUv32Setting,editUv32Vfo,uv32BluetoothFieldChanges,changedUv32Blocks} from './uat-uv32-edit.mjs?v=20.56';

export function installUv32Reader({radio,run,connect,message,refresh,renderMini5,workspaceStatus,bluetooth,fileTools}){
 const d=document,$=id=>d.getElementById(id),select=$('uatProtocol');
 const read=$('uatUv32Read'),cableRead=$('uatUv32CableRead'),cableWrite=$('uatUv32CableWrite'),view=$('uatUv32View'),save=$('uatUv32Save'),cancel=$('uatUv32Cancel'),importButton=$('uatUv32Import'),importInput=$('uatUv32ImportFile'),output=$('uatProtocolResult');
 const bluetoothControls=[read];
 if([select,cableRead,cableWrite,view,save,cancel,importButton,importInput,output,...(bluetooth?bluetoothControls:[])].some(x=>!x))throw Error('UV-32 controls missing');
 let capture=null,preview=null,editedImage=null,controller=null,undo=[],pending=[];
 let readBackup=null,fileOnly=false,datOnly=false,datTemplate=null;
 let writeDevice=null,importedSettings=null;
 const datSettings=new Set([...UV32_DAT_SETTING_OFFSETS,26,44,46,57]);
 const imageSettings=new Set(Array.from({length:64},(_,i)=>i));
 const topConnect=$('connect');
 const hasWriteConnection=()=>radio.connected&&writeDevice===radio.device;
 if(bluetooth){
  const defaultConnect=topConnect.onclick;
  topConnect.onclick=()=>{
   if(select.value!=='uv32')return defaultConnect();
   if(hasWriteConnection()){
    writeDevice=null;
    return defaultConnect();
   }
   return run(async()=>{await connect();writeDevice=radio.device;});
  };
 }
 const channelOnly=()=>capture?.kind==='uv32-channel-read-v1'||capture?.kind==='uv32-channel-file';
 const originalImage=()=>uv32WorkspaceImage(capture);
 const capacityMessage=()=>pending.length?'Remove '+pending.length+' channel'+(pending.length===1?'':'s')+' before writing. The UV-32 holds 1,000.':'';
 const remember=()=>{undo.push({image:editedImage,pending});if(undo.length>30)undo.shift();};
 const currentView=()=>{
  if(!pending.length||!preview)return preview;
  const extra=pending.map(({row},i)=>({...row,number:1001+i}));
  return {...preview,overCapacity:pending.length,preview:{...preview.preview,channels:preview.preview.channels.concat(extra)}};
 };
 const workspace=createUv32Workspace({document:d,select,getCapture:currentView,canUndo:()=>undo.length>0,onUndo:()=>{
  if(!undo.length)return;({image:editedImage,pending}=undo.pop());preview={...capture,...uv32Preview(editedImage),wireHex:uv32ImageToHex(editedImage)};note(`UV-32 edits: ${changedUv32Blocks(originalImage(),editedImage).length} memory blocks changed`);refresh();
 },onError:text=>note(text),onEdit:(kind,payload)=>{
  if(!editedImage||!capture)throw Error('Read the UV-32 before editing');
  let next=editedImage,nextPending=pending;
  if(kind==='deleteMany'||kind==='channel'&&payload.patch.delete){
   ({image:next,pending:nextPending}=removeUv32Channels(editedImage,pending,payload.numbers??[payload.number]));
  }else if(kind==='channel'&&payload.number>1000){
   nextPending=editPendingUv32Channel(pending,payload.number,payload.patch);
  }else{
   const actions={channel:()=>editUv32Channel(editedImage,payload.number,payload.patch),move:()=>moveUv32Channel(editedImage,payload.from,payload.to),insert:()=>insertUv32Channel(editedImage,payload.number),zone:()=>editUv32ZoneName(editedImage,payload.number,payload.value),dtmf:()=>editUv32Dtmf(editedImage,payload),setting:()=>editUv32Setting(editedImage,payload.name,payload.value),vfo:()=>editUv32Vfo(editedImage,payload.side,payload.field,payload.value)};
   if(!actions[kind])throw Error('Unknown UV-32 edit');
   next=actions[kind]();
  }
  if(nextPending!==pending||next.some((value,index)=>value!==editedImage[index]))remember();
  editedImage=next;pending=nextPending;
  const decoded=uv32Preview(editedImage);preview={...capture,...decoded,wireHex:uv32ImageToHex(editedImage)};
  note(`UV-32 edits: ${changedUv32Blocks(originalImage(),editedImage).length} memory blocks changed`);refresh();
 }});
 const note=text=>{output.textContent=text;message(text);};
 const exportImage=(image,name)=>fileTools.save(saveUv32ChirpImage(image),name,'application/octet-stream');
 const addFileButton=(id,label,before)=>{
  const button=d.createElement('button');button.type='button';button.id=id;button.textContent=label;button.hidden=true;
  before.insertAdjacentElement('beforebegin',button);return button;
 };
 const appendFile=addFileButton('uv32AppendFile','＋ Append channels',read);
 const saveDat=addFileButton('uv32SaveDat','↧ Save .dat copy',read);
 const bluetoothWrite=bluetooth&&addFileButton('uatUv32BluetoothWrite','↑ Write Bluetooth',cableWrite);
 const gpsWarning=bluetooth&&d.createElement('p');
 if(gpsWarning){
  gpsWarning.style.color='light-dark(#d00000, #ff4545)';
  gpsWarning.textContent='Turn GPS off on the UV-32 before reading or writing over Bluetooth.';
  gpsWarning.hidden=true;
  read.insertAdjacentElement('beforebegin',gpsWarning);
 }
 const blockedBluetoothWrite=()=>{
  if(pending.length)return capacityMessage();
  if(!navigator.bluetooth||!window.isSecureContext)return 'Use a browser with Web Bluetooth.';
  if(!hasWriteConnection())return 'Use Connect at the top before writing to the UV-32.';
  if(!(channelOnly()||capture?.readout)||!editedImage)return 'Open a UV-32 file or read the radio before writing.';
  try{uv32BluetoothFieldChanges(originalImage(),editedImage);}catch(error){return error.message;}
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
  if(pending.length)throw Error('A UV-32 DAT holds 1,000 channels. Reduce the list before saving this format.');
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
 (gpsWarning||read).insertAdjacentElement('beforebegin',save);
 const backupFile=addFileButton('uv32ReadBackup','↧ Save read backup',view);
 backupFile.onclick=()=>{if(readBackup)exportImage(readBackup,'uv32-original-radio-backup.img');};
 const stageImage=(next,keepUndo=true,nextPending=[],bank=1)=>{
  if(keepUndo)remember();
  else undo=[];
  editedImage=next;pending=nextPending;preview={...capture,...uv32Preview(next),wireHex:uv32ImageToHex(next)};
  workspace.reset(bank);refresh();
 };
 const loadImg=async file=>{
  if(file.size>100000)throw Error('CHIRP image is larger than expected.');
  return readUv32ChirpImage(new Uint8Array(await file.arrayBuffer()));
 };
 const openChannels=(replacing,initialFile)=>{
  const startingImage=editedImage;
  const base=startingImage??new Uint8Array(UV32_CHANNEL_BYTES).fill(255);
  const startingPending=pending;
  const current={channelList:[uv32ChannelList(base)],pending};
  fileTools.openChannelAppend({
   mode:replacing?'replace':'append',initialFile,capacity:1000,
   getData:()=>current,bankImport:{start:workspace.selectedBank(),plan:planUv32Import},
   readFile:async (file,settings)=>{
    const target={...settings,model:'UV-32',validateFrequency:uv32ChannelFrequencyError,charset:[[32,126,1]]};
    if(file.zoneFiles)return fileTools.readZoneFiles(file.zoneFiles,target);
    if(/\.(img|dat)$/i.test(file.name)){
     const isDat=/\.dat$/i.test(file.name);
     const template=isDat?await loadDat(file):null;
     const source=isDat?datChannelsForUv32(template):await loadImg(file);
     const names=template?.root.areaName??uv32Preview(source).readout?.zones?.map(z=>z.name);
     const channels=uv32ChannelList(source).flatMap((channel,i)=>channel.rxFreq?[{...channel,sourceZone:'Bank '+(Math.floor(i/100)+1)+(names?.[Math.floor(i/100)]?' · '+names[Math.floor(i/100)]:''),sourceMemberOrder:i%100}]:[]);
     return {kind:'csv',format:isDat?'UV-32 factory CPS DAT':'UV-32 CHIRP image',channels,rows:channels.map((channel,i)=>({line:i+1,channel,sourceName:channel.name,notes:[]})),emptyRows:0,notes:['Populated UV-32 channel records are copied. Current radio settings stay in place.']};
    }
    return fileTools.readChannelFile(file,target);
   },
   onApply:(_data,plan)=>{
    if(select.value!=='uv32')throw Error('Switch to the UV-32 workspace to apply this import.');
    if(editedImage!==startingImage||pending!==startingPending)throw Error('The workspace changed. Reopen the channel import.');
    const staged=stageUv32Import(base,pending,plan,replacing);
    if(!startingImage){
     capture={kind:'uv32-channel-file',wireHex:uv32ImageToHex(base)};
     editedImage=base;fileOnly=true;datOnly=false;importedSettings=null;datTemplate=null;readBackup=null;undo=[];
    }
    stageImage(staged.image,true,staged.pending,replacing?1:Math.ceil((plan.slots[0]??1001)/100));
    note([plan.channels.length+' channels '+(replacing?'imported':'appended')+' into the UV-32 workspace.',capacityMessage()].filter(Boolean).join(' '));
   }
  });
 };
 appendFile.onclick=()=>{try{openChannels(false);}catch(error){note(error.message);}};
 {
  importButton.textContent='↥ Import file';
  importButton.title='Open a UV-32 DAT, CHIRP image or capture, or import channels from CSV, TSV, HMK or supported AnyTone RDT files.';
  appendFile.title='Append channels from UV-32 DAT, IMG, CSV, TSV, HMK or supported AnyTone RDT files.';
  importInput.accept='.dat,.img,.csv,.tsv,.hmk,.rdt,.json';importInput.multiple=true;
 }
 importButton.onclick=()=>importInput.click();
 importInput.onchange=async()=>{const files=Array.from(importInput.files??[]),file=files[0];importInput.value='';if(!file)return;
  try{
   if(files.length>1){if(files.length!==2||files.some(f=>!/\.csv$/i.test(f.name)))throw Error('Select one radio file or the channel and zone CSVs from the same export.');openChannels(true,files);return;}
   if(/\.(csv|tsv|hmk|rdt)$/i.test(file.name)){openChannels(true,file);return;}
   if(/\.(img|dat)$/i.test(file.name)){
    const template=/\.dat$/i.test(file.name)?await loadDat(file):null;
    if(select.value!=='uv32')return;
    const format=template?'CPS DAT':'CHIRP image';
    const next=template?applyUv32Dat(template,channelOnly()?null:editedImage):await loadImg(file);
    if(select.value!=='uv32')return;
    if(editedImage&&channelOnly()&&!window.confirm('Replace the current UV-32 channel workspace with this file?'))return;
    if(editedImage&&!channelOnly()){
     if(!window.confirm('Replace the UV-32 workspace with this '+format+'?'))return;
     stageImage(next,false);
     if(!template)datOnly=false;
    }
    else{
     const decoded=uv32Preview(next);capture={...decoded,wireHex:uv32ImageToHex(next)};editedImage=next;preview=capture;fileOnly=true;datOnly=!!template;pending=[];undo=[];
     workspace.reset();refresh();
    }
    importedSettings=template?datSettings:imageSettings;
    datTemplate=template;
    refresh();
    note('Opened UV-32 '+format+'. Channels and radio settings are ready.');
    return;
   }
   if(file.size>250000)throw Error('UV-32 capture is larger than expected');const loaded=openUv32Capture(await file.text());
   if(select.value!=='uv32')return;
   if(editedImage&&!window.confirm('Replace the UV-32 workspace with this capture?'))return;
   capture=loaded.sourceWireHex?openUv32Capture({...loaded,wireHex:loaded.sourceWireHex}):loaded;
   editedImage=uv32ImageFromHex(loaded.wireHex);importedSettings=imageSettings;fileOnly=false;datOnly=false;pending=[];undo=[];preview=loaded;workspace.reset();note('Opened full UV-32 cable capture: '+loaded.preview.channels.length+' populated channels');refresh();
  }
  catch(error){note(error.message);refresh();}
 };
 view.onclick=()=>workspace.render();
 save.onclick=()=>{if(!pending.length&&editedImage&&capture?.readout&&!channelOnly()&&!datOnly)exportImage(editedImage,'uv32-edited.img');};
 cancel.onclick=()=>{controller?.abort();cancel.disabled=true;note('Stopping UV-32 operation after the current request…');};
 if(bluetooth)read.onclick=()=>run(async()=>{
  controller=new AbortController();note('Reading UV-32 channels…');refresh();
  try{
   const result=await bluetooth.captureUv32Channels(radio,{connect,includeSettings:true,blockBytes:128,readSendMode:'without-response',signal:controller.signal,stage:note,
    progress:(n,total)=>{const p=$('progress');p.max=total;p.value=n;note(`Reading UV-32 channels · block ${n}/${total}`);}
   });
   editedImage=uv32ChannelCaptureImage(result);capture={...result,...uv32Preview(editedImage)};preview=capture;importedSettings=null;datTemplate=null;fileOnly=false;datOnly=false;pending=[];undo=[];
   workspace.reset();note(radio.connected?'UV-32 channel read complete.':'UV-32 channel read complete. Use Connect at the top to reconnect.');
  }catch(error){note(error.message);throw error;}
  finally{controller=null;refresh();}
 });
 cableRead.onclick=()=>run(async()=>{
  if(!navigator.serial||!window.isSecureContext)throw Error('Cable reading requires Web Serial in a secure browser');
  if(radio.connected)throw Error('Disconnect Bluetooth before starting a cable read');
  controller=new AbortController();note('Choose the UV-32 programming cable…');refresh();
  try{const port=await navigator.serial.requestPort();note('Reading UV-32 through the cable…');
   capture=await readUv32SerialImage(port,{signal:controller.signal,progress:(n,total)=>{const p=$('progress');p.max=total;p.value=n;note(`UV-32 cable: block ${n}/${total} · read only`);}});
   editedImage=uv32ImageFromHex(capture.wireHex);readBackup=editedImage.slice();importedSettings=null;fileOnly=false;datOnly=false;pending=[];undo=[];preview=capture;workspace.reset();note('UV-32 cable read complete: '+capture.preview.channels.length+' populated channels');
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
     signal:controller.signal,stage:note,fileSettings:importedSettings,
     progress:(stage,n,total)=>{const p=$('progress');p.max=total;p.value=n;note(`UV-32 Bluetooth ${stage}: block ${n}/${total}`);}
    });
    const updated={...baseline,...uv32Preview(staged),wireHex:uv32ImageToHex(staged)};
    capture=channelOnly()||fileOnly?updated:openUv32Capture(updated);preview=capture;undo=[];
    const connection=report.connected?'Bluetooth connected.':'Use Connect at the top to reconnect.';
    note(`UV-32 Bluetooth write complete. All ${report.acknowledged} blocks acknowledged.${report.renamedBanks?' Bank names written.':''} ${connection}`);
    workspace.render();
   }catch(error){
    note(error.message);throw error;
   }finally{controller=null;refresh();}
  });
 }
 cableWrite.onclick=()=>{
  if(pending.length){note(capacityMessage());return;}
  if(!navigator.serial||!window.isSecureContext){note('Cable writing requires Web Serial in a secure browser');return;}
  if(radio.connected){note('Disconnect Bluetooth before starting a cable write');return;}
  if(!capture?.readout||!editedImage||channelOnly()||datOnly){note('Open a complete UV-32 CHIRP image or cable capture to write by cable.');return;}
  // Web Serial must be requested directly in the button's user activation.
  const portPromise=navigator.serial.requestPort();
  return run(async()=>{
  controller=new AbortController();note('Choose the UV-32 programming cable…');refresh();
  try{const port=await portPromise;note('Writing the complete UV-32 image…');const report=await writeUv32SerialImage(port,fileOnly?{kind:'uv32-chirp-image',wireHex:capture.wireHex}:capture,editedImage,{signal:controller.signal,progress:(stage,n,total)=>{const p=$('progress');p.max=total;p.value=n;note(`UV-32 ${stage}: block ${n}/${total}`);}});
   const updated={...capture,...uv32Preview(editedImage),wireHex:uv32ImageToHex(editedImage)};
   capture=fileOnly?updated:openUv32Capture(updated);preview=capture;undo=[];note(`UV-32 cable write complete. All ${report.completedBlocks} blocks acknowledged.`);workspace.render();
  }catch(error){note(error.message);throw error;}
  finally{controller=null;refresh();}
  });
 };
 select.addEventListener('change',()=>{
  writeDevice=null;
  if(bluetooth&&radio.connected)radio.disconnect();
  if(select.value==='uv32'){workspace.reset();refresh();note('UV-32 · Ready to read or open a capture');}
  else{workspace.restoreBrand();renderMini5();refresh();workspaceStatus();}
 });
 return {openHelp(){if(select.value!=='uv32')return false;workspace.openHelp();return true;},sync(busy){const uv=select.value==='uv32';
  if(!radio.connected&&!controller)writeDevice=null;
  for(const id of ['uatUv32CableRead','uatUv32CableWrite','uatUv32View','uatUv32Save','uatUv32Import'])$(id).hidden=!uv;
  view.hidden=true;
  for(const button of [appendFile,saveDat,backupFile])button.hidden=!uv;
  appendFile.disabled=busy;backupFile.disabled=busy||!readBackup;
  saveDat.disabled=busy||!!pending.length||!editedImage;
  saveDat.title=datTemplate?'Save a UV-32 factory CPS DAT copy':'Save a UV-32 CPS DAT copy using an existing stock DAT for factory-only fields';
  if(bluetooth){
   read.hidden=!uv;
   read.disabled=busy||!navigator.bluetooth||!window.isSecureContext;
   gpsWarning.hidden=!uv;
   const writeBlocked=uv?blockedBluetoothWrite():'';
   bluetoothWrite.hidden=!uv;
   if(uv&&!hasWriteConnection())topConnect.textContent='Connect';
   bluetoothWrite.disabled=busy||!!writeBlocked;
   bluetoothWrite.title=writeBlocked||'Write channels and edited settings over Bluetooth.';
  }
  for(const id of ['open','appendChannels','save','saveImg','readRadio','writeRadio','readMini5Cable','writeMini5Cable','verify','backup'])$(id).hidden=uv;
  select.disabled=busy;importButton.disabled=busy;
  $('connect').hidden=uv&&!bluetooth&&!radio.connected;
  $('linkDot').toggleAttribute('hidden',uv&&!bluetooth);
  cableRead.disabled=busy||!!radio.connected||!navigator.serial||!window.isSecureContext;
  cableWrite.disabled=busy||!!pending.length||!!radio.connected||!navigator.serial||!window.isSecureContext||!editedImage||!capture?.readout||channelOnly()||datOnly;
  cableWrite.title=capacityMessage()||'Write the current image by cable.';
  view.disabled=busy||!preview;save.disabled=busy||!!pending.length||!editedImage||!capture?.readout||channelOnly()||datOnly;
  save.title=datOnly?'Open a complete UV-32 CHIRP image or read the radio before exporting a CHIRP image.':'Save a complete UV-32 CHIRP image';
  save.textContent='↧ Save CHIRP .img';
  cancel.hidden=!controller;cancel.disabled=!controller||controller.signal.aborted;
  if(uv){
   for(const id of ['readRadio','writeRadio','verify'])$(id).disabled=true;
   $('sourceTag').textContent=preview?(capture?.kind==='uv32-channel-file'?'UV-32 channel file':channelOnly()?'UV-32 Bluetooth read':fileOnly?(datOnly?'UV-32 DAT':'UV-32 image'):'UV-32 full read'):'Blank UV-32 workspace';
   $('connectionHint').textContent=bluetooth?'Bluetooth programming':radio.connected?'Disconnect MINI-5 to use the UV-32 cable':'UV-32 cable programming';
   if(!bluetooth&&!radio.connected)$('connection').textContent=navigator.serial&&window.isSecureContext?'USB programming cable':'Cable unavailable in this browser';
  }
 }};
}
