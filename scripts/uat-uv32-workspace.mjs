// UAT UV-32 views use Ham-Rx's existing navigation, card, and channel table.
// This module renders captured data only; it never invokes MINI-5 editors.
export function createUv32Workspace({document:d,select,getCapture}){
 const $=id=>d.getElementById(id),sections=['Channels','Optional settings','VFO A / B','DTMF','Zones','Radio & help'];
 const icons=['☷','⚙','⇄','▦','▤','ⓘ'];
 let section='Channels',zone=0,search='',showEmpty=false,page=0;
 const el=(tag,cls,text)=>{const node=d.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=String(text);return node;};
 const button=(label,action)=>{const node=el('button','',label);node.type='button';node.onclick=action;return node;};
 const pairs=(items)=>{const list=el('dl','uv32-fields');for(const [label,value] of items){list.append(el('dt','',label),el('dd','',value));}return list;};
 const box=(title)=>{const card=el('section','card');card.append(el('h3','',title));return card;};
 const empty=()=>el('p','muted','Open a complete UV-32 cable capture or read the radio to see this section.');
 const render=()=>{
  if(select.value!=='uv32')return;
  const capture=getCapture(),readout=capture?.readout;
  d.documentElement.dataset.screen=section==='Channels'?'channels':'other';
  $('pageTitle').textContent=section;
  $('pageDescription').textContent=section==='Channels'?'Browse UV-32 channels by zone.':'UV-32 radio settings from the full cable capture.';
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
   if(!readout){content.append(empty());return;}const card=box('Radio Function');card.append(pairs(readout.functionFields));content.append(card);
  }else if(section==='VFO A / B'){
   if(!readout){content.append(empty());return;}const wrap=el('div','uv32-vfo-grid');for(const [name,fields] of [['VFO A',readout.vfoA],['VFO B',readout.vfoB]]){const card=box(name);card.append(pairs(fields));wrap.append(card);}content.append(wrap);
  }else if(section==='DTMF'){
   if(!readout){content.append(empty());return;}const card=box('DTMF');card.append(pairs([['Local ID',readout.dtmf.localId],['Code Time',readout.dtmf.codeTime],['Idle Time',readout.dtmf.idleTime],['Hang-Up Time',readout.dtmf.hangUp]]));const table=el('table','uv32-info-table');table.innerHTML='<thead><tr><th>No.</th><th>Code</th><th>Name</th></tr></thead><tbody></tbody>';
   for(const entry of readout.dtmf.entries){const tr=el('tr');for(const value of [entry.number,entry.code,entry.name])tr.append(el('td','',value));table.tBodies[0].append(tr);}card.append(table);content.append(card);
  }else if(section==='Zones'){
   if(!readout){content.append(empty());return;}const card=box('UV-32 zones');card.append(pairs(readout.zones.map(z=>['Zone '+String(z.number).padStart(2,'0'),z.name||'(unnamed)'])));content.append(card);
  }else{const card=box('UV-32 readout');card.append(el('p','muted',capture?'Capture loaded from the UV-32. Channel and settings views are read only.':'Choose Read UV-32 by cable or Open UV-32 capture from File & radio.'));content.append(card);}
 };
 function renderChannels(content,capture){
  const card=el('section','card channel-card'),guide=el('details','feature-guide');guide.append(el('summary','','How to browse UV-32 channels'),el('p','','Choose a zone, search channels, or show empty slots. Changes to the radio are not available in this build.'));card.append(guide);
  const toolbar=el('div','toolbar'),controls=el('div','toolbar-controls');
  const input=el('input');input.type='search';input.id='uv32ChannelSearch';input.placeholder='Search name, frequency, channel';input.setAttribute('aria-label','Search UV-32 channels');input.value=search;input.oninput=()=>{search=input.value;page=0;renderChannelsOnly();};controls.append(input);
  const emptyLabel=el('label','check'),checkbox=el('input');checkbox.type='checkbox';checkbox.checked=showEmpty;checkbox.onchange=()=>{showEmpty=checkbox.checked;page=0;renderChannelsOnly();};emptyLabel.append(checkbox,'Show empty slots');controls.append(emptyLabel);
  const zoneLabel=el('label','uv32-zone-control','Zone '),picker=el('select');picker.id='uv32Zone';picker.setAttribute('aria-label','UV-32 zone');for(let n=0;n<=10;n++){const option=el('option','',n?(capture?.readout?.zones[n-1]?.name||'Zone '+String(n).padStart(2,'0')):'All zones');option.value=String(n);picker.append(option);}picker.value=String(zone);picker.onchange=()=>{zone=Number(picker.value);page=0;renderChannelsOnly();};zoneLabel.append(picker);controls.append(zoneLabel);toolbar.append(controls);card.append(toolbar);
  const wrap=el('div','table-wrap');wrap.id='channelTableWrap';wrap.tabIndex=0;wrap.setAttribute('aria-label','UV-32 channels');const table=el('table');const cols=[['number','Ch'],['rx','RX MHz'],['rxTone','RX tone'],['tx','TX MHz'],['txTone','TX tone'],['power','Power'],['bandwidth','BW'],['scan','Scan'],['squelch','SQ mode'],['pttId','PTT-ID'],['signal','Signal'],['busyLock','Busy lock'],['fhss','FHSS'],['name','Name']];
  const head=el('thead'),heading=el('tr');for(const [,label] of cols){const th=el('th','',label);th.scope='col';heading.append(th);}head.append(heading);table.append(head);const body=el('tbody');table.append(body);wrap.append(table);card.append(wrap);
  const bottom=el('div','table-bottom'),count=el('span'),pager=el('div'),prev=button('← Previous',()=>{page--;paint();}),next=button('Next →',()=>{page++;paint();});pager.append(prev,next);bottom.append(count,pager);card.append(bottom,el('p','muted','UV-32 readout. Captured bytes are retained; channel editing and writing are not enabled.'));content.append(card);
  function paint(){const all=capture?.preview?.channels??[],populated=new Map(all.map(c=>[c.number,c]));let rows=showEmpty?Array.from({length:1000},(_,i)=>populated.get(i+1)??{number:i+1}):all;
   if(zone)rows=rows.filter(r=>Math.floor((r.number-1)/100)+1===zone);
   if(search){const q=search.toLowerCase();rows=rows.filter(r=>`${r.number} ${r.name??''} ${r.rx??''} ${r.tx??''}`.toLowerCase().includes(q));}
   const pages=Math.max(1,Math.ceil(rows.length/50));page=Math.min(page,pages-1);body.replaceChildren();for(const row of rows.slice(page*50,(page+1)*50)){const tr=el('tr','channel-row');tr.dataset.uv32Channel=String(row.number);for(const [key] of cols){const td=el('td','',row[key]??'');tr.append(td);}body.append(tr);}
   if(!rows.length){const tr=el('tr'),td=el('td','empty-state',capture?'No channels in this view.':'No UV-32 capture loaded yet.');td.colSpan=cols.length;tr.append(td);body.append(tr);}
   count.textContent=`${rows.length?page*50+1:0}–${Math.min((page+1)*50,rows.length)} of ${rows.length} shown · 1000 available slots`;prev.disabled=page===0;next.disabled=page+1>=pages;
  }
  function renderChannelsOnly(){paint();}
  paint();
 }
 return {render,reset(){section='Channels';zone=0;search='';showEmpty=false;page=0;render();},restoreBrand(){const image=$('brandRadioImage');image.src='assets/mini5-blue.png';image.alt='Blue Baofeng MINI-5';image.parentElement.classList.remove('uv32-brand-image');$('brandTitle').textContent='Ham-Rx Baofeng Mini-5';}};
}
