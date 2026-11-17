// UAT UV-32 views use Ham-Rx's existing navigation, card, and channel table.
import {renderUv32Help} from './uat-uv32-help.mjs?v=20.55';
import {UV32_SETTING_OPTIONS} from './uat-uv32-edit.mjs?v=20.55c';
export function createUv32Workspace({document:d,select,getCapture,onEdit,onUndo,canUndo,onError}){
 const $=id=>d.getElementById(id),sections=['Channels','Optional settings','VFO A / B','DTMF','Zones','Radio & help'];
 const icons=['☷','⚙','⇄','▦','▤','ⓘ'];
 let section='Channels',zone=0,search='',showEmpty=false,page=0;
 const el=(tag,cls,text)=>{const node=d.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=String(text);return node;};
 const button=(label,action)=>{const node=el('button','',label);node.type='button';node.onclick=action;return node;};
 const apply=action=>{try{action();render();}catch(error){onError(error.message);}};
 const field=(label,value,change,options)=>{const wrap=el('label','uv32-edit-field'),caption=el('span','',label);const input=options?el('select'):el('input');if(options){for(const option of options){const item=el('option','',option);item.value=option;input.append(item);}if(!options.includes(String(value))){const item=el('option','',value);item.value=String(value);input.prepend(item);}input.value=String(value);}else input.value=String(value??'');input.setAttribute('aria-label',label);input.onchange=()=>apply(()=>change(input.value));wrap.append(caption,input);return wrap;};
 const pairs=(items)=>{const list=el('dl','uv32-fields');for(const [label,value] of items){list.append(el('dt','',label),el('dd','',value));}return list;};
 const cpsColumns=[
  ['SQL','TOT','Save Mode','TOT Alarm','Dual Standby','Pilot Tone','Sidetone','Tail Clear','Power On Dis Type','Beep','Roger'],
  ['Language','Scan Mode','Alarm Mode','Sound Alarm','Key Lock','FM','Key Auto Lock','Menu Quit Timer','Backlight Timer','Send ID Delay','QT Save Mode','Skey1 Short'],
  ['CH.A Display Type','Work Mode A','CH.B Display Type','Work Mode B','Rpt Tail Clear','Rpt Tail Delay','Enable Menu Rst','Vox Switch','Vox Lv','Vox Dly Time','GPS Switch','GPS Mode']
 ];
 const cpsAliases={'Power On Dis Type':'Power On Dls Type','Vox Switch':'VOX Switch','Vox Lv':'VOX level','Vox Dly Time':'VOX Dly Time'};
 const radioFunction=fields=>{
  const values=new Map(fields),work=String(values.get('Work Modes')??'');
  const modes=work.match(/^A (\d+), B (\d+)$/);
  if(modes){values.set('Work Mode A',modes[1]==='1'?'Ch Mode':`Code ${modes[1]}`);values.set('Work Mode B',modes[2]==='1'?'Ch Mode':`Code ${modes[2]}`);}
  const grid=el('div','uv32-cps-grid');
  for(const names of cpsColumns){const column=el('dl','uv32-cps-column');for(const name of names){
   const row=el('div','uv32-cps-field'),source=cpsAliases[name]??name,raw=values.get(source);
   const label=el('dt','',name),cell=el('dd'),output=el('output','uv32-cps-value',raw===undefined?'Not captured':raw);
   const spec=UV32_SETTING_OPTIONS[name];
   if(spec&&getCapture()?.readout){const current=String(raw);const control=el('select');control.setAttribute('aria-label',name);for(const choice of spec.values){const option=el('option','',choice);option.value=choice;control.append(option);}if(!spec.values.includes(current)){const option=el('option','',current);option.value=current;control.prepend(option);}control.value=current;control.onchange=()=>apply(()=>onEdit('setting',{name,value:control.value}));cell.append(control);}
   else cell.append(output);row.append(label,cell);column.append(row);
  }grid.append(column);}
  const used=new Set(cpsColumns.flat().map(name=>cpsAliases[name]??name));used.add('Work Modes');
  const extras=fields.filter(([name])=>!used.has(name));
  const details=el('details','uv32-cps-extras');details.append(el('summary','','Additional captured settings'),pairs(extras));
  const wrap=el('div','uv32-cps-function');wrap.append(grid,details);return wrap;
 };
 const box=(title)=>{const card=el('section','card');card.append(el('h3','',title));return card;};
 const empty=()=>el('p','muted','Open a complete UV-32 cable capture or read the radio to see this section.');
 const render=()=>{
  if(select.value!=='uv32')return;
  const capture=getCapture(),readout=capture?.readout;
  d.documentElement.dataset.screen=section==='Channels'?'channels':'other';
  $('pageTitle').textContent=section;
  $('pageDescription').textContent=section==='Channels'?'Edit UV-32 channels by zone.':section==='Radio & help'?'UV-32 controls and operating instructions.':'UV-32 radio settings from the full cable capture.';
  $('sourceTag').textContent=capture?(capture.readout?'UV-32 full read':'UV-32 channel read'):'Blank UV-32 workspace';
  $('brandTitle').textContent='Ham-Rx Baofeng UV-32';
  const image=$('brandRadioImage');image.src='assets/uv32-blue.jpg';image.alt='Baofeng UV-32 with blue accents';image.parentElement.classList.add('uv32-brand-image');
  $('connectionHint').textContent='UV-32 Bluetooth programming';
  const nav=$('tabs');nav.replaceChildren();for(let i=0;i<sections.length;i++){
   const name=sections[i],item=button(icons[i]+' '+name,()=>{section=name;page=0;render();});item.classList.toggle('active',section===name);item.setAttribute('aria-current',section===name?'page':'false');nav.append(item);
  }
  const content=$('content');content.replaceChildren();
  if(section==='Channels')renderChannels(content,capture);
  else if(section==='Optional settings'){
   if(!readout){content.append(empty());return;}const card=box('Radio Function');card.append(radioFunction(readout.functionFields));content.append(card);
  }else if(section==='VFO A / B'){
   if(!readout){content.append(empty());return;}const wrap=el('div','uv32-vfo-grid');for(const [name,fields] of [['VFO A',readout.vfoA],['VFO B',readout.vfoB]]){const card=box(name),side=name.slice(-1);for(const [key,value] of fields){if(key==='Offset bytes'){const bytes=String(value).split(' ').map(x=>parseInt(x,16));const offset=bytes.every(x=>x>=0&&x<=9)?(Number(bytes.join(''))/1000).toFixed(3):value;card.append(field('Offset MHz',offset,v=>onEdit('vfo',{side,field:'Offset MHz',value:v})));continue;}if(['Frequency MHz','RX tone code','TX tone code','Busy Lock','Power code','Bandwidth','FHSS','Signalling code','Offset direction code','Step code','SQ Mode code'].includes(key)){const shown=key==='Power code'?['High','Low','Medium'][value]??value:value;const options=key==='Busy Lock'||key==='FHSS'?['Off','On']:key==='Bandwidth'?['Wide','Narrow']:key==='Power code'?['High','Low','Medium']:null;card.append(field(key,shown,v=>onEdit('vfo',{side,field:key,value:v}),options));}else card.append(pairs([[key,value]]));}wrap.append(card);}content.append(wrap);
  }else if(section==='DTMF'){
   if(!readout){content.append(empty());return;}const card=box('DTMF');for(const [label,key,options] of [['Local ID','localId'],['Code Time','codeTime',['50 ms','100 ms','200 ms','300 ms','500 ms']],['Idle Time','idleTime',['50 ms','100 ms','200 ms','300 ms','500 ms']],['Hang-Up Time','hangUp',Array.from({length:8},(_,i)=>`${i+3} s`)]])card.append(field(label,readout.dtmf[key],value=>onEdit('dtmf',{field:key,value}),options));const table=el('table','uv32-info-table');table.innerHTML='<thead><tr><th>No.</th><th>Code</th><th>Name</th></tr></thead><tbody></tbody>';
   for(const entry of readout.dtmf.entries){const tr=el('tr');tr.append(el('td','',entry.number));for(const key of ['code','name']){const td=el('td'),input=el('input');input.value=entry[key];input.setAttribute('aria-label',`DTMF ${entry.number} ${key}`);input.onchange=()=>apply(()=>onEdit('dtmf',{number:entry.number,field:key,value:input.value}));td.append(input);tr.append(td);}table.tBodies[0].append(tr);}card.append(table);content.append(card);
  }else if(section==='Zones'){
   if(!readout){content.append(empty());return;}const card=box('UV-32 zones');for(const z of readout.zones)card.append(field('Zone '+String(z.number).padStart(2,'0'),z.name,value=>onEdit('zone',{number:z.number,value})));content.append(card);
  }else{renderUv32Help(d,content);}
 };
 function renderChannels(content,capture){
  const selected=new Set(),editable=!!capture?.readout;
  const card=el('section','card channel-card'),guide=el('details','feature-guide');guide.append(el('summary','','How to edit UV-32 channels'),el('p','','Choose a zone and select a channel. Save your edits before writing them to the radio.'));card.append(guide);
  const toolbar=el('div','toolbar'),controls=el('div','toolbar-controls');
  const input=el('input');input.type='search';input.id='uv32ChannelSearch';input.placeholder='Search name, frequency, channel';input.setAttribute('aria-label','Search UV-32 channels');input.value=search;input.oninput=()=>{search=input.value;page=0;renderChannelsOnly();};controls.append(input);
  const emptyLabel=el('label','check'),checkbox=el('input');checkbox.type='checkbox';checkbox.checked=showEmpty;checkbox.onchange=()=>{showEmpty=checkbox.checked;page=0;renderChannelsOnly();};emptyLabel.append(checkbox,'Show empty slots');controls.append(emptyLabel);
  const zoneLabel=el('label','uv32-zone-control','Zone '),picker=el('select');picker.id='uv32Zone';picker.setAttribute('aria-label','UV-32 zone');for(let n=0;n<=10;n++){const option=el('option','',n?(capture?.readout?.zones[n-1]?.name||'Zone '+String(n).padStart(2,'0')):'All zones');option.value=String(n);picker.append(option);}picker.value=String(zone);picker.onchange=()=>{zone=Number(picker.value);page=0;selected.clear();renderChannelsOnly();};zoneLabel.append(picker);controls.append(zoneLabel);toolbar.append(controls);
  const actions=el('div','toolbar-actions'),add=button('＋ Add channel',()=>{const populated=new Set((getCapture()?.preview?.channels??[]).map(c=>c.number)),first=zone?(zone-1)*100+1:1,last=zone?zone*100:1000;let number=first;while(number<=last&&populated.has(number))number++;if(number>last){onError('No empty channel slot in this zone');return;}showEmpty=true;checkbox.checked=true;search='';input.value='';page=Math.floor((number-first)/50);paint();openEditor({number});}),deleteSelected=button('Delete selected (0)',()=>{if(!selected.size)return;if(!window.confirm(`Delete ${selected.size} selected UV-32 channel(s)?`))return;apply(()=>onEdit('deleteMany',{numbers:[...selected]}));}),moveSelected=button('Move selected (0)',()=>{if(selected.size!==1)return;const from=[...selected][0],value=window.prompt(`Move channel ${from} to which slot in the same zone?`);if(value===null)return;apply(()=>onEdit('move',{from,to:Number(value)}));}),undo=button('Undo',()=>apply(onUndo));
  add.disabled=!editable;deleteSelected.disabled=true;moveSelected.disabled=true;undo.disabled=!canUndo?.();actions.append(add,deleteSelected,moveSelected,undo);toolbar.append(actions);card.append(toolbar);
  const updateSelected=()=>{deleteSelected.textContent=`Delete selected (${selected.size})`;deleteSelected.disabled=!editable||!selected.size;moveSelected.textContent=`Move selected (${selected.size})`;moveSelected.disabled=!editable||selected.size!==1;};
  const wrap=el('div','table-wrap');wrap.id='channelTableWrap';wrap.tabIndex=0;wrap.setAttribute('aria-label','UV-32 channels');const table=el('table');const cols=[['number','Ch'],['rx','RX MHz'],['rxTone','RX tone'],['tx','TX MHz'],['txTone','TX tone'],['power','Power'],['bandwidth','BW'],['scan','Scan'],['squelch','SQ mode'],['pttId','PTT-ID'],['signal','Signal'],['busyLock','Busy lock'],['fhss','FHSS'],['name','Name']];
  const head=el('thead'),heading=el('tr'),selectHead=el('th');const selectAll=el('input');selectAll.type='checkbox';selectAll.setAttribute('aria-label','Select shown UV-32 channels');selectHead.append(selectAll);heading.append(selectHead);for(const [,label] of cols){const th=el('th','',label);th.scope='col';heading.append(th);}heading.append(el('th','','Actions'));head.append(heading);table.append(head);const body=el('tbody');table.append(body);wrap.append(table);card.append(wrap);
  const bottom=el('div','table-bottom'),count=el('span'),pager=el('div'),prev=button('← Previous',()=>{page--;paint();}),next=button('Next →',()=>{page++;paint();});pager.append(prev,next);bottom.append(count,pager);card.append(bottom);const editor=el('section','card uv32-channel-editor');editor.hidden=true;card.append(editor);content.append(card);
  const openEditor=row=>{if(!capture?.readout)return;editor.replaceChildren();editor.hidden=false;editor.append(el('h3','',`Channel ${row.number} · Zone ${Math.floor((row.number-1)/100)+1}`));const form=el('form'),inputs={},initial={};const choices={power:['High','Low','Medium'],bandwidth:['Wide','Narrow'],scan:['Add','Skip'],squelch:['Code 0','Code 1','Code 2','Code 3'],pttId:['Off','BOT','EOT','Both'],signal:Array.from({length:20},(_,i)=>String(i+1)),busyLock:['Off','On'],fhss:['Off','On']};const defaults={rx:'',tx:'Off',rxTone:'Off',txTone:'Off',power:'High',bandwidth:'Wide',scan:'Add',squelch:'Code 0',pttId:'Off',signal:'1',busyLock:'Off',fhss:'Off',name:''};for(const [key,label] of cols.slice(1)){const wrap=el('label','uv32-edit-field'),caption=el('span','',label),input=choices[key]?el('select'):el('input');if(choices[key]){for(const option of choices[key]){const node=el('option','',option);node.value=option;input.append(node);}if(row[key]&&!choices[key].includes(String(row[key]))){const node=el('option','',row[key]);node.value=row[key];input.prepend(node);}}input.value=String(row[key]??defaults[key]);initial[key]=input.value;input.setAttribute('aria-label',`Channel ${row.number} ${label}`);inputs[key]=input;wrap.append(caption,input);form.append(wrap);}const actions=el('div','toolbar');const save=button('Save channel',()=>{const patch=Object.fromEntries(Object.entries(inputs).filter(([key,input])=>input.value!==initial[key]).map(([key,input])=>[key,input.value]));if(row.rx===undefined&&!patch.rx){onError('Enter an RX frequency for this channel');return;}apply(()=>onEdit('channel',{number:row.number,patch}));}),remove=button('Delete channel',()=>apply(()=>onEdit('channel',{number:row.number,patch:{delete:true}}))),close=button('Close',()=>{editor.hidden=true;});actions.append(save,remove,close);form.append(actions);editor.append(form);editor.scrollIntoView?.({block:'nearest'});};
  function paint(){const all=capture?.preview?.channels??[],populated=new Map(all.map(c=>[c.number,c]));let rows=showEmpty?Array.from({length:1000},(_,i)=>populated.get(i+1)??{number:i+1}):all;
   if(zone)rows=rows.filter(r=>Math.floor((r.number-1)/100)+1===zone);
   if(search){const q=search.toLowerCase();rows=rows.filter(r=>`${r.number} ${r.name??''} ${r.rx??''} ${r.tx??''}`.toLowerCase().includes(q));}
   const pages=Math.max(1,Math.ceil(rows.length/50));page=Math.min(page,pages-1);body.replaceChildren();const shown=rows.slice(page*50,(page+1)*50);selectAll.disabled=!editable||!shown.length;selectAll.checked=shown.length>0&&shown.every(row=>selected.has(row.number));selectAll.onchange=()=>{for(const row of shown)selectAll.checked?selected.add(row.number):selected.delete(row.number);paint();};for(const row of shown){const tr=el('tr','channel-row');tr.dataset.uv32Channel=String(row.number);if(editable){tr.tabIndex=0;tr.title='Select to edit';tr.onclick=()=>openEditor(row);tr.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();openEditor(row);}};}const selection=el('td'),check=el('input');check.type='checkbox';check.checked=selected.has(row.number);check.disabled=!editable;check.setAttribute('aria-label',`Select channel ${row.number}`);check.onchange=()=>{check.checked?selected.add(row.number):selected.delete(row.number);updateSelected();selectAll.checked=shown.every(item=>selected.has(item.number));};check.onclick=e=>e.stopPropagation();selection.append(check);tr.append(selection);for(const [key] of cols){const td=el('td','',row[key]??'');tr.append(td);}const actionCell=el('td','uv32-row-actions');if(editable){for(const [label,action] of [['Edit',()=>openEditor(row)],['Delete',()=>apply(()=>onEdit('channel',{number:row.number,patch:{delete:true}}))],['Ins Ch',()=>apply(()=>onEdit('insert',{number:row.number}))],['Move',()=>{const value=window.prompt(`Move channel ${row.number} to which slot in the same zone?`);if(value!==null)apply(()=>onEdit('move',{from:row.number,to:Number(value)}));}]]){const item=button(label,action);item.onclick=e=>{e.stopPropagation();action();};item.disabled=(label==='Delete'||label==='Move')&&row.rx===undefined;actionCell.append(item);}}tr.append(actionCell);body.append(tr);}
   if(!rows.length){const tr=el('tr'),td=el('td','empty-state',capture?'No channels in this view.':'No UV-32 capture loaded yet.');td.colSpan=cols.length+2;tr.append(td);body.append(tr);}
   count.textContent=`${rows.length?page*50+1:0}–${Math.min((page+1)*50,rows.length)} of ${rows.length} shown · 1000 available slots`;prev.disabled=page===0;next.disabled=page+1>=pages;
   updateSelected();
  }
  function renderChannelsOnly(){paint();}
  paint();
 }
 return {render,reset(){section='Channels';zone=0;search='';showEmpty=false;page=0;render();},restoreBrand(){const image=$('brandRadioImage');image.src='assets/mini5-blue.png';image.alt='Blue Baofeng MINI-5';image.parentElement.classList.remove('uv32-brand-image');$('brandTitle').textContent='Ham-Rx Baofeng Mini-5';}};
}
