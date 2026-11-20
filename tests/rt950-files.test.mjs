import test from 'node:test';
import assert from 'node:assert/strict';
import {openNative,saveNative} from '../scripts/rt950-native.mjs';
import {importChannels} from '../scripts/rt950-import.mjs';
import {workspaceBlocks} from '../scripts/rt950-workspace.mjs';
import {blankImage,channel,record,editRecord,saveBackup,openBackup,renameZone,zoneName} from '../scripts/rt950-channels.mjs';
import {editField,getValue,vfos,settings,dtmf,stationRows,aprs} from '../scripts/rt950-sections.mjs';
import {readCsvFile} from '../csv-import.mjs';
import {readRdtFile} from '../rdt-import.mjs';
import {csvFixture} from './csv-fixtures.mjs';
import {rdtFixture} from './rdt-fixtures.mjs';
import {options,fixture,schemas} from './fixtures.mjs';
import {readDatFile,writeDat} from '../dat.mjs';
import {readImageFile,exportChirpImage} from '../image-files.mjs';
import {editUv32Channel} from '../scripts/uat-uv32-edit.mjs';
import {UV32_IMAGE_BYTES} from '../scripts/uat-uv32-image.mjs';
import {saveUv32ChirpImage} from '../scripts/uv32-files.mjs';

test('Radtel factory DAT round-trips channels, zone names and each settings section',()=>{
 const fresh=openNative(saveNative(blankImage(),'990'));
 let image={...fresh.image,ch:fresh.image.ch.slice(),zn:fresh.image.zn.slice()};
 const slot=record(image,'990',989);
 slot.set(editRecord(slot,{rx:'145.50000',tx:'144.90000',name:'LOCAL',rxTone:'D023I',txTone:'110.9',power:'Medium'}));
 renameZone(image,'990',10,'HOME');
 const changes=[[settings.find(f=>f.key==='SQL'),'6'],[vfos[2].find(f=>f.key==='rxTone'),'100.0'],[dtmf[0],'98765'],
  [stationRows.SSB[2].find(f=>f.key==='beat'),'-315'],[stationRows.SSB[2].at(-1),'SHORTWAVE'],[aprs.find(f=>f.key==='call'),'K4RJM']];
 for(const [f,value] of changes)image=editField(image,f,value);
 const bytes=saveNative(image,'990',fresh.native),again=openNative(bytes);
 assert.equal(again.native.root.channelData.channelList[989].rxQT,'D023I');
 assert.equal(again.native.root.channelData.channelList[989].txQT,'110.9');
 assert.deepEqual(channel(record(again.image,'990',989)),channel(slot));
 assert.equal(zoneName(again.image,'990',10),'HOME');
 for(const [f,value] of changes)assert.equal(getValue(again.image[f.region],f),value);
 assert.deepEqual(openNative(saveNative(again.image,'990',again.native)).native.root,again.native.root);
 assert.throws(()=>openNative(bytes.subarray(0,900)));
 const partial=workspaceBlocks(again.image,'990',true).filter(b=>b.preserveFrom!==undefined);
 assert.deepEqual(partial.map(b=>[b.addr,b.preserveFrom]),[[0x7b80,64],[0xc080,32]]);
});

async function preview(file,layout='990'){
 let result;
 const tools={openChannelAppend:x=>x,readMiniFile:async f=>f.name.endsWith('.img')?(await readImageFile(f)).data:readDatFile(f,schemas),readChannelFile:(file,settings)=>(file.name.endsWith('.rdt')?readRdtFile:readCsvFile)(file,{...settings,options})};
 const dialog=importChannels({files:[file],layout,zone:1,image:blankImage(),fileTools:tools,apply:image=>{result=image;}});
 const parsed=await dialog.readFile(file,{defaultPower:1});
 assert.deepEqual(parsed.rows.filter(r=>r.error).map(r=>r.error),[]);
 const plan=dialog.bankImport.plan(dialog.getData(),parsed.channels,{placement:'1',skipDuplicates:false});
 dialog.onApply(null,plan);
 return {result,parsed};
}
for(const [profile,ext] of [['chirp','csv'],['rb','csv'],['anytone','csv'],['rt','csv'],['kenwood','tsv'],['hmk','hmk'],['rdt','rdt']]){
 test('RT-950 imports analog channels from '+profile,async()=>{
  const data=profile==='rdt'?rdtFixture({model:'D890UV',records:[{},{name:'DIGITAL',mode:1}]}):csvFixture(profile);
  const {result,parsed}=await preview(new File([data],'source.'+ext));
  assert.equal(parsed.channels.length,1);
  const ch=channel(record(result,'990',0));
  assert.deepEqual([ch.rx,ch.tx,ch.rxTone,ch.txTone],['145.50000','144.90000','110.9','110.9']);
  if(profile==='rdt')assert.equal(parsed.skippedDigital,1);
 });
}
test('legacy layout overflow remains in local workspace until pared down',async()=>{
 const csv=csvFixture('chirp',{},Array.from({length:960},(_,i)=>({Name:'R'+i})));
 const {result}=await preview(new File([csv],'source.csv'),'960');
 assert.equal(result.overflow.length,1);
 assert.equal(channel(record(result,'960',959)).name,'R958');
 assert.deepEqual(openBackup(saveBackup(result,'960')).image.overflow,result.overflow);
 assert.throws(()=>saveNative(result,'960'),/capacity/);
});

test('compatible Baofeng files keep analog memories including padded and Chinese names',async()=>{
 const mini=fixture();
 for(const [extension,bytes] of [['dat',writeDat(mini,schemas)],['img',exportChirpImage(mini,options)]]){
  const {result}=await preview(new File([bytes],'mini5.'+extension));
  assert.deepEqual([0,1].map(i=>channel(record(result,'990',i)).name),['TEST A','\u6d4b\u8bd5']);
 }
 const memory=editUv32Channel(new Uint8Array(UV32_IMAGE_BYTES).fill(255),1000,{name:'LAST',rx:'146.52000',tx:'Off'});
 const {result}=await preview(new File([saveUv32ChirpImage(memory)],'uv32.img'));
 assert.equal(channel(record(result,'990',0)).name,'LAST');
});
