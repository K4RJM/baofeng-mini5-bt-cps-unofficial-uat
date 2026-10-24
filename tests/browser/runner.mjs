import {rdtFixture} from '../rdt-fixtures.mjs?v=20.33';
import {readImage} from '../../image-files.mjs?v=20.31';
import {csvFixture,csvHeads} from '../csv-fixtures.mjs?v=20.31';
const root=new URL('../../',import.meta.url),results=document.getElementById('results'),status=document.getElementById('status');let frame;const builds=new Set();
const assert=(value,message)=>{if(!value)throw Error(message);};
const until=async(fn,label)=>{const end=Date.now()+15000;while(!fn()){if(Date.now()>end)throw Error('Timed out: '+label);await new Promise(r=>setTimeout(r,20));}};
function record(name,pass,error){const li=document.createElement('li');li.className=pass?'pass':'fail';li.textContent=(pass?'PASS: ':'FAIL: ')+name+(error?' — '+error:'');results.append(li);}
async function fresh(mode='normal'){
 frame?.contentWindow.f13?.fake.close();frame?.remove();
 let html=await fetch(new URL('index.html',root),{cache:'no-store'}).then(r=>r.text());
 const match=html.match(/<script type="module" src="(app\.mjs[^\"]*)"><\/script>/);assert(match,'Actual application module exists');
 const script=`<script>window.f13Mode=${JSON.stringify(mode)};window.f13AppURL=${JSON.stringify(new URL(match[1],root).href)};<\/script><script type="module" src="${new URL('tests/browser/frame.mjs?v=20.33',root).href}"><\/script>`;
 html=html.replace('<head>','<head><base href="'+root.href+'">').replace(match[0],script);
 frame=document.createElement('iframe');frame.title='Isolated CPS test application';frame.setAttribute('allow',"bluetooth 'none'");frame.srcdoc=html;document.getElementById('workspace').append(frame);
 await until(()=>frame.contentWindow.f13?.ready||frame.contentWindow.f13?.failed,'application bootstrap');
 const badge=frame.contentDocument.querySelector('.build-badge')?.textContent;builds.add(badge||'Version unavailable');document.getElementById('build').textContent='Tested: '+[...builds].join(' / ');return {w:frame.contentWindow,d:frame.contentDocument,state:frame.contentWindow.f13};
}
async function load(h){const transfer=new h.w.DataTransfer();transfer.items.add(new h.w.File([h.state.bytes],'browser-test.dat'));h.d.getElementById('file').files=transfer.files;h.d.getElementById('file').dispatchEvent(new h.w.Event('change',{bubbles:true}));await until(()=>h.d.getElementById('file').value===''&&!h.d.getElementById('open').disabled&&h.d.getElementById('sourceTag').textContent==='CPS file loaded','native DAT load finished');}
async function busyCheck(h){h.state.fake.faults.holdRead=true;h.d.getElementById('readRadio').click();await until(()=>h.state.fake.reads===1,'held read');const row=h.d.querySelector('[data-channel-index="0"]');h.d.getElementById('help').focus();row.querySelector('[data-field]').focus();assert(h.d.getElementById('content').inert&&h.d.getElementById('tabs').inert,'Busy workspace must be inert');assert(!row.contains(h.d.activeElement),'Inert row must refuse focus');assert(h.d.getElementById('appendChannels').disabled&&h.d.getElementById('open').disabled&&h.d.getElementById('save').disabled&&h.d.getElementById('saveImg').disabled,'File controls must be disabled during the read');}
document.getElementById('start').onclick=async()=>{
 const start=document.getElementById('start');start.disabled=true;results.replaceChildren();status.textContent='Running';let failed=0;
 const check=async(name,fn)=>{try{await fn();record(name,true);}catch(e){failed++;record(name,false,e.message);}};
 try{
  let h=await fresh();assert(h.state.ready&&!h.state.errors.length,'Unmodified application must load');const id=n=>h.d.getElementById(n);
  await check('High contrast text follows theme, persists, and fits a phone',async()=>{
   const button=id('highContrast'),theme=id('theme');
   if(button.getAttribute('aria-pressed')==='true')button.click();
   button.focus();button.click();assert(h.d.activeElement===button,'Toggle retains keyboard focus');
   for(const mode of ['light','dark','system']){
    theme.value=mode;theme.dispatchEvent(new h.w.Event('change'));
    const dark=mode==='dark'||(mode==='system'&&h.w.matchMedia('(prefers-color-scheme:dark)').matches),expected=dark?'rgb(255, 255, 255)':'rgb(0, 0, 0)';
    for(const selector of ['h1','.risk-banner','.session-bar','#connect','#tabs button','.table-bottom','#highContrast']){
     assert(h.w.getComputedStyle(h.d.querySelector(selector)).color===expected,selector+' uses pure text in '+mode);
    }
    assert(h.w.getComputedStyle(id('connect')).backgroundColor!==expected,'Button surface contrasts with text');
   }
   id('help').click();
   const hotspot=h.d.querySelector('.radio-key:not(.radio-side-key)');
   assert(h.w.getComputedStyle(hotspot).color==='rgba(0, 0, 0, 0)'&&h.w.getComputedStyle(hotspot).backgroundColor==='rgba(0, 0, 0, 0)','Photo hotspots remain transparent');
   h.d.querySelector('#tabs button').click();
   frame.style.width='390px';await new Promise(r=>h.w.requestAnimationFrame(r));
   assert(h.d.documentElement.scrollWidth<=h.d.documentElement.clientWidth+1,'Contrast control fits phone');frame.style.width='100%';
   h=await fresh();assert(id('highContrast').getAttribute('aria-pressed')==='true','Preference survives reload');
   id('highContrast').click();assert(id('highContrast').getAttribute('aria-pressed')==='false','Toggle restores ordinary appearance');
   id('theme').value='system';id('theme').dispatchEvent(new h.w.Event('change'));
   assert(h.state.fake.events.length===0,'Appearance never connects to a radio');
  });
  await check('CHIRP and Studio imports, CHIRP download and failed-import retention',async()=>{
   assert(['.dat','.img'].every(ext=>id('file').accept.split(',').includes(ext))&&id('saveImg'),'Native image controls remain available alongside channel-list formats');
   const open=async(bytes,name)=>{const t=new h.w.DataTransfer();t.items.add(new h.w.File([bytes],name));id('file').files=t.files;id('file').dispatchEvent(new h.w.Event('change',{bubbles:true}));await until(()=>!id('open').disabled&&id('file').value==='','image load');};
   for(const [bytes,label] of [[h.state.studioImage,'Mini 5 Studio'],[h.state.chirpImage,'CHIRP']]){
    await open(bytes,'browser.img');assert(id('sourceTag').textContent===label+' image loaded','Image recognized: '+label);
    assert(id('cell-998-rxFreq').textContent==='146.52000','Channel 999 imported');
    id('saveImg').click();assert(h.state.downloads.length,'Image download requested');
    const saved=readImage(new Uint8Array(await h.state.downloads.at(-1).arrayBuffer()));assert(saved.data.channelList[0][998].name==='BROWSER 999','Export retains last channel');
   }
   await open(new Uint8Array(4),'broken.img');assert(id('sourceTag').textContent==='CHIRP image loaded','Failed import retains prior workspace');
   assert(h.state.fake.events.length===0,'File operations never connect');
  });
  await check('Native DAT import uses actual File / input events and never connects',async()=>{await load(h);assert(h.state.fake.sent.length===0&&h.state.fake.events.length===0,'File import must not contact radio');assert(h.d.querySelector('[data-channel-index="998"]'),'Channel 999 is displayed');});
  await check('DAT and both IMG formats append with preview, duplicate skipping, protected blocks and Undo',async()=>{
   const append=()=>id('appendChannels').click();
   const choose=async(bytes,name)=>{const t=new h.w.DataTransfer();t.items.add(new h.w.File([bytes],name));id('appendDat').files=t.files;id('appendDat').dispatchEvent(new h.w.Event('change',{bubbles:true}));await until(()=>id('appendRange').textContent!=='Reading channel file…','append preview');};
   assert(id('appendDat').accept==='.dat,.img,.csv,.tsv,.hmk,.rdt','Append picker accepts both extensions');
   for(const [bytes,name] of [[h.state.chirpImage,'test.img'],[h.state.studioImage,'legacy.IMG'],[h.state.bytes,'test.dat']]){
    append();assert(id('appendDialog').matches(':modal'),'Append opens existing dialog');await choose(bytes,name);
    assert(id('appendApply').disabled&&id('appendCounts').textContent.includes('3 matching channels skipped'),'Duplicates skipped by default');
    id('appendSkip').click();id('appendPlacement').value='101';id('appendPlacement').dispatchEvent(new h.w.Event('change'));
    assert(id('appendRange').textContent==='3 channels → 101–103','Preview has three destination slots');
    assert(id('appendPlacement').querySelector('option[value="901"]').disabled,'Occupied final block unavailable');
    assert(!id('cell-100-rxFreq'),'Preview does not change workspace');
    id('appendApply').click();assert(!id('appendDialog').open&&id('cell-100-rxFreq').textContent==='146.52000','Append adds channels');
    assert(id('cell-998-rxFreq').textContent==='146.52000'&&id('cell-0-rxFreq').textContent==='146.52000','Original first and last channels preserved');
    id('undoChannels').click();assert(!id('cell-100-rxFreq'),'Undo removes entire append');
   }
   append();await choose(new Uint8Array(4),'broken.img');assert(id('appendApply').disabled&&!id('appendErrors').hidden,'Invalid image cannot append');id('appendCancel').click();
   assert(h.state.fake.events.length===0,'Append never connects to a radio');
  });
  await check('All ten channel-list layouts preview, append and undo through actual file controls',async()=>{
   const button=()=>id('appendChannels');
   const choose=async(text,name)=>{const t=new h.w.DataTransfer();t.items.add(new h.w.File([text],name));id('appendDat').files=t.files;id('appendDat').dispatchEvent(new h.w.Event('change',{bubbles:true}));await until(()=>id('appendRange').textContent!=='Reading channel file…','channel list preview');};
   for(const format of Object.keys(csvHeads)){
    button().click();await choose(csvFixture(format),'synthetic.'+(format==='hmk'?'hmk':format==='kenwood'?'tsv':'csv'));
    assert(!id('csvReview').hidden&&id('csvSummary').textContent.includes('1 valid · 0 excluded'),format+' detected');
    const cells=id('csvTableBody').querySelector('tr').cells;assert(cells[3].textContent==='145.50000'&&cells[5].textContent==='144.90000',format+' RX/TX exact');
    assert(cells[4].textContent==='110.9'&&cells[6].textContent==='110.9',format+' tones exact');
    id('appendPlacement').value='101';id('appendPlacement').dispatchEvent(new h.w.Event('change'));id('appendApply').click();assert(id('cell-100-rxFreq').textContent==='145.50000',format+' applied');
    id('undoChannels').click();assert(!id('cell-100-rxFreq'),format+' Undo');
   }
   button().click();await choose(csvFixture('chirp',{Name:'<b>SAFE</b>'},[{Location:'2',Mode:'AM'}]),'review.csv');
   assert(!id('csvTableBody').querySelector('b'),'File text never becomes HTML');assert(id('appendApply').disabled&&!id('csvPartialRow').hidden,'Excluded rows require acknowledgement');
   id('csvPartial').click();assert(!id('appendApply').disabled,'Acknowledgement enables valid rows');
   const check=id('csvTableBody').querySelector('input');check.click();assert(id('appendApply').disabled,'Deselect all disables import');check.click();
   id('csvPower').value='0';id('csvPower').dispatchEvent(new h.w.Event('change'));await until(()=>!id('appendApply').disabled,'power change');assert(id('csvTableBody').querySelector('tr').cells[7].textContent==='High','Fallback power preview updates');
   for(const theme of ['light','dark']){id('theme').value=theme;id('theme').dispatchEvent(new h.w.Event('change'));assert(h.w.getComputedStyle(id('csvReview')).display!=='none','Review visible in '+theme);}
   frame.style.width='390px';await new Promise(r=>h.w.requestAnimationFrame(r));assert(h.d.documentElement.scrollWidth<=h.d.documentElement.clientWidth+1,'CSV dialog fits phone');
   assert(id('appendDialog').getBoundingClientRect().width<=390,'Phone dialog width');frame.style.width='100%';id('appendCancel').click();
   id('theme').value='system';id('theme').dispatchEvent(new h.w.Event('change'));assert(h.state.fake.events.length===0,'Channel lists never connect to radio');
  });
  await check('CSV row paging and UTF-16 Kenwood imports retain selection and reject broken input',async()=>{
   const open=()=>id('appendChannels').click();
   const choose=async(bytes,name)=>{const t=new h.w.DataTransfer();t.items.add(new h.w.File([bytes],name));id('appendDat').files=t.files;id('appendDat').dispatchEvent(new h.w.Event('change',{bubbles:true}));await until(()=>id('appendRange').textContent!=='Reading channel file…','paged preview');};
   open();await choose(csvFixture('chirp',{},Array.from({length:26},(_,i)=>({Location:String(i+2)}))),'many.csv');
   assert(id('csvTableBody').rows.length===25,'Preview bounded to 25 rows');id('csvNext').click();assert(id('csvTableBody').rows.length===2&&id('csvPage').textContent==='Rows 26–27 of 27','Next CSV page');
   id('csvTableBody').querySelector('input').click();assert(id('appendCounts').textContent.startsWith('26 selected'),'Selection includes other pages');id('csvPrevious').click();assert(id('csvTableBody').rows.length===25,'Previous CSV page');
   const text=csvFixture('kenwood'),bytes=new Uint8Array(2+text.length*2);bytes.set([255,254]);for(let i=0;i<text.length;i++){bytes[2+i*2]=text.charCodeAt(i)&255;bytes[3+i*2]=text.charCodeAt(i)>>8;}
   await choose(bytes,'kenwood.tsv');assert(id('csvSummary').textContent.includes('Kenwood DR repeater TSV · 1 valid'),'UTF-16 TSV');
   await choose('Channel Name;RX MHz;TX MHz;Mode;TX Tone;RX Tone\nCOMMON;145.5;144.9;FM;110.9;110.9','common.csv');assert(id('csvSummary').textContent.includes('Common channel columns · 1 valid'),'Generic columns supported');
   await choose(csvFixture('anytone',{Reverse:'On'}),'reverse.csv');assert(id('csvSummary').textContent.includes('0 valid · 1 excluded')&&id('appendApply').disabled&&id('csvTableBody').textContent.includes('Active AnyTone reverse'),'Active reverse cannot be silently lost');
   await choose('not,a,channel,file\n1,2,3,4','broken.csv');assert(id('appendApply').disabled&&!id('appendErrors').hidden,'Broken replacement blocks import');id('appendCancel').click();assert(!id('cell-100-rxFreq'),'No workspace mutation');
  });
  await check('Separate sidebar Import/Append controls replace CSV, TSV and HMK with consent and Undo',async()=>{
   assert(h.d.querySelector('.side-section').contains(id('open'))&&h.d.querySelector('.side-section').contains(id('appendChannels')),'Both controls in left toolbar');
   assert(id('open').textContent.includes('Import file')&&id('appendChannels').textContent.includes('Append channels'),'Distinct labels');
   assert(id('file').accept==='.dat,.img,.csv,.tsv,.hmk,.rdt','Import supports all formats');
   assert(![...h.d.querySelectorAll('#content button')].some(b=>b.textContent.includes('Append')||b.textContent==='Import / append'),'No duplicate Channels toolbar control');
   const exportBytes=async()=>{id('save').click();return new Uint8Array(await h.state.downloads.at(-1).arrayBuffer());};
   const choose=async(format,ext)=>{const transfer=new h.w.DataTransfer();transfer.items.add(new h.w.File([csvFixture(format)],'import.'+ext));id('file').files=transfer.files;id('file').dispatchEvent(new h.w.Event('change',{bubbles:true}));await until(()=>id('appendDialog').open&&!id('csvReview').hidden&&id('appendRange').textContent!=='Reading channel file…','replacement preview');};
   for(const [format,ext] of [['chirp','csv'],['kenwood','tsv'],['hmk','hmk']]){
    const before=await exportBytes();[...h.d.querySelectorAll('#tabs button')].find(b=>b.textContent.includes('Optional settings')).click();
    await choose(format,ext);assert(id('appendTitle').textContent==='Import channels'&&id('appendApply').disabled,'Replacement needs consent');
    assert(id('appendPlacementField').hidden&&id('appendSkipRow').hidden,'Append options hidden during replacement');
    id('replaceConfirm').click();id('appendApply').click();assert(!id('appendDialog').open&&id('pageTitle').textContent==='Channels','Import returns to Channels');
    assert(id('cell-0-rxFreq').textContent==='145.50000'&&!id('cell-2-rxFreq')&&!id('cell-998-rxFreq'),'Only imported channels remain');
    id('undoChannels').click();const after=await exportBytes();assert(before.length===after.length&&before.every((v,i)=>v===after[i]),'Undo restores exact configuration');
   }
   [...h.d.querySelectorAll('#tabs button')].find(b=>b.textContent.includes('VFO A / B')).click();id('appendChannels').click();assert(id('appendDialog').open&&id('appendTitle').textContent==='Append channels','Append available on VFO screen');id('appendCancel').click();
   [...h.d.querySelectorAll('#tabs button')].find(b=>b.textContent.includes('Channels')).click();assert(h.state.fake.events.length===0,'File operations never connect');
  });
  await check('RDT Import and Append filter digital channels, preserve settings and Undo in both formats',async()=>{
   const exportBytes=async()=>{id('save').click();return new Uint8Array(await h.state.downloads.at(-1).arrayBuffer());};
   const choose=async(bytes,name,input)=>{const t=new h.w.DataTransfer();t.items.add(new h.w.File([bytes],name));id(input).files=t.files;id(input).dispatchEvent(new h.w.Event('change',{bubbles:true}));await until(()=>!id('csvReview').hidden&&id('appendRange').textContent!=='Reading channel file…','RDT preview');};
   for(const model of ['D168UV','D890UV']){
    const before=await exportBytes();await choose(rdtFixture({model,records:[{}, {mode:1}]}),'sample.rdt','file');
    assert(id('appendTitle').textContent==='Import channels'&&id('appendApply').disabled,'Import requires replacement consent');
    assert(id('csvSummary').textContent.includes('1 digital filtered')&&id('csvSummary').textContent.includes('2 VFO records omitted'),'Source exclusions explicit');
    assert(id('csvTableBody').rows.length===1&&id('csvPartialRow').hidden,'Only analog row selectable, no digital acknowledgement');
    const c=id('csvTableBody').rows[0].cells;assert(c[3].textContent==='145.50000'&&c[5].textContent==='144.90000'&&c[4].textContent==='110.9','RDT expected fields');
    id('replaceConfirm').click();id('appendApply').click();assert(id('cell-0-name').textContent==='RDT TEST','Imported RDT');id('undoChannels').click();const after=await exportBytes();assert(before.every((v,i)=>v===after[i])&&before.length===after.length,'Exact Undo');
   }
   id('appendChannels').click();await choose(rdtFixture(),'append.rdt','appendDat');id('appendPlacement').value='101';id('appendPlacement').dispatchEvent(new h.w.Event('change'));id('appendApply').click();assert(id('cell-100-rxFreq').textContent==='145.50000','RDT append destination');id('undoChannels').click();assert(!id('cell-100-rxFreq'),'Append Undo');
   id('appendChannels').click();await choose(csvFixture('chirp',{},[{Location:'2',Mode:'DV'}]),'mixed.csv','appendDat');assert(id('csvTableBody').rows.length===1&&id('csvPartialRow').hidden&&!id('appendApply').disabled,'CSV digital filter');id('appendCancel').click();
   await choose(rdtFixture({records:[{mode:1}]}),'digital.rdt','file');id('replaceConfirm').click();assert(id('appendApply').disabled&&id('csvTableBody').rows.length===0,'All-digital cannot clear channels');assert(id('csvPage').textContent==='No analog channels to import','Empty preview clear');id('appendCancel').click();
   assert(h.state.fake.events.length===0,'RDT processing never contacts a radio');
  });
  await check('Factory column order, compact rows, striping and responsive overflow',async()=>{
   frame.style.width='1600px';await new Promise(resolve=>h.w.requestAnimationFrame(resolve));
   const headers=[...h.d.querySelectorAll('#channelTableWrap th')].map(x=>x.textContent);
   assert(JSON.stringify(headers)===JSON.stringify(['','Ch','RX MHz','RX tone','TX MHz','TX tone','Power','BW','Scan','DTMF','PTT-ID','Signal','Busy lock','FHSS','Name','Actions']),'Factory CPS column order');
   const rows=[...h.d.querySelectorAll('.channel-row')];assert(rows[0].cells.length===16,'All factory fields displayed');
   assert(rows[0].getBoundingClientRect().height<=32,'Desktop rows must be compact');
   const ins=[...rows[0].querySelectorAll('button')].find(b=>b.textContent==='Ins Ch');assert(ins?.title==='Insert new channel above','Insertion label and tooltip');
   for(const theme of ['light','dark']){h.d.documentElement.dataset.theme=theme;assert(h.w.getComputedStyle(rows[0]).backgroundColor!==h.w.getComputedStyle(rows[1]).backgroundColor,'Alternating shading in '+theme);}
   const wrap=h.d.getElementById('channelTableWrap');assert(wrap.scrollWidth<=wrap.clientWidth+1,'All columns fit a wide desktop');
   frame.style.width='390px';await new Promise(resolve=>h.w.requestAnimationFrame(resolve));
   assert(wrap.scrollWidth>wrap.clientWidth,'Phone table scrolls horizontally');assert(rows[0].getBoundingClientRect().height>=39.9,'Phone rows retain touch spacing: '+rows[0].getBoundingClientRect().height);
   assert(h.d.documentElement.scrollWidth<=h.d.documentElement.clientWidth+1,'Phone has no whole-page horizontal overflow');
   frame.style.width='100%';delete h.d.documentElement.dataset.theme;
  });
  await check('Every inline column keeps its geometry, compact height and focus',async()=>{
   frame.style.width='1600px';await new Promise(r=>h.w.requestAnimationFrame(r));
   for(const field of ['rxFreq','strRxCtsDcs','txFreq','strTxCtsDcs','txPower','bandwide','scanAdd','sqMode','pttid','signalGroup','busyLock','fhss','name']){
    const cell=id('cell-0-'+field),row=cell.parentElement,wrap=id('channelTableWrap');
    const sizes=()=>[...row.cells].map(x=>x.getBoundingClientRect().width);
    const before=sizes(),height=row.getBoundingClientRect().height;
    cell.click();const control=cell.querySelector('input,select');assert(control,'Editor exists '+field);
    assert(sizes().every((x,i)=>Math.abs(x-before[i])<.1),'Column stable while editing '+field);
    assert(Math.abs(row.getBoundingClientRect().height-height)<.1,'Row height stable '+field);
    assert(control.getBoundingClientRect().width<=cell.getBoundingClientRect().width,'Editor fits '+field);
    if(control.type!=='checkbox'){assert(h.d.activeElement===control,'Editor focused '+field);control.dispatchEvent(new h.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));}
    assert(sizes().every((x,i)=>Math.abs(x-before[i])<.1),'Column stable after edit '+field);
   }
   frame.style.width='100%';
  });
  await check('Checkbox clicks bubble without opening editor; cells edit inline and Edit opens the popup',async()=>{const row=h.d.querySelector('[data-channel-index="0"]');row.querySelector('input').click();assert(!id('editor').open,'Checkbox must not edit');row.querySelector('[data-field=rxFreq]').click();assert(!id('editor').open&&row.querySelector('[data-field=rxFreq] input'),'Cell edits inline');row.querySelector('[data-field=rxFreq] input').dispatchEvent(new h.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));[...row.querySelectorAll('button')].find(x=>x.textContent==='Edit').click();assert(id('editor').matches(':modal'),'Edit opens real modal dialog');id('cancel').click();});
  await check('Invalid frequencies block navigation; valid short entries are padded',async()=>{[...h.d.querySelectorAll('[data-channel-index="0"] button')].find(x=>x.textContent==='Edit').click();const input=h.d.querySelector('#fields [data-key="rxFreq"]');input.value='146.52001';input.dispatchEvent(new h.w.Event('input',{bubbles:true}));id('editNext').click();assert(id('editorTitle').textContent==='Edit channel 1'&&id('editErrors').textContent,'Invalid edit must stay in channel 1');input.value='146.52';id('editNext').click();assert(id('editorTitle').textContent==='Edit channel 3','Valid edit advances to next occupied channel');id('cancel').click();});

  await check('Inline all controls, grouped tones, keyboard navigation, cancel, Undo and popup consistency',async()=>{
   await load(h);const cell=k=>id('cell-0-'+k),key=(c,k,shiftKey=false)=>c.dispatchEvent(new h.w.KeyboardEvent('keydown',{key:k,shiftKey,bubbles:true,cancelable:true}));
   const edit=(k,v)=>{cell(k).click();const c=cell(k).querySelector('input,select');c.value=v;c.tagName==='SELECT'?c.dispatchEvent(new h.w.Event('change',{bubbles:true})):key(c,'Enter');};
   for(const [k,v]of Object.entries({rxFreq:'146.55',txFreq:'146.55',strRxCtsDcs:'67.0',strTxCtsDcs:'D023I',txPower:'1',bandwide:'1',pttid:'3',signalGroup:'19',name:'INLINE'}))edit(k,v);
   for(const k of ['scanAdd','sqMode','busyLock','fhss']){cell(k).querySelector('input').click();assert(cell(k).querySelector('input').checked,'Binary checked '+k);}
   cell('strRxCtsDcs').click();assert(cell('strRxCtsDcs').querySelectorAll('optgroup').length===4,'Four tone groups');key(cell('strRxCtsDcs').querySelector('select'),'Escape');
   cell('name').click();let c=cell('name').querySelector('input');c.value='CANCEL';key(c,'Escape');assert(cell('name').textContent==='INLINE','Escape restores');
   cell('rxFreq').click();c=cell('rxFreq').querySelector('input');c.value='146.52';key(c,'Tab');assert(h.d.activeElement===cell('strRxCtsDcs').querySelector('select'),'Tab advances');key(h.d.activeElement,'Tab',true);assert(h.d.activeElement===cell('rxFreq').querySelector('input'),'Shift Tab returns');key(h.d.activeElement,'Enter');
   [...h.d.querySelectorAll('[data-channel-index="0"] button')].find(x=>x.textContent==='Edit').click();assert(h.d.querySelector('#fields [data-key=name]').value==='INLINE','Popup sees inline name');h.d.querySelector('#fields [data-key=name]').value='POPUP';id('apply').click();assert(cell('name').textContent==='POPUP','Inline sees popup');id('undoChannels').click();assert(cell('name').textContent==='INLINE','Undo restores popup edit');assert(h.state.fake.sent.length===0,'No radio commands');
  });
  await check('Inline upper boundaries, invalid restoration, channel 999 and Add/Insert',async()=>{
   await load(h);const key=(c,k)=>c.dispatchEvent(new h.w.KeyboardEvent('keydown',{key:k,bubbles:true,cancelable:true}));const edit=(i,k,v)=>{const cell=id(`cell-${i}-${k}`);cell.click();const c=cell.querySelector('input,select');c.value=v;key(c,'Enter');};
   for(const [input,expected]of [['174','173.99875'],['520','519.99875'],['136','136.00000'],['400','400.00000'],['146.52','146.52000'],['800','146.52000'],['399.99875','146.52000'],['bad','146.52000'],['146.52001','146.52000']]){edit(0,'rxFreq',input);assert(id('cell-0-rxFreq').textContent===expected,'Boundary '+input);}
   edit(998,'name','LAST');assert(id('cell-998-name').textContent==='LAST','999 inline edit');id('undoChannels').click();assert(id('cell-998-name').textContent==='BROWSER 999','999 Undo');
   [...h.d.querySelectorAll('button')].find(x=>x.textContent==='+ Add channel').click();let c=id('cell-1-rxFreq').querySelector('input');assert(h.d.activeElement===c,'Add focuses first gap');c.value='147';key(c,'Enter');assert(id('cell-1-rxFreq').textContent==='147.00000','Add saves');id('undoChannels').click();assert(!id('cell-1-rxFreq'),'Add Undo');
   [...h.d.querySelectorAll('[data-channel-index="0"] button')].find(x=>x.textContent==='Ins Ch').click();c=id('cell-0-rxFreq').querySelector('input');c.value='145.5';key(c,'Enter');assert(id('cell-0-rxFreq').textContent==='145.50000'&&id('cell-1-name').textContent==='BROWSER 1','Insert preserves displaced row');id('undoChannels').click();assert(id('cell-0-name').textContent==='BROWSER 1','Insert Undo');
  });
  await check('Bulk preview, occupied destination, range rejection and one-step Undo',async()=>{
   await load(h);id('channelSelect-0').click();id('channelSelect-2').click();[...h.d.querySelectorAll('button')].find(x=>x.textContent==='Move selected (2)').click();assert(id('bulkMoveDialog').matches(':modal'),'Bulk modal');id('bulkMoveTo').value='999';id('bulkMoveTo').dispatchEvent(new h.w.Event('input'));assert(id('bulkMoveApply').disabled,'Cannot extend beyond 999');id('bulkMoveTo').value='998';id('bulkMoveTo').dispatchEvent(new h.w.Event('input'));assert(id('bulkMoveSummary').textContent.includes('998–999')&&id('bulkMovePreview').children.length===3,'Preview selected and displaced');id('bulkMoveApply').click();assert(id('cell-997-name').textContent==='BROWSER 1'&&id('cell-998-name').textContent==='BROWSER 3','Contiguous destination');id('undoChannels').click();assert(id('cell-0-name').textContent==='BROWSER 1'&&id('cell-2-name').textContent==='BROWSER 3'&&id('cell-998-name').textContent==='BROWSER 999','Whole move Undo');
  });
  await check('Desktop single table scroll, pinned pagination and responsive height',async()=>{
   frame.style.width='1600px';frame.style.height='900px';await new Promise(r=>h.w.requestAnimationFrame(r));const empty=[...h.d.querySelectorAll('label')].find(x=>x.textContent.includes('Show empty slots')).querySelector('input');empty.click();const wrap=id('channelTableWrap');assert(wrap.scrollHeight>wrap.clientHeight,'Table scrolls');assert(h.d.documentElement.scrollHeight<=h.w.innerHeight+1,'Desktop page fits');wrap.scrollTop=350;const y=h.d.querySelector('.table-bottom').getBoundingClientRect().top;assert(y<h.w.innerHeight&&h.d.querySelector('.table-bottom').getBoundingClientRect().bottom<=h.w.innerHeight,'Bottom pagination visible');[...h.d.querySelectorAll('button')].find(x=>x.textContent==='Next →').click();assert(id('channelTableWrap').scrollTop===0&&id('cell-50-rxFreq'),'Page advances and starts at top');[...h.d.querySelectorAll('button')].find(x=>x.textContent==='← Previous').click();assert([...h.d.querySelectorAll('button')].find(x=>x.textContent==='← Previous').disabled,'First boundary');frame.style.height='700px';await new Promise(r=>h.w.requestAnimationFrame(r));assert(h.d.documentElement.scrollHeight<=h.w.innerHeight+1,'Resize fits');frame.style.width='100%';frame.style.height='650px';await load(h);
  });
  await check('Approved radio photo and all 23 interactive Help controls',async()=>{
   id('help').click();const image=h.d.querySelector('.radio-outline img');await until(()=>image?.complete,'Radio image');assert(image.naturalWidth>0,'Photo loaded');const keys=[...h.d.querySelectorAll('[data-radio-key]')];assert(keys.length===23,'23 hotspots');for(const key of keys){key.click();assert(id('radioTutorialPanel').textContent.length>30,'Tutorial '+key.dataset.radioKey);}assert(h.d.querySelector('link[rel=icon]').href.endsWith('assets/favicon.svg'),'Blue favicon');[...h.d.querySelectorAll('#tabs button')].find(x=>x.textContent.includes('Channels')).click();assert(h.state.fake.sent.length===0,'Help never programs');
  });
  await check('Help layout, single active navigation, manuals and responsive restoration',async()=>{
   frame.style.width='1600px';id('help').click();await new Promise(r=>h.w.requestAnimationFrame(r));
   assert(h.d.querySelectorAll('#tabs button.active').length===1,'One active navigation item');
   const left=h.d.querySelector('.help-tutorial-host'),right=h.d.querySelector('.help-reference'),limits=h.d.querySelector('.known-limitations');
   const lr=left.getBoundingClientRect(),rr=right.getBoundingClientRect();assert(Math.abs(lr.top-rr.top)<1,'Top aligned');assert(Math.abs(lr.width/(lr.width+rr.width)-.65)<.02,'65/35 split');
   assert(limits.querySelector('h3').textContent==='Known Firmware Limitations','Heading');assert(limits.querySelectorAll('details').length===3,'Explanations retained');
   assert(!h.d.getElementById('content').textContent.includes('What has been tested'),'Long history removed');
   const select=id('manualSelector'),pdf=id('manualPDF');assert(!select.querySelector('[value=hamrx]').disabled,'Guide enabled');assert(id('baofengManual').href==='https://baofeng.s3.amazonaws.com/Baofeng_MINI-5_User_Manual_EN_V1.0_20260920.pdf'&&id('baofengManual').target==='_blank','Official manufacturer manual link');
   select.value='hamrx';select.dispatchEvent(new h.w.Event('change'));const source=pdf.src;
   assert(source.endsWith('/docs/manuals/viewer.html'),'Local versioned guide');assert(h.w.getComputedStyle(limits).display==='none','Right manual replaces limits');
   await until(()=>pdf.contentDocument?.getElementById('status')?.textContent.startsWith('Page 1 of 8'),'PDF rendered');
   pdf.contentDocument.getElementById('next').click();await until(()=>pdf.contentDocument.getElementById('status').textContent.startsWith('Page 2 of 8'),'Second PDF page');
   id('manualExpand').click();assert(left.hidden&&h.w.getComputedStyle(limits).display!=='none','Expanded left, limits accessible');
   id('manualExpand').click();assert(!left.hidden&&pdf===id('manualPDF')&&pdf.src===source,'Same iframe and source retained');
   assert(pdf.contentDocument.getElementById('page').value==='2','Reading page retained after resize');
   assert(id('manualOpen').target==='_blank'&&id('manualOpen').href===source,'Separate-tab control');
   id('manualClose').click();assert(!left.hidden&&h.w.getComputedStyle(limits).display!=='none'&&h.d.activeElement===select,'Close restores content and focus');
   frame.style.width='390px';await new Promise(r=>h.w.requestAnimationFrame(r));assert(h.d.documentElement.scrollWidth<=h.w.innerWidth+1,'Mobile Help fits');
   frame.style.width='100%';[...h.d.querySelectorAll('#tabs button')].find(x=>x.textContent.includes('Channels')).click();
  });
  await check('Published guide is a local PDF and testing document retains evidence links',async()=>{
   const response=await fetch(new URL('docs/manuals/ham-rx-cps-user-guide-v20.27.pdf',root),{cache:'no-store'});assert(response.ok,'PDF delivered');assert((response.headers.get('content-type')||'').includes('pdf'),'PDF MIME type');
   const bytes=new Uint8Array(await response.arrayBuffer());assert(new TextDecoder().decode(bytes.slice(0,5))==='%PDF-','Actual PDF asset');
   const html=await fetch(new URL('docs/testing-compatibility.html',root)).then(r=>r.text());for(const name of ['AUDIT-2026-10-14.md','AUDIT-REMEDIATION.md','KNOWN-LIMITATIONS.md','F13-COVERAGE.md'])assert(html.includes(name),'Evidence reference '+name);
  });
  // Reload the native file to discard edited/selected state before transport checks.
  await load(h);
  await check('One-checkbox confirmation, modal focus isolation and Cancel',async()=>{id('writeRadio').focus();id('writeRadio').click();assert(id('warning').matches(':modal'),'Native write dialog is modal');assert(h.d.querySelectorAll('#warning input[type="checkbox"]').length===1,'Exactly one confirmation');assert(id('confirmWrite').disabled,'Unchecked confirmation is blocked');id('confirmWrite').click();assert(h.state.fake.events.length===0,'Disabled confirmation cannot connect');const row=h.d.querySelector('[data-channel-index="0"]');row.focus();assert(id('warning').contains(h.d.activeElement),'Modal prevents background focus');id('hasBackup').click();assert(!id('confirmWrite').disabled,'Checkbox enables confirmation');id('cancelWrite').click();assert(!id('warning').open&&h.d.activeElement===id('writeRadio'),'Cancel restores focus');assert(h.state.fake.writes===0,'Cancel never writes');});
  await check('Real busy inertness, disabled controls and recovery',async()=>{await busyCheck(h);h.state.fake.release();await until(()=>!id('content').inert,'read completion');assert(h.state.fake.reads===521,'Complete read uses 521 blocks');assert(!id('open').disabled&&!id('save').disabled,'Controls recover');assert(h.state.errors.length===0,'No application errors');});
  await check('Actual HTML number constraints reject channel 1000',async()=>{const move=[...h.d.querySelectorAll('[data-channel-index="0"] button')].find(b=>b.textContent==='Move');move.click();id('moveTo').value='1000';assert(!id('moveTo').checkValidity(),'1000 violates native max');id('moveApply').click();assert(id('moveDialog').open,'Invalid destination leaves dialog open');id('moveCancel').click();});
  await check('Simulated full write stays unverified until explicit reconnect/readback',async()=>{h=await fresh();await load(h);id('writeRadio').click();id('hasBackup').click();id('confirmWrite').click();await until(()=>id('status').textContent.includes('All 262 blocks acknowledged'),'simulated write');assert(h.state.fake.writes===262&&!h.state.fake.device.gatt.connected,'Completed write releases link');assert(id('writeRadio').disabled,'Source stays write locked');id('verify').click();assert(id('resetSession').matches(':modal'),'Readback requires restart confirmation');const choosers=h.state.fake.events.filter(x=>x==='chooser').length;assert(choosers===1,'No automatic reconnect');id('resetRebootReady').click();await until(()=>id('status').textContent.includes('VERIFIED: all 33,344 bytes'),'simulated readback');assert(h.state.fake.writes===262&&h.state.fake.reads===521,'Readback sends no additional write');assert(h.state.errors.length===0,'No application errors');});
  await check('Wrong simulated radio identity blocks every memory write',async()=>{h=await fresh();await load(h);h.state.fake.faults.wrongModel=true;id('writeRadio').click();id('hasBackup').click();id('confirmWrite').click();await until(()=>!id('open').disabled,'rejected identity');assert(/Unexpected radio model/.test(id('status').textContent),'Identity error is visible');assert(h.state.fake.writes===0,'No write sent to wrong model');});
  await check('Missing simulated ACK unlocks editing and never retries the uncertain write',async()=>{h=await fresh();await load(h);h.state.fake.faults.dropAck=1;id('writeRadio').click();id('hasBackup').click();id('confirmWrite').click();await until(()=>!id('open').disabled,'uncertain write timeout');assert(/Write incomplete or uncertain/.test(id('status').textContent),'Uncertainty is visible');assert(h.state.fake.writes===1,'Only one write attempt');assert(id('writeRadio').disabled&&!id('save').disabled&&!id('content').inert,'Editing recovers while writing stays locked');});
  await check('Bluetooth icon follows the simulated connection and returns to offline',async()=>{h=await fresh();const icon=id('linkDot'),offline=h.w.getComputedStyle(icon).color;assert(icon.localName==='svg'&&icon.getAttribute('aria-hidden')==='true','Decorative Bluetooth SVG exists');assert(!icon.classList.contains('online')&&id('connection').textContent==='Not connected','Initial offline state');id('connect').click();await until(()=>id('connection').textContent==='Connected','Bluetooth icon connected');assert(icon.classList.contains('online'),'Connected icon state');assert(h.w.getComputedStyle(icon).color!==offline,'Connected color differs visibly');assert(h.state.fake.sent.length===0,'Connecting sends no programming commands');id('connect').click();await until(()=>id('connection').textContent==='Not connected','Bluetooth icon disconnected');assert(!icon.classList.contains('online')&&h.w.getComputedStyle(icon).color===offline,'Disconnected icon restores offline color');assert(h.state.fake.writes===0,'Icon test never programs');});
  await check('Missing HTML control mutation is detected by actual app startup',async()=>{h=await fresh('missing-id');assert(h.state.failed&&h.state.errors.some(e=>/null|onclick/.test(e)),'Removing confirmWrite must break startup');});
  await check('Removed inertness mutation is caught by the same busy check',async()=>{h=await fresh('inert-mutant');await load(h);let detected=false;try{await busyCheck(h);}catch(e){detected=/inert/i.test(e.message);}assert(detected,'The busy test must reject removed inertness');});
 }catch(e){failed++;record('Harness setup',false,e.message);}
 finally{frame?.contentWindow.f13?.fake.close();frame?.remove();frame=null;status.textContent=failed?`${failed} check(s) failed`:`All ${results.children.length} browser checks passed`;status.dataset.result=failed?'fail':'pass';start.disabled=false;}
};
