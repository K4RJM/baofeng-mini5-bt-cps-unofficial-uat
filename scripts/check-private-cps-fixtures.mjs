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
 assert.deepEqual(decodeRadio(raw),native);assert.deepEqual(readDat(radioDat(raw,schemas),schemas),native);
 assert.deepEqual(readDat(writeDat(native,schemas),schemas),native);
}
console.log(JSON.stringify({nativeFramesCompared:frames,nativePayloadBytesCompared:frames*64,retainedDecoderFixtures:2,physicalRadioAccess:false,notes:'Historical finite fixtures; settings in the retained decoder oracle include hand-transcribed rules. This does not close F02, F03 or F13.'},null,2));
