import {test} from 'node:test';
import assert from 'node:assert/strict';
import {appHarness} from './app-harness.mjs';
import {fixture} from './fixtures.mjs';

test('F02: editor exposes confirmed values and preserves unknown saved codes',async()=>{
 const app=await appHarness();
 try{
  const data=fixture();data.funCfgs.pttDly=28;Object.assign(data.vfos,{vfopttid:3,vfoASQMode:2,vfoBSQMode:2});
  await app.open(data);app.tab('Optional');
  assert.equal(app.field('pttDly').value,'28');
  assert.ok(app.field('pttDly').children.some(o=>o.value==='28'&&o.textContent==='3000 ms'));
  app.tab('VFO');for(const [key,value]of [['vfopttid','3'],['vfoASQMode','2'],['vfoBSQMode','2']]){
   const field=app.field(key);assert.equal(field.value,value);assert.ok(field.children.some(o=>o.value===value));
  }
  assert.deepEqual((await app.exported()).vfos,data.vfos);
  data.funCfgs.pttDly=255;await app.open(data);app.tab('Optional');
  assert.equal(app.field('pttDly').value,'255');assert.match(app.field('pttDly').children[0].textContent,/Unrecognized saved value.*preserved/);
  assert.equal((await app.exported()).funCfgs.pttDly,255);
 }finally{app.close();}
});
