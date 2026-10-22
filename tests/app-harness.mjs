import {mountManuals} from '../help-manuals.mjs';
import {inlineChannelEdit,planChannelMove,channelKeys} from '../channel-workspace.mjs';
import {mountChannelCell} from '../channel-inline-ui.mjs';
// Real application handlers with an isolated DOM/transport double. No hardware access.
import fs from 'node:fs';
import vm from 'node:vm';
import * as dat from '../dat.mjs';
import {validateEdits} from '../validation.mjs';
import {Writer,makePlan,verificationMessage} from '../writer.mjs';
import * as decoder from '../radio-decoder.mjs';
import * as channels from '../channels.mjs';
import * as fields from '../fields.mjs';
import {renderRadioTutorial} from '../radio-help.mjs';
import {openChannelAppend} from '../channel-import-ui.mjs';
import {releaseAfterAcknowledgedWrite} from '../connection-recovery.mjs';
import {simulatedRadio} from './simulate.mjs';
import {schemas,fixture} from './fixtures.mjs';

export async function appHarness({storage={getItem(){},setItem(){}}}={}){
 const nodes=new Map(),events=new Map(),connections=[],downloads=[],faults={};let radio;
 class Element{
  constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.listeners={};this.value='';this.checked=false;this.classList={toggle(){},add(){},remove(){}};this.style={};this.scrollTop=0;this.scrollLeft=0;this.scrollHeight=2200;}
  set id(value){this._id=value;nodes.set(value,this);}get id(){return this._id;}
  closest(selector){return selector.split(',').includes(this.tag)?this:null;}
  select(){}
  querySelector(s){return this.querySelectorAll(s)[0]||null;}
  focus(options){this.focusOptions=options;}
  append(...xs){this.children.push(...xs);}replaceChildren(...xs){this.children=xs;}setAttribute(k,v){this[k]=v;}
  get lastChild(){return this.children.at(-1);}
  addEventListener(k,f){(this.listeners[k]??=[]).push(f);}
  checkValidity(){return !this.invalid;}reportValidity(){return !this.invalid;}
  showModal(){this.open=true;}close(){this.open=false;for(const fn of this.listeners.close||[])fn();}
  click(){if(!this.disabled)return this.onclick?.();}
  set innerHTML(value){this.html=value;for(const match of value.matchAll(/id="([^"]+)"/g))nodes.set(match[1],new Element('input'));}
  get innerHTML(){return this.html;}
  querySelectorAll(selector){return this.children.filter(x=>x instanceof Element).flatMap(x=>[...((selector==='[data-key]'&&x.dataset.key)||(selector===x.tag)?[x]:[]),...x.querySelectorAll(selector)]);}
 }
 const get=id=>{if(!nodes.has(id))nodes.set(id,new Element(id));return nodes.get(id);};
 const document={getElementById:get,createElement:tag=>new Element(tag),documentElement:new Element('html'),addEventListener(){}};
 const window={isSecureContext:true,scrollX:0,scrollY:0,scrollTo(){},addEventListener(name,fn){events.set(name,fn);}};
 class TestWriter extends Writer{
  constructor(){super();radio=this;}
  async connect(){connections.push(simulatedRadio(this,faults.transport));}
 }
 const previousDocument=globalThis.document;globalThis.document=document;
 const context=vm.createContext({inlineChannelEdit,planChannelMove,channelKeys,mountChannelCell,document,window,navigator:{bluetooth:{},userAgent:'test-double'},localStorage:storage,structuredClone,Blob,Uint8Array,console,Date,URL:{createObjectURL(blob){downloads.push(blob);return 'mock';},revokeObjectURL(){}},setTimeout(){},setInterval(){},confirm:()=>true,fetch:async path=>({json:async()=>JSON.parse(fs.readFileSync(new URL('../'+path,import.meta.url)))}),...dat,...decoder,...channels,...fields,validateEdits,Writer:TestWriter,makePlan,verificationMessage,renderRadioTutorial,mountManuals,openChannelAppend,releaseAfterAcknowledgedWrite,decodeRadio:raw=>{if(faults.decode)throw Error('Injected decode failure');return decoder.decodeRadio(raw);}});
 try{const source=fs.readFileSync(new URL('../app.mjs',import.meta.url),'utf8').replace(/^import .*$/gm,'');await vm.runInContext('(async()=>{'+source+'})()',context);}
 catch(error){globalThis.document=previousDocument;throw error;}
 return {
  get,radio,connections,downloads,faults,document,
  async open(data=fixture()){const bytes=dat.writeDat(data,schemas);get('file').files=[{name:'test.dat',size:bytes.length,arrayBuffer:async()=>bytes}];await get('file').onchange();},
  tab(name){get('tabs').querySelectorAll('button').find(button=>button.textContent.includes(name)).click();},
  row(index){return get('content').querySelectorAll('tr').find(row=>row.dataset.channelIndex===String(index));},
  field(key,root='content'){return get(root).querySelectorAll('[data-key]').find(input=>input.dataset.key===key);},
  enter(key,value,root='fields'){const input=this.field(key,root);if(!input)throw Error('Missing field '+key);input.value=value;for(const fn of input.listeners.input||[])fn();for(const fn of input.listeners.change||[])fn();input.onchange?.();},
  button(label){return get('content').querySelectorAll('button').find(button=>button.textContent===label);},
  unloadBlocked(){let prevented=false;events.get('beforeunload')?.({preventDefault(){prevented=true;}});return prevented;},
  async exported(){get('save').click();return dat.readDat(new Uint8Array(await downloads.at(-1).arrayBuffer()),schemas);},
  async report(){get('help').click();get('report').click();return JSON.parse(await downloads.at(-1).text());},
  close(){if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;}
 };
}
