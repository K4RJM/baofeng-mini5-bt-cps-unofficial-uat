import {test} from 'node:test';import assert from 'node:assert/strict';
import {PRESETS,presetChannels,datChannels,planAppend,blockAvailability,appendChannels} from '../channel-import.mjs';
import {openChannelAppend} from '../channel-import-ui.mjs';
import {blankData} from '../channels.mjs';import {readDat,writeDat} from '../dat.mjs';import {validateEdits} from '../validation.mjs';import {makePlan} from '../writer.mjs';
import {defaults,schemas,options,charset,fixture,channel} from './fixtures.mjs';

test('official preset frequencies are exact, combined once and include receive/transmit frequencies by default',()=>{
 assert.deepEqual(PRESETS.map(p=>p.key),['shared','gmrs','murs','pmr']);
 const shared=presetChannels('shared');assert.equal(shared.length,22);assert.equal(new Set(shared.map(c=>c.rxFreq)).size,22);assert.equal(shared[0].rxFreq,'462.56250');assert.equal(shared[7].rxFreq,'467.56250');assert.equal(shared[21].rxFreq,'462.72500');assert.ok(shared.every(c=>c.txFreq===c.rxFreq&&c.txPower===1&&c.bandwide===1));
 assert.deepEqual(presetChannels('murs').map(c=>c.rxFreq),['151.82000','151.88000','151.94000','154.57000','154.60000']);
 const pmr=presetChannels('pmr');assert.equal(pmr.length,16);assert.equal(pmr[0].rxFreq,'446.00625');assert.equal(pmr[15].rxFreq,'446.19375');
});
test('GMRS offsets affect only repeater pairs and preserve full write plans',()=>{
 const combined=presetChannels('shared',{repeaters:true,transmit:true,power:1});assert.equal(combined.length,30);assert.ok(combined.slice(0,22).every(c=>c.txFreq===c.rxFreq));assert.equal(combined[22].rxFreq,'462.55000');assert.equal(combined[22].txFreq,'467.55000');assert.equal(combined[29].txFreq,'467.72500');assert.ok(combined.slice(22).every(c=>c.bandwide===0));
 const p=appendChannels(fixture(),combined,{placement:'101'});assert.deepEqual(validateEdits(p.data,fixture(),options,charset),[]);assert.equal(makePlan(p.data,options).frames.length,262);
});
test('next placement uses a complete empty run and never fills isolated gaps partially',()=>{
 const d=fixture(),source=presetChannels('shared'),p=planAppend(d,source);assert.equal(p.start,4);assert.equal(p.end,25);
 for(let i=0;i<999;i++)d.channelList[0][i]=i%2?channel():blankData(defaults).channelList[0][0];
 assert.match(planAppend(d,source).error,/consecutive empty slots/);assert.throws(()=>appendChannels(d,source),/consecutive empty slots/);
});
test('numbered blocks require the whole area empty, fit the set and protect channel 1000',()=>{
 const d=fixture();d.channelList[0][199]=channel('AT 200');d.channelList[0][999]=channel('RESERVED');
 assert.equal(blockAvailability(d,22).find(b=>b.start===101).available,false);assert.match(planAppend(d,presetChannels('shared'),{placement:'101'}).error,/occupied/);
 const p=appendChannels(d,presetChannels('pmr'),{placement:'901'});assert.equal(p.plan.start,901);assert.equal(p.plan.end,916);assert.deepEqual(p.data.channelList[0][999],d.channelList[0][999]);
 assert.match(planAppend(d,Array.from({length:100},(_,i)=>channel('N'+i,'145.00000')),{placement:'901',skipDuplicates:false}).error,/does not fit/);
 assert.match(planAppend(d,[channel()],{placement:'1000',skipDuplicates:false}).error,/listed placement/);
});
test('DAT append preserves every imported field and all current settings and occupied records',()=>{
 const current=fixture(),source=fixture();source.funCfgs.sql=3;source.vfos.vfoAFreq='147.00000';source.channelList[0][0].name='CHANGED';source.channelList[0][2].txFreq='';source.channelList[0][2].txPower=1;source.channelList[0][2].scanAdd=1;source.channelList[0][999]=channel('IGNORE');
 const loaded=readDat(writeDat(source,schemas),schemas),imported=datChannels(loaded);assert.equal(imported.length,2);
 const result=appendChannels(current,imported,{placement:'201',skipDuplicates:false});
 assert.deepEqual(result.data.channelList[0][200],imported[0]);assert.deepEqual(result.data.channelList[0][201],imported[1]);
 for(const k of ['funCfgs','vfos','dtmfs'])assert.deepEqual(result.data[k],current[k]);
 for(const i of [0,2,999])assert.deepEqual(result.data.channelList[0][i],current.channelList[0][i]);
 assert.deepEqual(readDat(writeDat(result.data,schemas),schemas),result.data);assert.equal(makePlan(result.data,options).frames.length,262);assert.deepEqual(validateEdits(result.data,current,options,charset),[]);
 assert.deepEqual(current,fixture());
});
test('duplicate matching ignores names, preserves differing options, and can be turned off',()=>{
 const d=fixture(),a=structuredClone(d.channelList[0][0]);a.name='OTHER';const b=structuredClone(a);b.txPower=1;
 const p=planAppend(d,[a,a,b]);assert.equal(p.duplicates,2);assert.equal(p.channels.length,1);assert.equal(p.channels[0].txPower,1);
 assert.equal(planAppend(d,[a,a,b],{skipDuplicates:false}).channels.length,3);assert.match(planAppend(d,[a]).error,/already present/);
});
test('apply rechecks changed destinations and never mutates the workspace on failure',()=>{
 const d=fixture(),source=presetChannels('shared');assert.equal(planAppend(d,source,{placement:'101'}).error,'');d.channelList[0][150]=channel('NEW');const before=structuredClone(d);
 assert.throws(()=>appendChannels(d,source,{placement:'101'}),/occupied/);assert.deepEqual(d,before);
});

function dialogHarness(){
 const nodes=new Map();class El{constructor(){this.children=[];this.value='';this.checked=false;this.textContent='';}replaceChildren(...items){this.children=items;}showModal(){this.open=true;}close(){this.open=false;}}
 const get=id=>{if(!nodes.has(id))nodes.set(id,new El());return nodes.get(id);};
 return {get,document:{getElementById:get,createElement:()=>new El()}};
}
test('dialog cancellation changes nothing; defaults, blocked blocks and Apply use the same plan',()=>{
 const prior=globalThis.document,h=dialogHarness();globalThis.document=h.document;let current=fixture(),applied=0;
 try{
  current.channelList[0][140]=channel('BLOCKED');const before=structuredClone(current);
  const open=()=>openChannelAppend({getData:()=>current,readFile:async()=>fixture(),onApply:d=>{current=d;applied++;}});
  open();assert.equal(h.get('appendPower').value,'1');assert.ok(h.get('appendPlacement').children.find(o=>o.value==='101').disabled);
  h.get('appendCancel').onclick();assert.deepEqual(current,before);assert.equal(applied,0);
  open();h.get('appendPlacement').value='201';h.get('appendPlacement').onchange();assert.equal(h.get('appendRange').textContent,'22 channels → 201–222');h.get('appendApply').onclick();assert.equal(applied,1);assert.equal(current.channelList[0][200].txFreq,'462.56250');assert.deepEqual(current.funCfgs,before.funCfgs);
 }finally{globalThis.document=prior;}
});
test('malformed DAT and late file completion after Cancel cannot replace or append channels',async()=>{
 const prior=globalThis.document,h=dialogHarness();globalThis.document=h.document;const current=fixture();let applied=0,finish;
 try{
  openChannelAppend({mode:'dat',getData:()=>current,readFile:async()=>{throw Error('Invalid native DAT');},onApply:()=>applied++});h.get('appendDat').files=[{name:'broken.dat'}];await h.get('appendDat').onchange();assert.match(h.get('appendErrors').textContent,/File not loaded/);assert.equal(h.get('appendApply').disabled,true);
  openChannelAppend({mode:'dat',getData:()=>current,readFile:()=>new Promise(resolve=>finish=resolve),onApply:()=>applied++});h.get('appendDat').files=[{name:'ok.dat'}];const pending=h.get('appendDat').onchange();h.get('appendCancel').onclick();finish(fixture());await pending;h.get('appendApply').onclick();assert.equal(applied,0);assert.deepEqual(current,fixture());
 }finally{globalThis.document=prior;}
});
