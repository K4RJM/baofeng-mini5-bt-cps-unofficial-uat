import {releaseAfterAcknowledgedWrite} from './connection-recovery.mjs?v=20.12';
import {readDatFile,writeDat} from './dat.mjs';
import {validateEdits} from './validation.mjs?v=20.14';
import {Writer,makePlan,verificationMessage} from './writer.mjs?v=20.18';
import {decodeRadio,radioDat} from './radio-decoder.mjs?v=20.12';
import {openChannelAppend} from './channel-import-ui.mjs?v=20.12';
import {renderRadioTutorial} from './radio-help.mjs?v=20.12';
import {blankData,emptyChannel,removeChannels,insertChannel,moveChannel} from './channels.mjs';
import {configureFields,form,optionalForm,vfoForm,visibleName,visibleTone,editedName,isFrequencyField,padFrequency} from './fields.mjs?v=19.1';
const $=id=>document.getElementById(id),radio=new Writer();
let schemas,options,charset,defaults,data,baseline,filename='mini5',tab='Channels',dirty=false,busy=false,loadedSource=false,backup=null,writePlan=null,attempted=false,resetRequired=false,log=[],history=[],selected=new Set(),search='',showEmpty=false,page=0,dragIndex=null,activity=Date.now(),idleDeadline=null;
let latestRead=null,previousTransport=null,stagedEdits=()=>false;
function startReport(stage){
 if(radio.report.stage!=='idle')previousTransport=structuredClone(radio.report);
 radio.report={stage,attempted:0,acknowledged:0,verified:false};
}
const pageSize=50,tabs=['Channels','Repeater import','Optional settings','VFO A / B','DTMF','Radio & help'];

// Shared explanations for the editor screens and the main Help walkthrough.
const featureGuides={
 'Channels':{title:'How to edit and arrange channels',body:`<p><strong>Channels are saved radio memories.</strong> Start by opening a native CPS .dat or reading your radio. Changes here affect the workspace; they reach the radio only after an explicit Write radio action.</p>
<ul><li><strong>Click a channel row</strong> to edit it, or focus the row and press Enter. Checkboxes and action buttons keep their own functions. Editing and deletion preserve your position in the list.</li>
<li><strong>+ Add channel</strong> opens the first empty slot. Enter receive/transmit frequencies, tones and a name, then choose <strong>Apply channel edits</strong>. <strong>Previous / Next</strong> applies valid edits before moving through channel numbers, skipping empty slots unless Show empty slots is on. Navigation crosses table pages and ignores the search filter. Closing discards only the current staged edits; changes already applied remain in the workspace.</li>
<li><strong>Add preset / Append .dat:</strong> load a radio read or native DAT first. Choose next available consecutive slots or an entirely empty numbered block. Preview placement; matching channels are skipped by default. Additions preserve current radio settings and support Undo. Programming still uses the separate full Write radio action.</li>
<li><strong>Frequency entry:</strong> 146.52 becomes 146.52000 when you leave the field or apply. Channel RX/TX must use 136.00000–173.99875 or 400.00000–519.99875 MHz in 1.25 kHz steps. Off-grid values and extra decimal places are rejected rather than rounded. Preserve a blank transmit frequency when it is already disabled in your configuration.</li>
<li><strong>RX tone</strong> controls tone filtering on reception; Off means no tone filter. <strong>TX tone</strong> is the tone sent with a transmission, such as the access tone supplied by a repeater operator. <strong>Include in scan</strong> includes or skips a memory; it does not start scanning.</li>
<li><strong>Add Ch</strong> in a row inserts above that channel and shifts later channels as far as the next empty slot. <strong>Move</strong> or dragging moves a channel and shifts the intervening slots. Review changed channel numbers.</li>
<li><strong>Delete</strong> or <strong>Delete selected</strong> offers two choices: <strong>Leave slots empty</strong> preserves other channel numbers; <strong>Delete and renumber</strong> removes all empty gaps and renumbers the remaining populated channels.</li>
<li><strong>Search</strong> matches names, receive/transmit frequencies or channel numbers. <strong>Show empty slots</strong> exposes unused memories. Pages show up to 50 rows; the header checkbox selects the visible page. Selections can remain on other pages, so check the selected count before deleting.</li>
<li><strong>Undo</strong> reverses the latest channel operation. Optional settings, VFOs and DTMF edits stay as they are. Save a DAT copy before important edits.</li></ul><p>There are 999 editable slots. The extra native-file record is preserved and cannot be edited here.</p>`},
 'Optional settings':{title:'How to use optional settings',body:`<p><strong>These are radio-wide CPS settings.</strong> Changes apply to the workspace as you edit; use Save .dat copy to keep them, or explicitly Write radio to program them.</p>
<ul><li><strong>Squelch</strong> sets when received audio opens. <strong>Battery saving</strong> controls the radio's saved battery-saving option. <strong>Dual watch</strong> checks both selected channels.</li>
<li><strong>VOX</strong> enables voice-triggered transmission; sensitivity and release delay control its response. <strong>Transmit time limit</strong> limits a continuous transmission, with a separate timeout-warning option.</li>
<li><strong>Upper/lower display mode</strong> chooses channel name, frequency or number. <strong>Upper/lower channel/frequency mode</strong> chooses saved memories or direct frequency operation for each display.</li>
<li><strong>Scan resume behavior</strong> controls what happens after a signal is found. It does not start scanning. <strong>FM broadcast receiver</strong> concerns the broadcast receiver, not the modulation of your two-way channels.</li>
<li>Hover over a field for its individual explanation. An <strong>unrecognized saved value</strong> is preserved until you deliberately change it. Numeric CPS codes without verified labels should be left at their existing values.</li></ul><p>Save a copy before changing unfamiliar options. Tone-scan details and some signaling combinations still need firmware verification.</p>`},
 'VFO A / B':{title:'How to use the upper and lower VFOs',body:`<p><strong>A is the upper display; B is the lower display.</strong> A VFO stores direct frequency-mode settings. Editing a VFO does not add a saved channel to the Channels table.</p>
<ul><li>Set the receive frequency and any receive/transmit tone for each side. Frequency entry fills missing trailing zeros, just as it does in the channel editor.</li>
<li><strong>Offset</strong> is the difference between receive and transmit frequencies. <strong>Offset direction</strong> chooses Off, Plus or Minus. Off uses the same frequency; Plus adds the offset and Minus subtracts it. Follow the frequency and tone information for the station you intend to use.</li>
<li><strong>Tuning step</strong> controls the size of each frequency adjustment. <strong>Power</strong> and <strong>bandwidth</strong> are saved separately for each VFO.</li>
<li><strong>Shared VFO settings</strong> apply to both sides, including the saved frequency-scan limits and VFO PTT identification setting. Per-VFO busy-lock fields are read-only because their controls are not verified.</li>
<li>Choose frequency mode for the appropriate display in <strong>Optional settings</strong> when you want to use its VFO settings on the radio.</li></ul><p>VFO edits remain in this workspace until saved or explicitly programmed. Frequency hopping and detailed squelch-signaling combinations are not verified for this firmware.</p>`},
 'DTMF':{title:'How DTMF codes and groups work',body:`<p><strong>DTMF is tone signaling.</strong> It uses sequences of keypad tones for identification or calling. The 20 DTMF groups here are saved signaling-code entries; they do not collect channels into folders, banks or presets.</p>
<ul><li><strong>Own DTMF ID</strong> is the saved identification code. <strong>Transmit-start/end DTMF codes</strong> store identification sequences used by those signaling options.</li>
<li><strong>Tone duration</strong> is the length of each tone; <strong>pause duration</strong> is the gap between tones. <strong>Call hold time</strong>, <strong>separator</strong> and <strong>group-call code</strong> are additional CPS signaling options. Match a known configuration rather than guessing codes or timing.</li>
<li>Each numbered group has a <strong>digits</strong> field for the tone sequence and a <strong>name</strong> field for its label. Naming a group does not assign any frequencies to it.</li>
<li>The channel editor's <strong>DTMF group</strong>, or a VFO's DTMF-group field, selects one of those numbered entries. <strong>PTT identification</strong> chooses Off, start, end or both for identification. Leave it Off when identification tones are not wanted.</li></ul><p>Saving DTMF edits does not send tones. Programming stores the settings for use by the radio. Exact calling and squelch-signaling behavior still needs firmware verification; the app does not provide a live DTMF keypad.</p>`},
 'Files & radio':{title:'What the file and radio buttons do',body:`<ul><li><strong>Open CPS .dat</strong> replaces the workspace with a native CPS configuration. <strong>Save .dat copy</strong> requests a download of the current workspace, including edits. Confirm that the file appears in your downloads; the close warning remains because the browser cannot confirm that it was saved. Use that DAT with stock Baofeng CPS and a compatible cable, or open it here for Bluetooth programming. .img and CSV files are not supported.</li>
<li><strong>Connect</strong> opens the Bluetooth link without sending programming commands. <strong>Read radio</strong> loads the radio's CPS configuration into the editor using 521 read blocks.</li>
<li><strong>Save read backup</strong> downloads the original configuration captured by the latest radio read, before your workspace edits. Opening another DAT replaces that read source; keep your downloaded backup.</li>
<li><strong>Write radio</strong> requires a loaded DAT or radio read and backup confirmation. It writes the complete CPS configuration in 262 blocks, including channels, optional settings, VFOs and DTMF. It is not a one-channel update.</li>
<li>After all write blocks are acknowledged, the app requests a browser Bluetooth disconnect. Wait for the radio to finish restarting. Choose <strong>Read back &amp; verify</strong> and confirm that the radio is ready. Wireless CPS OFF/ON remains a fallback if reconnection fails. Verification compares the known CPS bytes against the write plan; acknowledged blocks alone do not verify programming or normal radio operation.</li>
<li><strong>Save diagnostic report</strong> downloads troubleshooting information and, when available, the original read capture. Keep it private unless you choose to share it. An uncertain write stops without automatic retry; save its report.</li></ul><p>Files and edits remain in this browser tab until downloaded. A refresh or closing the tab can lose them. A DAT contains CPS settings, not firmware or a full raw-memory backup. Cable programming is performed by stock CPS, outside this app.</p>`},
 'Availability':{title:'Weather, presets and remaining features',body:`<p><strong>Weather access is built into the radio.</strong> Use its dedicated weather button; this app does not need to add a weather preset to provide that access.</p>
<p>Simplex preset packs are not planned. Add preset offers shared FRS/GMRS channels, GMRS repeater pairs, MURS and PMR446 with placement previews and service notices. Append .dat adds saved channels while preserving current settings. Browser-stored personal channel groups are not included. DTMF groups are signaling codes, not channel groups.</p>
<p><strong>RepeaterBook import is a disabled preview pending API approval.</strong> It cannot currently search or add repeaters. No live API calls or shared tokens are used.</p>
<p>.img/CSV import, a live DTMF keypad, cable transport, firmware flashing and bank/zone unlocks are not implemented. A blank workspace supports editing and DAT export; it does not enable direct Bluetooth writing until a DAT or radio configuration has been loaded.</p>`}
};
function appendFeatureGuide(target,key){const guide=featureGuides[key],details=document.createElement('details');details.className='feature-guide';details.innerHTML=`<summary>${guide.title}</summary><div class="guide-body">${guide.body}</div>`;target.append(details);}

const icons=['☷','⌁','⚙','⇄','▦','ⓘ'];
const message=s=>{$('status').textContent=s;};
function remember(){history.push(structuredClone(data.channelList[0].slice(0,999)));if(history.length>20)history.shift();}
function changed(){dirty=true;activity=Date.now();sync();}
function errors(candidate){return validateEdits(candidate,baseline,options,charset);}
function commit(candidate){const problems=errors(candidate);if(problems.length)throw Error(problems.join('\n'));remember();data=candidate;selected.clear();changed();render();}
function checked(){if([...$('content').querySelectorAll('input')].some(input=>!input.reportValidity()))throw Error('Please fix the highlighted field before continuing.');for(const input of $('content').querySelectorAll('[data-key]')){const k=input.dataset.key;if(['vfoAFreq','vfoBFreq'].includes(k)&&input.value!==input.dataset.originalValue){input.value=padFrequency(input.value);if(data.vfos[k]!==input.value){data.vfos[k]=input.value;changed();}}}const problems=errors(data);if(problems.length)throw Error('Please fix these edits:\n'+problems.join('\n'));return data;}
function sync(){
 const bluetooth=!!navigator.bluetooth&&window.isSecureContext;
 for(const id of ['open','file','save'])$(id).disabled=busy||!data;
 $('connect').disabled=busy||!bluetooth;$('connect').textContent=radio.connected?'Disconnect':'Connect';
 $('readRadio').disabled=busy||!bluetooth;$('writeRadio').disabled=busy||!bluetooth||!loadedSource||attempted;
 $('verify').disabled=busy||!bluetooth||!attempted||!writePlan;$('backup').disabled=busy||!backup;
 $('connection').textContent=radio.connected?'Connected':'Not connected';$('linkDot').classList.toggle('online',radio.connected);
 $('connectionHint').textContent=bluetooth?(resetRequired?'Reconnect after radio restart':'Bluetooth programming'):'File editing available';
 $('sourceTag').textContent=loadedSource?(backup?'Radio read loaded':'CPS file loaded'):'Blank workspace';
 $('content').inert=busy;$('tabs').inert=busy;
}
function workspaceStatus(){message(`${filename} · ${data.channelList[0].slice(0,999).filter(c=>c.rxFreq).length} / 999 channels · ${dirty?'Unsaved changes':'Ready'}${loadedSource?'':' · Read a radio or open CPS .dat to enable writing.'}`);}
function load(next,name,fromRadio=null){if(!fromRadio)startReport('idle');data=next;baseline=structuredClone(next);filename=name;loadedSource=true;dirty=false;history=[];selected.clear();backup=fromRadio;writePlan=null;attempted=false;page=0;search='';tab='Channels';render();sync();workspaceStatus();}
function save(bytes,name,type='application/octet-stream'){const url=URL.createObjectURL(new Blob([bytes],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
function btn(label,action,title){const b=document.createElement('button');b.textContent=label;b.onclick=()=>{try{action();}catch(e){message(e.message);}};if(title)b.title=title;return b;}
function textEl(tag,text,cls){const el=document.createElement(tag);el.textContent=text;if(cls)el.className=cls;return el;}
function captureChannelView(){
 const wrap=document.getElementById('channelTableWrap');
 return wrap?{key:wrap.dataset.view,page:wrap.dataset.page,top:wrap.scrollTop,left:wrap.scrollLeft,x:window.scrollX||0,y:window.scrollY||0,guideOpen:wrap.closest('.card')?.querySelector('.feature-guide')?.open||false}:null;
}
function restoreChannelView(view,focusIndex=null){
 const wrap=document.getElementById('channelTableWrap');if(!view||!wrap||wrap.dataset.view!==view.key)return;
 const guide=wrap.closest('.card')?.querySelector('.feature-guide');if(guide)guide.open=view.guideOpen;
 if(focusIndex!==null){const rows=[...wrap.querySelectorAll('tr')].filter(r=>r.dataset.channelIndex!==undefined);const nearest=rows.find(r=>Number(r.dataset.channelIndex)>=focusIndex)||rows.at(-1);nearest?.focus({preventScroll:true});}
 wrap.scrollTop=wrap.dataset.page===view.page?view.top:focusIndex!==null?wrap.scrollHeight:0;wrap.scrollLeft=view.left;
 window.scrollTo?.(view.x,view.y);
}
function render(){
 const channelView=tab==='Channels'?captureChannelView():null;
 $('tabs').replaceChildren();tabs.forEach((name,i)=>{const b=btn(`${icons[i]}  ${name}`,()=>{tab=name;render();});b.classList.toggle('active',tab===name);b.setAttribute('aria-current',tab===name?'page':'false');$('tabs').append(b);});
 $('pageTitle').textContent=tab;$('pageDescription').textContent=({'Channels':'Arrange your channels, then save a native CPS file.','Repeater import':'A planned channel-import workflow for your radio.','Optional settings':'CPS options, with plain-English help on hover.','VFO A / B':'Upper (A) and lower (B) frequency-mode settings.','DTMF':'Saved identification tones and DTMF code groups.','Radio & help':'Connection preparation, safety, and programming status.'})[tab];
 const c=$('content');c.replaceChildren();
 if(tab==='Channels')renderChannels(c);
 else if(tab==='Repeater import')renderRepeaters(c);
 else if(tab==='Radio & help')renderHelp(c);
 else{const card=document.createElement('section');card.className='card';c.append(card);appendFeatureGuide(card,tab);if(tab==='DTMF')card.append(textEl('p','DTMF groups store signaling codes, not channel collections. Each entry below has digits and a name.','muted'));if(tab==='Optional settings')optionalForm(data.funCfgs,card);else if(tab==='VFO A / B')vfoForm(data.vfos,card);else{const grid=document.createElement('div');grid.className='grid';form(data.dtmfs,grid);card.append(grid);const groups=document.createElement('div');groups.className='grid';groups.style.marginTop='24px';for(let i=0;i<20;i++){const box=document.createElement('label');box.append(textEl('span',`DTMF code group ${i+1}`));for(const key of ['group','groupName']){const input=document.createElement('input'),original=data.dtmfs[key][i];input.value=key==='groupName'?visibleName(original):original;input.placeholder=key==='groupName'?'Group name':'DTMF digits';input.title=key==='groupName'?'A label for this signaling code; it does not group channels.':'Saved DTMF tone sequence for this numbered group.';input.setAttribute('aria-label',`Group ${i+1} ${key==='group'?'digits':'name'}`);input.onchange=()=>{data.dtmfs[key][i]=key==='groupName'?editedName(original,input.value):input.value;changed();workspaceStatus();};box.append(input);}groups.append(box);}card.append(groups);}}
 sync();if(tab==='Channels')restoreChannelView(channelView);
}
function filtered(){return data.channelList[0].slice(0,999).map((ch,i)=>({ch,i})).filter(({ch,i})=>(showEmpty||ch.rxFreq)&&`${i+1} ${visibleName(ch.name)} ${ch.rxFreq} ${ch.txFreq}`.toLowerCase().includes(search.toLowerCase()));}
function renderChannels(c){
 const card=document.createElement('section');card.className='card';appendFeatureGuide(card,'Channels');const toolbar=document.createElement('div');toolbar.className='toolbar';const controls=document.createElement('div');controls.className='toolbar-controls';
 const input=document.createElement('input');input.type='search';input.placeholder='Search name, frequency, channel';input.setAttribute('aria-label','Search channels');input.value=search;input.oninput=()=>{const at=input.selectionStart;search=input.value;page=0;render();const next=$('channelSearch');next.focus();next.setSelectionRange(at,at);};input.id='channelSearch';controls.append(input);
 const emptyLabel=document.createElement('label');emptyLabel.className='check';const empty=document.createElement('input');empty.type='checkbox';empty.checked=showEmpty;empty.onchange=()=>{showEmpty=empty.checked;page=0;render();};emptyLabel.append(empty,'Show empty slots');controls.append(emptyLabel);toolbar.append(controls);
 const actions=document.createElement('div');actions.className='toolbar-controls';actions.append(btn('+ Add channel',()=>{const i=data.channelList[0].findIndex((ch,n)=>n<999&&!ch.rxFreq);if(i<0)throw Error('All 999 channels are in use.');edit(i);}),btn(`Delete selected (${selected.size})`,()=>deleteSelected(),'Choose whether to leave slots empty or renumber remaining channels'));
 actions.lastChild.disabled=!selected.size;const undo=btn('Undo',()=>{const channels=history.pop();if(!channels)return;data.channelList[0].splice(0,999,...channels);selected.clear();changed();render();workspaceStatus();});undo.disabled=!history.length;actions.append(undo);const presets=btn('Add preset',()=>openAppend('preset')),appendDat=btn('Append .dat',()=>openAppend('dat'));presets.disabled=appendDat.disabled=!loadedSource;presets.title=appendDat.title=loadedSource?'Add channels without overwriting existing slots.':'Read your radio or open a native CPS .dat first.';actions.append(presets,appendDat);toolbar.append(actions);card.append(toolbar);
 const rows=filtered();page=Math.max(0,Math.min(page,Math.ceil(rows.length/pageSize)-1));const showing=rows.slice(page*pageSize,(page+1)*pageSize),wrap=document.createElement('div');wrap.className='table-wrap';wrap.id='channelTableWrap';wrap.dataset.view=JSON.stringify([search,showEmpty]);wrap.dataset.page=String(page);const table=document.createElement('table');table.innerHTML='<thead><tr><th><input id="selectPage" type="checkbox" aria-label="Select visible channels"></th><th>Ch</th><th>Name</th><th>Receive MHz</th><th>RX tone</th><th>Transmit MHz</th><th>TX tone</th><th>Scan</th><th>Actions</th></tr></thead>';
 const body=document.createElement('tbody');
 for(const {ch,i} of showing){const row=document.createElement('tr');row.className='channel-row';row.dataset.channelIndex=String(i);row.tabIndex=0;row.title='Click to '+(ch.rxFreq?'edit':'add')+' channel '+(i+1);row.setAttribute('aria-label',(ch.rxFreq?'Edit':'Add')+' channel '+(i+1));let dragged=false;row.onclick=e=>{if(dragged||e.defaultPrevented||e.target.closest('button,input,a,select,label'))return;edit(i);};row.onkeydown=e=>{if(e.target===row&&['Enter',' '].includes(e.key)){e.preventDefault();edit(i);}};row.draggable=true;row.classList.toggle('selected',selected.has(i));row.ondragstart=e=>{dragged=true;dragIndex=i;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',String(i));};row.ondragover=e=>{e.preventDefault();row.classList.add('drag-target');};row.ondragleave=()=>row.classList.remove('drag-target');row.ondrop=e=>{e.preventDefault();row.classList.remove('drag-target');try{if(dragIndex===null)return;commit(moveChannel(data,dragIndex,i));workspaceStatus();}catch(err){message(err.message);}finally{dragIndex=null;}};row.ondragend=()=>{dragIndex=null;setTimeout(()=>{dragged=false;},0);};
 const cell=document.createElement('td'),check=document.createElement('input');check.type='checkbox';check.id='channelSelect-'+i;check.checked=selected.has(i);check.setAttribute('aria-label',`Select channel ${i+1}`);check.onchange=()=>{const view=captureChannelView();if(check.checked)selected.add(i);else selected.delete(i);render();$('channelSelect-'+i)?.focus({preventScroll:true});restoreChannelView(view);};cell.append(check);row.append(cell);
 [i+1,visibleName(ch.name)||(ch.rxFreq?'Unnamed':'Empty slot'),ch.rxFreq||'—',ch.rxFreq?visibleTone(ch.strRxCtsDcs):'—',ch.txFreq||'—',ch.rxFreq?visibleTone(ch.strTxCtsDcs):'—',ch.rxFreq?(ch.scanAdd?'On':'Off'):'—'].forEach((value,n)=>row.append(textEl('td',String(value),[2,4].includes(n)?'numeric':'')));
 const a=document.createElement('td');a.append(btn(ch.rxFreq?'Edit':'Add',()=>edit(i)),btn('Delete',()=>deleteSelected([i])),btn('Add Ch',()=>edit(i,true),'Add channel above this position. Later channels shift to the next empty slot.'),btn('Move',()=>openMove(i),'Move to a channel number; dragging rows also changes their order.'));row.append(a);body.append(row);}
 table.append(body);wrap.append(table);card.append(wrap);
 if(!rows.length){wrap.append(textEl('div',search?'No matching channels.':'No saved channels yet. Add a channel, open a CPS .dat, or read your radio.','empty-state'));}
 const bottom=document.createElement('div');bottom.className='table-bottom';bottom.append(textEl('span',`${rows.length? page*pageSize+1:0}–${Math.min((page+1)*pageSize,rows.length)} of ${rows.length} shown · 999 available slots`));const paging=document.createElement('div'),prev=btn('← Previous',()=>{page--;render();}),next=btn('Next →',()=>{page++;render();});prev.disabled=page===0;next.disabled=(page+1)*pageSize>=rows.length;paging.append(prev,next);bottom.append(paging);card.append(bottom,textEl('p','Drag rows to reorder, or use Move. Edits stay in this workspace until you explicitly write the radio.','muted'));c.append(card);
 $('selectPage').checked=showing.length>0&&showing.every(({i})=>selected.has(i));$('selectPage').onchange=e=>{const view=captureChannelView();showing.forEach(({i})=>e.target.checked?selected.add(i):selected.delete(i));render();$('selectPage').focus({preventScroll:true});restoreChannelView(view);};
}
function openAppend(mode){
 if(busy||!loadedSource)throw Error('Read your radio or open a native CPS .dat first.');
 openChannelAppend({mode,getData:()=>data,readFile:file=>readDatFile(file,schemas),onApply:(candidate,plan)=>{
  commit(candidate);search='';showEmpty=false;page=Math.floor(candidate.channelList[0].slice(0,plan.start-1).filter(c=>c.rxFreq).length/pageSize);render();workspaceStatus();message(plan.channels.length+(plan.channels.length===1?' channel':' channels')+' added to '+(plan.start===plan.end?plan.start:plan.start+'–'+plan.end)+'. Existing channels and radio settings preserved. Save a .dat copy or review before Write radio.');
 }});
}
function edit(i,insert=false){
 const view=captureChannelView();let copy,original,originalName;
 const adjacent=step=>{for(let n=i+step;n>=0&&n<999;n+=step)if(showEmpty||data.channelList[0][n].rxFreq)return n;return null;};
 function populate(){
  copy=insert?emptyChannel():structuredClone(data.channelList[0][i]);original=structuredClone(copy);originalName=copy.name;
  $('fields').replaceChildren();form(copy,$('fields'));$('editErrors').textContent='';
  const initial=[...$('fields').querySelectorAll('[data-key]')].map(input=>[input,input.value]);
  stagedEdits=()=>$('editor').open&&initial.some(([input,value])=>input.value!==value);
  $('editorTitle').textContent=`${insert?'Add above channel':copy.rxFreq?'Edit channel':'Add channel'} ${i+1}`;
  $('editorNavigation').hidden=insert;
  for(const [id,step]of [['editPrevious',-1],['editNext',1]]){
   const next=adjacent(step);$(id).disabled=insert||next===null;
   $(id).title=next===null?'No '+(step<0?'previous':'next')+' channel':'Apply edits and open channel '+(next+1);
  }
 }
 function apply(navigating=false){
  try{
   if([...$('fields').querySelectorAll('input')].some(el=>!el.reportValidity()))return false;
   for(const input of $('fields').querySelectorAll('[data-key]')){
    const k=input.dataset.key;if(isFrequencyField(k)&&input.value!==original[k])input.value=padFrequency(input.value);
    copy[k]=k==='name'?editedName(originalName,input.value):typeof copy[k]==='number'?Number(input.value):input.value;
   }
   const modified=JSON.stringify(copy)!==JSON.stringify(original);
   if(!copy.rxFreq&&(!navigating||modified))throw Error('Enter a receive frequency, or use Delete to clear this slot.');
   if(modified||insert){
    const candidate=insert?insertChannel(data,i,copy):structuredClone(data);if(!insert)candidate.channelList[0][i]=copy;
    commit(candidate);workspaceStatus();
   }
   return true;
  }catch(e){$('editErrors').textContent=e.message;return false;}
 }
 // Navigation applies the current edits; closing discards only the current staged edits.
 for(const [id,step]of [['editPrevious',-1],['editNext',1]])$(id).onclick=()=>{
  if(insert)return;const next=adjacent(step);if(next===null||!apply(true))return;
  i=next;populate();$(id).focus({preventScroll:true});
 };
 $('apply').onclick=()=>{if(apply()){$('editor').close();restoreChannelView(view,i);}};
 populate();$('editor').showModal();
}
function deleteSelected(indices=[...selected]){if(!indices.length)return;$('deleteTitle').textContent=`Delete ${indices.length} channel${indices.length===1?'':'s'}?`;const apply=compact=>{try{const view=captureChannelView();commit(removeChannels(data,indices,compact));$('deleteDialog').close();restoreChannelView(view,Math.min(...indices));workspaceStatus();}catch(e){message(e.message);}};$('deleteLeave').onclick=()=>apply(false);$('deleteRenumber').onclick=()=>apply(true);$('deleteDialog').showModal();}
function openMove(i){$('moveTo').value=i+1;$('moveApply').onclick=()=>{try{if(!$('moveTo').reportValidity())return;commit(moveChannel(data,i,Number($('moveTo').value)-1));$('moveDialog').close();workspaceStatus();}catch(e){message(e.message);}};$('moveDialog').showModal();}
function renderRepeaters(c){
 const card=document.createElement('section');card.className='card';card.innerHTML='<h3>RepeaterBook channel import <span class="tag">Pending API approval</span></h3><div class="pending"><strong>Preview of the planned workflow</strong><p>Import is unavailable until RepeaterBook approves this application and a browser-compatible access method. This screen makes no API calls and accepts no tokens.</p></div><fieldset disabled><div class="repeater-form"><label>ZIP code for your operating area<input placeholder="Enter ZIP code" maxlength="5"></label><label>Search radius<select><option>25 miles (proposed)</option></select></label><label>Band<select><option>2 m &amp; 70 cm</option></select></label><label>Eligibility<select><option>Analog FM · confirmed on air</option></select></label></div><div class="radio-actions" style="margin-top:18px"><button>Find channels for my radio</button></div></fieldset><div class="workflow"><div><span class="number">01</span><h3>Choose your area</h3><p>Proposed: one request per minute, one at a time, up to 50 channels. Final limits depend on approval.</p></div><div><span class="number">02</span><h3>Review selected channels</h3><p>Only 2 m / 70 cm repeaters confirmed to support analog FM and be on air. Unknown mode or status is excluded.</p></div><div><span class="number">03</span><h3>Choose channel placement</h3><p>Review a starting slot and every proposed change. Occupied slots will require a placement decision before anything is added.</p></div></div><hr style="border:0;border-top:1px solid var(--border);margin:24px 0"><fieldset disabled><div class="repeater-form"><label>Starting channel<input type="number" value="1" min="1" max="999"></label><label>Placement<select><option>Empty slots only</option></select></label><label>Scan<select><option>Review before adding</option></select></label><button>Add selected to channels</button></div></fieldset><p class="muted" style="margin-top:20px">No repeater results are bundled or cached. You will need your own approved app-bound token when integration is authorized.</p><a href="https://www.repeaterbook.com" target="_blank" rel="noopener">Visit RepeaterBook ↗</a><p class="muted" style="margin:10px 0 0">Planned attribution wherever imported data appears: “Data courtesy of RepeaterBook.com.”</p>';c.append(card);
}
function renderHelp(c){
 renderRadioTutorial(c,data.funCfgs,options['KDH.Function'].key2Short);
 const guideCard=document.createElement('section');guideCard.className='card';guideCard.innerHTML='<h3>Using Baofeng Mini 5 BT CPS – Unofficial</h3><p>Open a DAT or read your radio, save a backup, edit, then save a copy. Radio programming is a separate action. Expand a topic below for the controls and their limits.</p>';for(const key of ['Files & radio','Channels','Optional settings','VFO A / B','DTMF','Availability'])appendFeatureGuide(guideCard,key);c.append(guideCard);
 const card=document.createElement('section');card.className='card';card.innerHTML='<h3>Supported files and programming</h3><p><strong>Only the native CPS .dat format is supported.</strong> Keep your backups in this format so the same file can be used with stock Baofeng CPS and a compatible programming cable, or loaded into <strong>Baofeng Mini 5 BT CPS – Unofficial</strong> for Bluetooth programming.</p><h3>Prepare the radio</h3><ol class="radio-steps"><li>Turn <strong>Wireless CPS programming ON</strong> on the radio.</li><li>Turn <strong>scanning OFF</strong>.</li><li>Disconnect OLA and other programming applications.</li><li>Keep the radio charged and close to the computer.</li><li>Choose Connect, then Read radio or open a native CPS .dat.</li></ol><p class="muted">Bluetooth requires a secure page (HTTPS or localhost) and a browser exposing Web Bluetooth. If unavailable, native DAT editing still works. Connect only opens the Bluetooth link. Each read and write checks the radio’s 5RMINI identity. A write stays bound to that connection; reconnecting requires a fresh check. Opening a DAT loads settings and does not verify a radio.</p><div class="pending"><strong>After writing: reset the programming connection</strong><p>After all 262 write blocks are acknowledged, the app explicitly requests a browser Bluetooth disconnect. Wait until the radio has finished rebooting; no fixed timer determines readiness. Choose Read back &amp; verify, then Radio has restarted — reconnect. If needed, toggle Wireless CPS OFF/ON and use the fallback button. Physical testing on build 20.14 confirmed programming, the normal automatic reboot, reconnection and stored-data readback. No new radio reset command or automatic write retry is used.</p></div><h3>What has been tested</h3><p>K4RJM has physically tested Bluetooth programming, reads and reconnection, including successful build 18 programming and normal operation on Radio 100 / firmware V0.05 / hardware V1.7. Factory CPS files and independent Bluetooth memory captures support the build 20.11 settings-decoder correction. Typical programming took less than one minute in the reported tests.</p><p>Build 20.12 corrects channel-frequency decoding. Build 20.14 checks channel edits and programming against the recorded factory CPS ranges and 1.25 kHz grid. Imported and read values remain preserved, with unsupported channel frequencies blocked from programming. F07 is closed based on completed factory CPS testing and regression coverage; VFO reception is separate from memory-channel limits. F03 is an accepted factory-compatible VFO limitation: OFF/group 17, PLUS/group 1 and PLUS/group 17 can read back as PLUS/group 17. Memory-channel programming is unaffected. F06 is closed: the original build 20.14 before/after captures confirm the intended channel 71 addition and channel 999 clearing after reboot, with no changes outside those areas. F05 now requires a complete, fresh 5RMINI identification for the current connection before programming. F01 is closed as accepted factory-compatible memory reconstruction, supported by retained factory CPS output and radio captures. Remaining audit work covers channel 999 mapping, unexpected-interruption recovery and independent coverage. Automated and simulated tests supplement this physical evidence. See the <a href="docs/AUDIT-REMEDIATION.md" target="_blank" rel="noopener">Open Audit Findings</a> for completed evidence and specific remaining work. A matching model is not firmware identification.</p><p>DAT files preserve CPS fields, including the extra 1,000th file record, which cannot be edited. A DAT is not firmware or a byte-for-byte memory backup. No firmware flashing, cable programming, bank unlocks or speculative memory commands are included.</p><h3>Credits &amp; source</h3><p>Free, noncommercial hobby software by K4RJM. Derived from <a href="https://github.com/replicationbench/Mini5" target="_blank" rel="noopener">Mini 5 Studio by replicationbench</a>, with protocol comparisons against <a href="https://github.com/kk7ds/chirp" target="_blank" rel="noopener">CHIRP</a> and native CPS captures. Distributed under <a href="LICENSE">GPL v3</a>.</p><p>Files and captures stay in browser memory until downloaded. Only your appearance preference is stored on this device.</p><div class="radio-actions"><button id="report">Save diagnostic report</button><button id="disconnectHelp">Disconnect</button></div><details><summary>Connection log</summary><pre id="connectionLog" class="connection-log"></pre></details>';c.append(card);$('connectionLog').textContent=log.join('\n');$('disconnectHelp').onclick=disconnect;$('report').onclick=()=>save(JSON.stringify({build:'20.19',browser:navigator.userAgent||'Unavailable',source:filename,transport:radio.report,previousTransport,latestRead:latestRead?{identity:latestRead.identity,deviceId:latestRead.deviceId,capturedAt:latestRead.capturedAt,decoded:latestRead.decoded,error:latestRead.error,rawHex:BufferHex(latestRead.raw)}:null,connectionLog:log,backup:backup?{identity:backup.identity,capturedAt:backup.capturedAt,rawHex:BufferHex(backup.raw)}:null},null,2),'mini5-diagnostic.json','application/json');
}
const BufferHex=b=>Array.from(b,v=>v.toString(16).padStart(2,'0')).join('');
function disconnect(){radio.disconnect();idleDeadline=null;if($('idle').open)$('idle').close();sync();message('Disconnected by request.');}
async function connect(){if(!radio.connected)await radio.connect();activity=Date.now();sync();}
async function run(action){if(busy)return;busy=true;activity=Date.now();$('progress').hidden=false;$('progress').value=0;sync();try{await action();}catch(e){radio.log('Operation stopped: '+e.name+': '+e.message);message(`${radio.report.stage==='write-incomplete-or-uncertain'?`Write incomplete or uncertain: ${radio.report.acknowledged} / ${radio.report.totalBlocks} blocks acknowledged. Do not retry automatically.\n`:''}${e.message}`);}finally{busy=false;activity=Date.now();$('progress').hidden=true;sync();}}
function progress(stage,n,total){$('progress').max=total;$('progress').value=n;message(`${stage}: ${n} / ${total} blocks`);}
function beforeRead(action){
 if(!resetRequired)return action();if(busy)return;
 try{radio.disconnect();radio.log('Old browser link cleared. Waiting for restart/reset confirmation; no radio commands sent.');}catch(e){radio.log('Browser disconnect failed: '+e.message+'. Use Wireless CPS off/on if needed.');}sync();
 const acknowledged=radio.report.totalBlocks===262&&radio.report.acknowledged===262;
 $('resetRebootReady').hidden=!acknowledged;
 const proceed=async method=>{
  if(busy)return;$('resetSession').close();radio.log('Reconnect requested after '+method+'.');resetRequired=false;
  try{await action();}finally{if(!radio.connected)resetRequired=true;sync();}
 };
 $('resetRebootReady').onclick=()=>{if(acknowledged)return proceed('radio reboot confirmation');};
 $('resetReady').onclick=()=>proceed('Wireless CPS off/on confirmation');$('resetSession').showModal();
}
radio.log=s=>{log.push(s);if(log.length>150)log.shift();message(s);if($('connectionLog'))$('connectionLog').textContent=log.join('\n');};radio.onDisconnect=()=>{radio.log(radio.report.totalBlocks===262&&radio.report.acknowledged===262?'Bluetooth link ended after the acknowledged write; radio reboot expected.':'Bluetooth link ended; the current operation stopped.');sync();};
$('connect').onclick=()=>radio.connected?disconnect():run(connect);
$('readRadio').onclick=()=>{if(dirty&&!confirm('Replace unsaved workspace changes with the radio read?'))return;return beforeRead(()=>run(async()=>{startReport('read-connecting');let captured=false;
 try{
  await connect();radio.report.stage='reading';radio.report.deviceId=radio.device?.id;
  const capture=await radio.readRadio((n,t)=>progress('Reading radio',n,t));
  latestRead={...capture,decoded:false};captured=true;
  const next=decodeRadio(capture.raw);writeDat(next,schemas);latestRead.decoded=true;radio.report.stage='read-complete';
  load(next,'mini5-radio-read',capture);message('Read complete. Channels and settings are loaded. Connection kept open. Save a CPS DAT backup before programming.');
 }catch(e){radio.report.stage=captured?'read-decode-failed':'read-failed';radio.report.error=e.message;if(captured)latestRead.error=e.message;throw e;}}));};
$('backup').onclick=()=>{try{save(radioDat(backup.raw,schemas),'mini5-original-radio-backup.dat');message('Original radio read download requested as native CPS DAT. It does not include firmware or unmapped memory.');}catch(e){message(e.message);}};
$('writeRadio').onclick=()=>{try{if(busy||attempted||!loadedSource)return;checked();const prepared=makePlan(data,options);writePlan=prepared;$('writeSummary').textContent=`${data.channelList[0].slice(0,999).filter(c=>c.rxFreq).length} populated channels. All CPS channels, VFOs, optional settings and DTMF will be written in 262 blocks; this is not a channel-only update.`;$('hasBackup').checked=false;$('confirmWrite').disabled=true;$('warning').showModal();}catch(e){message('Write blocked: '+e.message);}};
$('hasBackup').onchange=()=>{$('confirmWrite').disabled=!$('hasBackup').checked;};
$('confirmWrite').onclick=()=>{if(busy||attempted||!writePlan||!$('hasBackup').checked)return;$('warning').close();attempted=true;resetRequired=true;return run(async()=>{await connect();await radio.upload(writePlan,null,{confirmed:true,progress});releaseAfterAcknowledgedWrite(radio);message('All 262 blocks acknowledged. Programming is not verified. '+(radio.report.browserLinkCleanup?.outcome==='cleanup-failed'?'Browser disconnect failed; see the connection log. ':'Browser disconnect requested; ')+ 'wait for the radio to finish rebooting, then choose Read back & verify. Writing is locked for this source; no automatic retry.');});};
$('verify').onclick=()=>{if(!attempted||!writePlan||busy)return;return beforeRead(()=>run(async()=>{await connect();const result=await radio.verify(writePlan,backup,(n,t)=>progress('Verifying',n,t));message(verificationMessage(radio.report,result));}));};
$('open').onclick=()=>{if(!dirty||confirm('Discard unsaved changes and open another CPS .dat?'))$('file').click();};
$('file').onchange=()=>{const f=$('file').files[0];if(!f||busy)return;return run(async()=>{try{const next=await readDatFile(f,schemas);load(next,f.name.replace(/\.dat$/i,''));}catch(e){message('File not loaded; current workspace retained. '+e.message);}finally{$('file').value='';}});};
$('save').onclick=()=>{try{checked();save(writeDat(data,schemas),filename+'-edited.dat');sync();workspaceStatus();message('Download requested. Confirm the .dat file appears in your downloads before closing this workspace.');}catch(e){message('Save blocked: '+e.message);}};
for(const [button,dialog] of [['cancel','editor'],['deleteCancel','deleteDialog'],['cancelWrite','warning'],['resetCancel','resetSession'],['moveCancel','moveDialog']])$(button).onclick=()=>$(dialog).close();
$('help').onclick=()=>{tab='Radio & help';render();};
$('whatsNew').onclick=()=>$('releaseNotes').showModal();
$('closeReleaseNotes').onclick=()=>$('releaseNotes').close();
$('idleKeep').onclick=()=>{$('idle').close();idleDeadline=null;activity=Date.now();};$('idleDisconnect').onclick=disconnect;
for(const type of ['pointerdown','keydown','input'])document.addEventListener(type,()=>{if(!$('idle').open)activity=Date.now();},{passive:true});
setInterval(()=>{if(busy||!radio.connected){idleDeadline=null;if($('idle').open)$('idle').close();return;}if(!idleDeadline&&Date.now()-activity>=600000){idleDeadline=Date.now()+60000;$('idle').showModal();}if(idleDeadline){$('idleSeconds').textContent=String(Math.max(0,Math.ceil((idleDeadline-Date.now())/1000)));if(Date.now()>=idleDeadline)disconnect();}},1000);
function setTheme(value){document.documentElement.dataset.theme=value;try{localStorage.setItem('mini5-theme',value);}catch{}}
try{const saved=localStorage.getItem('mini5-theme');if(['dark','light','system'].includes(saved)){$('theme').value=saved;document.documentElement.dataset.theme=saved;}}catch{}
$('theme').onchange=()=>setTheme($('theme').value);
if('ResizeObserver' in window){new ResizeObserver(entries=>document.documentElement.style.setProperty('--warning-height',entries[0].target.getBoundingClientRect().height+'px')).observe(document.querySelector('.risk-banner'));}
window.addEventListener('beforeunload',e=>{if(dirty||busy||stagedEdits()){e.preventDefault();e.returnValue='';}});
try{
 [schemas,options,charset,defaults]=await Promise.all([fetch('schemas.json').then(r=>r.json()),Promise.all(['function-options.json','editor-options.json'].map(p=>fetch(p).then(r=>r.json()))).then(([f,e])=>({'KDH.Function':f,...e})),fetch('name-charset.json').then(r=>r.json()),fetch('defaults.json').then(r=>r.json())]);
 data=blankData(defaults);baseline=structuredClone(data);writeDat(data,schemas);configureFields(options['KDH.Function'],Object.fromEntries(Object.entries(options).filter(([k])=>k!=='KDH.Function')),()=>{if(!$('editor').open){changed();workspaceStatus();}});render();workspaceStatus();
}catch(e){message('Editor could not start: '+e.message+'. Serve the complete folder over HTTPS or localhost.');for(const id of ['open','save','connect','readRadio','writeRadio'])$(id).disabled=true;}
