// UAT-only read-only channel preview. Never loads a capture into the MINI-5 editor.
import {uv32ReadSessionStatus,isUatPage} from './uat-protocols.mjs?v=20.46';
import {captureUv32Channels,uv32ReadDiagnostics} from './uat-uv32-read.mjs?v=20.48';
import {readUv32SerialImage} from './uat-uv32-serial.mjs?v=20.48';
import {openUv32Capture} from './uat-uv32-capture.mjs?v=20.49';
export function installUv32Reader({radio,run,connect,message,refresh}){
 const page=location.href==='about:srcdoc'?document.baseURI:location.href;
 const protocolModule=new URL('./uat-protocols.mjs',import.meta.url).href;
 if(!isUatPage(protocolModule,page))return null;
 const d=document,$=id=>d.getElementById(id),select=$('uatProtocol'),mode=$('uatSendMode');
 const readSend=$('uatUv32ReadSend'),readSendControl=$('uatUv32ReadSendControl');
 const sweep=$('uatUv32Sweep'),sweepControl=$('uatUv32SweepControl');
 const output=$('uatProtocolResult'),read=$('uatUv32Read'),cableRead=$('uatUv32CableRead'),view=$('uatUv32View'),save=$('uatUv32Save'),cancel=$('uatUv32Cancel');
 if(!readSend||!readSendControl||!sweep||!sweepControl||!select||!mode||!output||!read||!cableRead||!view||!save||!cancel)throw Error('UV-32 read controls missing');
 let capture=null,preview=null,controller=null,pageIndex=0,zone=0;
 const importButton=d.createElement('button');importButton.type='button';importButton.id='uatUv32Import';importButton.textContent='Open UV-32 capture';importButton.title='Open a completed UV-32 full-read JSON from this computer';
 const importInput=d.createElement('input');importInput.type='file';importInput.accept='.json,application/json';importInput.hidden=true;
 cableRead.after(importButton,importInput);
 const dialog=d.createElement('dialog');dialog.id='uatUv32Results';dialog.className='uat-uv32-view';
 dialog.setAttribute('aria-labelledby','uatUv32Title');
 dialog.innerHTML='<div class="uv32-head"><h2 id="uatUv32Title">UV-32 channels · Read only</h2><button type="button" id="uatUv32Close" aria-label="Close UV-32 preview">Close</button></div><p id="uatUv32Summary"></p><p class="muted">Decoded with the CHIRP UV-32 layout. Compare with the radio or factory CPS. Squelch values remain raw codes until confirmed.</p><p id="uatUv32Warnings" role="status"></p><label class="uv32-zone-label" for="uatUv32Zone">Zone</label> <select id="uatUv32Zone" aria-label="UV-32 zone"><option value="0">All zones</option></select><div class="uv32-scroll" tabindex="0" aria-label="UV-32 read-only channels"><table><thead><tr></tr></thead><tbody id="uatUv32Rows"></tbody></table></div><div class="uv32-foot"><button type="button" id="uatUv32Previous">Previous</button><output id="uatUv32Page"></output><button type="button" id="uatUv32Next">Next</button><button type="button" id="uatUv32SavePreview">Save this capture</button></div>';
 d.body.append(dialog);
 const channelPane=dialog.querySelector('.uv32-scroll'),footer=dialog.querySelector('.uv32-foot');
 const tabBar=d.createElement('div');tabBar.className='uv32-tabs';tabBar.setAttribute('role','tablist');
 channelPane.before(tabBar);
 const panes={Channels:channelPane};
 for(const name of ['Radio Function','VFO A / B','DTMF','Zones']){
  const section=d.createElement('section');section.className='uv32-readout';section.hidden=true;section.setAttribute('aria-label',name);channelPane.after(section);panes[name]=section;
 }
 const tabs={};
 for(const name of Object.keys(panes)){
  const button=d.createElement('button');button.type='button';button.textContent=name;button.setAttribute('role','tab');
  button.onclick=()=>{for(const [key,pane] of Object.entries(panes)){pane.hidden=key!==name;tabs[key].setAttribute('aria-selected',String(key===name));}footer.querySelectorAll('#uatUv32Previous,#uatUv32Next,#uatUv32Page').forEach(x=>x.hidden=name!=='Channels');dialog.querySelector('#uatUv32Title').textContent='UV-32 '+name+' · Read only';};
  tabBar.append(button);tabs[name]=button;
 }
 tabs.Channels.click();
 const pairs=(target,items)=>{target.replaceChildren();const grid=d.createElement('dl');grid.className='uv32-fields';for(const [label,value] of items){const dt=d.createElement('dt'),dd=d.createElement('dd');dt.textContent=label;dd.textContent=String(value);grid.append(dt,dd);}target.append(grid);};
 const renderReadout=()=>{
  const data=preview?.readout;
  for(const name of ['Radio Function','VFO A / B','DTMF','Zones'])tabs[name].disabled=!data;
  if(!data)return;
  pairs(panes['Radio Function'],data.functionFields);
  panes['VFO A / B'].replaceChildren();for(const [name,rows] of [['VFO A',data.vfoA],['VFO B',data.vfoB]]){const h=d.createElement('h3'),part=d.createElement('section');h.textContent=name;part.append(h);panes['VFO A / B'].append(part);const grid=d.createElement('div');part.append(grid);pairs(grid,rows);}
  const dtmfPane=panes.DTMF;dtmfPane.replaceChildren();const summary=d.createElement('div');dtmfPane.append(summary);pairs(summary,[['Local ID',data.dtmf.localId],['DTMF Code Time',data.dtmf.codeTime],['DTMF Idle Time',data.dtmf.idleTime],['Hang-Up Time',data.dtmf.hangUp]]);
  const table=d.createElement('table');table.innerHTML='<thead><tr><th>No.</th><th>Code</th><th>Name</th></tr></thead><tbody></tbody>';for(const item of data.dtmf.entries){const tr=d.createElement('tr');for(const key of ['number','code','name']){const td=d.createElement('td');td.textContent=String(item[key]);tr.append(td);}table.tBodies[0].append(tr);}dtmfPane.append(table);
  pairs(panes.Zones,data.zones.map(zone=>['Zone '+String(zone.number).padStart(2,'0'),zone.name||'(unnamed)']));
 };
 const columns=[['number','Ch'],['bank','Bank'],['rx','RX MHz'],['rxTone','RX tone'],['tx','TX MHz'],['txTone','TX tone'],['power','Power'],['bandwidth','BW'],['scan','Scan'],['squelch','SQ mode'],['pttId','PTT-ID'],['signal','Signal'],['busyLock','Busy lock'],['fhss','FHSS'],['name','Name']];
 for(const [,label] of columns){const th=d.createElement('th');th.scope='col';th.textContent=label;dialog.querySelector('thead tr').append(th);}
 const download=report=>{
  const build=d.querySelector('.build-badge')?.textContent;
  const url=URL.createObjectURL(new Blob([JSON.stringify({build,...report,selectedProtocol:select.value,requestedSendMode:mode.value,sessionAtDownload:uv32ReadSessionStatus(radio)},null,2)],{type:'application/json'}));
  const a=d.createElement('a');a.href=url;a.download=report.memoryReads===0?'ham-rx-uv32-read-diagnostics.json':report.kind==='uv32-cable-full-read-v1'?'ham-rx-uv32-full-read'+(report.completed?'':'-partial')+'.json':'ham-rx-uv32-channels'+(report.completed?'':'-partial')+'.json';d.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 };
 function render(){
  if(!preview)return;const p=preview.preview,rows=zone?p.channels.filter(x=>x.bank===zone):p.channels,total=Math.max(1,Math.ceil(rows.length/100));pageIndex=Math.max(0,Math.min(pageIndex,total-1));
  $('uatUv32Summary').textContent=rows.length+' populated / 1000 channels · '+preview.bytes.toLocaleString()+' captured bytes · '+(preview.readout?'full cable regions':'channel region')+' · MINI-5 workspace unchanged';
  $('uatUv32Warnings').textContent=p.warnings.length?p.warnings.length+' decoding note(s). '+p.warnings.slice(0,3).join(' '):'Physical comparison of the decoded channels is pending.';
  const body=$('uatUv32Rows');body.replaceChildren();
  for(const row of rows.slice(pageIndex*100,pageIndex*100+100)){const tr=d.createElement('tr');tr.dataset.uv32Channel=String(row.number);for(const [key] of columns){const td=d.createElement('td');td.textContent=String(row[key]);tr.append(td);}body.append(tr);}
  if(!rows.length){const tr=d.createElement('tr'),td=d.createElement('td');td.colSpan=columns.length;td.textContent='No populated channels found in this capture.';tr.append(td);body.append(tr);}
  $('uatUv32Page').textContent=(zone?'Zone '+String(zone).padStart(2,'0')+' · ':'')+'Page '+(pageIndex+1)+' / '+total;
  $('uatUv32Previous').disabled=pageIndex===0;$('uatUv32Next').disabled=pageIndex>=total-1;
 }
 function open(){
  const picker=$('uatUv32Zone');picker.replaceChildren();const all=d.createElement('option');all.value='0';all.textContent='All zones';picker.append(all);
  for(let n=1;n<=10;n++){const option=d.createElement('option');option.value=String(n);option.textContent='Zone '+String(n).padStart(2,'0')+' · '+(preview?.readout?.zones[n-1]?.name||'(unnamed)');picker.append(option);}
  picker.value=String(zone);render();renderReadout();tabs.Channels.click();if(!dialog.open)dialog.showModal();$('uatUv32Close').focus();}
 $('uatUv32Close').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>view.focus());
 $('uatUv32Previous').onclick=()=>{pageIndex--;render();};
 $('uatUv32Next').onclick=()=>{pageIndex++;render();};
 $('uatUv32Zone').onchange=event=>{zone=Number(event.target.value);pageIndex=0;render();};
 $('uatUv32SavePreview').onclick=()=>{if(preview)download(preview);};
 view.onclick=open;save.onclick=()=>download(capture??uv32ReadDiagnostics(radio,{readSendMode:readSend.value}));
 importButton.onclick=()=>importInput.click();
 importInput.onchange=async()=>{const file=importInput.files?.[0];importInput.value='';if(!file)return;
  try{if(file.size>250000)throw Error('UV-32 capture is larger than expected');const loaded=openUv32Capture(await file.text());capture=loaded;preview=loaded;zone=0;pageIndex=0;output.textContent='Opened full UV-32 cable capture: '+loaded.preview.channels.length+' populated channels';message(output.textContent);refresh();open();}
  catch(error){output.textContent=error.message;message(error.message);refresh();}
 };
 cancel.onclick=()=>{controller?.abort();cancel.disabled=true;message('Stopping UV-32 read after connection/identification or the current channel request…');};
 read.onclick=()=>run(async()=>{
  const uiSessionAtClick=uv32ReadSessionStatus(radio),readSendMode=readSend.value,diagnosticSweep=sweep.checked;
  controller=new AbortController();output.textContent='Reading UV-32 channels…';refresh();
  try{
   capture=await captureUv32Channels(radio,{connect,readSendMode,diagnosticSweep,signal:controller.signal,stage:text=>{output.textContent=text;message(text);},progress:(n,total)=>{const p=$('progress');p.max=total;p.value=n;},status:state=>{
    const address='0x'+state.address.toString(16).padStart(4,'0').toUpperCase();
    const text=`UV-32 ${state.phase}: block ${state.block}/${state.total} (${address}) · valid ${state.valid} · errors ${state.errors}`;
    output.textContent=text;message(text);
   }});
   capture.uiSessionAtClick=uiSessionAtClick;
   if(capture.completed){preview=capture;pageIndex=0;output.textContent='UV-32 channel capture complete: '+capture.preview.channels.length+' populated channels · read only';message(output.textContent);open();}
   else{output.textContent='Diagnostic sweep finished: '+capture.completedBlocks+' / 500 valid blocks, '+capture.anomalies.length+' anomaly(s). Save UV-32 capture; gaps are not channel data.';message(output.textContent);}
  }catch(error){
   if(error.uv32ReadReport){
    capture=error.uv32ReadReport;capture.uiSessionAtClick=uiSessionAtClick;
    if(capture.memoryReads>0){
     const block=capture.attemptedAddress/64+1;
     const address='0x'+capture.attemptedAddress.toString(16).padStart(4,'0').toUpperCase();
     const errors=capture.anomalies?.length??(/cancelled/i.test(error.message)?0:1);
     error.message+=` — block ${block}/500 (${address}) · valid ${capture.completedBlocks} · errors ${errors}`;
    }
   }
   output.textContent=error.message;throw error;
  }
  finally{controller=null;}
 });
 cableRead.onclick=()=>run(async()=>{
  if(!navigator.serial||!window.isSecureContext)throw Error('Cable reading requires Web Serial in a secure browser');
  if(radio.connected)throw Error('Disconnect Bluetooth before starting a cable read');
  controller=new AbortController();output.textContent='Choose the UV-32 programming cable…';refresh();
  try{
   const port=await navigator.serial.requestPort();
   output.textContent='Reading UV-32 through the cable…';message(output.textContent);
   capture=await readUv32SerialImage(port,{signal:controller.signal,progress:(n,total)=>{
    const p=$('progress');p.max=total;p.value=n;
    const text=`UV-32 cable: block ${n}/${total} · read only`;
    output.textContent=text;message(text);
   }});
   preview=capture;pageIndex=0;zone=0;
   output.textContent='UV-32 cable capture complete: '+capture.preview.channels.length+' populated channels · read only';
   message(output.textContent);open();
  }catch(error){if(error.uv32ReadReport)capture=error.uv32ReadReport;output.textContent=error.message;throw error;}
  finally{controller=null;refresh();}
 });
 select.addEventListener('change',()=>{if(select.value==='uv32')mode.value='with-response';refresh();});
 mode.addEventListener('change',refresh);readSend.addEventListener('change',refresh);
 return {sync(busy){
  const uv=select.value==='uv32';for(const el of [read,cableRead,importButton,view,save,readSendControl,sweepControl])el.hidden=!uv;readSend.disabled=busy;sweep.disabled=busy;importButton.disabled=busy;
  read.disabled=busy||!navigator.bluetooth||!window.isSecureContext;
  cableRead.disabled=busy||!!radio.connected||!navigator.serial||!window.isSecureContext;
  cableRead.title='Read UV-32 channels and settings through a USB serial programming cable. No radio memory writes.';
  read.title='Connect, identify and read UV-32 channels in one operation. An existing connection is reopened.';
  view.disabled=busy||!preview;save.disabled=busy;
  save.textContent=capture&&capture.memoryReads>0?'Save UV-32 capture':'Save read diagnostics';
  cancel.hidden=!controller;cancel.disabled=!controller||controller.signal.aborted;
  if(uv)for(const id of ['readRadio','writeRadio','verify'])$(id).disabled=true;
 }};
}
