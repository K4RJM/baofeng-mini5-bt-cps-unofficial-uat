// Read-only replay of private physical evidence. No device or network access.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {readDat} from '../dat.mjs';import {decodeRadio} from '../radio-decoder.mjs';
const dir=process.argv[2];if(!dir)throw Error('Pass the private evidence directory');
const json=p=>JSON.parse(fs.readFileSync(p,'utf8')),manifest=json(new URL('../tests/evidence/f03-oct16-private-files.json',import.meta.url)),schemas=json(new URL('../schemas.json',import.meta.url));
const hash=b=>createHash('sha256').update(b).digest('hex'),raws=new Map();
for(const entry of manifest.files){
 const b=fs.readFileSync(path.join(dir,entry.name));assert.equal(b.length,entry.bytes);assert.equal(hash(b),entry.sha256,entry.name+' fingerprint');let data;
 if(entry.name.endsWith('.json')){const d=JSON.parse(b);assert.match(d.latestRead.rawHex,/^[0-9a-f]{66688}$/i);const raw=Buffer.from(d.latestRead.rawHex,'hex');assert.equal(hash(raw),entry.rawSha256);assert.equal(raw[0x800e],0x10);assert.equal(raw.subarray(0x8000,0x8020).toString('hex'),entry.vfoAHex);raws.set(entry.name,raw);data=decodeRadio(raw);}
 else data=readDat(b,schemas);
 assert.deepEqual([data.vfos.vfoADir,data.vfos.vfoASignalGroup,data.vfos.vfoBDir,data.vfos.vfoBSignalGroup],entry.vfo,entry.name+' VFO fields');
}
const off=raws.get('F03-OFF-GROUP17.json'),plus=raws.get('F03-PLUS-GROUP1.json');
assert.deepEqual(off.subarray(0x8000,0x8020),plus.subarray(0x8000,0x8020));
assert.equal([...off.keys()].filter(i=>off[i]!==plus[i]).length,299);
console.log('PASS: six private fingerprints, distinct input DAT settings, factory readback PLUS/group 17, two independent 33,344-byte captures and matching 32-byte VFO A regions.');
console.log('SCOPE: these OFF/17 and PLUS/1 captures differ at 299 other bytes. The separately reported fresh PLUS/1 versus PLUS/17 full-image equality is not reproduced from this pair.');
