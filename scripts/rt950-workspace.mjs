import {BLOCK, EMPTY_REC, LAYOUTS, LOW_LIMIT, REC, ZN_ADDR, blockBefore, sections, eq, hex, planWrites, readImage, webBluetoothLink, writeBlocks} from './rt950-core.mjs';
import {blankImage, channel, fullChannel, channelMenus, editRecord, exportZoneCsv, openBackup, overlayChanges, powers, record, renameZone, saveBackup, zoneName} from './rt950-channels.mjs';
import {rt950Models} from './rt950-models.mjs';
import {withRt950Serial} from './rt950-serial.mjs';
import {importChannels} from './rt950-import.mjs';
import {openNative,saveNative} from './rt950-native.mjs';
import {renderSection,toneSelect} from './rt950-forms.mjs';
import {validateSettings} from './rt950-sections.mjs';
import {renderRt950Help,rt950Photo} from './rt950-help.mjs';

const columns=[['name','Name'],['rx','RX MHz'],['tx','TX MHz'],['rxTone','RX tone'],['txTone','TX tone'],['signal','Signalling'],['ptt','PTT-ID'],['power','TX power'],['scramble','Scramble'],['learn','Learn FHSS'],['bandwidth','Bandwidth'],['encryption','Encryption'],['lock','Busy lockout'],['scan','Scan add'],['rxMode','RX modulation'],['fhss','FHSS code']];
const pages={'Channels':'☷','Optional Features':'⚙','VFO A / B / C':'⇄','DTMF':'▦','FM / AM / SSB':'♫','APRS':'⌖','Radio & help':'ⓘ'};
const layoutNames={'990':'0.24+ · 10 zones × 99','960':'Earlier · 15 zones × 64'};
const sameImage=(a,b)=>!!a.replaceChannelList===!!b.replaceChannelList&&eq(a.ch,b.ch)&&eq(a.zn,b.zn)&&sections.every(({key})=>
 a[key]===b[key]||(a[key]&&b[key]&&eq(a[key],b[key])));
const emptyImage=blankImage();

export function workspaceBlocks(target,layout,hasChannelImage,state){
 const baseline=state?.baseline;
 const pending=state?.pending??[];
 const unchanged=baseline&&sameImage(baseline,target);
 // A replacement owns every editable channel, including the empty slots.
 // Manually added channels without a snapshot own only their edited blocks.
 const reference=(!hasChannelImage&&unchanged?null:baseline)??emptyImage;
 const sendTable=(target.replaceChannelList&&!state?.complete)||((hasChannelImage||target.replaceChannelList)&&(!baseline||(unchanged&&!pending.length)));
 const blocks=planWrites(reference,target,layout,true,sendTable,hasChannelImage&&sendTable);
 // A backup can supply sections the previous radio image does not contain.
 // Send those captured bytes, including APRS in its separate address space.
 for(const region of sections){
  if(!target[region.key]||reference[region.key])continue;
  for(let offset=0;offset<region.length;offset+=BLOCK){
   blocks.push(blockBefore(target,{region:region.key,addr:region.addr+offset,read:region.read,write:region.write}));
  }
 }
 const regionOrder=b=>sections.findIndex(region=>region.key===b.region);
 const transferOrder=(a,b)=>regionOrder(a)-regionOrder(b)||a.addr-b.addr;
 blocks.sort(transferOrder);
 if(!hasChannelImage){
  const {zones,per}=LAYOUTS[layout];
  for(const b of blocks){
   const end=b.addr>=ZN_ADDR?ZN_ADDR+zones*16:zones*per*REC;
   if(!(target.replaceChannelList&&b.addr<ZN_ADDR)&&b.addr+BLOCK>end)throw Error('This last block includes bytes beyond the editable slots. Open a saved radio backup to preserve those bytes when writing it.');
  }
 }
 // A factory DAT describes 990 memories and 10 names. Preserve the radio's
 // padding in the two partly occupied blocks, even when reconnecting.
 function preserveTail(b){
  if(b.region||!(target.factoryDat||target.replaceChannelList&&b.addr<ZN_ADDR))return b;
  const end=b.addr>=ZN_ADDR?ZN_ADDR+LAYOUTS[layout].zones*16:LAYOUTS[layout].zones*LAYOUTS[layout].per*REC;
  return b.addr+BLOCK>end?{...b,preserveFrom:end-b.addr}:b;
 }
 if(!pending.length)return blocks.map(preserveTail);
 // An edit undone after an interruption may already have reached the radio.
 const address=b=>(b.region||'memory')+'/'+b.addr;
 const retry=new Map(pending.filter(b=>!b.region||target[b.region]).map(b=>[address(b),blockBefore(target,b)]));
 for(const b of blocks)retry.set(address(b),b);
 return [...retry.values()].sort(transferOrder).map(preserveTail);
}
export function createRt950Workspace({run,refresh,message,fileTools,profile=rt950Models.rt950pro}){
 const $=id=>document.getElementById(id);
 function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
 function button(text,action){const b=el('button',text);b.type='button';b.onclick=action;return b;}
 function field(label,control){control.setAttribute('aria-label',label);const wrap=el('label');wrap.append(el('span',label),control);return wrap;}
 function choices(options,value){const input=el('select');for(const [key,title] of options)input.add(new Option(title,key));input.value=value;return input;}
 function sidebar(id,title,action){const b=button(title,action);b.id=profile.id==='rt950pro'?id:id.replace(/^rt950/,profile.id);b.hidden=true;$('uatUv32Import').before(b);return b;}
 const input=el('input');input.type='file';input.multiple=true;input.accept='.dat,.json,.csv,.tsv,.hmk,.rdt,.img';input.hidden=true;$('uatUv32Import').before(input);
 let appendSelected=false;
 function chooseFile(append){appendSelected=append;input.accept=append?'.csv,.tsv,.hmk,.rdt,.img,.dat':'.dat,.json,.csv,.tsv,.hmk,.rdt,.img';input.click();}
 const open=sidebar('rt950Open','↥ Import file',()=>chooseFile(false));
 const append=sidebar('rt950Append','＋ Append channels',()=>chooseFile(true));
 const dat=sidebar('rt950SaveDat',profile.id==='rt950pro'?'↧ Save CPS .dat':'↧ Save Radtel .dat',()=>run(async()=>{
  if(draft.overflow?.length)throw Error(capacityMessage());
  fileTools.save(saveNative(draft,layout,nativeTemplate),'rt950pro-edited.dat','application/octet-stream');
  note('Saved Radtel CPS DAT.'+(layout==='960'?' CPS 1.3.3 displays the 960 channel slots in its 10-zone layout.':''));
 }));
 const save=sidebar('rt950Save','↧ Save workspace',()=>download(draft,profile.id+'-edited.json'));
 const read=sidebar('rt950Read','↓ Read Bluetooth',()=>run(readRadio));
 const cableRead=sidebar('rt950CableRead','↓ Read Cable',()=>run(()=>viaCable(readRadio)));
 const write=sidebar('rt950Write','↑ Write Bluetooth',()=>run(writeRadio));
 const cableWrite=sidebar('rt950CableWrite','↑ Write Cable',()=>run(()=>viaCable(writeRadio)));
 const backup=sidebar('rt950Backup','↧ Save read backup',()=>download(original,profile.id+'-radio-backup.json'));
 let layout='990',zone=1,screen='Channels',search='',showEmpty=false,link=null,active=false;
 let base=emptyImage,draft=base,original=null,history=[],restoreFile=false,hasChannelImage=false,nativeTemplate=null;
 const capacityMessage=()=>draft.overflow?.length+' channels over capacity. Place or remove them before writing or saving a CPS DAT.';
 // A dropped GATT connection still belongs to the same browser device. Keep its
 // last acknowledged image and any interrupted blocks until the next user action.
 const radios=new Map();
 let lastCablePort=null;
 const deviceKey=device=>device?.id||device;
 const radioState=()=>radios.get(deviceKey(link?.device));
 const hasWorkspace=()=>hasChannelImage||!!draft.overflow?.length||!sameImage(emptyImage,draft)||!!radioState()?.pending?.length||!!radios.get(lastCablePort)?.pending?.length||!sameImage(base,draft);
 let status='Choose the firmware layout shown in Menu › About. Connect to read your radio, or edit channels here.';
 const note=text=>{status=text;if(active)message(text);};
 function download(image,name){if(image)fileTools.save(saveBackup(image,layout,profile,!hasChannelImage&&image===draft&&!!image.replaceChannelList),name,'application/json');}
 function commit(next,text,repaint=true){
  if(!sameImage(draft,next)||draft.overflow!==next.overflow){history.push(draft);if(history.length>20)history.shift();draft=next;}
  note(text);if(repaint)render();refresh();
 }
 function undoEdit(){if(!history.length)return;draft=history.pop();render();refresh();note('Last edit undone.');}
 function disconnect(){const old=link;link=null;old?.disconnect();}
 async function chooseRadio(){
  disconnect();
  const next=webBluetoothLink(()=>{});link=next;
  try{await next.choose(false);}catch(error){disconnect();throw error;}
  next.device.addEventListener('gattserverdisconnected',()=>{
   if(link!==next)return;
   note(hasWorkspace()?'Bluetooth disconnected. Your workspace is ready. Choose Write Bluetooth to reconnect and send it.':'Bluetooth disconnected.');refresh();
  });
  return next;
 }
 async function connect(){
  if(link?.device?.gatt.connected){disconnect();note('Bluetooth disconnected. Your workspace is retained.');return;}
  await chooseRadio();
  note(hasWorkspace()?'Connected. Your workspace is ready to write.':'Connected. Read the radio, open a workspace or add channels.');
 }
 const opts={allowedModels:profile.models};
 function progress(verb){return (done,total)=>{const bar=$('progress');bar.max=total;bar.value=done;note(verb+' · '+done+' / '+total+' blocks');};}
 async function viaCable(action){
  let port;
  try{port=await navigator.serial.requestPort();}
  catch(error){if(error.name==='NotFoundError')return;throw error;}
  lastCablePort=port;
  await action(port);
 }
 async function readRadio(port){
  const session=link,key=port??deviceKey(session?.device);
  if(!port&&!session?.device?.gatt.connected)throw Error('Use Connect at the top before reading.');
  const uncertain=!!radios.get(key)?.pending?.length;
  const merge=!uncertain&&(restoreFile||!!draft.overflow?.length||!sameImage(base,draft));
  if(uncertain&&!confirm('Read the current radio contents and replace the uncertain workspace? Save the workspace first to retain your edits.'))return;
  if(merge&&!confirm('Read this radio and stage your current workspace edits over its channels and settings?'))return;
  const readFrom=transport=>readImage(transport,opts,progress(port?'Reading cable':'Reading'));
  const fresh=port?await withRt950Serial(port,readFrom):await readFrom(session);
  if(!port&&(link!==session||!session.device.gatt.connected))throw Error('The radio disconnected. Connect and read again.');
  const missing=fresh.unavailable||[];
  if(merge&&missing.some(k=>draft[k]&&(restoreFile||!base[k]||!eq(base[k],draft[k])))){
   throw Error('Some settings could not be read. Your staged workspace was kept.');
  }
  const prior=restoreFile?(draft.replaceChannelList&&!hasChannelImage?{...fresh,zn:emptyImage.zn}:fresh):base;
  const next=merge?overlayChanges(fresh,prior,draft,layout):fresh;
  if(merge&&draft.overflow?.length)next.overflow=draft.overflow;
  if(merge&&draft.factoryDat)next.factoryDat=true;
  if(!merge)nativeTemplate=null;
  base=fresh;original=fresh;hasChannelImage=true;draft=next;history=[];restoreFile=false;
  if(port)radios.delete(port);
  else radios.set(key,{baseline:fresh,complete:true});
  note(missing.length?'Channels read. Unavailable settings: '+missing.join(', ')+'.':merge?'Read complete. Review the staged changes before writing.':'Channels and radio settings read. The original radio backup is available.');
  render();
 }
 async function writeRadio(port){
  if(draft.overflow?.length)throw Error(capacityMessage());
  if(!hasWorkspace())throw Error('Open a workspace or add channels to write.');
  const session=port?null:(link?.device?link:await chooseRadio());
  // A USB port identifies an adapter. Another radio can be plugged into it
  // between operations, so never use a cached radio image for a cable write.
  const key=port??deviceKey(session.device),state=radios.get(key),baseline=state?.baseline,target=draft;
  validateSettings(target,base);
  const unchanged=baseline&&sameImage(baseline,target);
  const blocks=workspaceBlocks(target,layout,hasChannelImage,state);
  if(!blocks.length)throw Error('There are no workspace blocks to write.');
  const high=blocks.some(b=>!b.region&&b.addr>=LOW_LIMIT&&b.addr<0x7c00);
  const count=blocks.length+' block'+(blocks.length===1?'':'s');
  const scope=!baseline&&hasChannelImage?'Replace the channel table and all sections present in this workspace':
   unchanged&&hasChannelImage&&!state?.pending?.length?'Write back the channel table'+(LAYOUTS[layout].zoneNames?' and zone names':''):'Write the selected workspace blocks';
  const detail=target.replaceChannelList?' The workspace channel order replaces the radio channel list.':!hasChannelImage?' Each channel block replaces four adjacent slots, including any empty slots in the block.':'';
  if(!confirm(scope+' ('+count+') on '+(port?'the RT-950 Pro on the selected cable':profile.name+(session.device.name?' ('+session.device.name+')':''))+' using '+layoutNames[layout]+'?'+detail+(high?' This includes channels 961–990. Confirm firmware 0.24 or later.':'')))return;
  let acknowledged=0;
  note(port?'Starting cable write…':session.device.gatt.connected?'Starting write…':'Reconnecting to write…');
  const showProgress=progress('Writing');
  let attempted=false;
  const onWriteAttempt=()=>{
   if(attempted)return;
   attempted=true;
   // Cable and Bluetooth may address the same radio. Preserve interrupted
   // blocks, but don't compare against a baseline invalidated by a cable write.
   if(port)for(const [id,known] of radios)if(known.baseline)radios.set(id,{pending:known.pending});
  };
  const send=transport=>writeBlocks(transport,{...opts,onWriteAttempt},blocks,(done,total)=>{acknowledged=done;showProgress(done,total);});
  try{if(port)await withRt950Serial(port,send);else await send(session);}
  catch(error){
   if(!attempted)throw error;
   radios.set(key,{...state,pending:blocks});
   note('Write incomplete. '+acknowledged+' of '+count+' acknowledged. Your workspace is retained. Choose '+(port?'Write Cable':'Write Bluetooth')+' to retry. '+error.message);throw Error(status);
  }
  base=target;
  if(port)radios.delete(key);else radios.set(key,{baseline:target,complete:hasChannelImage});
  history=[];restoreFile=false;
  note('Write complete. The radio acknowledged '+count+'.');render();
 }
 input.onchange=()=>{
  const replacing=!appendSelected,files=Array.from(input.files??[]),file=files[0];input.value='';if(!file)return;
  run(async()=>{
   let saved;
   if(replacing&&files.length===1&&/\.json$/i.test(file.name)){
    if(file.size>4*1024*1024)throw Error('Select a workspace smaller than 4 MB.');
    saved=openBackup(await file.text(),layout,profile);
   }else if(files.length===1&&/\.dat$/i.test(file.name)&&new TextDecoder().decode(await file.slice(0,140).arrayBuffer()).includes('BT-RT950PRO_CPS,')){
    if(!replacing)throw Error('Use Import file to open a full Radtel CPS DAT.');
    if(file.size>=2000000)throw Error('Select a Radtel DAT smaller than 2 MB.');
    saved=openNative(new Uint8Array(await file.arrayBuffer()));
   }else{
    const image=draft;
    await importChannels({files,layout,zone,image,fileTools,replacing,modelName:profile.short,apply:(next,plan,first)=>{
     if(!active||draft!==image)throw Error('The workspace changed. Reopen the channel import.');
     zone=first;search='';screen='Channels';
     commit(next,plan.channels.length+' analog channels imported.'+(next.overflow.length?' '+next.overflow.length+' over capacity.':''));
    }});return;
   }
   const state=radioState(),radioBase=state?.complete?state.baseline:null;
   if(link?.device?.gatt.connected&&radioBase&&saved.layout!==layout)throw Error('The backup uses a different firmware layout from this radio workspace.');
   if(!confirm('Open this '+(saved.native?'Radtel CPS DAT':'backup')+' and replace the channels and settings it contains?'))return;
   if(saved.layout!==layout){radios.clear();original=null;}
   else for(const [key,known] of radios)if(!known.complete)radios.delete(key);
   if(!radioBase||saved.layout!==layout){layout=saved.layout;base=saved.image;draft=base;}
   else{
    base=radioBase;
    const prior=saved.channelListOnly?{...radioBase,zn:emptyImage.zn}:radioBase;
    draft=overlayChanges(radioBase,prior,saved.image,layout);
    for(const {key} of sections)if(saved.image[key]&&!draft[key])draft[key]=saved.image[key];
    if(saved.image.factoryDat)draft.factoryDat=true;
    if(saved.image.overflow?.length)draft.overflow=saved.image.overflow;
   }
   nativeTemplate=saved.native??null;
   history=[];hasChannelImage=!!radioBase||!saved.channelListOnly;restoreFile=true;
   zone=1;search='';screen='Channels';render();note(saved.native?'Radtel CPS DAT opened. Channels and settings are ready.':'Backup opened. Review the workspace before writing.');
  });
 };
 function channelValues(slot){
  const row=fullChannel(record(draft,layout,slot));
  if(!row.rx)Object.assign(row,Object.fromEntries(Object.entries(channelMenus).map(([key,options])=>[key,options[0]])),{name:'',tx:'',rxTone:'Off',txTone:'Off',power:'High',scan:true,fhss:''});
  return row;
 }
 function channelControl(key,value,inline=false){
  if(key==='rxTone'||key==='txTone')return toneSelect(el,value);
  const options=key==='power'?powers:channelMenus[key];
  if(options)return choices([...new Set([...options,value])].map(x=>[x,x]),value);
  const control=el('input');control.value=value;
  if(key==='scan'){
   if(inline)return choices([['add','Add'],['skip','Skip']],value?'add':'skip');
   control.type='checkbox';control.checked=value;
  }
  if(key==='name')control.maxLength=12;
  if(key==='rx'||key==='tx')control.inputMode='decimal';
  if(key==='tx')control.placeholder='Blank for receive only';
  return control;
 }
 const channelValue=(key,control)=>key==='scan'?(control.type==='checkbox'?control.checked:control.value==='add'):control.value;
 function saveChannel(slot,initial,patch){
  const bytes=record(draft,layout,slot);
  if(!initial.rx&&!patch.rx)throw Error('Enter an RX frequency to add a channel.');
  const values=initial.rx?patch:{...Object.fromEntries(columns.map(([key])=>[key,initial[key]])),...patch};
  const next=editRecord(bytes,values);
  if(eq(bytes,next))return;
  const image={...draft,ch:draft.ch.slice()};record(image,layout,slot).set(next);
  commit(image,'Channel saved to the workspace.',false);
 }
 function render(){
  if(!active)return;
  $('brandTitle').textContent='Ham-Rx '+profile.name;
  document.documentElement.dataset.screen=screen==='Channels'?'channels':'other';
  $('tabs').replaceChildren(...Object.entries(pages).map(([s,icon])=>{
   const b=button(icon+' '+s,()=>{screen=s;render();});b.classList.toggle('active',s===screen);if(s===screen)b.setAttribute('aria-current','page');return b;
  }));
  const allChannels=draft.settings?.[38]!==255&&(draft.settings?.[38]&15)===1;
  $('pageTitle').textContent=screen==='Channels'?(allChannels?'Channels · All':'Channels · Zone '+zone):screen;
  $('pageDescription').textContent=screen==='Channels'?(allChannels?'All CH Mode':'Edit '+profile.short+' channels by zone.'):profile.name+' programming';
  const card=el('section',undefined,'card'+(screen==='Channels'?' channel-card rt950-channels':''));
  $('content').replaceChildren(card);
  if(screen==='Radio & help'){
   renderRt950Help($('content'),draft,profile);return;
  }
  if(screen!=='Channels'){
   $('pageDescription').textContent='';
   card.classList.add('rt950-config');
   renderSection(card,screen,{el,field,button,image:()=>draft,update:(img,msg)=>commit(img,msg,false),undo:undoEdit,canUndo:()=>history.length>0,note,layout});
   return;
  }
  const bar=el('div',undefined,'toolbar'),controls=el('div',undefined,'toolbar-controls');
  const firmware=choices([['990',layoutNames['990']],['960',layoutNames['960']]],layout);firmware.id='rt950Firmware';
  firmware.onchange=()=>{
   if((original||restoreFile||!!draft.overflow?.length||!sameImage(base,draft))&&!confirm('Change firmware layout and clear this '+profile.short+' workspace?')){firmware.value=layout;return;}
   layout=firmware.value;zone=1;base=emptyImage;draft=base;original=null;nativeTemplate=null;radios.clear();history=[];restoreFile=hasChannelImage=false;note('Firmware layout changed.');render();refresh();
  };
  const find=el('input');find.type='search';find.placeholder='Search channels';find.setAttribute('aria-label','Search channels');find.value=search;
  const empty=el('input');empty.type='checkbox';empty.checked=showEmpty;
  const show=el('label',undefined,'check');show.append(empty,'Show empty slots');
  controls.append(field('Firmware',firmware),find,show);bar.append(controls);
  const actions=el('div',undefined,'toolbar-actions');
  const bankSize=LAYOUTS[layout].per;
  const per=allChannels?bankSize*LAYOUTS[layout].zones:bankSize,start=allChannels?0:(zone-1)*bankSize;
  const add=button('＋ Add channel',()=>{for(let i=start;i<start+per;i++)if(!channel(record(draft,layout,i)).rx){editor(i);return;}note('This zone is full. Choose another zone.');});
  const undo=button('Undo',undoEdit);undo.disabled=!history.length;actions.append(add,undo);bar.append(actions);
  const wrap=el('div',undefined,'table-wrap');wrap.id='channelTableWrap';const table=el('table',undefined,'rt950-table'),head=table.createTHead().insertRow();
  for(const caption of ['Ch',...columns.map(c=>c[1]),'Actions'])head.append(el('th',caption));
  const body=table.createTBody();wrap.append(table);
  function editor(slot){
   const dlg=el('dialog',undefined,'rt950-dialog'),form=el('form'),title=el('h3'),fields=el('div',undefined,'rt950-fields');
   title.id='rt950ChannelTitle';dlg.setAttribute('aria-labelledby',title.id);
   const err=el('p','');err.setAttribute('role','alert');
   const actions=el('div',undefined,'dialog-actions'),apply=el('button','Save channel','primary');apply.type='submit';
   const previous=button('← Previous',()=>move(-1)),next=button('Next →',()=>move(1));
   for(const b of [previous,next])b.title='Save changes to this channel and move to the adjacent channel.';
   actions.append(previous,next,button('Cancel',()=>dlg.close()),apply);form.append(title,fields,err,actions);dlg.append(form);
   let initial,controls,changed=false;
   function adjacent(step){
    for(let i=slot+step;i>=start&&i<start+per;i+=step)if(showEmpty||channel(record(draft,layout,i)).rx)return i;
    return null;
   }
   function populate(){
    initial=channelValues(slot);controls=new Map();fields.replaceChildren();err.textContent='';
    title.textContent=(initial.rx?'Edit':'Add')+' channel '+(slot-start+1)+' · Zone '+(Math.floor(slot/bankSize)+1);
    for(const [key,name] of columns){
     const control=channelControl(key,initial[key]);controls.set(key,control);fields.append(field(name,control));
    }
    previous.disabled=adjacent(-1)===null;next.disabled=adjacent(1)===null;
   }
   function saveCurrent(moving){
    const patch={};
    for(const [key,node] of controls){
     const value=channelValue(key,node);if(value!==initial[key])patch[key]=value;
    }
    if(!Object.keys(patch).length&&(initial.rx||moving))return true;
    try{saveChannel(slot,initial,patch);changed=true;return true;}
    catch(error){err.textContent=error.message;return false;}
   }
   function move(step){
    const target=adjacent(step);if(target===null||!saveCurrent(true))return;
    slot=target;populate();controls.get(initial.rx?'name':'rx').focus();
   }
   form.onsubmit=e=>{e.preventDefault();if(saveCurrent(false))dlg.close();};
   dlg.onclose=()=>{
    dlg.remove();if(!changed)return;
    paint();(body.querySelector('tr[data-slot="'+slot+'"] button')??add).focus({preventScroll:true});
   };
   populate();document.body.append(dlg);dlg.showModal();controls.get(initial.rx?'name':'rx').focus();
  }
  function matches(row,n){
   return (showEmpty||!!row.rx)&&[n,row.name,row.rx,row.tx].join(' ').toLowerCase().includes(search.toLowerCase());
  }
  function updateRow(tr,row){
   const slot=Number(tr.dataset.slot),n=slot-start+1;
   tr.cells[0].textContent=n;
   for(const [index,[key]] of columns.entries()){
    const value=key==='scan'?(row.scan?'Add':'Skip'):row[key]||(key==='tx'?'RX only':'');
    tr.cells[index+1].firstChild.textContent=row.rx?value:'';
   }
   const actions=tr.lastElementChild,occupied=String(!!row.rx);
   if(actions.dataset.occupied===occupied)return;
   actions.dataset.occupied=occupied;actions.replaceChildren(button(row.rx?'Edit':'Add',()=>editor(slot)));
   if(row.rx)actions.append(button('Delete',()=>{
    if(!confirm('Delete channel '+n+(allChannels?'':' from zone '+zone)+'?'))return;
    const next={...draft,ch:draft.ch.slice()};record(next,layout,slot).set(EMPTY_REC);commit(next,'Channel deleted from the workspace.');
   }));
  }
  function inlineEdit(cell){
   const tr=cell.parentElement,slot=Number(tr.dataset.slot),initial=channelValues(slot);
   if(!initial.rx)cell=tr.cells[2];
   const index=cell.cellIndex,[key,label]=columns[index-1],control=channelControl(key,initial[key],true);
   control.className='inline-control';control.setAttribute('aria-label','Channel '+(slot-start+1)+' '+label);
   cell.append(control);control.focus();if(control.tagName==='INPUT')control.select();
   let finished=false;
   function finish(cancel=false,keepInvalid=false){
    if(finished)return true;
    const value=channelValue(key,control);
    if(!cancel&&value!==initial[key]){
     try{saveChannel(slot,initial,{[key]:value});}
     catch(error){note(error.message);if(keepInvalid)return false;}
    }
    finished=true;control.remove();
    const row=fullChannel(record(draft,layout,slot));
    if(matches(row,slot-start+1))updateRow(tr,row);
    else if(body.rows.length===1)paint();
    else tr.remove();
    undo.disabled=!history.length;return true;
   }
   control.onblur=()=>finish();
   const focusRow=()=>{(tr.isConnected?tr:find).focus({preventScroll:true});};
   if(control.tagName==='SELECT')control.onchange=()=>{if(finish(false,true))focusRow();};
   control.onkeydown=e=>{
    e.stopPropagation();
    if(e.key==='Escape'||e.key==='Enter'){
     e.preventDefault();if(finish(e.key==='Escape',true))focusRow();return;
    }
    if(e.key!=='Tab')return;
    const step=e.shiftKey?-1:1;
    const neighbor=index+step;
    let target=tr.cells[neighbor];
    if(neighbor<1||neighbor>columns.length||(!initial.rx&&control.value.trim()==='')){
     const nextRow=step>0?tr.nextElementSibling:tr.previousElementSibling;
     target=nextRow?.cells[step>0?1:columns.length];
    }
    if(!target){
     // At the table edge let Tab continue to the surrounding controls.
     if(!finish(false,true))e.preventDefault();else focusRow();return;
    }
    e.preventDefault();if(finish(false,true)){if(target.isConnected)inlineEdit(target);else find.focus();}
   };
  }
  body.onclick=e=>{
   const cell=e.target.closest('td.editable-cell');
   if(cell&&!cell.querySelector('.inline-control'))inlineEdit(cell);
  };
  body.ondblclick=e=>{
   const cell=e.target.closest('td');if(cell?.cellIndex===0&&cell.parentElement.hasAttribute('data-slot'))editor(Number(cell.parentElement.dataset.slot));
  };
  body.onkeydown=e=>{
   const tr=e.target;
   if(tr.matches('tr[data-slot]')&&(e.key==='Enter'||e.key==='F2')){e.preventDefault();inlineEdit(tr.cells[1]);}
  };
  function paint(){
   body.replaceChildren();undo.disabled=!history.length;
   for(let i=start;i<start+per;i++){
    const row=fullChannel(record(draft,layout,i)),n=i-start+1;
    if(!matches(row,n))continue;
    const tr=body.insertRow();tr.className='channel-row';tr.dataset.slot=i;tr.tabIndex=0;tr.insertCell();
    for(const [,label] of columns){
     const cell=tr.insertCell();cell.className='editable-cell';cell.title='Click to edit '+label;cell.append(el('span'));
    }
    tr.insertCell();updateRow(tr,row);
   }
   if(!body.rows.length){const td=body.insertRow().insertCell();td.colSpan=columns.length+2;td.textContent=search?'No matching channels in this zone.':'This zone is empty. Add a channel, import a file, or read your radio.';}
  }
  find.oninput=()=>{search=find.value;paint();};empty.onchange=()=>{showEmpty=empty.checked;paint();};paint();
  const foot=el('div',undefined,'table-bottom rt950-zones'),zones=LAYOUTS[layout].zones;
  function navigate(n){zone=(n-1+zones)%zones+1;render();}
  const picker=choices(Array.from({length:zones},(_,i)=>[String(i+1),'Zone '+(i+1)+(zoneName(draft,layout,i+1)?' · '+zoneName(draft,layout,i+1):'')]),String(zone));
  picker.onchange=()=>navigate(Number(picker.value));
  if(!allChannels)foot.append(button('‹ Previous',()=>navigate(zone-1)),field('Zone',picker),button('Next ›',()=>navigate(zone+1)));
  if(!allChannels&&LAYOUTS[layout].zoneNames){
   const name=el('input');name.maxLength=12;name.value=zoneName(draft,layout,zone);
   const rename=()=>{try{const next={...draft,zn:draft.zn.slice()};renameZone(next,layout,zone,name.value);commit(next,'Zone name saved to the workspace.');}catch(error){note(error.message);}};
   name.onkeydown=e=>{if(e.key==='Enter')rename();};foot.append(field('Zone name',name),button('Rename',rename));
  }
  const scope=allChannels?'all zones':'zone '+zone;
  foot.append(button('Export CHIRP CSV',()=>fileTools.save(exportZoneCsv(draft,layout,allChannels?null:zone),allChannels?profile.id+'_all_channels.csv':'Zone'+String(zone).padStart(2,'0')+'_'+(zoneName(draft,layout,zone)||'Channels')+'.csv','text/csv')),
   button(allChannels?'Clear list':'Clear zone',()=>{
    if(!confirm('Clear all channels in '+scope+' from the workspace?'))return;
    const next={...draft,ch:draft.ch.slice()};
    for(let i=start;i<start+per;i++)record(next,layout,i).set(EMPTY_REC);
    commit(next,'Cleared channels in '+scope+'.');
   }));
  card.append(bar,wrap,foot);
  if(draft.overflow?.length){
   const pending=el('section'),list=el('select');list.multiple=true;list.size=4;list.setAttribute('aria-label','Over-capacity channels');
   draft.overflow.forEach((value,i)=>{const c=channel(hex(value));list.add(new Option((i+1)+' · '+(c.name||'Unnamed')+' · '+c.rx+' MHz',i));});
   const place=button('Fill empty slots',()=>{
    const out={...draft,ch:draft.ch.slice()},queue=draft.overflow;let used=0;
    for(let i=0;i<LAYOUTS[layout].zones*bankSize&&used<queue.length;i++)if(!channel(record(out,layout,i)).rx)record(out,layout,i).set(hex(queue[used++]));
    if(!used){note('Delete a stored channel to make room.');return;}
    out.overflow=queue.slice(used);commit(out,'Placed '+used+' channels.');
   });
   const remove=button('Remove selected',()=>{
    const selected=new Set(Array.from(list.selectedOptions,o=>Number(o.value)));
    if(selected.size)commit({...draft,overflow:draft.overflow.filter((_,i)=>!selected.has(i))},'Removed '+selected.size+' over-capacity channels.');
   });
   pending.append(el('h3','Over-capacity channels'),el('p',capacityMessage()),list,place,remove);card.append(pending);
  }
 }
 return {
  select(selected){
   const image=$('brandRadioImage'),holder=image.parentElement;
   if(active&&!selected){
    disconnect();
    // The other profile can address this same radio while this workspace is inactive.
    for(const [key,state] of radios)if(state.baseline)radios.set(key,{pending:state.pending});
    holder.hidden=false;holder.querySelector('svg')?.remove();holder.classList.remove('rt950-brand-image');
   }
   active=selected;if(!active)return;
   holder.hidden=profile.id!=='rt950pro';
   if(!holder.hidden&&!holder.querySelector('svg')){
    const photo=rt950Photo(image.ownerDocument,'rt950-picker-housing');
    photo.setAttribute('aria-hidden','true');holder.append(photo);
   }
   holder.classList.remove('uv32-brand-image');holder.classList.add('rt950-brand-image');
   screen='Channels';render();message(status);
  },
  connect:()=>run(connect),
  help(){screen='Radio & help';render();},
  sync(selected,busy){
   for(const b of [open,append,dat,save,read,cableRead,write,cableWrite,backup]){b.hidden=!selected;b.disabled=busy;}
   if(!selected)return;
   cableRead.hidden=cableWrite.hidden=!profile.cable;
   const connected=!!link?.device?.gatt.connected;
   $('connection').textContent=connected?'Connected':'Not connected';$('connectionHint').textContent=navigator.bluetooth?'Bluetooth programming':profile.cable&&navigator.serial?'Cable programming available':'File editing available';
   $('linkDot').classList.toggle('online',connected);$('connect').textContent=connected?'Disconnect':'Connect';
   $('connect').disabled=busy||!navigator.bluetooth||!window.isSecureContext;
   const source=(radioState()?.pending?.length||radios.get(lastCablePort)?.pending?.length)?'Write incomplete':restoreFile?(draft.factoryDat?'Radtel CPS DAT':profile.short+' backup'):original?profile.short+' radio read':profile.short+' workspace';
   $('sourceTag').textContent=source;
   dat.disabled=busy||!!draft.overflow?.length;dat.title=draft.overflow?.length?capacityMessage():'Download a native RT-950 Pro factory CPS file.';
   read.disabled=busy||!connected;write.disabled=busy||!!draft.overflow?.length||!navigator.bluetooth||!window.isSecureContext||!hasWorkspace();
   write.title=hasWorkspace()?'Send the current workspace over Bluetooth.':'Open a workspace or add channels to write.';
   const serial=window.isSecureContext&&!!navigator.serial;
   cableRead.disabled=busy||!serial;
   cableWrite.disabled=busy||!serial||!!draft.overflow?.length||!hasWorkspace();
   cableRead.title=cableWrite.title=serial?'RT-950 Pro programming cable · hardware testing pending':'Cable programming requires a browser with Web Serial support.';
   backup.disabled=busy||!original;
  }
 };
}
