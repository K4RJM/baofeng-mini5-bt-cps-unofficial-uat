// Optional local check. Reads retained CPS artifacts; never loads CPS or accesses a radio.
// Files remain private and are not copied into the repository or Pages package.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {offlineFrames} from '../radio-encoder.mjs';
import {decodeRadio,radioDat} from '../radio-decoder.mjs';
import {readDat,writeDat} from '../dat.mjs';
const directory=process.argv[2];if(!directory)throw Error('Pass the retained fixture directory (containing work/ and outputs/).');
const json=file=>JSON.parse(fs.readFileSync(file)),schemas=json(new URL('../schemas.json',import.meta.url));
let frames=0;
for(const [input,capture]of [['work/cps-write-input.json','outputs/cps-write-capture.json'],['work/cps-full-test-input.json','outputs/cps-full-test-capture.json']]){
 const encoded=offlineFrames(json(path.join(directory,input))).map(bytes=>Buffer.from(bytes).toString('hex').toUpperCase());
 assert.deepEqual(encoded,json(path.join(directory,capture)).frames);frames+=encoded.length;
}
for(const label of ['base','varied']){
 const raw=new Uint8Array(fs.readFileSync(path.join(directory,'work/decoder-'+label+'.img'))).slice(0,33344);
 const native=readDat(fs.readFileSync(path.join(directory,'work/native-read-'+label+'.dat')),schemas);
 // The old native VFO read oracle incorrectly reduces MuteMode 2 to 0.
 // Retain its result as historical evidence; allow only these two documented F02 differences.
 const expected=structuredClone(native);
 if(label==='varied'){assert.equal(native.vfos.vfoASQMode,0);assert.equal(native.vfos.vfoBSQMode,0);expected.vfos.vfoASQMode=2;expected.vfos.vfoBSQMode=2;}
 assert.deepEqual(decodeRadio(raw),expected);assert.deepEqual(readDat(radioDat(raw,schemas),schemas),expected);
 assert.deepEqual(readDat(writeDat(native,schemas),schemas),native);
}
console.log(JSON.stringify({nativeFramesCompared:frames,nativePayloadBytesCompared:frames*64,retainedDecoderFixtures:2,physicalRadioAccess:false,notes:'Historical finite fixtures; two documented F02 MuteMode differences from the old native read oracle are expected. Settings rules also include hand-transcribed code. F01 is accepted factory-compatible behavior; these finite fixtures do not close F13.'},null,2));
