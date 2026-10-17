// Optional offline replay of the 21 private factory DAT/diagnostic files supplied Oct 15.
// No device, browser or network API is called. Inputs are read only and never copied.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {readDat,writeDat} from '../dat.mjs';
import {decodeRadio} from '../radio-decoder.mjs';
import {crypt} from '../radio-encoder.mjs';
import {makePlan} from '../writer.mjs';

const directory=process.argv[2];
if(!directory)throw Error('Pass the directory containing the 21 October 15 evidence files.');
const json=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const manifest=json(new URL('../tests/evidence/oct15-private-files.json',import.meta.url));
const schemas=json(new URL('../schemas.json',import.meta.url));
const options={'KDH.Function':json(new URL('../function-options.json',import.meta.url)),...json(new URL('../editor-options.json',import.meta.url))};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const dats=new Map(),captures=new Map();
// Check booleans rather than dumping whole objects/buffers into assertion logs.
const same=(a,b,message)=>assert.ok(isDeepStrictEqual(a,b),message);
const target=data=>makePlan(data,options).target;
const differences=(a,b)=>{assert.equal(a.length,b.length);return [...a.keys()].filter(i=>a[i]!==b[i]);};
function changedPaths(a,b,prefix=''){
 if(isDeepStrictEqual(a,b))return [];
 if(a&&b&&typeof a==='object'&&typeof b==='object')return [...new Set([...Object.keys(a),...Object.keys(b)])].flatMap(key=>changedPaths(a[key],b[key],prefix?prefix+'.'+key:key));
 return [prefix];
}
const occupied=data=>data.channelList[0].filter(channel=>Boolean(channel.rxFreq)).length;

for(const entry of manifest.files){
 const bytes=fs.readFileSync(path.join(directory,entry.name));
 assert.equal(bytes.length,entry.bytes,entry.name+': size changed');
 assert.equal(sha(bytes),entry.sha256,entry.name+': fingerprint changed; review provenance before updating');
 if(entry.name.endsWith('.dat')){
  const data=readDat(bytes,schemas);
  same(readDat(writeDat(data,schemas),schemas),data,entry.name+': native DAT semantic round trip');
  dats.set(entry.name,data);
 }else{
  const diagnostic=JSON.parse(bytes.toString('utf8'));
  const hex=diagnostic.latestRead?.rawHex;
  assert.ok(typeof hex==='string'&&/^[a-f0-9]{66688}$/i.test(hex),entry.name+': complete raw capture required');
  captures.set(entry.name,new Uint8Array(Buffer.from(hex,'hex')));
 }
}
assert.equal(dats.size,16);assert.equal(captures.size,5);

// Independent factory input + complete raw output, not a self-generated raw oracle.
const pairs=[
 ['F02-COMBINED-TEST.dat','F02-AFTER.json'],
 ['F03-COMBINED-TEST.dat','F03-AFTER.json'],
 ['F02-F03-COMBINED.dat','F02-F03-COMBINED.json']
];
for(const [datName,captureName] of pairs){
 const data=dats.get(datName),raw=captures.get(captureName);
 same(decodeRadio(raw),data,datName+': decoded fields must match independent native DAT');
 assert.ok(Buffer.from(target(data)).equals(Buffer.from(raw)),datName+': all 33,344 planned bytes must match capture');
}
for(const name of ['F02-AFTER.json','F02-F03-COMBINED.json']){
 const raw=captures.get(name),plain=crypt(raw);
 same([plain[0x804c],plain[0x804b],plain[0x801b]],[28,3,2],name+': independently confirmed F02 codes');
 same([raw[0x804c],raw[0x804b],raw[0x801b]],[0x5f,0x34,0x35],name+': fixed transport bytes');
}
for(const [name,field,value] of [
 ['F02-PTT-100ms.dat','funCfgs.pttDly',0],
 ['F02-PTT-3000ms.dat','funCfgs.pttDly',28],
 ['F02-VFO-PTT-BOTH.dat','vfos.vfopttid',3],
 ['F02-VFOA-SQUELCH-COMBINED.dat','vfos.vfoASQMode',2]
]){
 const data=dats.get(name),[object,key]=field.split('.');
 same(changedPaths(dats.get('MINI5_FACTORY_ORIGINAL_BT.dat'),data),[field],name+': isolate one setting');
 assert.equal(data[object][key],value,name+': intended code');
}

// F03 characterization: preserve the explicitly accepted factory-compatible limitation.
const collisionNames=['F03-GROUP17.dat','F03-PLUS.dat','F03-PLUS-GROUP17.dat'];
const expectedInputs=[[0,16],[1,0],[1,16]];
const expectedPaths=[['vfos.vfoASignalGroup'],['vfos.vfoADir'],['vfos.vfoADir','vfos.vfoASignalGroup']];
const collisionTargets=collisionNames.map((name,i)=>{
 const data=dats.get(name);
 same([data.vfos.vfoADir,data.vfos.vfoASignalGroup],expectedInputs[i],name+': factory DAT retains distinct input');
 same(changedPaths(dats.get('MINI5_BLUETOOTH_FACTORY_RESAVED.dat'),data),expectedPaths[i],name+': isolated F03 fields');
 const raw=target(data);
 assert.equal(raw[0x800e],0x10,name+': observed current packing');
 assert.equal(sha(raw),'12467ed36d1f2751c19703cfc4c5dd0631a611d41c5b0c58680c4b97b98c7d35',name+': current whole-image collision');
 return raw;
});
assert.ok(collisionTargets.every(raw=>Buffer.from(raw).equals(Buffer.from(collisionTargets[0]))),'F03: three distinct DATs currently produce identical entire images');

// F01: genuine captured byte lost by reconstruction; do not infer what that byte means.
const originalRaw=captures.get('mini5-diagnostic.json');
same(decodeRadio(originalRaw),dats.get('MINI5_FACTORY_ORIGINAL_BT.dat'),'F01: original DAT matches decoded capture');
const rebuilt=target(dats.get('MINI5_FACTORY_ORIGINAL_BT.dat'));
same(differences(originalRaw,rebuilt),[0x8058],'F01: sole mismatch is radio address 0x9018');
same([originalRaw[0x8058],rebuilt[0x8058]],[0x42,0],'F01: observed transport-byte loss');
same([crypt(originalRaw)[0x8058],crypt(rebuilt)[0x8058]],[1,0],'F01: decoded byte changes from 1 to 0');

// F08: native DAT represents channel 999; no independent radio mapping is provided.
const last=dats.get('F08-CHANNEL999.dat');
assert.ok(last.channelList[0][998].rxFreq,'F08: channel 999 populated');
assert.ok(!last.channelList[0][999].rxFreq,'F08: hidden record empty');
assert.throws(()=>target(last),/last channel pair must remain empty/,'F08: retain existing safety guard');

// Matching filenames alone do not establish a valid input/output pair.
assert.equal(occupied(dats.get('F02-SAME-RADIO.dat')),0);
assert.equal(occupied(decodeRadio(captures.get('F02-SAME-RADIO.json'))),21);
assert.ok(Buffer.from(captures.get('F02-SAME-RADIO.json')).equals(Buffer.from(captures.get('F03-AFTER.json'))),'Same-radio capture duplicates F03-AFTER memory');
same(dats.get('F03-SAME-RADIO.dat'),dats.get('F03-COMBINED-TEST.dat'),'F03 same-radio DAT duplicates combined-test settings');

console.log('PASS: 21 fingerprints; 16 native DAT semantic round trips; 5 complete raw captures.');
console.log('PASS: 3 independent DAT/capture pairs match every field and all 33,344 bytes; F02 codes 28/3/2 preserved.');
console.log('ACCEPTED F03: whole-image collision retained. ACCEPTED F01: factory-compatible 0x9018 normalization; F08 guard remains open.');
console.log('EVIDENCE CAUTION: F02-SAME-RADIO DAT and JSON contain different channel/settings states.');
