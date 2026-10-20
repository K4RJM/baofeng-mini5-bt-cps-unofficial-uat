import test from 'node:test';
import assert from 'node:assert/strict';
import {mountManuals,guideURL,baofengManualURL} from '../help-manuals.mjs';
test('Manual viewer retains one frame across expansion and close, restores focus and links to the official manufacturer manual',()=>{
 const previous=globalThis.document;let active;
 class Element{constructor(tag){this.tag=tag;this.children=[];this.hidden=false;this.classes=new Set();this.classList={toggle:(key,on)=>on?this.classes.add(key):this.classes.delete(key)};}append(...a){this.children.push(...a);}prepend(...a){this.children.unshift(...a);}setAttribute(k,v){this[k]=v;}focus(){active=this;}}
 globalThis.document={createElement:tag=>new Element(tag)};
 try{
  const workspace=new Element('div'),tutorial=new Element('div'),references=new Element('div');
  const v=mountManuals(workspace,tutorial,references),frame=v.pdf;
  assert.equal(v.viewer.hidden,true);assert.equal(v.pdf.src,undefined);
  const official=references.children[0].children.find(x=>x.id==='baofengManual');assert.equal(official.href,baofengManualURL);assert.equal(official.target,'_blank');assert.equal(official.rel,'noopener');
  v.select.value='baofeng';v.select.onchange();assert.equal(v.pdf.src,undefined);
  v.select.value='hamrx';v.select.onchange();assert.equal(v.pdf.src,guideURL);assert.equal(v.viewer.hidden,false);assert.equal(active,v.expand);
  v.expand.onclick();assert.equal(tutorial.hidden,true);assert(workspace.classes.has('manual-expanded'));
  v.expand.onclick();assert.equal(tutorial.hidden,false);assert.equal(v.pdf,frame);assert.equal(v.pdf.src,guideURL);
  v.close.onclick();assert.equal(v.viewer.hidden,true);assert.equal(active,v.select);assert.equal(v.pdf,frame);
  v.select.value='hamrx';v.select.onchange();assert.equal(v.pdf,frame);assert.equal(v.pdf.src,guideURL);
 }finally{globalThis.document=previous;}
});
