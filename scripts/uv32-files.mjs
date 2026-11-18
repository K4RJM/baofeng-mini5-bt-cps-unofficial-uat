import {UV32_IMAGE_BYTES} from './uat-uv32-image.mjs';
import {editUv32Channel} from './uat-uv32-edit.mjs';
import {decodeUv32Channels,uv32WireDecode} from './uv32-codec.mjs';
const CHIRP_MAGIC=Uint8Array.of(0,255,99,104,105,114,112,238,105,109,103,0,1);

export function readUv32ChirpImage(bytes){
 const metadataStart=UV32_IMAGE_BYTES+CHIRP_MAGIC.length;
 if(!(bytes instanceof Uint8Array)||bytes.length<=metadataStart||bytes.length>metadataStart+65536||
  !CHIRP_MAGIC.every((byte,index)=>bytes[UV32_IMAGE_BYTES+index]===byte))throw Error('Choose a CHIRP image saved for the Baofeng UV-32.');
 let metadata;
 try{metadata=JSON.parse(atob(new TextDecoder().decode(bytes.subarray(metadataStart))));}
 catch{throw Error('Invalid CHIRP image metadata.');}
 if(metadata?.vendor!=='Baofeng'||metadata.model!=='UV-32'||(metadata.variant??'')!=='')throw Error('This CHIRP image does not identify a Baofeng UV-32.');
 const image=bytes.slice(0,UV32_IMAGE_BYTES);
 const {channels}=decodeUv32Channels(uv32WireDecode(image.subarray(0,32000)));
 if(channels.some(channel=>channel.rx==='Invalid'||channel.rx==='0.00000'||channel.tx==='Invalid'))
  throw Error('The UV-32 image contains invalid channel frequency data.');
 return image;
}

export function saveUv32ChirpImage(image){
 if(!(image instanceof Uint8Array)||image.length!==UV32_IMAGE_BYTES)throw Error('A complete UV-32 image is required.');
 const metadata=new TextEncoder().encode(btoa(JSON.stringify({vendor:'Baofeng',model:'UV-32',variant:'',rclass:'UV32',hamrx_version:'20.72'})));
 const bytes=new Uint8Array(image.length+CHIRP_MAGIC.length+metadata.length);
 bytes.set(image);
 bytes.set(CHIRP_MAGIC,image.length);
 bytes.set(metadata,image.length+CHIRP_MAGIC.length);
 return bytes;
}

export function importUv32ChannelPlan(image,{channels,start},replacing){
 if(!channels.length||start<1||start+channels.length-1>1000)throw Error('Imported channels do not fit in the UV-32.');
 let next=new Uint8Array(image);
 if(replacing)next.fill(255,0,32000);
 for(const [index,channel] of channels.entries()){
  const number=start+index;
  if(next[(number-1)*32]!==255)throw Error('Placement changed. Choose an empty destination.');
  if(channel.uv32Record){
   next.set(channel.uv32Record,(number-1)*32);
   continue;
  }
  next=editUv32Channel(next,number,{
   rx:channel.rxFreq,tx:channel.txFreq||'Off',rxTone:channel.strRxCtsDcs||'Off',txTone:channel.strTxCtsDcs||'Off',
   name:(channel.name??'').replace(/\x00+$/,''),
   power:['High','Low','Medium'][channel.txPower]??'Low',bandwidth:channel.bandwide?'Narrow':'Wide',scan:channel.scanAdd?'Add':'Skip'
  });
 }
 return next;
}

export function uv32ChannelList(image){
 const {channels}=decodeUv32Channels(uv32WireDecode(image.subarray(0,32000)));
 const slots=Array.from({length:1000},()=>({rxFreq:''}));
 for(const row of channels)slots[row.number-1]={
  name:row.name,rxFreq:row.rx,txFreq:row.tx==='Off'?'':row.tx,
  strRxCtsDcs:row.rxTone.toUpperCase(),strTxCtsDcs:row.txTone.toUpperCase(),
  txPower:['High','Low','Medium'].indexOf(row.power),bandwide:Number(row.bandwidth==='Narrow'),scanAdd:Number(row.scan==='Add'),
  uv32Record:image.slice((row.number-1)*32,row.number*32)
 };
 return slots;
}
