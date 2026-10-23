import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readImage,readImageFile,exportChirpImage,CHIRP_MAGIC,MAX_IMAGE_BYTES} from '../image-files.mjs';
import {crypt} from '../radio-encoder.mjs';
import {decodeRadio} from '../radio-decoder.mjs';
import {makePlan} from '../writer.mjs';
import {imageFile,SIZE} from '../read-test/memory.mjs';
import {fixture,options,schemas} from './fixtures.mjs';
import {writeDat} from '../dat.mjs';
import {appHarness} from './app-harness.mjs';
const raw=()=>makePlan(fixture(),options).target;
function metadataImage(memory,metadata={vendor:'Baofeng',model:'UV-5R Mini',variant:''},trailer=false){
 const header=trailer?imageFile(memory):memory,meta=new TextEncoder().encode(btoa(JSON.stringify(metadata))),out=new Uint8Array(header.length+CHIRP_MAGIC.length+meta.length);out.set(header);out.set(CHIRP_MAGIC,header.length);out.set(meta,header.length+CHIRP_MAGIC.length);return out;
}
test('Studio encoded and CHIRP decoded images load the same configuration',()=>{
 const r=raw(),plain=crypt(r),expected=writeDat(decodeRadio(r),schemas);
 for(const bytes of [imageFile(r),imageFile(plain),metadataImage(plain),metadataImage(plain,undefined,true)])assert.deepEqual(writeDat(readImage(bytes).data,schemas),expected);
 assert.equal(readImage(imageFile(r)).format,'Mini 5 Studio');assert.equal(readImage(metadataImage(plain)).format,'CHIRP');
});
test('unchanged image export preserves all memory, including opaque bytes and channel 1000',()=>{
 const r=raw();r[0x7d20]=123;r[0x8040+24]=9;r[999*32]=1; // intentionally retained extra record; never programmed
 // Keep frequency data valid for the stored extra record.
 r.set(r.subarray(0,32),999*32);const data=decodeRadio(r),before=r.slice();
 const result=exportChirpImage(data,options,{raw:r,baseline:structuredClone(data)});
 assert.deepEqual(result.slice(0,SIZE),crypt(before));assert.deepEqual(readImage(result).raw,before);assert.deepEqual(r,before);
 assert.throws(()=>exportChirpImage({...data,funCfgs:{...data.funCfgs,sql:2}},options,{raw:r,baseline:data}),/Channel 1000/);
});
test('edited CHIRP export uses validated existing CPS layout and survives reimport',()=>{
 const data=fixture();data.channelList[0][998]={...data.channelList[0][0],name:'LAST',rxFreq:'446.00000',txFreq:'446.00000'};
 const exported=exportChirpImage(data,options),loaded=readImage(exported);
 assert.equal(loaded.data.channelList[0][998].name,'LAST');assert.equal(loaded.data.channelList[0][0].rxFreq,'146.52000');
 const expected=crypt(makePlan(data,options).target);expected[0x8062]=0; // file export does not force Wireless CPS on
 assert.deepEqual(exported.slice(0,SIZE),expected);
 assert.deepEqual(makePlan(loaded.data,options).target,makePlan(data,options).target);
 data.channelList[0][0].rxFreq='999.99999';assert.throws(()=>exportChirpImage(data,options),/frequency/i);
});
test('wrong-model, truncated, malformed, oversized, and unidentified images are rejected',async()=>{
 const plain=crypt(raw());for(const model of ['UV-5R','UV-5G Mini','UV-17Pro'])assert.throws(()=>readImage(metadataImage(plain,{vendor:'Baofeng',model})),/different model/);
 for(const bytes of [plain,plain.slice(1),new Uint8Array(MAX_IMAGE_BYTES+1),new Uint8Array(SIZE+10),metadataImage(plain).slice(0,-1)])assert.throws(()=>readImage(bytes));
 const malformed=metadataImage(plain);malformed[SIZE+CHIRP_MAGIC.length]=33;assert.throws(()=>readImage(malformed),/metadata/);
 let read=false;await assert.rejects(readImageFile({size:MAX_IMAGE_BYTES+1,arrayBuffer(){read=true;}}));assert.equal(read,false);
 const broken=metadataImage(plain);broken[0]=0xfa;assert.throws(()=>readImage(broken),/frequency/);
});
test('actual image import/export handlers are passive, atomic, and retain native DAT support',async()=>{
 const h=await appHarness();try{
  const bytes=imageFile(raw());h.get('file').files=[{name:'test.IMG',size:bytes.length,arrayBuffer:async()=>bytes.buffer}];await h.get('file').onchange();
  assert.equal(h.get('sourceTag').textContent,'Mini 5 Studio image loaded');assert.equal(h.connections.length,0);
  h.get('saveImg').click();const saved=new Uint8Array(await h.downloads.at(-1).arrayBuffer());assert.deepEqual(readImage(saved).raw,raw());
  const before=await h.exported();h.get('file').files=[{name:'bad.img',size:12,arrayBuffer:async()=>new ArrayBuffer(12)}];await h.get('file').onchange();assert.deepEqual(await h.exported(),before);assert.equal(h.connections.length,0);
  await h.open();assert.equal(h.get('sourceTag').textContent,'CPS file loaded');h.get('saveImg').click();assert.equal(readImage(new Uint8Array(await h.downloads.at(-1).arrayBuffer())).format,'CHIRP');
 }finally{h.close();}
});

test('ambiguous legacy encoding is rejected instead of guessed',()=>{
 const b=new Uint8Array(SIZE).fill(255);b[0x7d80]=12;
 assert.throws(()=>readImage(imageFile(b)),/Ambiguous legacy/);
});
