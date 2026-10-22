import {test} from 'node:test';
import assert from 'node:assert/strict';
import {appHarness} from './app-harness.mjs';
test('contrast toggle persists independently of theme and never connects',async()=>{
 const saved=new Map();const storage={getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)};
 let h=await appHarness({storage});
 try{
  assert.equal(h.get('highContrast')['aria-pressed'],'false');h.get('highContrast').click();
  assert.equal(h.document.documentElement.dataset.highContrast,'true');assert.equal(saved.get('mini5-high-contrast'),'true');
  h.get('theme').value='dark';h.get('theme').onchange();assert.equal(h.get('highContrast')['aria-pressed'],'true');
  assert.equal(h.connections.length,0);
 }finally{h.close();}
 h=await appHarness({storage});try{assert.equal(h.get('highContrast')['aria-pressed'],'true');h.get('highContrast').click();assert.equal(saved.get('mini5-high-contrast'),'false');}finally{h.close();}
});
test('contrast remains usable when browser preference storage is unavailable',async()=>{
 const h=await appHarness({storage:{getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}}});
 try{h.get('highContrast').click();assert.equal(h.get('highContrast')['aria-pressed'],'true');h.get('highContrast').click();assert.equal(h.get('highContrast')['aria-pressed'],'false');}finally{h.close();}
});
