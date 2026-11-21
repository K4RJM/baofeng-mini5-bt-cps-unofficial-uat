import test from 'node:test';
import assert from 'node:assert/strict';
import {importChannels} from '../scripts/rt950-import.mjs';
import {blankImage,channel,record,editRecord,renameZone,zoneName,overlayChanges,saveBackup,openBackup} from '../scripts/rt950-channels.mjs';
import {workspaceBlocks} from '../scripts/rt950-workspace.mjs';
import {readCsvFile} from '../csv-import.mjs';
import {csvFixture} from './csv-fixtures.mjs';
import {options} from './fixtures.mjs';

function occupied(layout,slots){
 const image=blankImage();
 for(const i of slots){
  const bytes=record(image,layout,i-1);
  bytes.set(editRecord(bytes,{rx:'145.00000',name:'OLD'+i}));
 }
 return image;
}

async function preview(image,layout,replacing,locations,modelName='RT-950 Pro'){
 const rows=locations.map(Location=>({Location,Name:'REPEATER'}));
 const file=new File([csvFixture('chirp',rows[0],rows.slice(1))],'repeaters.csv');
 let output;
 const dialog=importChannels({image,layout,zone:3,modelName,replacing,files:[file],apply:next=>{output=next;},
  fileTools:{openChannelAppend:config=>config,readChannelFile:(f,prefs)=>readCsvFile(f,{...prefs,options})}});
 const parsed=await dialog.readFile(file,{defaultPower:1});
 assert.equal(parsed.channels.length,rows.length);
 const plan=dialog.bankImport.plan(dialog.getData(),parsed.channels,{placement:'3',skipDuplicates:dialog.bankImport.skipDuplicates});
 if(!plan.error)dialog.onApply(null,plan);
 return {output,plan,mode:dialog.mode};
}

for(const [layout,per,model] of [['960',64,'RT-950 Pro'],['990',99,'BJ-9000']]){
 test(model+' replaces in numbered slots and clears old channels',async()=>{
  const before=occupied(layout,[1,2,per*2]);
  if(layout==='990')renameZone(before,layout,2,'LOCAL');
  const {output,mode,plan}=await preview(before,layout,true,[per+1,1,per],model);
  assert.equal(mode,'replace');
  assert.deepEqual(plan.slots,[per+1,1,per]);
  for(const i of plan.slots)assert.equal(channel(record(output,layout,i-1)).name,'REPEATER');
  for(const i of [2,per*2])assert.equal(channel(record(output,layout,i-1)).rx,'');
  assert.equal(channel(record(before,layout,1)).name,'OLD2');
  if(layout==='990')assert.equal(zoneName(output,layout,2),'LOCAL');
  const saved=openBackup(saveBackup(output,layout,undefined,true),layout);
  assert.equal(saved.image.replaceChannelList,true);
  const fresh=occupied(layout,[per*3]);
  const merged=overlayChanges(fresh,blankImage(),saved.image,layout);
  assert.equal(channel(record(merged,layout,per*3-1)).rx,'');
  for(const state of [undefined,{baseline:blankImage(),complete:false}]){
   const imported=(await preview(blankImage(),layout,true,[1],model)).output;
   const blocks=workspaceBlocks(imported,layout,false,state);
   assert.equal(blocks.length,layout==='960'?240:248);
   assert(blocks.every(b=>!b.region&&b.addr<0x7c00));
   if(layout==='990')assert.equal(blocks.at(-1).preserveFrom,64);
  }
 });
}
test('append keeps holes, row order and repeats across a zone boundary',async()=>{
 const image=occupied('960',[1,63]);
 const {plan,mode,output}=await preview(image,'960',false,[25,3,25]);
 assert.equal(mode,'append');assert.deepEqual(plan.slots,[64,65,66]);
 assert.equal(channel(record(output,'960',1)).rx,'');
 assert.equal(channel(record(output,'960',62)).name,'OLD63');
 assert.equal(plan.duplicates,0);
 const full=occupied('960',[960]);
 const overflow=await preview(full,'960',false,[1,2]);
 assert.deepEqual(overflow.plan.slots,[]);
 assert.equal(overflow.output.overflow.length,2);
});
test('duplicate CHIRP destination requires correction before replacement',async()=>{
 const {output,plan}=await preview(blankImage(),'960',true,[2,2]);
 assert.match(plan.error,/Location 2/);assert.equal(output,undefined);
});
