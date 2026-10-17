import {test} from 'node:test';import assert from 'node:assert/strict';
import {decodeRadio} from '../radio-decoder.mjs';import {encodeChannel,crypt,vfoBlock} from '../radio-encoder.mjs';
// Literal evidence already published in F02/F03/F06. FF filler is synthetic,
// intentionally not a complete valid configuration or a whole-image oracle.
const capture=()=>{const b=new Uint8Array(33344).fill(255);b.set(Buffer.from('006f6523006f65230000000000000100ffffffff057f3663061c54ffffffffff','hex'),2240);b.set(Buffer.from('4047093e4a47073200000000ff001000000000360000000000000000ffffffff','hex'),0x8000);b[0x804c]=0x5f;b[0x804b]=0x34;b[0x801b]=0x35;return b;};
test('F13 decoder consumes literal hardware slices without encoder-generated input',()=>{
 const b=capture(),d=decodeRadio(b),c=d.channelList[0][70];
 assert.deepEqual([c.name,c.rxFreq,c.txFreq,c.txPower],['F06TEST','146.52000','146.52000',1]);
 assert.deepEqual([d.funCfgs.pttDly,d.vfos.vfopttid,d.vfos.vfoASQMode,d.vfos.vfoADir,d.vfos.vfoASignalGroup],[28,3,2,1,16]);
 assert.deepEqual(Buffer.from(crypt(encodeChannel(c))),Buffer.from(b.slice(2240,2272)));
});
test('F13 accepted F03 collision is pinned to independent constant 0x10',()=>{
 const d=decodeRadio(capture());for(const [dir,group]of [[0,16],[1,0],[1,16]]){d.vfos.vfoADir=dir;d.vfos.vfoASignalGroup=group;assert.equal(vfoBlock(d.vfos,'A')[14],0x10);}
});
