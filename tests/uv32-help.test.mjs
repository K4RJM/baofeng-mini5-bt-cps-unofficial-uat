import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderUv32Help} from '../scripts/uat-uv32-help.mjs';

class Element{
 constructor(tag,text=''){this.tag=tag;this.textContent=text;this.children=[];this.dataset={};this.style={};this.classList={toggle(){},contains(){return false;}};}
 append(...items){this.children.push(...items);}replaceChildren(...items){this.children=items;}setAttribute(key,value){this[key]=value;}
 querySelectorAll(tag){return this.children.filter(x=>x instanceof Element).flatMap(x=>[...(x.tag===tag?[x]:[]),...x.querySelectorAll(tag)]);}
}
const textOf=node=>[node.textContent||'',...node.children.map(textOf)].join(' ');

test('UV-32 help distinguishes programmable SK1 from fixed SK2 actions',()=>{
 const document={createElement:tag=>new Element(tag),createTextNode:text=>new Element('#text',text)};
 const root=new Element('main');renderUv32Help(document,root);
 const buttons=root.querySelectorAll('button'),panel=root.querySelectorAll('section').find(x=>x.id==='uv32RadioTutorialPanel');
 buttons.find(x=>x.dataset.radioKey==='sk1').onclick();
 assert.match(textOf(panel),/only UV-32 side-key action identified as customizable/i);
 assert.deepEqual(panel.querySelectorAll('strong').map(x=>x.textContent),['FM broadcast radio — ','Channel scan — ','Frequency search — ','VOX — ']);
 buttons.find(x=>x.dataset.radioKey==='sk2').onclick();
 assert.match(textOf(panel),/sweep function/i);assert.match(textOf(panel),/fixed/i);assert.match(textOf(panel),/opening the squelch/i);
 assert.doesNotMatch(textOf(root),/Skey2 Short|SK2 shortcut selector/);
});
