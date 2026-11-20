import {BLOCK, EMPTY_REC, LAYOUTS, LOW_LIMIT, REC, ZN_ADDR, blockBefore, sections, eq, planWrites, readImage, webBluetoothLink, writeBlocks} from './rt950-core.mjs';
import {appendCsv, blankImage, channel, fullChannel, channelMenus, editRecord, exportZoneCsv, openBackup, overlayChanges, powers, record, renameZone, saveBackup, zoneName} from './rt950-channels.mjs';
import {renderSection} from './rt950-forms.mjs';
import {validateSettings} from './rt950-sections.mjs';
import {renderRt950Help} from './rt950-help.mjs';

const columns=[['name','Name'],['rx','RX MHz'],['tx','TX MHz'],['rxTone','RX tone'],['txTone','TX tone'],['signal','Signalling'],['ptt','PTT-ID'],['power','TX power'],['scramble','Scramble'],['learn','Learn FHSS'],['bandwidth','Bandwidth'],['encryption','Encryption'],['lock','Busy lockout'],['scan','Scan add'],['rxMode','RX modulation'],['fhss','FHSS code']];
const pages={'Channels':'☷','Optional Features':'⚙','VFO A / B / C':'⇄','DTMF':'▦','FM / AM / SSB':'♫','APRS':'⌖','Radio & help':'ⓘ'};
const layoutNames={'990':'0.24+ · 10 zones × 99','960':'Earlier · 15 zones × 64'};
const sameImage=(a,b)=>eq(a.ch,b.ch)&&eq(a.zn,b.zn)&&sections.every(({key})=>
 a[key]===b[key]||(a[key]&&b[key]&&eq(a[key],b[key])));
const emptyImage=blankImage();

export function workspaceBlocks(target,layout,hasChannelImage,state){
 const baseline=state?.baseline;
 const pending=state?.pending??[];
 const unchanged=baseline&&sameImage(baseline,target);
 // With no radio snapshot, a backup owns its supplied sections. A new channel
 // list owns only the blocks populated in the editor.
 const reference=(!hasChannelImage&&unchanged?null:baseline)??emptyImage;
 const sendTable=hasChannelImage&&(!baseline||(unchanged&&!pending.length));
 const blocks=planWrites(reference,target,layout,true,sendTable);
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
   if(b.addr+BLOCK>end)throw Error('This last block includes bytes beyond the editable slots. Open a saved radio backup to preserve those bytes when writing it.');
  }
 }
 if(!pending.length)return blocks;
 // An edit undone after an interruption may already have reached the radio.
 const address=b=>(b.region||'memory')+'/'+b.addr;
 const retry=new Map(pending.filter(b=>!b.region||target[b.region]).map(b=>[address(b),blockBefore(target,b)]));
 for(const b of blocks)retry.set(address(b),b);
 return [...retry.values()].sort(transferOrder);
}
export function createRt950Workspace({run,refresh,message,fileTools}){
 const $=id=>document.getElementById(id);
 function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
 function button(text,action){const b=el('button',text);b.type='button';b.onclick=action;return b;}
 function field(label,control){control.setAttribute('aria-label',label);const wrap=el('label');wrap.append(el('span',label),control);return wrap;}
 function choices(options,value){const input=el('select');for(const [key,title] of options)input.add(new Option(title,key));input.value=value;return input;}
 function sidebar(id,title,action){const b=button(title,action);b.id=id;b.hidden=true;$('uatUv32Import').before(b);return b;}
 const input=el('input');input.type='file';input.accept='.json,.csv';input.hidden=true;$('uatUv32Import').before(input);
 const open=sidebar('rt950Open','↥ Import file',()=>input.click());
 const save=sidebar('rt950Save','↧ Save workspace',()=>download(draft,'rt950pro-edited.json'));
 const read=sidebar('rt950Read','↓ Read Bluetooth',()=>run(readRadio));
 const write=sidebar('rt950Write','↑ Write Bluetooth',()=>run(writeRadio));
 const backup=sidebar('rt950Backup','↧ Save read backup',()=>download(original,'rt950pro-radio-backup.json'));
 let layout='990',zone=1,screen='Channels',search='',showEmpty=false,link=null,active=false;
 let base=emptyImage,draft=base,original=null,history=[],restoreFile=false,hasChannelImage=false;
 // A dropped GATT connection still belongs to the same browser device. Keep its
 // last acknowledged image and any interrupted blocks until the next user action.
 const radios=new Map();
 const deviceKey=device=>device?.id||device;
 const radioState=()=>radios.get(deviceKey(link?.device));
 const hasWorkspace=()=>hasChannelImage||!sameImage(emptyImage,draft)||!!radioState()?.pending?.length||!sameImage(base,draft);
 let status='Choose the firmware layout shown in Menu › About. Connect to read your radio, or edit channels here.';
 const note=text=>{status=text;if(active)message(text);};
 function download(image,name){if(image)fileTools.save(saveBackup(image,layout),name,'application/json');}
 function commit(next,text,repaint=true){
  if(!sameImage(draft,next)){history.push(draft);if(history.length>20)history.shift();draft=next;}
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
 const opts={allowedModels:['RT-950']};
 function progress(verb){return (done,total)=>{const bar=$('progress');bar.max=total;bar.value=done;note(verb+' · '+done+' / '+total+' blocks');};}
 async function readRadio(){
  const session=link;
  if(!session?.device?.gatt.connected)throw Error('Use Connect at the top before reading.');
  const uncertain=!!radioState()?.pending?.length;
  const merge=!uncertain&&(restoreFile||!sameImage(base,draft));
  if(uncertain&&!confirm('Read the current radio contents and replace the uncertain workspace? Save the workspace first to retain your edits.'))return;
  if(merge&&!confirm('Read this radio and stage your current workspace edits over its channels and settings?'))return;
  const fresh=await readImage(session,opts,progress('Reading'));
  if(link!==session||!session.device.gatt.connected)throw Error('The radio disconnected. Connect and read again.');
  const missing=fresh.unavailable||[];
  if(merge&&missing.some(k=>draft[k]&&(restoreFile||!base[k]||!eq(base[k],draft[k])))){
   throw Error('Some settings could not be read. Your staged workspace was kept.');
  }
  const next=merge?overlayChanges(fresh,restoreFile?fresh:base,draft,layout):fresh;
  base=fresh;original=fresh;hasChannelImage=true;draft=next;history=[];restoreFile=false;
  radios.set(deviceKey(session.device),{baseline:fresh,complete:true});
  note(missing.length?'Channels read. Unavailable settings: '+missing.join(', ')+'.':merge?'Read complete. Review the staged changes before writing.':'Channels and radio settings read. The original radio backup is available.');
  render();
 }
 async function writeRadio(){
  if(!hasWorkspace())throw Error('Open a workspace or add channels to write.');
  const session=link?.device?link:await chooseRadio();
  const key=deviceKey(session.device),state=radios.get(key),baseline=state?.baseline,target=draft;
  validateSettings(target,base);
  const unchanged=baseline&&sameImage(baseline,target);
  const blocks=workspaceBlocks(target,layout,hasChannelImage,state);
  if(!blocks.length)throw Error('There are no workspace blocks to write.');
  const high=blocks.some(b=>!b.region&&b.addr>=LOW_LIMIT&&b.addr<0x7c00);
  const count=blocks.length+' block'+(blocks.length===1?'':'s');
  const scope=!baseline&&hasChannelImage?'Replace the channel table and all sections present in this workspace':
   unchanged&&hasChannelImage&&!state?.pending?.length?'Write back the channel table'+(LAYOUTS[layout].zoneNames?' and zone names':''):'Write the selected workspace blocks';
  const detail=!hasChannelImage?' Each channel block replaces four adjacent slots, including any empty slots in the block.':'';
  if(!confirm(scope+' ('+count+') on '+(session.device.name||'this RT-950 Pro')+' using '+layoutNames[layout]+'?'+detail+(high?' This includes channels 961–990. Confirm firmware 0.24 or later.':'')))return;
  let acknowledged=0;
  note(session.device.gatt.connected?'Starting write…':'Reconnecting to write…');
  const showProgress=progress('Writing');
  try{await writeBlocks(session,opts,blocks,(done,total)=>{acknowledged=done;showProgress(done,total);});}
  catch(error){
   radios.set(key,{...state,pending:blocks});
   note('Write incomplete. '+acknowledged+' of '+count+' acknowledged. Your workspace is retained. Choose Write Bluetooth to retry. '+error.message);throw Error(status);
  }
  base=target;radios.set(key,{baseline:target,complete:hasChannelImage});history=[];restoreFile=false;
  note('Write complete. The radio acknowledged '+count+'.');render();
 }
 input.onchange=()=>{
  const file=input.files?.[0];input.value='';if(!file)return;
  run(async()=>{
   if(file.size>4*1024*1024)throw Error('Select a channel file smaller than 4 MB.');
   const text=await file.text();
   if(/\.csv$/i.test(file.name)){
    const added=appendCsv(draft,layout,zone,text,file.name);zone=added.zone;search='';screen='Channels';
    commit(added.image,'Added '+added.count+' analog channels.'+(added.skipped?' Skipped '+added.skipped+' unsupported modes.':''));return;
   }
   const saved=openBackup(text,layout);
   const state=radioState(),radioBase=state?.complete?state.baseline:null;
   if(link?.device?.gatt.connected&&radioBase&&saved.layout!==layout)throw Error('The backup uses a different firmware layout from this radio workspace.');
   if(!confirm('Open this backup and replace the channels and settings it contains?'))return;
   if(saved.layout!==layout){radios.clear();original=null;}
   else for(const [key,known] of radios)if(!known.complete)radios.delete(key);
   if(!radioBase||saved.layout!==layout){layout=saved.layout;base=saved.image;draft=base;}
   else{
    base=radioBase;draft=overlayChanges(radioBase,radioBase,saved.image,layout);
    for(const {key} of sections)if(saved.image[key]&&!draft[key])draft[key]=saved.image[key];
   }
   history=[];hasChannelImage=true;restoreFile=true;
   zone=1;screen='Channels';render();note('Backup opened. Review the workspace before writing.');
  });
 };
 function editor(slot){
  const bytes=record(draft,layout,slot),initial=fullChannel(bytes),adding=!initial.rx;
  if(adding)Object.assign(initial,Object.fromEntries(Object.entries(channelMenus).map(([k,opts])=>[k,opts[0]])),{rxTone:'Off',txTone:'Off',power:'High',scan:true,fhss:''});
  const dlg=el('dialog',undefined,'rt950-dialog'),form=el('form');
  const per=LAYOUTS[layout].per;
  const title=el('h3',(adding?'Add':'Edit')+' channel '+(slot%per+1)+' · Zone '+(Math.floor(slot/per)+1));
  const fields=el('div',undefined,'rt950-fields'),controls={};
  for(const [key,name] of columns){
   const value=initial[key],options=key==='power'?powers:channelMenus[key];
   const control=options?choices([...new Set([...options,value])].map(x=>[x,x]),value):el('input');
   if(!options){if(key==='scan'){control.type='checkbox';control.checked=value;}else{control.value=value;if(key==='name')control.maxLength=12;}}
   if(key==='rx')control.required=true;
   if(key==='tx')control.placeholder='Blank for receive only';
   if(key.endsWith('Tone'))control.title='Off, CTCSS in Hz, or DCS such as D023N';
   controls[key]=control;fields.append(field(name,control));
  }
  const err=el('p','');err.setAttribute('role','alert');
  const actions=el('div',undefined,'dialog-actions'),apply=el('button','Save channel','primary');apply.type='submit';
  actions.append(button('Cancel',()=>dlg.close()),apply);form.append(title,fields,err,actions);dlg.append(form);
  form.onsubmit=e=>{
   e.preventDefault();
   try{
    const patch={};
    for(const [key,node] of Object.entries(controls)){
     const val=key==='scan'?node.checked:node.value.trim();
     if(adding||val!==initial[key])patch[key]=val;
    }
    const next=editRecord(bytes,patch),image={...draft,ch:draft.ch.slice()};
    record(image,layout,slot).set(next);dlg.close();commit(image,'Channel saved to the workspace.');
   }catch(error){err.textContent=error.message;}
  };
  dlg.onclose=()=>dlg.remove();document.body.append(dlg);dlg.showModal();
 }
 function render(){
  if(!active)return;
  $('brandTitle').textContent='Ham-Rx Radtel RT-950 Pro';
  document.documentElement.dataset.screen=screen==='Channels'?'channels':'other';
  $('tabs').replaceChildren(...Object.entries(pages).map(([s,icon])=>{
   const b=button(icon+' '+s,()=>{screen=s;render();});b.classList.toggle('active',s===screen);if(s===screen)b.setAttribute('aria-current','page');return b;
  }));
  const allChannels=draft.settings?.[38]!==255&&(draft.settings?.[38]&15)===1;
  $('pageTitle').textContent=screen==='Channels'?(allChannels?'Channels · All':'Channels · Zone '+zone):screen;
  $('pageDescription').textContent=screen==='Channels'?(allChannels?'All CH Mode':'Edit RT-950 Pro channels by zone.'):'Radtel RT-950 Pro programming';
  const card=el('section',undefined,'card'+(screen==='Channels'?' channel-card rt950-channels':''));
  $('content').replaceChildren(card);
  if(screen==='Radio & help'){
   renderRt950Help($('content'),draft);return;
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
   if((original||restoreFile||!sameImage(base,draft))&&!confirm('Change firmware layout and clear this RT-950 workspace?')){firmware.value=layout;return;}
   layout=firmware.value;zone=1;base=emptyImage;draft=base;original=null;radios.clear();history=[];restoreFile=hasChannelImage=false;note('Firmware layout changed.');render();refresh();
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
  function paint(){
   body.replaceChildren();
   for(let i=start;i<start+per;i++){
    const row=fullChannel(record(draft,layout,i)),n=i-start+1;
    if(!showEmpty&&!row.rx)continue;
    if(![n,row.name,row.rx,row.tx].join(' ').toLowerCase().includes(search.toLowerCase()))continue;
    const tr=body.insertRow();tr.className='channel-row';tr.insertCell().textContent=n;
    for(const [key] of columns)tr.insertCell().textContent=row.rx?(key==='scan'?(row.scan?'Add':'Skip'):row[key]||(key==='tx'?'RX only':'')):'';
    const cell=tr.insertCell();cell.append(button(row.rx?'Edit':'Add',()=>editor(i)));
    if(row.rx)cell.append(button('Delete',()=>{
     if(!confirm('Delete channel '+n+(allChannels?'':' from zone '+zone)+'?'))return;
     const next={...draft,ch:draft.ch.slice()};record(next,layout,i).set(EMPTY_REC);commit(next,'Channel deleted from the workspace.');
    }));
    tr.ondblclick=e=>{if(!e.target.closest('button'))editor(i);};
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
  foot.append(button('Export CHIRP CSV',()=>fileTools.save(exportZoneCsv(draft,layout,allChannels?null:zone),allChannels?'RT950Pro_all_channels.csv':'Zone'+String(zone).padStart(2,'0')+'_'+(zoneName(draft,layout,zone)||'Channels')+'.csv','text/csv')),
   button(allChannels?'Clear list':'Clear zone',()=>{
    if(!confirm('Clear all channels in '+scope+' from the workspace?'))return;
    const next={...draft,ch:draft.ch.slice()};
    for(let i=start;i<start+per;i++)record(next,layout,i).set(EMPTY_REC);
    commit(next,'Cleared channels in '+scope+'.');
   }));
  card.append(bar,wrap,foot);
 }
 return {
  select(selected){
   if(active&&!selected){disconnect();$('brandRadioImage').parentElement.classList.remove('rt950-brand-image');}
   active=selected;if(!active)return;
   const image=$('brandRadioImage');image.src='assets/rt950pro.jpg';image.alt='Radtel RT-950 Pro';image.parentElement.classList.remove('uv32-brand-image');image.parentElement.classList.add('rt950-brand-image');screen='Channels';render();message(status);
  },
  connect:()=>run(connect),
  help(){screen='Radio & help';render();},
  sync(selected,busy){
   for(const b of [open,save,read,write,backup]){b.hidden=!selected;b.disabled=busy;}
   if(!selected)return;
   const connected=!!link?.device?.gatt.connected;
   $('connection').textContent=connected?'Connected':'Not connected';$('connectionHint').textContent=navigator.bluetooth?'Bluetooth programming':'File editing available';
   $('linkDot').classList.toggle('online',connected);$('connect').textContent=connected?'Disconnect':'Connect';
   $('connect').disabled=busy||!navigator.bluetooth||!window.isSecureContext;
   $('sourceTag').textContent=radioState()?.pending?.length?'Write incomplete':restoreFile?'RT-950 Pro backup':original?'RT-950 Pro radio read':'RT-950 Pro workspace';
   read.disabled=busy||!connected;write.disabled=busy||!navigator.bluetooth||!window.isSecureContext||!hasWorkspace();
   write.title=hasWorkspace()?'Send the current workspace over Bluetooth.':'Open a workspace or add channels to write.';
   backup.disabled=busy||!original;
  }
 };
}
