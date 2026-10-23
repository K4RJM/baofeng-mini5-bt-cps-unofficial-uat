import {PRESETS,presetChannels,datChannels,planAppend,blockAvailability,appendChannels} from './channel-import.mjs?v=20.6';
const $=id=>document.getElementById(id);
const option=(value,label,disabled=false)=>{const el=document.createElement('option');el.value=String(value);el.textContent=label;el.disabled=disabled;return el;};
let generation=0;
export function openChannelAppend({mode='preset',getData,readFile,onApply}){
 const dialog=$('appendDialog');generation++;let imported=null,loading=false,fileError='',closed=false,csv=null,csvFile=null,csvPage=0,chosen=new Set();
 const isDat=mode==='dat';
 $('appendTitle').textContent=isDat?'Import / append channels':'Add channel preset';
 $('appendIntro').textContent=isDat?'Add a saved channel set to this workspace.':'Choose a channel set and an empty destination.';
 $('appendPresetField').hidden=isDat;$('appendDatField').hidden=!isDat;$('appendTransmitRow').hidden=isDat;$('appendRepeaterField').hidden=isDat;
 $('appendPreset').replaceChildren(...PRESETS.map(p=>option(p.key,p.label)));$('appendPreset').value='shared';
 $('appendPlacement').value='next';$('appendSkip').checked=true;$('appendPower').value='1';$('appendRepeaters').checked=false;$('appendDat').value='';
 $('csvReview').hidden=true;$('csvPower').value='1';$('csvPartial').checked=false;dialog.classList.remove('csv-import-dialog');
 const preferences=()=>({placement:$('appendPlacement').value,skipDuplicates:$('appendSkip').checked});
 const source=()=>isDat?(csv?csv.rows.filter((r,i)=>r.channel&&chosen.has(i)).map(r=>r.channel):imported||[]):presetChannels($('appendPreset').value,{power:Number($('appendPower').value),repeaters:$('appendRepeaters').checked});
 const renderCsv=()=>{
  $('csvReview').hidden=!csv;dialog.classList.toggle('csv-import-dialog',!!csv);if(!csv)return;
  const rejected=csv.rows.filter(r=>r.error).length;
  $('csvSummary').textContent=csv.format+' · '+csv.channels.length+' valid · '+rejected+' excluded · '+csv.emptyRows+' empty rows ignored';
  $('csvPartialRow').hidden=!rejected;$('csvNotes').textContent=csv.notes.join(' ');
  $('csvTableBody').replaceChildren();csvPage=Math.max(0,Math.min(csvPage,Math.ceil(csv.rows.length/25)-1));
  for(let i=csvPage*25;i<Math.min(csv.rows.length,(csvPage+1)*25);i++){
   const r=csv.rows[i],c=r.channel,row=document.createElement('tr'),cell=document.createElement('td'),check=document.createElement('input');check.type='checkbox';check.checked=chosen.has(i);check.disabled=!c;check.setAttribute('aria-label','Include CSV line '+r.line);check.onchange=()=>{check.checked?chosen.add(i):chosen.delete(i);update();};cell.append(check);row.append(cell);
   const texts=[r.line,c?.name||'—',c?.rxFreq||'—',c?.strRxCtsDcs||'—',c?(c.txFreq||'Off'):'—',c?.strTxCtsDcs||'—',c?(c.txPower?'Low':'High'):'—',c?(c.bandwide?'Narrow':'Wide'):'—',c?(c.scanAdd?'Include':'Skip'):'—',r.error||r.notes.join(' ')||'Ready'];
   for(const text of texts){const td=document.createElement('td');td.textContent=String(text);row.append(td);}
   row.children[2].title=r.sourceName;row.classList.toggle('csv-rejected',!!r.error);$('csvTableBody').append(row);
  }
  $('csvPage').textContent='Rows '+(csvPage*25+1)+'–'+Math.min(csv.rows.length,(csvPage+1)*25)+' of '+csv.rows.length;
  $('csvPrevious').disabled=csvPage===0;$('csvNext').disabled=(csvPage+1)*25>=csv.rows.length;
 };
 const update=()=>{
  const preset=PRESETS.find(p=>p.key===$('appendPreset').value),list=source(),current=getData();
  $('appendRepeaterField').hidden=isDat||preset.key!=='shared';
  const unplaced=planAppend(current,list,{...preferences(),placement:'next'}),selected=$('appendPlacement').value||'next';
  $('appendPlacement').replaceChildren(option('next','Next available space'),...blockAvailability(current,unplaced.channels.length).map(b=>option(b.start,`${b.start}–${b.end}${b.occupied?' · occupied':!b.available?' · too small':' · empty'}`,!b.available)));
  $('appendPlacement').value=selected;
  const plan=planAppend(current,list,preferences());
  $('appendNoticeTitle').textContent=isDat?'Keep the current radio configuration':preset.key==='shared'&&$('appendRepeaters').checked?'USA · FRS / GMRS + repeater pairs':preset.label.split(' · ').at(-1)+' · '+preset.label.split(' · ')[0];
  $('appendNoticeText').textContent=isDat?(csv?'Review the converted fields and notes below. Current radio settings stay unchanged. Before transmitting, check frequency permissions and power limits.':'Only populated channels are copied. Current optional settings, VFOs, DTMF and the extra file record stay unchanged. Imported transmit frequencies and power settings are preserved.'):preset.notice+(preset.key==='shared'&&$('appendRepeaters').checked?' Set repeater access tones.':'');
  $('appendPowerNote').hidden=isDat;$('appendPowerNote').textContent='Before transmitting, check local regulations, licensing and equipment approval. High / Low settings do not guarantee these power limits.';
  $('appendRules').hidden=isDat;$('appendRules').href=preset.rules;
  $('appendRange').textContent=loading?'Reading channel file…':isDat&&!imported?'Choose a channel file to preview placement':plan.error?'No channels will be added':`${plan.channels.length} channel${plan.channels.length===1?'':'s'} → ${plan.start===plan.end?plan.start:plan.start+'–'+plan.end}`;
  $('appendCounts').textContent=loading||isDat&&!imported?'Existing channels stay in place.':`${plan.duplicates} matching channels skipped · existing channels preserved`;
  $('appendErrors').textContent=fileError||(!loading&&(!isDat||imported)?plan.error:'');$('appendErrors').hidden=!$('appendErrors').textContent;
  $('appendApply').disabled=loading||!!fileError||!!plan.error||isDat&&!imported||!!(csv?.rows.some(r=>r.error)&&!$('csvPartial').checked);
  if(csv)$('appendCounts').textContent=chosen.size+' selected · '+plan.duplicates+' matching channels skipped · existing channels preserved';
 };
 for(const id of ['appendPreset','appendPlacement','appendSkip','appendPower','appendRepeaters'])$(id).onchange=update;
 $('appendDat').onchange=async()=>{
  const file=$('appendDat').files?.[0];if(!file)return;const request=++generation;imported=null;fileError='';loading=true;update();
  csv=null;csvFile=null;chosen.clear();csvPage=0;$('csvPartial').checked=false;renderCsv();
  try{if(!/\.(dat|img|csv|tsv|hmk)$/i.test(file.name))throw Error('Choose a native CPS .dat, MINI-5 .img or supported CSV / TSV / HMK file.');const next=await readFile(file,{defaultPower:Number($('csvPower').value)});if(closed||request!==generation)return;
   if(next.kind==='csv'){csv=next;csvFile=file;imported=next.channels;chosen=new Set(next.rows.flatMap((r,i)=>r.channel?[i]:[]));renderCsv();}else imported=datChannels(next);}
  catch(e){if(closed||request!==generation)return;fileError='File not loaded. '+e.message;}
  finally{if(!closed&&request===generation){loading=false;update();}}
 };
 $('csvPartial').onchange=update;
 $('csvPrevious').onclick=()=>{csvPage--;renderCsv();};$('csvNext').onclick=()=>{csvPage++;renderCsv();};
 $('csvPower').onchange=async()=>{if(!csvFile)return;const file=csvFile,request=++generation,selection=new Set(chosen);loading=true;fileError='';update();try{const next=await readFile(file,{defaultPower:Number($('csvPower').value)});if(closed||request!==generation)return;csv=next;imported=next.channels;chosen=selection;renderCsv();}catch(e){if(!closed&&request===generation){fileError=e.message;}}finally{if(!closed&&request===generation){loading=false;update();}}};
 const close=()=>{closed=true;generation++;dialog.close();};
 $('appendCancel').onclick=close;$('appendClose').onclick=close;dialog.oncancel=()=>{closed=true;generation++;};
 $('appendApply').onclick=()=>{
  if(closed||loading||$('appendApply').disabled)return;
  try{const result=appendChannels(getData(),source(),preferences());onApply(result.data,result.plan);close();}
  catch(e){$('appendErrors').hidden=false;$('appendErrors').textContent=e.message;}
 };
 update();dialog.showModal();
}
