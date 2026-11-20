import {BLOCK, EMPTY_REC, LAYOUTS, LOW_LIMIT, ZN_ADDR, eq, planWrites, readImage, verifyBlocks, webBluetoothLink, writeBlocks} from './rt950-core.mjs';
import {appendCsv, blankImage, channel, editRecord, modes, openBackup, overlayChanges, powers, record, renameZone, saveBackup, zoneName} from './rt950-channels.mjs';

const columns=[['name','Name'],['rx','RX MHz'],['tx','TX MHz'],['rxTone','RX tone'],['txTone','TX tone'],['mode','Mode'],['power','Power'],['scan','Scan']];
const layoutNames={'990':'0.24+ · 10 zones × 99','960':'Earlier · 15 zones × 64'};
const sameImage=(a,b)=>eq(a.ch,b.ch)&&eq(a.zn,b.zn);
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
 let base=blankImage(),draft=base,original=null,radioBase=null,history=[],restoreFile=false,uncertain=false;
 let status='Choose the firmware layout shown in Menu › About. Connect to read your radio, or edit channels here.';
 const note=text=>{status=text;if(active)message(text);};
 function download(image,name){if(image)fileTools.save(saveBackup(image,layout),name,'application/json');}
 function commit(next,text){
  if(!sameImage(draft,next)){history.push(draft);if(history.length>20)history.shift();draft=next;}
  note(text);render();refresh();
 }
 function disconnect(){const old=link;link=null;radioBase=null;old?.disconnect();}
 async function connect(){
  if(link?.device?.gatt.connected){disconnect();note('Bluetooth disconnected.');return;}
  disconnect();
  const next=webBluetoothLink(()=>{});link=next;
  try{await next.choose(false);}catch(error){disconnect();throw error;}
  next.device.addEventListener('gattserverdisconnected',()=>{
   if(link!==next)return;
   radioBase=null;note('Bluetooth disconnected. Connect and read again before writing.');refresh();
  });
  note('Connected. Choose Read Bluetooth to load the channels.');
 }
 const opts={allowedModels:['RT-950']};
 function progress(verb){return (done,total)=>{const bar=$('progress');bar.max=total;bar.value=done;note(verb+' · '+done+' / '+total+' blocks');};}
 async function readRadio(){
  const session=link;
  if(!session?.device?.gatt.connected)throw Error('Use Connect at the top before reading.');
  const merge=!uncertain&&(restoreFile||!sameImage(base,draft));
  if(uncertain&&!confirm('Read the current radio contents and replace the uncertain workspace? Save the workspace first to retain your edits.'))return;
  if(merge&&!confirm('Read this radio and stage your current workspace edits over its channels?'))return;
  radioBase=null;
  const fresh=await readImage(session,opts,progress('Reading'));
  if(link!==session||!session.device.gatt.connected)throw Error('The radio disconnected. Connect and read again.');
  const next=merge?overlayChanges(fresh,restoreFile?fresh:base,draft,layout):fresh;
  base=fresh;original=fresh;radioBase=fresh;draft=next;history=[];restoreFile=false;uncertain=false;
  note(merge?'Read complete. Review the staged channel changes before writing.':'Read complete. The original radio backup is available.');
  render();
 }
 async function writeRadio(){
  if(!radioBase||!link?.device?.gatt.connected||uncertain)throw Error('Connect and read this radio before writing.');
  const baseline=radioBase,target=draft,session=link;
  const blocks=planWrites(baseline,target,layout,true);
  if(!blocks.length)return;
  const high=blocks.some(b=>b.addr>=LOW_LIMIT&&b.addr<ZN_ADDR);
  if(!confirm('Write '+blocks.length+' changed block(s) to this RT-950 Pro using '+layoutNames[layout]+'?'+(high?' This includes channels 961–990. Confirm that this radio has firmware 0.24 or later.':'')))return;
  const expected=blocks.map(({addr})=>({addr,data:addr>=ZN_ADDR?baseline.zn.slice(addr-ZN_ADDR,addr-ZN_ADDR+BLOCK):baseline.ch.slice(addr,addr+BLOCK)}));
  let changed;
  try{changed=await verifyBlocks(session,opts,expected,progress('Checking changed blocks against the original'));}
  catch(error){radioBase=null;throw error;}
  if(changed.length||radioBase!==baseline){radioBase=null;throw Error('The radio contents or connection changed. Read it again before writing.');}
  try{await writeBlocks(session,opts,blocks,progress('Writing'));}
  catch(error){uncertain=true;radioBase=null;note('Write incomplete. Read the radio before retrying. '+error.message);throw Error(status);}
  base=target;radioBase=session.device.gatt.connected?target:null;history=[];restoreFile=false;
  note('Write complete. The radio acknowledged all '+blocks.length+' changed block(s).');render();
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
   if(radioBase&&saved.layout!==layout)throw Error('The backup uses a different firmware layout from this radio workspace.');
   if(!confirm('Open this backup and replace the workspace channels?'))return;
   if(!radioBase){layout=saved.layout;base=blankImage();draft=saved.image;restoreFile=true;original=null;history=[];}
   else{draft=overlayChanges(radioBase,radioBase,saved.image,layout);history=[];}
   zone=1;screen='Channels';render();note('Backup opened. Review the channels before writing.');
  });
 };
 function editor(slot){
  const bytes=record(draft,layout,slot),initial=channel(bytes),adding=!initial.rx;
  if(adding)Object.assign(initial,{rxTone:'Off',txTone:'Off',mode:'FM',power:'High',scan:true});
  const dlg=el('dialog',undefined,'rt950-dialog'),form=el('form');
  const title=el('h3',(adding?'Add':'Edit')+' channel '+(slot%LAYOUTS[layout].per+1)+' · Zone '+zone);
  const fields=el('div',undefined,'rt950-fields'),controls={};
  for(const [key,name] of columns){
   const value=initial[key],options=key==='mode'?modes:key==='power'?powers:null;
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
  $('tabs').replaceChildren(...['Channels','Radio & help'].map((s,i)=>{
   const b=button((i?'ⓘ ':'☷ ')+s,()=>{screen=s;render();});b.classList.toggle('active',s===screen);if(s===screen)b.setAttribute('aria-current','page');return b;
  }));
  $('pageTitle').textContent=screen==='Channels'?'Channels · Zone '+zone:screen;
  $('pageDescription').textContent=screen==='Channels'?'Edit RT-950 Pro channels by zone.':'Radtel RT-950 Pro programming';
  const card=el('section',undefined,'card'+(screen==='Channels'?' channel-card rt950-channels':''));
  $('content').replaceChildren(card);
  if(screen!=='Channels'){
   card.append(el('h3','Bluetooth programming'),el('p','Check Menu › About on your radio. Firmware 0.24 and later has 10 zones of 99 channels. Earlier firmware has 15 zones of 64 channels with fixed zone names.'),
    el('p','Choose the matching firmware in Channels, then Connect and Read Bluetooth. Save read backup keeps the original channels and zone data. Write Bluetooth sends the edited blocks and finishes when the radio acknowledges them.'),
    el('p','Import file opens an RT-950 JSON backup or appends analog channels from a CHIRP CSV to empty slots. A file named Zone03_LOCAL.csv targets zone 3. A plain CSV starts in the selected zone and continues into later zones as needed.'));
   const ref=el('a','RT-950 Pro protocol reference ↗');ref.href='https://github.com/facenot/bj9000-programmer';ref.target='_blank';ref.rel='noopener noreferrer';card.append(ref);return;
  }
  const bar=el('div',undefined,'toolbar'),controls=el('div',undefined,'toolbar-controls');
  const firmware=choices([['990',layoutNames['990']],['960',layoutNames['960']]],layout);firmware.id='rt950Firmware';
  firmware.onchange=()=>{
   if((original||restoreFile||!sameImage(base,draft))&&!confirm('Change firmware layout and clear this RT-950 workspace?')){firmware.value=layout;return;}
   layout=firmware.value;zone=1;base=blankImage();draft=base;original=radioBase=null;history=[];restoreFile=uncertain=false;note('Firmware layout changed.');render();refresh();
  };
  const find=el('input');find.type='search';find.placeholder='Search channels';find.setAttribute('aria-label','Search channels');find.value=search;
  const empty=el('input');empty.type='checkbox';empty.checked=showEmpty;
  const show=el('label',undefined,'check');show.append(empty,'Show empty slots');
  controls.append(field('Firmware',firmware),find,show);bar.append(controls);
  const actions=el('div',undefined,'toolbar-actions');
  const per=LAYOUTS[layout].per,start=(zone-1)*per;
  const add=button('＋ Add channel',()=>{for(let i=start;i<start+per;i++)if(!channel(record(draft,layout,i)).rx){editor(i);return;}note('This zone is full. Choose another zone.');});
  const undo=button('Undo',()=>{draft=history.pop();render();refresh();note('Last channel or zone edit undone.');});undo.disabled=!history.length;actions.append(add,undo);bar.append(actions);
  const wrap=el('div',undefined,'table-wrap');wrap.id='channelTableWrap';const table=el('table',undefined,'rt950-table'),head=table.createTHead().insertRow();
  for(const caption of ['Ch',...columns.map(c=>c[1]),'Actions'])head.append(el('th',caption));
  const body=table.createTBody();wrap.append(table);
  function paint(){
   body.replaceChildren();
   for(let i=start;i<start+per;i++){
    const row=channel(record(draft,layout,i)),n=i-start+1;
    if(!showEmpty&&!row.rx)continue;
    if(![n,row.name,row.rx,row.tx].join(' ').toLowerCase().includes(search.toLowerCase()))continue;
    const tr=body.insertRow();tr.className='channel-row';tr.insertCell().textContent=n;
    for(const [key] of columns)tr.insertCell().textContent=row.rx?(key==='scan'?(row.scan?'Add':'Skip'):row[key]||(key==='tx'?'RX only':'')):'';
    const cell=tr.insertCell();cell.append(button(row.rx?'Edit':'Add',()=>editor(i)));
    if(row.rx)cell.append(button('Delete',()=>{
     if(!confirm('Delete channel '+n+' from zone '+zone+'?'))return;
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
  picker.onchange=()=>navigate(Number(picker.value));foot.append(button('‹ Previous',()=>navigate(zone-1)),field('Zone',picker),button('Next ›',()=>navigate(zone+1)));
  if(LAYOUTS[layout].zoneNames){
   const name=el('input');name.maxLength=12;name.value=zoneName(draft,layout,zone);
   const rename=()=>{try{const next={...draft,zn:draft.zn.slice()};renameZone(next,layout,zone,name.value);commit(next,'Zone name saved to the workspace.');}catch(error){note(error.message);}};
   name.onkeydown=e=>{if(e.key==='Enter')rename();};foot.append(field('Zone name',name),button('Rename',rename));
  }
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
   $('sourceTag').textContent=uncertain?'Write incomplete':radioBase?'RT-950 Pro radio read':restoreFile?'RT-950 Pro backup':'RT-950 Pro workspace';
   read.disabled=busy||!connected;write.disabled=busy||!connected||!radioBase||uncertain||sameImage(radioBase,draft);
   write.title=!radioBase?'Connect and read the radio before writing.':'Write changed channel and zone blocks.';
   backup.disabled=busy||!original;
  }
 };
}
