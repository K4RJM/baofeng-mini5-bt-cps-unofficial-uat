// UAT-only read-only channel preview. Never loads a capture into the MINI-5 editor.
import {hasUv32ReadSession,isUatPage} from './uat-protocols.mjs?v=20.39';
import {readUv32Channels} from './uat-uv32-read.mjs?v=20.39';
export function installUv32Reader({radio,run,message,refresh}){
 const page=location.href==='about:srcdoc'?document.baseURI:location.href;
 const protocolModule=new URL('./uat-protocols.mjs',import.meta.url).href;
 if(!isUatPage(protocolModule,page))return null;
 const d=document,$=id=>d.getElementById(id),select=$('uatProtocol'),mode=$('uatSendMode');
 const read=$('uatUv32Read'),view=$('uatUv32View'),save=$('uatUv32Save'),cancel=$('uatUv32Cancel');
 if(!select||!mode||!read||!view||!save||!cancel)throw Error('UV-32 read controls missing');
 let capture=null,preview=null,controller=null,pageIndex=0;
 const dialog=d.createElement('dialog');dialog.id='uatUv32Results';dialog.className='uat-uv32-view';
 dialog.setAttribute('aria-labelledby','uatUv32Title');
 dialog.innerHTML='<div class="uv32-head"><h2 id="uatUv32Title">UV-32 channels · Read only</h2><button type="button" id="uatUv32Close" aria-label="Close UV-32 preview">Close</button></div><p id="uatUv32Summary"></p><p class="muted">Decoded with the CHIRP UV-32 layout. Compare with the radio or factory CPS. Squelch values remain raw codes until confirmed.</p><p id="uatUv32Warnings" role="status"></p><div class="uv32-scroll" tabindex="0" aria-label="UV-32 read-only channels"><table><thead><tr></tr></thead><tbody id="uatUv32Rows"></tbody></table></div><div class="uv32-foot"><button type="button" id="uatUv32Previous">Previous</button><output id="uatUv32Page"></output><button type="button" id="uatUv32Next">Next</button><button type="button" id="uatUv32SavePreview">Save this capture</button></div>';
 d.body.append(dialog);
 const columns=[['number','Ch'],['bank','Bank'],['rx','RX MHz'],['rxTone','RX tone'],['tx','TX MHz'],['txTone','TX tone'],['power','Power'],['bandwidth','BW'],['scan','Scan'],['squelch','SQ mode'],['pttId','PTT-ID'],['signal','Signal'],['busyLock','Busy lock'],['fhss','FHSS'],['name','Name']];
 for(const [,label] of columns){const th=d.createElement('th');th.scope='col';th.textContent=label;dialog.querySelector('thead tr').append(th);}
 const download=report=>{
  const build=d.querySelector('.build-badge')?.textContent;
  const url=URL.createObjectURL(new Blob([JSON.stringify({build,...report},null,2)],{type:'application/json'}));
  const a=d.createElement('a');a.href=url;a.download='ham-rx-uv32-channels'+(report.completed?'':'-partial')+'.json';d.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 };
 function render(){
  if(!preview)return;const p=preview.preview,rows=p.channels,total=Math.max(1,Math.ceil(rows.length/100));pageIndex=Math.max(0,Math.min(pageIndex,total-1));
  $('uatUv32Summary').textContent=rows.length+' populated / 1000 channels · '+preview.bytes.toLocaleString()+' captured bytes · MINI-5 workspace unchanged';
  $('uatUv32Warnings').textContent=p.warnings.length?p.warnings.length+' decoding note(s). '+p.warnings.slice(0,3).join(' '):'Physical comparison of the decoded channels is pending.';
  const body=$('uatUv32Rows');body.replaceChildren();
  for(const row of rows.slice(pageIndex*100,pageIndex*100+100)){const tr=d.createElement('tr');tr.dataset.uv32Channel=String(row.number);for(const [key] of columns){const td=d.createElement('td');td.textContent=String(row[key]);tr.append(td);}body.append(tr);}
  if(!rows.length){const tr=d.createElement('tr'),td=d.createElement('td');td.colSpan=columns.length;td.textContent='No populated channels found in this capture.';tr.append(td);body.append(tr);}
  $('uatUv32Page').textContent='Page '+(pageIndex+1)+' / '+total;
  $('uatUv32Previous').disabled=pageIndex===0;$('uatUv32Next').disabled=pageIndex>=total-1;
 }
 function open(){render();if(!dialog.open)dialog.showModal();$('uatUv32Close').focus();}
 $('uatUv32Close').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>view.focus());
 $('uatUv32Previous').onclick=()=>{pageIndex--;render();};
 $('uatUv32Next').onclick=()=>{pageIndex++;render();};
 $('uatUv32SavePreview').onclick=()=>{if(preview)download(preview);};
 view.onclick=open;save.onclick=()=>{if(capture)download(capture);};
 cancel.onclick=()=>{controller?.abort();cancel.disabled=true;message('Stopping UV-32 read after the current Bluetooth operation…');};
 read.onclick=()=>run(async()=>{
  controller=new AbortController();refresh();
  try{
   capture=await readUv32Channels(radio,{signal:controller.signal,progress:(n,total)=>{const p=$('progress');p.max=total;p.value=n;message('Reading UV-32 channels: '+n+' / '+total+' blocks');}});
   preview=capture;pageIndex=0;message('UV-32 channel capture complete: '+capture.preview.channels.length+' populated channels · read only');open();
  }catch(error){if(error.uv32ReadReport)capture=error.uv32ReadReport;throw error;}
  finally{controller=null;}
 });
 select.addEventListener('change',()=>{if(select.value==='uv32')mode.value='with-response';refresh();});
 mode.addEventListener('change',refresh);
 return {sync(busy){
  const uv=select.value==='uv32';for(const el of [read,view,save])el.hidden=!uv;
  read.disabled=busy||mode.value!=='with-response'||!hasUv32ReadSession(radio);
  read.title='Check radio ID with UV-32 / With response first';
  view.disabled=busy||!preview;save.disabled=busy||!capture;
  cancel.hidden=!controller;cancel.disabled=!controller||controller.signal.aborted;
  if(uv)for(const id of ['readRadio','writeRadio','verify'])$(id).disabled=true;
 }};
}
