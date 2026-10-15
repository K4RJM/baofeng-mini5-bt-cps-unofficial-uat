import {PRESETS,presetChannels,datChannels,planAppend,blockAvailability,appendChannels} from './channel-import.mjs?v=20.6';
const $=id=>document.getElementById(id);
const option=(value,label,disabled=false)=>{const el=document.createElement('option');el.value=String(value);el.textContent=label;el.disabled=disabled;return el;};
let generation=0;
export function openChannelAppend({mode='preset',getData,readFile,onApply}){
 const dialog=$('appendDialog');generation++;let imported=null,loading=false,fileError='',closed=false;
 const isDat=mode==='dat';
 $('appendTitle').textContent=isDat?'Append channels from .dat':'Add channel preset';
 $('appendIntro').textContent=isDat?'Add a saved channel set to this workspace.':'Choose a channel set and an empty destination.';
 $('appendPresetField').hidden=isDat;$('appendDatField').hidden=!isDat;$('appendTransmitRow').hidden=isDat;$('appendRepeaterField').hidden=isDat;
 $('appendPreset').replaceChildren(...PRESETS.map(p=>option(p.key,p.label)));$('appendPreset').value='shared';
 $('appendPlacement').value='next';$('appendSkip').checked=true;$('appendPower').value='1';$('appendRepeaters').checked=false;$('appendDat').value='';
 const preferences=()=>({placement:$('appendPlacement').value,skipDuplicates:$('appendSkip').checked});
 const source=()=>isDat?(imported||[]):presetChannels($('appendPreset').value,{power:Number($('appendPower').value),repeaters:$('appendRepeaters').checked});
 const update=()=>{
  const preset=PRESETS.find(p=>p.key===$('appendPreset').value),list=source(),current=getData();
  $('appendRepeaterField').hidden=isDat||preset.key!=='shared';
  const unplaced=planAppend(current,list,{...preferences(),placement:'next'}),selected=$('appendPlacement').value||'next';
  $('appendPlacement').replaceChildren(option('next','Next available space'),...blockAvailability(current,unplaced.channels.length).map(b=>option(b.start,`${b.start}–${b.end}${b.occupied?' · occupied':!b.available?' · too small':' · empty'}`,!b.available)));
  $('appendPlacement').value=selected;
  const plan=planAppend(current,list,preferences());
  $('appendNoticeTitle').textContent=isDat?'Keep the current radio configuration':preset.key==='shared'&&$('appendRepeaters').checked?'USA · FRS / GMRS + repeater pairs':preset.label.split(' · ').at(-1)+' · '+preset.label.split(' · ')[0];
  $('appendNoticeText').textContent=isDat?'Only populated channels are copied. Current optional settings, VFOs, DTMF and the extra file record stay unchanged. Imported transmit frequencies and power settings are preserved.':preset.notice+(preset.key==='shared'&&$('appendRepeaters').checked?' Set repeater access tones.':'');
  $('appendPowerNote').hidden=isDat;$('appendPowerNote').textContent='Before transmitting, check local regulations, licensing and equipment approval. High / Low settings do not guarantee these power limits.';
  $('appendRules').hidden=isDat;$('appendRules').href=preset.rules;
  $('appendRange').textContent=loading?'Reading native CPS file…':isDat&&!imported?'Choose a .dat file to preview placement':plan.error?'No channels will be added':`${plan.channels.length} channel${plan.channels.length===1?'':'s'} → ${plan.start===plan.end?plan.start:plan.start+'–'+plan.end}`;
  $('appendCounts').textContent=loading||isDat&&!imported?'Existing channels stay in place.':`${plan.duplicates} matching channels skipped · existing channels preserved`;
  $('appendErrors').textContent=fileError||(!loading&&(!isDat||imported)?plan.error:'');$('appendErrors').hidden=!$('appendErrors').textContent;
  $('appendApply').disabled=loading||!!fileError||!!plan.error||isDat&&!imported;
 };
 for(const id of ['appendPreset','appendPlacement','appendSkip','appendPower','appendRepeaters'])$(id).onchange=update;
 $('appendDat').onchange=async()=>{
  const file=$('appendDat').files?.[0];if(!file)return;const request=++generation;imported=null;fileError='';loading=true;update();
  try{if(!/\.dat$/i.test(file.name))throw Error('Only native CPS .dat files are supported.');const next=await readFile(file);if(closed||request!==generation)return;imported=datChannels(next);}
  catch(e){if(closed||request!==generation)return;fileError='File not loaded. '+e.message;}
  finally{if(!closed&&request===generation){loading=false;update();}}
 };
 const close=()=>{closed=true;generation++;dialog.close();};
 $('appendCancel').onclick=close;$('appendClose').onclick=close;dialog.oncancel=()=>{closed=true;generation++;};
 $('appendApply').onclick=()=>{
  if(closed||loading||$('appendApply').disabled)return;
  try{const result=appendChannels(getData(),source(),preferences());onApply(result.data,result.plan);close();}
  catch(e){$('appendErrors').hidden=false;$('appendErrors').textContent=e.message;}
 };
 update();dialog.showModal();
}
