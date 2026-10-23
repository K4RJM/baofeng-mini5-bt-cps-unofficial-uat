// Passive MINI-5 file interchange. No Bluetooth calls or raw-image upload path.
// Layout/metadata references: CHIRP UV5RMini and CloneModeRadio (GPL), see docs/IMG-COMPATIBILITY.md.
import {crypt,offlineFrames} from './radio-encoder.mjs';
import {decodeRadio} from './radio-decoder.mjs';
import {makePlan} from './writer.mjs';
import {SIZE,TRAILER,offset} from './read-test/memory.mjs';

const utf8=new TextEncoder(),text=new TextDecoder('utf-8',{fatal:true});
export const CHIRP_MAGIC=Uint8Array.of(0,255,99,104,105,114,112,238,105,109,103,0,1);
export const MAX_IMAGE_BYTES=SIZE+10+CHIRP_MAGIC.length+65536;
const same=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
const at=(bytes,part,pos)=>same(bytes.subarray(pos,pos+part.length),part);
const trailer=utf8.encode(TRAILER);
function plausible(plain){
 for(let i=0;i<1000;i++){
  const b=plain.subarray(i*32,i*32+8);
  if(b.subarray(0,4).every(v=>v===255))continue;
  for(const start of [0,4]){const f=b.subarray(start,start+4);if(f.every(v=>v===255))continue;if(f.some(v=>(v>>4)>9||(v&15)>9)||(f[3]>>4)===0)return false;}
 }
 for(const start of [0x8000,0x8020]){const f=plain.subarray(start,start+8);if(f.every(v=>v===255))continue;if(f.some(v=>v>9)||f[0]===0)return false;}
 return true;
}
function decoded(raw,format){
 if(!plausible(crypt(raw)))throw Error('Image frequency data is malformed or outside the supported MINI-5 format.');
 return {raw:raw.slice(),data:decodeRadio(raw),format};
}
export function readImage(bytes){
 if(!(bytes instanceof Uint8Array)||bytes.length<SIZE||bytes.length>MAX_IMAGE_BYTES)throw Error('Expected a complete MINI-5 .img within the supported size limit.');
 // CHIRP metadata may follow the memory alone or the legacy model trailer.
 let marker=-1;
 if(at(bytes,CHIRP_MAGIC,SIZE))marker=SIZE;
 else if(at(bytes,trailer,SIZE)&&at(bytes,CHIRP_MAGIC,SIZE+10))marker=SIZE+10;
 if(marker>=0){
  let metadata;
  try{
   const encoded=text.decode(bytes.subarray(marker+CHIRP_MAGIC.length));
   if(!encoded.length||encoded.length%4||!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded))throw Error('base64');
   const json=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));metadata=JSON.parse(text.decode(json));
  }catch{throw Error('Malformed CHIRP image metadata.');}
  if(!metadata||Array.isArray(metadata)||metadata.vendor!=='Baofeng'||metadata.model!==TRAILER||(metadata.variant!=null&&metadata.variant!==''))throw Error('Only Baofeng UV-5R Mini CHIRP images are supported; this image identifies a different model or variant.');
  // CHIRP stores decoded bytes. Existing radio decoder expects encoded bytes.
  return decoded(crypt(bytes.slice(0,SIZE)),'CHIRP');
 }
 if(bytes.length!==SIZE+10||!at(bytes,trailer,SIZE))throw Error('Unrecognized .img: a UV-5R Mini model trailer or matching CHIRP metadata is required.');
 const body=bytes.slice(0,SIZE),studio=plausible(crypt(body)),chirp=plausible(body);
 if(studio&&chirp&&!same(body,crypt(body)))throw Error('Ambiguous legacy image encoding. Open and resave it in CHIRP to add model metadata before importing.');
 if(studio)return decoded(body,'Mini 5 Studio');
 if(chirp)return decoded(crypt(body),'CHIRP');
 throw Error('The MINI-5 image contains malformed frequency data.');
}
export async function readImageFile(file){
 if(!file||!Number.isInteger(file.size)||file.size<SIZE||file.size>MAX_IMAGE_BYTES)throw Error('Expected a complete MINI-5 .img within the supported size limit.');
 const bytes=new Uint8Array(await file.arrayBuffer());if(bytes.length!==file.size)throw Error('Image length changed while reading.');return readImage(bytes);
}
export function exportChirpImage(data,options,{raw=null,baseline=null}={}){
 let memory;
 if(raw instanceof Uint8Array&&raw.length===SIZE&&baseline&&JSON.stringify(data)===JSON.stringify(baseline)){
  // An unchanged import/read retains every original memory byte, including opaque areas.
  memory=crypt(raw);
 }else{
  makePlan(data,options); // Reuse every existing write validation; never send the plan.
  const encoded=new Uint8Array(SIZE);for(const f of offlineFrames(data))encoded.set(f.subarray(4),offset((f[1]<<8)|f[2]));
  memory=crypt(encoded);
 }
 const metadata=utf8.encode(btoa(JSON.stringify({vendor:'Baofeng',model:TRAILER,variant:'',rclass:'UV5RMini',hamrx_version:'20.30'})));
 const result=new Uint8Array(SIZE+CHIRP_MAGIC.length+metadata.length);result.set(memory);result.set(CHIRP_MAGIC,SIZE);result.set(metadata,SIZE+CHIRP_MAGIC.length);return result;
}
