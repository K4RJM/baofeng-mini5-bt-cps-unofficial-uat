import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readUv32ChirpImage,saveUv32ChirpImage,importUv32ChannelPlan,uv32ChannelList} from '../scripts/uv32-files.mjs';
import {UV32_IMAGE_BYTES} from '../scripts/uat-uv32-image.mjs';
import {editUv32Channel} from '../scripts/uat-uv32-edit.mjs';

const blank=()=>new Uint8Array(UV32_IMAGE_BYTES).fill(255);
const channel={name:'TEST',rxFreq:'146.52000',txFreq:'',strRxCtsDcs:'OFF',strTxCtsDcs:'110.9',txPower:1,bandwide:0,scanAdd:1};

test('UV-32 CHIRP export round-trips all image bytes and rejects another model',()=>{
 const memory=editUv32Channel(blank(),1000,{name:'LAST',rx:'146.52000',tx:'Off'});
 memory[0x8040]=3;
 const file=saveUv32ChirpImage(memory);
 assert.deepEqual(readUv32ChirpImage(file),memory);
 assert.throws(()=>readUv32ChirpImage(file.subarray(0,UV32_IMAGE_BYTES)),/CHIRP image/);
 const metadataAt=UV32_IMAGE_BYTES+13;
 const wrong=new Uint8Array(file);
 wrong.set(new TextEncoder().encode(btoa(atob(new TextDecoder().decode(file.subarray(metadataAt))).replace('UV-32','UV-17'))),metadataAt);
 assert.throws(()=>readUv32ChirpImage(wrong),/does not identify a Baofeng UV-32/);
});

test('UV-32 replace and append preserve configuration bytes and validate placement',()=>{
 const base=editUv32Channel(blank(),1,{name:'ORIGINAL',rx:'146.52000',tx:'Off'});
 base[0x8040]=4;
 const appended=importUv32ChannelPlan(base,{start:1000,channels:[channel]},false);
 const records=uv32ChannelList(appended);
 assert.equal(records[999].txFreq,'');
 assert.equal(records[999].strTxCtsDcs,'110.9');
 assert.deepEqual(appended.subarray(32000),base.subarray(32000));
 assert.throws(()=>importUv32ChannelPlan(base,{start:1,channels:[channel]},false),/empty destination/);
 const replaced=importUv32ChannelPlan(appended,{start:1,channels:[records[999]]},true);
 assert.deepEqual(replaced.slice(0,32),appended.slice(999*32,1000*32));
 assert.equal(uv32ChannelList(replaced)[999].rxFreq,'');
 assert.deepEqual(replaced.subarray(32000),base.subarray(32000));
});
