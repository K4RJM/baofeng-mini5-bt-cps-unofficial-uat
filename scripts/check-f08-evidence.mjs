// Read-only offline replay. Never opens a radio, executes the factory CPS, or calls a network.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {readDat,writeDat} from '../dat.mjs';import {makePlan} from '../writer.mjs';import {decodeRadio} from '../radio-decoder.mjs';
const dir=process.argv[2],old=process.argv[3];if(!dir||!old)throw Error('Provide private testing and retained native fixture directories');
const json=p=>JSON.parse(fs.readFileSync(p)),manifest=json(new URL('../tests/evidence/f08-private-files.json',import.meta.url));
const schemas=json(new URL('../schemas.json',import.meta.url)),options={'KDH.Function':json(new URL('../function-options.json',import.meta.url)),...json(new URL('../editor-options.json',import.meta.url))};
const hash=b=>createHash('sha256').update(b).digest('hex'),files=new Map();
for(const e of manifest.files){const b=fs.readFileSync(path.join(dir,e.name));assert.equal(b.length,e.bytes);assert.equal(hash(b),e.sha256,e.name);if(e.name.endsWith('.dat')){const d=readDat(b,schemas);assert.deepEqual(readDat(writeDat(d,schemas),schemas),d);files.set(e.name,d);}else{const j=JSON.parse(b),r=Buffer.from(j.latestRead.rawHex,'hex');assert.equal(r.length,33344);assert.equal(hash(r),e.rawSha256);files.set(e.name,r);}}
const capture=files.get('F08-CHANNEL999.json'),before=files.get('F06-BEFORE.json'),after=files.get('F06-AFTER.json');assert.deepEqual(capture,before);
const pair=Buffer.from(manifest.storedPairHex,'hex'),alternate=Buffer.from(manifest.alternatingPairHex,'hex');assert.equal(pair.length,64);assert.equal(alternate.length,64);
for(let i=0;i<13;i++)assert.deepEqual(capture.subarray(0x7cc0+i*64,0x7d00+i*64),i%2?alternate:pair,'literal captured block '+i);
assert.deepEqual(Buffer.from(makePlan(files.get('F08-CHANNEL999-WRITE.dat'),options).target),capture,'factory write DAT to all captured bytes');
for(const r of [capture,before,after])assert.deepEqual(Buffer.from(makePlan(decodeRadio(r),options).target),r,'complete independent image');
assert.deepEqual(decodeRadio(capture).channelList[0][998],manifest.channel999);
assert.ok(after.subarray(0x7cc0,0x8000).every(x=>x===255));
const inputBytes=fs.readFileSync(path.join(old,'work/cps-write-gap-test.json')),nativeBytes=fs.readFileSync(path.join(old,'outputs/cps-write-gap-test.json'));
assert.equal(hash(inputBytes),manifest.native.inputSha256);assert.equal(hash(nativeBytes),manifest.native.captureSha256);
const native=JSON.parse(nativeBytes);assert.equal(native.success,true);assert.equal(native.hardwareAccess,false);assert.equal(native.frames.length,521);
const frames=native.frames.map(h=>Buffer.from(h,'hex')),last=frames.find(f=>f.readUInt16BE(1)===0x7cc0).subarray(4);
// Independent transcription of the factory IL transform; never imports candidate crypt().
const transform=b=>Buffer.from(b.map((v,i)=>{const key=[0x43,0x4f,0x20,0x37][i%4];return key!==0x20&&v!==0&&v!==255&&v!==key&&v!==(key^255)?v^key:v;}));
const gaps=frames.filter(f=>f.readUInt16BE(1)>=0x7d00&&f.readUInt16BE(1)<0x8000);assert.equal(gaps.length,12);
gaps.forEach((f,i)=>assert.deepEqual(f.subarray(4),i%2?last:transform(last),'native alternating block '+i));
assert.throws(()=>makePlan(JSON.parse(inputBytes),options),/1000.*not supported/i,'native synthetic record 1000 is not enabled');
console.log('PASS: five private fingerprints, three complete 33,344-byte capture reconstructions, and exact factory write DAT/capture equality.');
console.log('PASS: all 13 physical trailing blocks; twelve independently captured native trailing blocks; record 1000 remains blocked.');
console.log('SCOPE: factory output and retained physical captures are replayed offline; no new Bluetooth write is performed or claimed. See F08-EVIDENCE.md for the accepted disposition.');
