import {test} from 'node:test';import assert from 'node:assert/strict';
import {appHarness} from './app-harness.mjs';import {fixture} from './fixtures.mjs';
const key=(control,key,shiftKey=false)=>control.onkeydown({key,shiftKey,preventDefault(){},stopPropagation(){}});
function activate(h,index,field){const cell=h.get(`cell-${index}-${field}`);cell.onclick({target:cell});return cell.querySelector('input')||cell.querySelector('select');}
test('inline UI commits every field, supports cancel, undo, popup consistency and never contacts radio',async()=>{
 const h=await appHarness();try{await h.open();const before=await h.exported();
 const edits={rxFreq:'146.55',strRxCtsDcs:'67.0',txFreq:'146.55',strTxCtsDcs:'D023I',txPower:1,bandwide:1,scanAdd:1,sqMode:1,pttid:3,signalGroup:19,busyLock:1,fhss:1,name:'INLINE'};
 for(const [field,value]of Object.entries(edits)){const control=activate(h,0,field);if(control.type==='checkbox'){control.checked=!!value;control.onchange();}else{control.value=String(value);control.tag==='select'?control.onchange():key(control,'Enter');}}
 const saved=await h.exported();for(const [field,value]of Object.entries(edits))assert.equal(saved.channelList[0][0][field],field.endsWith('Freq')?'146.55000':value);
 assert.deepEqual(saved.channelList[0][999],before.channelList[0][999]);h.row(0).querySelectorAll('button').find(x=>x.textContent==='Edit').click();assert.equal(h.field('name','fields').value,'INLINE');h.enter('name','POPUP');h.get('apply').click();assert.equal(h.get('cell-0-name').querySelector('span').textContent,'POPUP');
 const control=activate(h,0,'name');control.value='CANCEL';key(control,'Escape');assert.equal((await h.exported()).channelList[0][0].name,'POPUP');h.button('Undo').click();assert.equal((await h.exported()).channelList[0][0].name,'INLINE');assert.equal(h.connections.length,0);
 }finally{h.close();}
});
test('inline UI normalizes only approved boundaries, restores invalid input and protects drafts',async()=>{
 const h=await appHarness();try{await h.open();const original=(await h.exported()).channelList[0][0].rxFreq;
 let control=activate(h,0,'rxFreq');control.value='174';assert.equal(h.unloadBlocked(),true);key(control,'Enter');assert.match(h.get('status').textContent,/adjusted/);assert.equal((await h.exported()).channelList[0][0].rxFreq,'173.99875');
 for(const invalid of ['800','399.99875','bad','146.52001']){control=activate(h,0,'rxFreq');control.value=invalid;key(control,'Enter');assert.equal((await h.exported()).channelList[0][0].rxFreq,'173.99875');}
 h.button('Undo').click();assert.equal((await h.exported()).channelList[0][0].rxFreq,original);
 control=activate(h,0,'rxFreq');control.value='146.55';key(control,'Tab');assert.ok(h.get('cell-0-strRxCtsDcs').querySelector('select'));key(h.get('cell-0-strRxCtsDcs').querySelector('select'),'Tab',true);assert.ok(h.get('cell-0-rxFreq').querySelector('input'));key(h.get('cell-0-rxFreq').querySelector('input'),'Escape');
 const data=fixture();data.channelList[0][0].pttid=199;data.channelList[0][0].rxFreq='174.00000';await h.open(data);control=activate(h,0,'pttid');assert.equal(control.value,'199');key(control,'Escape');control=activate(h,0,'name');control.value='KEEP';key(control,'Enter');assert.equal((await h.exported()).channelList[0][0].pttid,199);assert.equal((await h.exported()).channelList[0][0].rxFreq,'174.00000');assert.equal(h.connections.length,0);
 }finally{h.close();}
});
test('inline Add and Insert preserve data and Undo; edit 999 and bulk selection across pages',async()=>{
 const h=await appHarness();try{await h.open();const before=await h.exported();h.button('+ Add channel').click();let input=h.get('cell-1-rxFreq').querySelector('input');input.value='147';key(input,'Enter');assert.equal((await h.exported()).channelList[0][1].rxFreq,'147.00000');h.button('Undo').click();assert.deepEqual(await h.exported(),before);
 h.row(0).querySelectorAll('button').find(x=>x.textContent==='Ins Ch').click();input=h.get('cell-0-rxFreq').querySelector('input');input.value='145.5';key(input,'Enter');let saved=await h.exported();assert.equal(saved.channelList[0][0].rxFreq,'145.50000');assert.deepEqual(saved.channelList[0][1],before.channelList[0][0]);h.button('Undo').click();assert.deepEqual(await h.exported(),before);
 const data=fixture();for(let i=0;i<999;i++)data.channelList[0][i]={...data.channelList[0][0],name:'CH'+(i+1)};data.channelList[0][999].name='EXTRA';await h.open(data);
 for(const i of [2,6,11]){const box=h.get('channelSelect-'+i);box.checked=true;box.onchange();}h.button('Next →').click();const box=h.get('channelSelect-50');box.checked=true;box.onchange();h.button('Move selected (4)').click();h.get('bulkMoveTo').value='100';h.get('bulkMoveTo').oninput();assert.match(h.get('bulkMoveSummary').textContent,/100–103/);h.get('bulkMoveApply').click();saved=await h.exported();assert.deepEqual(saved.channelList[0].slice(99,103).map(x=>x.name),['CH3','CH7','CH12','CH51']);assert.deepEqual(saved.channelList[0][999],data.channelList[0][999]);h.button('Undo').click();assert.deepEqual(await h.exported(),data);
 while(h.button('Next →')&&!h.button('Next →').disabled)h.button('Next →').click();input=activate(h,998,'name');input.value='LAST';key(input,'Enter');assert.equal((await h.exported()).channelList[0][998].name,'LAST');assert.equal(h.connections.length,0);
 }finally{h.close();}
});

