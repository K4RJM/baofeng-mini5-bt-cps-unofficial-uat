import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readUv32ChirpImage,saveUv32ChirpImage,importUv32ChannelPlan,uv32ChannelList,planUv32Import,stageUv32Import,removeUv32Channels,editPendingUv32Channel} from '../scripts/uv32-files.mjs';
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

test('UV-32 keeps excess analog rows editable and fills freed bank slots without shifting other records',()=>{
 const image=blank(),list=uv32ChannelList(image);
 const source=Array.from({length:1003},(_,i)=>({...channel,name:'ROW '+(i+1)}));
 const plan=planUv32Import({channelList:[list]},source,{replacing:true});
 assert.equal(plan.error,'');assert.equal(plan.overflow,3);
 const staged=stageUv32Import(image,[],plan,true);
 assert.equal(staged.pending.length,3);
 assert.equal(uv32ChannelList(staged.image)[999].name,'ROW 1000');
 const pending=editPendingUv32Channel(staged.pending,1002,{name:'KEEP'});
 const reduced=removeUv32Channels(staged.image,pending,[100,101,1001]);
 assert.equal(reduced.pending.length,0);
 const result=uv32ChannelList(reduced.image);
 assert.deepEqual(result.slice(98,102).map(c=>c.name),['ROW 99','KEEP','ROW 1003','ROW 102']);
 assert.equal(staged.pending[1].row.name,'ROW 1002');
});

test('UV-32 append uses gaps across banks, wraps around and checks all staged channels for duplicates',()=>{
 const first=Array.from({length:1000},(_,i)=>({...channel,name:'N'+i}));
 const image=importUv32ChannelPlan(blank(),{channels:first,start:1},true);
 const cleared=removeUv32Channels(image,[],[1,999,1000]);
 const list=uv32ChannelList(cleared.image),source=Array.from({length:4},(_,i)=>({...channel,rxFreq:'145.'+String(10000+i),name:'X'+i}));
 const plan=planUv32Import({channelList:[list]},source,{placement:'10'});
 assert.deepEqual(plan.slots,[999,1000,1]);assert.equal(plan.overflow,1);
 const staged=stageUv32Import(cleared.image,[],plan,false);
 const repeat=planUv32Import({channelList:[uv32ChannelList(staged.image)],pending:staged.pending},source,{});
 assert.equal(repeat.duplicates,4);assert.equal(repeat.channels.length,0);
});

test('Whole source zones stay together when banks have room and the preview shows splits',()=>{
 const list=uv32ChannelList(blank());
 for(let i=70;i<1000;i++)if(i<100||i>=140)list[i]=channel;
 const group=(name,count)=>Array.from({length:count},(_,i)=>({...channel,name:name+i,sourceZone:name,sourceMemberOrder:i}));
 const plan=planUv32Import({channelList:[list]},[...group('Small',30),...group('Large',65),...group('Split',20)],{skipDuplicates:false});
 assert.deepEqual(plan.zoneSummary,['Large → Bank 1 (65)','Small → Bank 2 (30)','Split → Bank 2 (10) / Bank 1 (5) / 5 over capacity']);
 assert.equal(plan.overflow,5);
 assert.equal(new Set(plan.slots).size,110);
});
