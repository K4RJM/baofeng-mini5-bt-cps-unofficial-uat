// Reopen a UV-32 cable capture from its original wire bytes. Never trust a
// saved preview or readout as a substitute for the captured memory.
import {UV32_CHANNEL_BYTES,decodeUv32Channels,uv32WireDecode} from './uat-uv32-read.mjs';
import {UV32_IMAGE_BYTES,decodeUv32Image} from './uat-uv32-image.mjs?v=20.70';

const REGIONS=[[0,0x8040],[0x9000,0x40],[0xa000,0x2c0],[0xd000,0x40]];
export function openUv32Capture(input){
 const report=typeof input==='string'?JSON.parse(input):input;
 if(!report||report.kind!=='uv32-cable-full-read-v1'||report.completed!==true||report.identity!=='UV32PRO')
  throw Error('Choose a completed UV32PRO full cable read');
 if(JSON.stringify(report.regions)!==JSON.stringify(REGIONS)||report.completedBlocks!==526||report.totalBlocks!==526||report.memoryReads!==526||report.memoryWrites!==0)
  throw Error('UV-32 capture region or block counts do not match a full read');
 if(typeof report.wireHex!=='string'||report.wireHex.length!==UV32_IMAGE_BYTES*2||!/^[0-9a-f]+$/i.test(report.wireHex))
  throw Error('UV-32 capture has missing or invalid memory bytes');
 const wire=Uint8Array.from(report.wireHex.match(/../g),pair=>Number.parseInt(pair,16));
 const preview=decodeUv32Channels(wire.slice(0,UV32_CHANNEL_BYTES));
 const readout=decodeUv32Image(uv32WireDecode(wire));
 return {...report,wireHex:report.wireHex.toLowerCase(),bytes:wire.length,preview,readout};
}
