import {UV32_IMAGE_BYTES} from './uat-uv32-image.mjs';
import {writeUv32ChannelRecord} from './uat-uv32-edit.mjs';
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

const uv32DuplicateKey=ch=>JSON.stringify([
 ch.rxFreq,ch.txFreq||'',ch.strRxCtsDcs?.toUpperCase()||'OFF',ch.strTxCtsDcs?.toUpperCase()||'OFF',
 ch.txPower,ch.bandwide,ch.scanAdd,ch.uv32Record?.[12]??0,ch.uv32Record?.[13]??0,(ch.uv32Record?.[15]??0)&57
]);

export function planUv32Import(current,source,{replacing,placement='1',skipDuplicates=true}){
 const list=current.channelList[0];
 const firstBank=replacing?1:Number(placement);
 if(!Number.isInteger(firstBank)||firstBank<1||firstBank>10||list.length!==1000)throw Error('Choose a UV-32 bank from 1 to 10.');
 const known=new Set(),channels=[];
 let duplicates=0;
 if(!replacing&&skipDuplicates)for(const ch of [...list,...(current.pending??[])])if(ch.rxFreq)known.add(uv32DuplicateKey(ch));
 for(const ch of source){
  if(!ch?.rxFreq)continue;
  if(!replacing&&skipDuplicates){
   const key=uv32DuplicateKey(ch);
   if(known.has(key)){duplicates++;continue;}
   known.add(key);
  }
  channels.push(ch);
 }
 const free=Array.from({length:10},(_,i)=>{
  const bank=(firstBank-1+i)%10,slots=[];
  for(let j=0;j<100;j++){const index=bank*100+j;if(replacing||!list[index].rxFreq)slots.push(index+1);}
  return slots;
 });
 const slots=[],placed=[],extra=[],byBank=new Map(),groups=new Map(),zoneSummary=[];
 const ungrouped=[];
 for(const ch of channels){
  if(!ch.sourceZone){ungrouped.push(ch);continue;}
  if(!groups.has(ch.sourceZone))groups.set(ch.sourceZone,[]);
  groups.get(ch.sourceZone).push(ch);
 }
 const allocate=(group,bankSlots,count)=>{
  const picked=bankSlots.splice(0,count),bank=Math.ceil(picked[0]/100);
  byBank.set(bank,(byBank.get(bank)??0)+picked.length);
  placed.push(...group.splice(0,picked.length));slots.push(...picked);
  return 'Bank '+bank+' ('+picked.length+')';
 };
 const split=[];
 // Place whole zones first. Best fit leaves larger banks available for later
 // groups, with ties resolved in the user's selected bank order.
 for(const [name,group] of [...groups].sort((a,b)=>b[1].length-a[1].length||(a[1][0].sourceZoneOrder??0)-(b[1][0].sourceZoneOrder??0))){
  group.sort((a,b)=>(a.sourceMemberOrder??0)-(b.sourceMemberOrder??0));
  const best=free.filter(bin=>bin.length>=group.length).sort((a,b)=>a.length-b.length)[0];
  if(best)zoneSummary.push(name+' → '+allocate(group,best,group.length));
  else split.push([name,group]);
 }
 if(ungrouped.length)split.push(['',ungrouped]);
 for(const [name,group] of split){
  const targets=[];
  for(const bin of (name?[...free].sort((a,b)=>b.length-a.length):free)){
   if(!group.length)break;
   if(bin.length)targets.push(allocate(group,bin,Math.min(group.length,bin.length)));
  }
  if(group.length){targets.push(group.length+' over capacity');extra.push(...group);}
  if(name)zoneSummary.push(name+' → '+targets.join(' / '));
 }
 const summary=[...byBank].map(([bank,count])=>'Bank '+bank+' · '+count);
 if(extra.length)summary.push(extra.length+' over capacity · kept in the workspace');
 const error=!channels.length?(duplicates?'All matching channels are already present.':'Select at least one analog channel.'):'';
 return {channels:placed.concat(extra),slots,duplicates,overflow:extra.length,error,zoneSummary,summary:summary.join(' / ')};
}

export function importUv32ChannelPlan(image,{channels,start,slots},replacing){
 const destinations=slots??channels.map((_,i)=>start+i);
 if(!channels.length||destinations.length!==channels.length||new Set(destinations).size!==channels.length||destinations.some(n=>!Number.isInteger(n)||n<1||n>1000))throw Error('Imported channels do not fit in the UV-32.');
 const next=new Uint8Array(image);
 if(replacing)next.fill(255,0,32000);
 for(const [index,channel] of channels.entries()){
  const number=destinations[index];
  if(next[(number-1)*32]!==255)throw Error('Placement changed. Choose an empty destination.');
  next.set(importedRecord(channel),(number-1)*32);
 }
 return next;
}

function importedRecord(channel){
 if(channel.uv32Record)return channel.uv32Record;
 const record=new Uint8Array(32).fill(255);
 writeUv32ChannelRecord(record,0,{
  rx:channel.rxFreq,tx:channel.txFreq||'Off',rxTone:channel.strRxCtsDcs||'Off',txTone:channel.strTxCtsDcs||'Off',
  name:(channel.name??'').replace(/\x00+$/,''),power:['High','Low','Medium'][channel.txPower]??'Low',
  bandwidth:channel.bandwide?'Narrow':'Wide',scan:channel.scanAdd?'Add':'Skip'
 });
 return record;
}
function pendingEntry(record){
 const pair=new Uint8Array(64).fill(255);pair.set(record);
 const row=decodeUv32Channels(uv32WireDecode(pair)).channels[0];
 return {...listEntry(row,record),row};
}
export function stageUv32Import(image,pending,plan,replacing){
 if(plan.error)throw Error(plan.error);
 const {channels,slots}=plan;
 const next=slots.length?importUv32ChannelPlan(image,{channels:channels.slice(0,slots.length),slots},replacing):image;
 const extra=channels.slice(slots.length).map(ch=>pendingEntry(importedRecord(ch)));
 return {image:next,pending:replacing?extra:pending.concat(extra)};
}
export function editPendingUv32Channel(pending,number,patch){
 const index=number-1001;
 if(!pending[index])throw Error('This workspace channel no longer exists.');
 const record=pending[index].uv32Record.slice();
 writeUv32ChannelRecord(record,0,patch);
 return pending.map((entry,i)=>i===index?pendingEntry(record):entry);
}
export function removeUv32Channels(image,pending,numbers){
 const remove=new Set(numbers),remaining=pending.filter((_,i)=>!remove.has(1001+i));
 const next=image.slice();
 let used=0;
 for(let number=1;number<=1000;number++){
  if(!remove.has(number))continue;
  const at=(number-1)*32;
  if(used<remaining.length)next.set(remaining[used++].uv32Record,at);
  else next.fill(255,at,at+32);
 }
 return {image:next,pending:remaining.slice(used)};
}
export function uv32ChannelList(image){
 const {channels}=decodeUv32Channels(uv32WireDecode(image.subarray(0,32000)));
 const slots=Array.from({length:1000},()=>({rxFreq:''}));
 for(const row of channels)slots[row.number-1]=listEntry(row,image.slice((row.number-1)*32,row.number*32));
 return slots;
}
function listEntry(row,record){
 return {
  name:row.name,rxFreq:row.rx,txFreq:row.tx==='Off'?'':row.tx,
  strRxCtsDcs:row.rxTone.toUpperCase(),strTxCtsDcs:row.txTone.toUpperCase(),
  txPower:['High','Low','Medium'].indexOf(row.power),bandwide:Number(row.bandwidth==='Narrow'),scanAdd:Number(row.scan==='Add'),
  uv32Record:record
 };
}
