import {readCsvFile} from '../csv-import.mjs';
import {readImageFile,exportChirpImage} from '../image-files.mjs';
import {mountManuals} from '../help-manuals.mjs';
import {inlineChannelEdit,planChannelMove,channelKeys} from '../channel-workspace.mjs';
import {mountChannelCell} from '../channel-inline-ui.mjs';
import {releaseAfterAcknowledgedWrite} from '../connection-recovery.mjs';
// Executes the real UI handlers against a minimal DOM and simulated transport.
// It does not replace browser visual or physical-radio checks.
import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {openChannelAppend} from '../channel-import-ui.mjs';
import {renderRadioTutorial} from '../radio-help.mjs';
import {readDat,readDatFile,writeDat} from '../dat.mjs';import {validateEdits} from '../validation.mjs';import {Writer,makePlan,verificationMessage} from '../writer.mjs';import {decodeRadio,radioDat} from '../radio-decoder.mjs';import {blankData,emptyChannel,removeChannels,insertChannel,moveChannel} from '../channels.mjs';import {configureFields,form,optionalForm,vfoForm,visibleName,visibleTone,editedName,isFrequencyField,padFrequency} from '../fields.mjs';import {simulatedRadio} from './simulate.mjs';import {schemas,fixture} from './fixtures.mjs';
test('single-screen safety controls, read/write locks, reset prompt, idle timeout and native backups',async()=>{
 const nodes=new Map();class Element{
  constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.listeners={};this.value='';this.checked=false;this.classList={toggle(){},add(){},remove(){}};this.style={};this.scrollTop=0;this.scrollLeft=0;this.scrollHeight=2200;}
  set id(value){this._id=value;nodes.set(value,this);}get id(){return this._id;}
  closest(selector){return selector.split(',').includes(this.tag)?this:null;}
  select(){}
  querySelector(s){return this.querySelectorAll(s)[0]||null;}
  focus(options){this.focusOptions=options;}
  append(...xs){this.children.push(...xs);}replaceChildren(...xs){this.children=xs;}setAttribute(k,v){this[k]=v;}
  get lastChild(){return this.children.at(-1);}
  addEventListener(k,f){(this.listeners[k]??=[]).push(f);}checkValidity(){return !this.invalid;}reportValidity(){return !this.invalid;}
  showModal(){this.open=true;}close(){this.open=false;}click(){return this.onclick?.();}
  set innerHTML(v){this.html=v;for(const match of v.matchAll(/id="([^"]+)"/g))nodes.set(match[1],new Element('input'));}get innerHTML(){return this.html;}
  querySelectorAll(selector){return this.children.filter(x=>x instanceof Element).flatMap(x=>[...((selector==='[data-key]'&&x.dataset.key)||(selector===x.tag)?[x]:[]),...x.querySelectorAll(selector)]);}
 }
 const get=id=>{if(!nodes.has(id))nodes.set(id,new Element(id));return nodes.get(id);};const doc={getElementById:get,createElement:tag=>new Element(tag),documentElement:new Element('html'),addEventListener(){}};
 globalThis.document=doc;const win={isSecureContext:true,scrollX:0,scrollY:0,scrollTo(x,y){this.scrollX=x;this.scrollY=y;},addEventListener(){}};let now=1000000,interval,download;
 const originalConnect=Writer.prototype.connect,connections=[];Writer.prototype.connect=async function(){const sim=simulatedRadio(this);connections.push(sim);};
 const ctx=vm.createContext({readCsvFile,readImageFile,exportChirpImage,inlineChannelEdit,planChannelMove,channelKeys,mountChannelCell,document:doc,window:win,navigator:{bluetooth:{}},localStorage:{getItem(){},setItem(){}},structuredClone,Blob,Uint8Array,console,Date:{now:()=>now},URL:{createObjectURL(b){download=b;return 'mock';},revokeObjectURL(){}},setTimeout(){},setInterval(f){interval=f;},confirm:()=>true,fetch:async p=>({json:async()=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url)))}),readDat,readDatFile,writeDat,validateEdits,Writer,makePlan,verificationMessage,decodeRadio,radioDat,blankData,emptyChannel,removeChannels,insertChannel,moveChannel,configureFields,form,optionalForm,vfoForm,visibleName,visibleTone,editedName,isFrequencyField,padFrequency,renderRadioTutorial,mountManuals,openChannelAppend,releaseAfterAcknowledgedWrite});
 try{
  const source=fs.readFileSync(new URL('../app.mjs',import.meta.url),'utf8').replace(/^import .*$/gm,'');await vm.runInContext('(async()=>{'+source+'})()',ctx);
  assert.equal(get('writeRadio').disabled,true);assert.equal(connections.length,0);
  get('help').click();
  const diagramButtons=get('content').querySelectorAll('button').filter(b=>b.dataset.radioKey);
  const tutorialPanel=get('content').querySelectorAll('section').find(s=>s.id==='radioTutorialPanel');
  const tutorialText=()=>[...tutorialPanel.querySelectorAll('h3'),...tutorialPanel.querySelectorAll('h4')].map(e=>e.textContent).join(' ');
  assert.equal(diagramButtons.length,23);
  diagramButtons.find(b=>b.dataset.radioKey==='0').onmouseenter();assert.match(tutorialText(),/Short Press – Numeric Entry/);assert.match(tutorialText(),/Long Press – Weather/);assert.ok(tutorialPanel.querySelectorAll('li').some(e=>e.textContent.includes('enter weather mode')));
  diagramButtons.find(b=>b.dataset.radioKey==='8').click();assert.match(tutorialText(),/Short Press – Numeric Entry/);assert.match(tutorialText(),/Long Press – Transmit Power/);assert.ok(tutorialPanel.querySelectorAll('li').some(e=>e.textContent.includes('switch between Low (L) and High (H)')));
  diagramButtons.find(b=>b.dataset.radioKey==='star').onfocus();assert.match(tutorialText(),/Short Press – Reverse \/ Talkaround/);assert.match(tutorialText(),/Long Press – Keypad Lock/);
  diagramButtons.find(b=>b.dataset.radioKey==='sk1').click();assert.match(tutorialText(),/Short Press – Programmable Function/);
  assert.equal(connections.length,0);assert.equal(get('writeRadio').disabled,true);
  get('tabs').querySelectorAll('button').find(b=>b.textContent.includes('Channels')).click();

  const bytes=writeDat(fixture(),schemas);get('file').files=[{name:'synthetic.dat',size:bytes.length,arrayBuffer:async()=>bytes}];await get('file').onchange();assert.equal(get('writeRadio').disabled,false);
  get('writeRadio').click();assert.equal(get('warning').open,true);assert.equal(get('confirmWrite').disabled,true);await get('confirmWrite').click();assert.equal(connections.length,0);get('cancelWrite').click();assert.equal(connections.length,0);
  get('writeRadio').click();get('hasBackup').checked=true;get('hasBackup').onchange();await get('confirmWrite').click();assert.equal(connections.length,1);assert.equal(connections[0].writes().length,262);assert.equal(get('writeRadio').disabled,true);assert.equal(get('verify').disabled,false);assert.match(get('status').textContent,/not verified/);
  assert.equal(get('connection').textContent,'Not connected');assert.equal(connections[0].sent.length,266);
  await get('confirmWrite').click();assert.equal(connections[0].writes().length,262);
  get('verify').click();assert.equal(get('resetSession').open,true);assert.equal(connections[0].sent.filter(x=>x[0]===82).length,0);get('resetCancel').click();assert.equal(connections.length,1);assert.equal(get('resetRebootReady').hidden,false);assert.equal(get('connection').textContent,'Not connected');
  get('verify').click();await get('resetRebootReady').click();assert.equal(connections.length,2);assert.match(get('status').textContent,/VERIFIED/);assert.equal(connections[1].writes().length,0);
  await get('readRadio').click();assert.equal(get('connection').textContent,'Connected');assert.equal(get('writeRadio').disabled,false);assert.equal(get('backup').disabled,false);assert.match(get('status').textContent,/loaded/);
  get('backup').click();const saved=readDat(new Uint8Array(await download.arrayBuffer()),schemas);assert.equal(saved.channelList[0].filter(c=>c.rxFreq).length,2);
  get('writeRadio').click();get('hasBackup').checked=true;get('hasBackup').onchange();const upload=Writer.prototype.upload;Writer.prototype.upload=async function(){this.report={stage:'write-incomplete-or-uncertain',acknowledged:0,totalBlocks:262};this.disconnect();throw Error('Simulated uncertain write');};try{await get('confirmWrite').click();}finally{Writer.prototype.upload=upload;}assert.equal(get('writeRadio').disabled,true);assert.match(get('status').textContent,/Do not retry automatically/);
  get('readRadio').click();assert.equal(get('resetSession').open,true);assert.equal(get('resetRebootReady').hidden,true);await get('resetReady').click();assert.equal(get('writeRadio').disabled,false);
  const writeCount=connections.reduce((n,s)=>n+s.writes().length,0);now+=600001;interval();assert.equal(get('idle').open,true);get('idleKeep').click();assert.equal(get('idle').open,false);now+=600001;interval();now+=60001;interval();assert.equal(get('connection').textContent,'Not connected');assert.equal(connections.reduce((n,s)=>n+s.writes().length,0),writeCount);
  const previousStatus=get('status').textContent;get('file').files=[{name:'bad.dat',size:1,arrayBuffer:async()=>Uint8Array.of(255)}];await get('file').onchange();assert.match(get('status').textContent,/current workspace retained/);get('save').click();assert.equal(readDat(new Uint8Array(await download.arrayBuffer()),schemas).channelList[0].filter(c=>c.rxFreq).length,2);assert.notEqual(previousStatus,get('status').textContent);
  const add=()=>{const toggle=get('content').querySelectorAll('input').find(x=>x.type==='checkbox'&&!x.id);if(!toggle.checked){toggle.checked=true;toggle.onchange();}get('content').querySelectorAll('button').find(b=>b.textContent==='Add').click();};
  const enter=(k,value)=>{get('fields').querySelectorAll('[data-key]').find(input=>input.dataset.key===k).value=value;};
  add();enter('rxFreq','146.52');enter('txFreq','146.52');get('apply').click();assert.equal(get('editor').open,false);get('save').click();let edited=readDat(new Uint8Array(await download.arrayBuffer()),schemas);assert.equal(edited.channelList[0][1].rxFreq,'146.52000');assert.equal(edited.channelList[0][1].txFreq,'146.52000');
  add();enter('rxFreq','147');get('apply').click();get('save').click();edited=readDat(new Uint8Array(await download.arrayBuffer()),schemas);assert.equal(edited.channelList[0][3].rxFreq,'147.00000');assert.equal(edited.channelList[0][3].txFreq,'');
  add();enter('rxFreq','146.520001');get('apply').click();assert.equal(get('editor').open,true);assert.match(get('editErrors').textContent,/five decimal places/);get('cancel').click();
  get('save').click();const beforeAppend=readDat(new Uint8Array(await download.arrayBuffer()),schemas),beforeConnections=connections.length;
  const presetButton=get('content').querySelectorAll('button').find(b=>b.textContent==='Add preset');assert.equal(presetButton.disabled,false);presetButton.click();assert.equal(get('appendDialog').open,true);get('appendCancel').click();get('save').click();assert.deepEqual(readDat(new Uint8Array(await download.arrayBuffer()),schemas),beforeAppend);
  presetButton.click();get('appendPlacement').value='101';get('appendPlacement').onchange();get('appendApply').click();assert.equal(get('appendDialog').open,false);get('save').click();const appended=readDat(new Uint8Array(await download.arrayBuffer()),schemas);assert.equal(appended.channelList[0][100].rxFreq,'462.56250');assert.equal(appended.channelList[0][100].txFreq,'462.56250');assert.deepEqual(appended.funCfgs,beforeAppend.funCfgs);assert.deepEqual(appended.vfos,beforeAppend.vfos);assert.deepEqual(appended.dtmfs,beforeAppend.dtmfs);assert.deepEqual(appended.channelList[0][999],beforeAppend.channelList[0][999]);assert.equal(connections.length,beforeConnections);
  get('content').querySelectorAll('button').find(b=>b.textContent==='Undo').click();get('save').click();assert.deepEqual(readDat(new Uint8Array(await download.arrayBuffer()),schemas),beforeAppend);
  const filled=count=>{const d=fixture();for(let i=0;i<count;i++)d.channelList[0][i]={...d.channelList[0][0],name:'CH '+(i+1)};d.channelList[0][999].name='KEEP EXTRA';return d;};
  const openFixture=async d=>{get('file').files=[{name:'channels.dat',size:writeDat(d,schemas).length,arrayBuffer:async()=>writeDat(d,schemas)}];await get('file').onchange();};
  await openFixture(filled(120));const rowAt=index=>get('content').querySelectorAll('tr').find(r=>r.dataset.channelIndex===String(index));let row50=rowAt(49);
  get('channelTableWrap').scrollTop=1720;get('channelTableWrap').scrollLeft=40;win.scrollY=220;
  row50.querySelectorAll('button').find(b=>b.textContent==='Edit').click();assert.equal(get('editor').open,true);assert.equal(get('editorTitle').textContent,'Edit channel 50');enter('name','EDITED 50');get('apply').click();assert.equal(get('channelTableWrap').scrollTop,1720);assert.equal(get('channelTableWrap').scrollLeft,40);assert.equal(win.scrollY,220);assert.equal(rowAt(49).focusOptions.preventScroll,true);
  row50=rowAt(49);const delete50=row50.querySelectorAll('button').find(b=>b.textContent==='Delete'),check50=row50.querySelectorAll('input')[0];assert.equal(row50.onclick,undefined);assert.equal(get('editor').open,false);assert.equal(get('editor').open,false);
  check50.checked=true;check50.onchange();assert.equal(get('channelTableWrap').scrollTop,1720);assert.equal(get('channelSelect-49').focusOptions.preventScroll,true);get('selectPage').onchange({target:{checked:true}});assert.equal(get('channelTableWrap').scrollTop,1720);assert.equal(get('selectPage').focusOptions.preventScroll,true);row50=rowAt(49);row50.querySelectorAll('button').find(b=>b.textContent==='Edit').click();assert.equal(get('editorTitle').textContent,'Edit channel 50');get('cancel').click();
  row50.ondragstart({target:row50,dataTransfer:{setData(){}}});assert.equal(row50.onclick,undefined);assert.equal(get('editor').open,false);row50.ondragend();
  get('save').click();const beforeDelete=readDat(new Uint8Array(await download.arrayBuffer()),schemas);rowAt(49).querySelectorAll('button').find(b=>b.textContent==='Delete').click();assert.equal(get('deleteDialog').open,true);assert.equal(get('editor').open,false);get('deleteLeave').click();assert.equal(get('channelTableWrap').scrollTop,1720);assert.equal(get('channelTableWrap').scrollLeft,40);assert.equal(win.scrollY,220);assert.equal(rowAt(50).focusOptions.preventScroll,true);
  get('save').click();const afterDelete=readDat(new Uint8Array(await download.arrayBuffer()),schemas);assert.equal(afterDelete.channelList[0][49].rxFreq,'');assert.deepEqual(afterDelete.channelList[0][50],beforeDelete.channelList[0][50]);assert.deepEqual(afterDelete.channelList[0][999],beforeDelete.channelList[0][999]);assert.deepEqual(afterDelete.funCfgs,beforeDelete.funCfgs);
  get('content').querySelectorAll('button').find(b=>b.textContent==='Undo').click();assert.equal(get('channelTableWrap').scrollTop,1720);
  await openFixture(filled(51));get('content').querySelectorAll('button').find(b=>b.textContent==='Next →').click();assert.equal(get('channelTableWrap').scrollTop,0);rowAt(50).querySelectorAll('button').find(b=>b.textContent==='Delete').click();get('deleteLeave').click();assert.equal(get('channelTableWrap').dataset.page,'0');assert.equal(get('channelTableWrap').scrollTop,get('channelTableWrap').scrollHeight);assert.equal(rowAt(49).focusOptions.preventScroll,true);assert.equal(connections.length,beforeConnections);

  // Editor navigation crosses pages, applies valid changes and leaves radio transport alone.
  await openFixture(filled(120));get('channelTableWrap').scrollTop=1720;win.scrollY=220;
  rowAt(49).querySelectorAll('button').find(b=>b.textContent==='Edit').click();enter('name','NAV 50');enter('rxFreq','146.55');get('editNext').click();
  assert.equal(get('editor').open,true);assert.equal(get('editorTitle').textContent,'Edit channel 51');assert.equal(get('editNext').focusOptions.preventScroll,true);assert.equal(get('channelTableWrap').scrollTop,1720);assert.equal(win.scrollY,220);
  enter('name','DISCARD 51');get('cancel').click();get('save').click();let navigated=readDat(new Uint8Array(await download.arrayBuffer()),schemas);
  assert.equal(navigated.channelList[0][49].name,'NAV 50');assert.equal(navigated.channelList[0][49].rxFreq,'146.55000');assert.equal(navigated.channelList[0][50].name,'CH 51');assert.equal(navigated.channelList[0][999].name,'KEEP EXTRA');
  rowAt(49).querySelectorAll('button').find(b=>b.textContent==='Edit').click();get('editNext').click();get('editPrevious').click();assert.equal(get('editorTitle').textContent,'Edit channel 50');
  enter('rxFreq','146.520001');get('editNext').click();assert.equal(get('editorTitle').textContent,'Edit channel 50');assert.match(get('editErrors').textContent,/five decimal places/);
  enter('rxFreq','146.55');get('editNext').click();enter('name','NAV 51');get('apply').click();assert.equal(get('editor').open,false);assert.equal(get('channelTableWrap').scrollTop,1720);
  get('content').querySelectorAll('button').find(b=>b.textContent==='Undo').click();get('save').click();navigated=readDat(new Uint8Array(await download.arrayBuffer()),schemas);assert.equal(navigated.channelList[0][50].name,'CH 51');assert.equal(navigated.channelList[0][49].name,'NAV 50');
  get('content').querySelectorAll('button').find(b=>b.textContent==='Undo').click();get('save').click();navigated=readDat(new Uint8Array(await download.arrayBuffer()),schemas);assert.equal(navigated.channelList[0][49].name,'CH 50');
  // Empty gaps are skipped and unchanged navigation does not create an Undo snapshot.
  const gaps=filled(3);gaps.channelList[0][1]=emptyChannel();gaps.channelList[0][998]={...gaps.channelList[0][0],name:'LAST'};await openFixture(gaps);
  rowAt(0).querySelectorAll('button').find(b=>b.textContent==='Edit').click();assert.equal(get('editPrevious').disabled,true);get('editNext').click();assert.equal(get('editorTitle').textContent,'Edit channel 3');get('editNext').click();assert.equal(get('editorTitle').textContent,'Edit channel 999');assert.equal(get('editNext').disabled,true);get('editNext').click();assert.equal(get('editorTitle').textContent,'Edit channel 999');get('editPrevious').click();assert.equal(get('editorTitle').textContent,'Edit channel 3');get('cancel').click();assert.equal(get('content').querySelectorAll('button').find(b=>b.textContent==='Undo').disabled,true);assert.match(get('status').textContent,/Ready/);
  const emptyToggle=get('content').querySelectorAll('input').find(el=>el.type==='checkbox'&&!el.id);emptyToggle.checked=true;emptyToggle.onchange();rowAt(0).querySelectorAll('button').find(b=>b.textContent==='Edit').click();get('editNext').click();assert.equal(get('editorTitle').textContent,'Add channel 2');get('editNext').click();assert.equal(get('editorTitle').textContent,'Edit channel 3');get('editPrevious').click();enter('name','NO RX');get('editNext').click();assert.equal(get('editorTitle').textContent,'Add channel 2');assert.match(get('editErrors').textContent,/receive frequency/);enter('rxFreq','147');get('editNext').click();get('cancel').click();get('save').click();navigated=readDat(new Uint8Array(await download.arrayBuffer()),schemas);assert.equal(navigated.channelList[0][1].rxFreq,'147.00000');assert.equal(navigated.channelList[0][1].name,'NO RX');
  // Insert-above now opens an inline draft; Escape must cancel without changing data.
  rowAt(0).querySelectorAll('button').find(b=>b.textContent==='Ins Ch').click();assert.equal(get('editor').open,false);get('cell-0-rxFreq').querySelector('input').onkeydown({key:'Escape',preventDefault(){},stopPropagation(){}});assert.equal(connections.length,beforeConnections);
 }finally{Writer.prototype.connect=originalConnect;delete globalThis.document;}
});

test('radio guide separates all six hold actions and retains DTMF transmission instructions',()=>{
 class GuideElement{
  constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.style={};this.classList={toggle(){}};}
  append(...items){this.children.push(...items);}replaceChildren(...items){this.children=items;}setAttribute(key,value){this[key]=value;}
  querySelectorAll(tag){return this.children.filter(x=>x instanceof GuideElement).flatMap(x=>[...(x.tag===tag?[x]:[]),...x.querySelectorAll(tag)]);}
 }
 const previousDocument=globalThis.document;globalThis.document={createElement:tag=>new GuideElement(tag)};
 const textOf=node=>typeof node==='string'?node:[node.textContent||'',...node.children.map(textOf)].join(' ');
 try{
  const root=new GuideElement('main'),choices=JSON.parse(fs.readFileSync(new URL('../function-options.json',import.meta.url))).key2Short;
  renderRadioTutorial(root,{key2Short:7},choices);
  const buttons=root.querySelectorAll('button'),panel=root.querySelectorAll('section').find(x=>x.id==='radioTutorialPanel');
  assert.equal(buttons.length,23);
  const select=key=>buttons.find(b=>b.dataset.radioKey===key).onclick();
  const headings=()=>panel.querySelectorAll('h4').map(x=>x.textContent);
  const expected={
   star:['Key: *','Short Press – Reverse / Talkaround','Long Press – Keypad Lock',/Normal → Reverse \(R\) → Talkaround \(T\) → Normal/],
   '8':['Key: 8','Short Press – Numeric Entry','Long Press – Transmit Power',/Keeping 8 held does not continuously cycle power levels/],
   hash:['Key: #','Short Press – DTMF Dial','Long Press – Channel Scan',/Scan resume behavior/],
   lamp:['Key: Flashlight / Search','Short Press – Flashlight','Long Press – Frequency Search (Nearby Signal Detection)',/Search detects nearby transmitting signals/],
   '0':['Key: 0','Short Press – Numeric Entry','Long Press – Weather',/weather-channel scanning/],
   menu:['Key: MENU','Short Press – Menu / Confirm','Long Press – Stopwatch',/Press MENU to start timing/]
  };
  for(const [key,[title,short,long,description]]of Object.entries(expected)){
   select(key);assert.deepEqual(panel.querySelectorAll('h3').map(x=>x.textContent),[title]);assert.deepEqual(headings(),[short,long]);assert.match(textOf(panel),description);
   assert.ok(panel.querySelectorAll('h4').every(h=>h.className==='tutorial-action-title'));
  }
  for(const [key,label,line]of [['ptta','PTT-A','upper (A)'],['pttb','PTT-B','lower (B)']]){select(key);assert.deepEqual(headings(),['Press and Hold — Transmit on '+label.at(-1)]);assert.deepEqual(panel.querySelectorAll('li').map(x=>x.textContent),[`Press and hold ${label} to transmit on the ${line} channel. Release the button to receive.`]);assert.equal(panel.querySelectorAll('p').length,0);}
  assert.doesNotMatch(textOf(root),/The diagram explains the radio; it does not operate it/);
  select('hash');const dtmf=textOf(panel);
  assert.match(dtmf,/PTT exits the screen even if no digits were entered/);assert.match(dtmf,/EXIT does not cancel the screen/);assert.match(dtmf,/No method of exiting without transmitting has been confirmed/);
  assert.equal(panel.querySelectorAll('p').length,0);assert.doesNotMatch(dtmf,/FM.*station search/i);
  select('lamp');const search=textOf(panel);assert.match(search,/# switches the search band between VHF and UHF/);assert.match(search,/attempts to identify/);assert.match(search,/MENU saves/);assert.match(search,/overwrite procedure has not been confirmed/);
  select('sk1');assert.deepEqual(headings(),['Short Press – Programmable Function','PTT + SK1 – Repeater Activation Tone']);assert.equal(panel.querySelectorAll('strong').length,6);assert.doesNotMatch(textOf(panel),/Current workspace assignment|workspace assignment may differ|No verified SK1 long-press remapping|This combination transmits\. The diagram only shows instructions/);assert.match(textOf(panel),/1000, 1450, 1750 and 2100 Hz/);assert.match(textOf(panel),/not been physically verified/);assert.match(textOf(panel),/may sound locally or transmit/);
  for(const key of ['ptta','pttb','vm','ab','up','down','exit','1','2','3','4','5','6','7','9']){select(key);assert.ok(!headings().some(h=>h.startsWith('Long Press')),'Unexpected hold action: '+key);}
 }finally{if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;}
});

