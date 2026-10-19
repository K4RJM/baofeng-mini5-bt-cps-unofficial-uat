import {visibleName,visibleTone} from './fields.mjs';
const binary=new Set(['scanAdd','sqMode','busyLock','fhss']);
const labels={rxFreq:'RX frequency',strRxCtsDcs:'RX tone',txFreq:'TX frequency',strTxCtsDcs:'TX tone',txPower:'Power',bandwide:'Bandwidth',scanAdd:'Include in scan',sqMode:'DTMF squelch mode',pttid:'PTT-ID',signalGroup:'DTMF group',busyLock:'Busy lock',fhss:'FHSS',name:'Channel name'};
export function mountChannelCell(cell,{index,key,getChannel,options,accept,notify,navigate,draft,onCancel}){
 let control=null,editing=false,finishing=false;
 cell.id=`cell-${index}-${key}`;cell.dataset.field=key;cell.tabIndex=0;cell.classList.add('editable-cell');
 const label=`Channel ${index+1} ${labels[key]}`;cell.setAttribute('aria-label',label);
 const choices=options[key];const display=value=>key==='name'?visibleName(value):key.includes('CtsDcs')?visibleTone(value):key==='pttid'?(['Off','Start','End','Both'][value]??`Code ${value}`):choices?.find(([v])=>v===value)?.[1]??String(value||'—');
 function save(value){try{const result=accept(key,value);if(result?.notice)notify(result.notice);return true;}catch(error){notify(error.message+' Previous value restored.');return false;}}
 function refresh(){
  if(editing)return;cell.replaceChildren();const ch=getChannel();cell.title=label;
  if(binary.has(key)&&ch.rxFreq){const box=document.createElement('input');box.type='checkbox';box.checked=ch[key]===1;box.indeterminate=![0,1].includes(ch[key]);box.setAttribute('aria-label',label);box.title=box.indeterminate?`Saved code ${ch[key]} — preserved until changed`:labels[key];box.onchange=()=>{save(box.checked?1:0);refresh();cell.querySelector('input')?.focus({preventScroll:true});};box.onkeydown=e=>{if(e.key==='Tab'&&navigate(e.shiftKey?-1:1))e.preventDefault();};cell.append(box);}
  else{const text=document.createElement('span');text.textContent=ch.rxFreq?display(ch[key]):'—';cell.append(text);}
 }
 function finish(cancel=false,focus=false){
  if(!editing||finishing)return;finishing=true;const input=control;editing=false;control=null;draft(null);
  if(!cancel)save(input.value);else onCancel?.();refresh();if(focus)cell.focus({preventScroll:true});finishing=false;
 }
 function activate(){
  if(editing)return;
  if(binary.has(key)&&getChannel().rxFreq){cell.querySelector('input')?.focus({preventScroll:true});return;}
  const ch=getChannel(),value=ch[key];editing=true;control=document.createElement(choices?'select':'input');
  control.setAttribute('aria-label',label);control.className='inline-control';
  if(choices){
   const add=(parent,code,text)=>{const option=document.createElement('option');option.value=String(code);option.textContent=text;parent.append(option);};
   if(!choices.some(([v])=>v===value))add(control,value,`Saved code ${value} (preserved)`);
   if(key.includes('CtsDcs')){for(const [group,test]of [['Off',v=>v==='OFF'],['CTCSS',v=>/^\d/.test(v)],['DCS Normal',v=>/^D.*N$/.test(v)],['DCS Inverted',v=>/^D.*I$/.test(v)]]){const items=choices.filter(([v])=>test(v));if(items.length){const optgroup=document.createElement('optgroup');optgroup.label=group;for(const [code,text]of items)add(optgroup,code,text);control.append(optgroup);}}}
   else for(const [code,text]of choices)add(control,code,key==='pttid'?['Off','Start','End','Both'][code]:text);
  }else{control.type='text';if(key==='rxFreq'||key==='txFreq')control.inputMode='decimal';}
  control.value=key==='name'?visibleName(value):String(value);const start=control.value;draft(()=>editing&&control?.value!==start);
  control.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();finish(true,true);}else if(e.key==='Enter'){e.preventDefault();e.stopPropagation();finish(false,true);}else if(e.key==='Tab'){e.preventDefault();e.stopPropagation();finish(false,true);navigate(e.shiftKey?-1:1);}};
  control.onblur=()=>finish();if(choices)control.onchange=()=>finish(false,true);
  cell.replaceChildren(control);control.focus({preventScroll:true});if(!choices)control.select();
 }
 cell.onclick=e=>{if(e.target.closest('input,select,option'))return;activate();};
 cell.onkeydown=e=>{if(e.target!==cell)return;if(e.key==='Enter'||e.key===' '){e.preventDefault();activate();}else if(e.key==='Tab'&&navigate(e.shiftKey?-1:1))e.preventDefault();};
 refresh();return {refresh,activate,cancel:()=>finish(true)};
}
