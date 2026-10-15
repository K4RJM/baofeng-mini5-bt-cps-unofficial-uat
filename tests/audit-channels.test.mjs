import {test} from 'node:test';
import assert from 'node:assert/strict';
import {moveChannel,insertChannel,removeChannels,emptyChannel} from '../channels.mjs';
import {readDat,writeDat} from '../dat.mjs';
import {fixture,channel,schemas} from './fixtures.mjs';

test('F13: deterministic varied channel layouts preserve order, unrelated settings and native records',()=>{
 let seed=1729;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
 for(let sample=0;sample<32;sample++){
  const source=fixture();source.channelList[0]=Array.from({length:999},(_,i)=>random()<0.2?emptyChannel():channel('CH'+(i+1)));
  source.channelList[0].push({...emptyChannel(),id:sample,name:'EXTRA'});
  const from=Math.floor(random()*999),to=Math.floor(random()*999),expected=structuredClone(source.channelList[0]);
  expected.splice(to,0,...expected.splice(from,1));const moved=moveChannel(source,from,to);
  assert.deepEqual(moved.channelList[0],expected);assert.deepEqual(moveChannel(moved,to,from),source);
  const start=Math.floor(random()*900),end=source.channelList[0].findIndex((c,i)=>i>=start&&i<999&&!c.rxFreq);
  if(end>=0){const copy=structuredClone(source.channelList[0]),added=channel('INSERT');copy.splice(end,1);copy.splice(start,0,added);assert.deepEqual(insertChannel(source,start,added).channelList[0],copy);}
  const deleted=[0,Math.floor(random()*999),998],compacted=removeChannels(source,deleted,true);
  assert.deepEqual(compacted.channelList[0].slice(0,999).filter(c=>c.rxFreq),source.channelList[0].slice(0,999).filter((c,i)=>c.rxFreq&&!deleted.includes(i)));
  for(const result of [moved,compacted]){
   assert.deepEqual(result.channelList[0][999],source.channelList[0][999]);
   for(const key of ['funCfgs','vfos','dtmfs'])assert.deepEqual(result[key],source[key]);
   assert.deepEqual(readDat(writeDat(result,schemas),schemas),result);
  }
 }
});
