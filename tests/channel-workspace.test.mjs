import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {inlineChannelEdit,planChannelMove} from '../channel-workspace.mjs';import {fixture} from './fixtures.mjs';
const json=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url)));const options={'KDH.Function':json('function-options.json'),...json('editor-options.json')},charset=json('name-charset.json');
test('inline boundary normalization is explicit, narrow and preserves imported frequencies',()=>{
 const original=fixture();for(const [entered,expected]of [['174.00000','173.99875'],['520','519.99875'],['136','136.00000'],['400','400.00000'],['146.52','146.52000']]){const r=inlineChannelEdit(original,original,0,'rxFreq',entered,options,charset);assert.equal(r.candidate.channelList[0][0].rxFreq,expected);assert.equal(!!r.notice,['174.00000','520'].includes(entered));}
 for(const value of ['800.00000','399.99875','garbage','146.52001','135.99875'])assert.throws(()=>inlineChannelEdit(original,original,0,'rxFreq',value,options,charset));
 const imported=fixture();imported.channelList[0][0].rxFreq='174.00000';const unchanged=inlineChannelEdit(imported,imported,0,'rxFreq','174.00000',options,charset);assert.equal(unchanged.changed,false);assert.equal(unchanged.candidate.channelList[0][0].rxFreq,'174.00000');assert.equal(inlineChannelEdit(imported,imported,0,'name','NEW',options,charset).candidate.channelList[0][0].rxFreq,'174.00000');
 assert.deepEqual(original,fixture());
});
test('inline every field preserves saved option codes, reserved record and other sections',()=>{
 const data=fixture();data.channelList[0][998]=structuredClone(data.channelList[0][0]);data.channelList[0][999].name='RESERVED';
 for(const [key,value]of Object.entries({rxFreq:'145.50000',txFreq:'145.50000',strRxCtsDcs:'67.0',strTxCtsDcs:'D023I',txPower:1,bandwide:1,scanAdd:1,sqMode:1,pttid:3,signalGroup:19,busyLock:1,fhss:1,name:'LAST'})){
  const result=inlineChannelEdit(data,data,998,key,value,options,charset).candidate;assert.equal(result.channelList[0][998][key],value);assert.deepEqual(result.channelList[0][999],data.channelList[0][999]);for(const k of ['vfos','funCfgs','dtmfs'])assert.deepEqual(result[k],data[k]);
 }
 data.channelList[0][0].pttid=199;assert.equal(inlineChannelEdit(data,data,0,'name','NAME',options,charset).candidate.channelList[0][0].pttid,199);assert.equal(inlineChannelEdit(data,data,0,'pttid',199,options,charset).changed,false);assert.throws(()=>inlineChannelEdit(data,data,0,'pttid',200,options,charset));
});
test('bulk moves form a stable contiguous block and preview every displaced channel',()=>{
 const data=fixture();for(let i=0;i<999;i++)data.channelList[0][i]={...data.channelList[0][0],name:'CH'+(i+1)};data.channelList[0][999].name='EXTRA';const before=structuredClone(data);
 const result=planChannelMove(data,[11,2,6],99);assert.deepEqual(result.candidate.channelList[0].slice(99,102).map(c=>c.name),['CH3','CH7','CH12']);assert.ok(result.displaced>0);assert.equal(result.start,100);assert.equal(result.end,102);
 const expected=data.channelList[0].slice(0,999).filter((_,i)=>![2,6,11].includes(i)).map(c=>c.name);assert.deepEqual(result.candidate.channelList[0].slice(0,999).filter((_,i)=>i<99||i>101).map(c=>c.name),expected);
 assert.equal(new Set(result.candidate.channelList[0].slice(0,999).map(c=>c.name)).size,999);assert.deepEqual(result.candidate.channelList[0][999],data.channelList[0][999]);assert.deepEqual(data,before);
 assert.equal(planChannelMove(data,[998],0).candidate.channelList[0][0].name,'CH999');assert.equal(planChannelMove(data,[0],998).candidate.channelList[0][998].name,'CH1');
 for(const [indices,to]of [[[0,1],998],[[0],999],[[0,0],10],[[],0],[[-1],0]])assert.throws(()=>planChannelMove(data,indices,to));
});
test('bulk movement preserves imported records and empty slots without guessing values',()=>{
 const data=fixture();data.channelList[0][0].pttid=199;data.channelList[0][50]=structuredClone(data.channelList[0][0]);data.channelList[0][998]=structuredClone(data.channelList[0][2]);
 const r=planChannelMove(data,[0,50,998],100);assert.deepEqual(r.candidate.channelList[0].slice(100,103),[data.channelList[0][0],data.channelList[0][50],data.channelList[0][998]]);assert.throws(()=>planChannelMove(data,[1],5),/occupied/);
});
