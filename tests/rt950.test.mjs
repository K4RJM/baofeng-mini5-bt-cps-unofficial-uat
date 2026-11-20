import test from 'node:test';
import assert from 'node:assert/strict';
import {BLOCK, EMPTY_REC, LAYOUTS, ZN_ADDR, planWrites} from '../scripts/rt950-core.mjs';
import {appendCsv,blankImage,channel,editRecord,openBackup,overlayChanges,record,renameZone,saveBackup,zoneName} from '../scripts/rt950-channels.mjs';

const sample={name:'LOCAL',rx:'146.52000',tx:'',rxTone:'D023I',txTone:'100.0',mode:'NFM',power:'Medium',scan:true};
const copy=i=>({...i,ch:i.ch.slice(),zn:i.zn.slice()});
test('RT-950 channel fields round-trip and unrelated bytes survive edits',()=>{
 const bytes=editRecord(EMPTY_REC,sample);
 assert.deepEqual(channel(bytes),sample);
 bytes[16]=91;bytes[15]|=32;
 const edit=editRecord(bytes,{tx:'146.12000',name:'REPEATER'});
 assert.equal(edit[15]&32,32);assert.equal(edit[16],91);
 assert.deepEqual(channel(edit),{...sample,name:'REPEATER',tx:'146.12000'});
 assert.throws(()=>editRecord(bytes,{name:'This is too long'}));
 assert.throws(()=>editRecord(bytes,{rx:'146.500001'}));
 assert.throws(()=>editRecord(bytes,{rxTone:'invalid'}));
});
test('RT-950 layout boundaries, zone names and high channels',()=>{
 const orig=blankImage(),draft=copy(orig);
 assert.throws(()=>record(orig,'960',960));
 assert.equal(LAYOUTS['990'].zones*LAYOUTS['990'].per,990);
 const last=record(draft,'990',989);last.set(editRecord(last,sample));
 renameZone(draft,'990',10,'LOCAL');assert.equal(zoneName(draft,'990',10),'LOCAL');
 assert.throws(()=>renameZone(draft,'960',10,'LOCAL'));
 assert.throws(()=>planWrites(orig,draft,'990',false));
 const blocks=planWrites(orig,draft,'990',true);
 assert.deepEqual(blocks.map(b=>b.addr),[0x7b80,ZN_ADDR+BLOCK]);
 assert.deepEqual(blocks[0].data.slice(64),orig.ch.slice(0x7bc0,0x7c00));
});
test('RT-950 backup restore touches only mapped records and merges offline edits',()=>{
 const radio=blankImage(),backup=copy(radio);
 radio.ch[19]=88;radio.ch[0x7bf0]=7;radio.zn[238]=9;
 record(radio,'990',0).set(editRecord(EMPTY_REC,sample));radio.ch[19]=88;
 const old=copy(radio),next=copy(old);next.ch.set(editRecord(record(old,'990',0),{name:'CHANGED'}));
 const fresh=copy(radio);fresh.ch[17]=92;
 const merged=overlayChanges(fresh,old,next,'990');
 assert.equal(merged.ch[17],92);assert.equal(channel(record(merged,'990',0)).name,'CHANGED');
 backup.ch.set(editRecord(EMPTY_REC,sample));backup.ch[19]=44;backup.zn[238]=10;
 const restored=overlayChanges(radio,radio,backup,'990');
 assert.equal(restored.ch[19],88);assert.equal(restored.ch[0x7bf0],7);assert.equal(restored.zn[238],9);
 const saved=saveBackup(radio,'960');assert.deepEqual(openBackup(saved,'990'),{layout:'960',image:radio});
 const bad=JSON.parse(saved);bad.segments.C000='00';assert.throws(()=>openBackup(JSON.stringify(bad),'960'));
 bad.model='MINI-5';assert.throws(()=>openBackup(JSON.stringify(bad),'960'));
});
test('RT-950 CSV targets named zones, skips digital and fails atomically on overflow',()=>{
 const image=blankImage(),csv='Name,Frequency,Duplex,Offset,Mode,Power\nLOCAL,147.00000,+,0.6,FM,High\nDigital,440.00000,,,DMR,High';
 const {image:out,count,skipped}=appendCsv(image,'990',1,csv,'Zone03_LOCAL.csv');
 assert.equal(zoneName(out,'990',3),'LOCAL');assert.equal(count,1);assert.equal(skipped,1);assert.equal(channel(record(out,'990',198)).tx,'147.60000');
 assert.equal(channel(record(image,'990',198)).rx,'');assert.throws(()=>appendCsv(image,'960',1,csv,'Zone16_LOCAL.csv'));
 const many='Name,Frequency\n'+Array(100).fill('A,146.52').join('\n');
 assert.throws(()=>appendCsv(image,'990',1,many,'Zone01_LOCAL.csv'));
 assert.equal(channel(record(image,'990',0)).rx,'');
});
