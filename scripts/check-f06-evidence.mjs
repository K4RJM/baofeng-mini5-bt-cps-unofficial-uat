// Read-only physical-evidence replay. Never connects to a radio or network.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {decodeRadio} from '../radio-decoder.mjs';import {makePlan} from '../writer.mjs';
const dir=process.argv[2];if(!dir)throw Error('Pass the private evidence directory');
const json=p=>JSON.parse(fs.readFileSync(p,'utf8')),manifest=json(new URL('../tests/evidence/f06-oct16-private-files.json',import.meta.url));
const options={'KDH.Function':json(new URL('../function-options.json',import.meta.url)),...json(new URL('../editor-options.json',import.meta.url))};
const hash=b=>createHash('sha256').update(b).digest('hex'),records=[];
for(const entry of manifest.files){
 const b=fs.readFileSync(path.join(dir,entry.name));assert.equal(b.length,entry.bytes);assert.equal(hash(b),entry.sha256,entry.name+' fingerprint');const d=JSON.parse(b);
 assert.equal(d.build,'20.14');assert.equal(d.latestRead.decoded,true);assert.equal(d.transport.stage,'read-complete');assert.match(d.latestRead.rawHex,/^[0-9a-f]{66688}$/i);
 const raw=Buffer.from(d.latestRead.rawHex,'hex');assert.equal(hash(raw),entry.rawSha256);const decoded=decodeRadio(raw);
 assert.deepEqual(decoded.channelList[0][70],entry.ch71);assert.deepEqual(decoded.channelList[0][998],entry.ch999);assert.deepEqual(decoded.channelList[0][999],entry.ch1000);
 assert.equal(raw.subarray(70*32,71*32).toString('hex'),entry.channel71RawHex);records.push({raw,decoded});
}
const [before,after]=records,changed=[...before.raw.keys()].filter(i=>before.raw[i]!==after.raw[i]);
assert.equal(changed.length,322);assert.equal(changed.filter(i=>i>=0x08c0&&i<0x08e0).length,23);assert.equal(changed.filter(i=>i>=0x7cc0&&i<0x8000).length,299);
assert.equal(changed.filter(i=>!(i>=0x08c0&&i<0x08e0)&&!(i>=0x7cc0&&i<0x8000)).length,0);
assert.ok(after.raw.subarray(0x7cc0,0x8000).every(x=>x===255));
assert.deepEqual(Buffer.from(makePlan(after.decoded,options).target),after.raw,'complete independently captured post-reboot image');
console.log('PASS: both original v20.14 fingerprints and complete 33,344-byte captures.');
console.log('PASS: exactly 322 changed bytes: channel 71 = 23, intentionally cleared 0x7CC0–0x7FFF = 299, outside = 0.');
console.log('PASS: F06TEST, RX/TX 146.52000, Low, no tones; channel 999 empty; full reconstructed post-read image matches capture.');
console.log('SCOPE: reboot/reconnect sequence is K4RJM physical testimony; final saved diagnostics contain read reports, not independent final-ACK timing. F01/F08/F10 remain separate.');
