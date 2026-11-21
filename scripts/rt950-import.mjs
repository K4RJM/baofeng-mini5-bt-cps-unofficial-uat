import {LAYOUTS,EMPTY_REC,hex,toHex,zoneFromFilename} from './rt950-core.mjs';
import {fullChannel,editRecord,record,renameZone,zoneName} from './rt950-channels.mjs';
import {readUv32ChirpImage,uv32ChannelList,planBankedImport} from './uv32-files.mjs';
import {writeValue} from './rt950-sections.mjs';
import {readUv32Dat} from './uv32-dat.mjs';
import {datChannelsForUv32} from './uv32-dat-image.mjs';

const powers=['High','Low','Medium'];
function commonChannel(bytes){
 const row=fullChannel(bytes);
 return {rxFreq:row.rx,txFreq:row.tx,name:row.name,strRxCtsDcs:row.rxTone,strTxCtsDcs:row.txTone,txPower:powers.indexOf(row.power),rxMode:row.rxMode,bandwide:Number(row.bandwidth==='Narrow'),scanAdd:Number(row.scan)};
}
const duplicateKey=c=>JSON.stringify([c.rxFreq,c.txFreq,c.name,c.strRxCtsDcs?.toUpperCase(),c.strTxCtsDcs?.toUpperCase(),c.txPower,c.rxMode||'FM',c.bandwide,c.scanAdd]);
function importedBytes(c){
 const bytes=editRecord(EMPTY_REC,{rx:c.rxFreq,tx:c.txFreq||'',rxTone:c.strRxCtsDcs||'Off',txTone:c.strTxCtsDcs||'Off',
  bandwidth:c.bandwide?'Narrow':'Wide',power:powers[c.txPower],scan:!!c.scanAdd,rxMode:c.rxMode||'FM'});
 writeValue(bytes,{type:'name',offset:20,length:12,label:'Channel name'},c.name??'');
 return bytes;
}
export function importChannels({files,layout,zone,image,fileTools,apply,replacing=false,modelName='RT-950 Pro'}){
 const {zones,per}=LAYOUTS[layout],named=files.length===1?zoneFromFilename(files[0].name):null;
 const start=zone;
 const current={channelList:[Array.from({length:zones*per},(_,i)=>commonChannel(record(image,layout,i)))],pending:(image.overflow??[]).map(h=>commonChannel(hex(h)))};
 function makePlan(data,source,prefs){
  const capacity=zones*per;
  const numbered=replacing&&source.some(c=>c.sourceLocation!==undefined&&c.sourceLocation!=='');
  if(replacing&&!numbered&&source.some(c=>c.sourceZone))return planBankedImport(data,source,{...prefs,replacing:true},{zones,per,label:'Zone',key:duplicateKey});
  const notice=replacing?(numbered?'CHIRP Location gives the destination channel number. Unlisted slots are cleared.':'Selected rows replace the channel list in file order starting at channel 1.'):
   'Channels are added in file order after the last programmed channel in this workspace.';
  const existing=data.channelList[0],pending=data.pending??[];
  const known=new Set(),used=new Set(),placed=[],slots=[],extra=[];
  const skip=!replacing&&prefs.skipDuplicates;
  if(skip)for(const c of [...existing,...pending])if(c.rxFreq)known.add(duplicateKey(c));
  let next=replacing?1:existing.findLastIndex(c=>c.rxFreq)+2;
  if(!replacing&&pending.length)next=capacity+1;
  let duplicates=0,error='';
  for(const c of source){
   if(skip){const key=duplicateKey(c);if(known.has(key)){duplicates++;continue;}known.add(key);}
   const slot=numbered?Number(c.sourceLocation):next++;
   if(!Number.isSafeInteger(slot)||slot<1){error='Use positive whole CHIRP Location numbers starting at 1.';break;}
   if(used.has(slot)){error='More than one selected row uses CHIRP Location '+slot+'.';break;}
   used.add(slot);
   if(slot>capacity)extra.push(c);else{placed.push(c);slots.push(slot);}
  }
  if(!used.size&&!error)error=duplicates?'All matching channels are already present.':'Select at least one analog channel.';
  const summary=[];
  for(let z=1;z<=zones;z++){const n=slots.filter(slot=>Math.ceil(slot/per)===z).length;if(n)summary.push('Zone '+z+' · '+n);}
  if(extra.length)summary.push(extra.length+' over capacity');
  return {channels:placed.concat(extra),slots,duplicates,overflow:extra.length,notice,error,summary:summary.join(' / ')};
 }
 return fileTools.openChannelAppend({
  mode:replacing?'replace':'append',initialFile:files,capacity:zones*per,getData:()=>current,bankImport:{start,count:zones,label:'Zone',plan:makePlan,skipDuplicates:false,appendAtEnd:true,allowChannelImages:true},
  async readFile(file,settings){
   const target={...settings,model:modelName,charset:[[32,126,1]],validateFrequency:v=>Number(v)>=18&&Number(v)<1000?'':'Frequency must be from 18 to below 1000 MHz.'};
   let result;
   if(file.zoneFiles)result=await fileTools.readZoneFiles(file.zoneFiles,target);
   else if(/\.(dat|img)$/i.test(file.name)){
    if(file.size>2000000)throw Error('Choose a supported Baofeng DAT or CHIRP image smaller than 2 MB.');
    const bytes=new Uint8Array(await file.arrayBuffer());
    let channels,format;
    if(/\.dat$/i.test(file.name)&&new TextDecoder().decode(bytes.subarray(0,130)).includes('BF-UVs CPS,')){
     const doc=readUv32Dat(bytes);channels=uv32ChannelList(datChannelsForUv32(doc));format='Baofeng UV-32 CPS DAT';
    }else if(/\.img$/i.test(file.name)){
     try{channels=uv32ChannelList(readUv32ChirpImage(bytes));format='Baofeng UV-32 CHIRP image';}catch{/* Check the MINI-5 image identity below. */}
    }
    if(!channels){channels=(await fileTools.readMiniFile(file)).channelList[0].slice(0,999);format='Baofeng MINI-5 '+(/\.img$/i.test(file.name)?'image':'CPS DAT');}
    channels=channels.flatMap((c,i)=>{
     if(!c.rxFreq)return [];
     const entry={...c,name:(c.name??'').replace(/\0+$/,'')};
     if(format.startsWith('Baofeng UV-32'))Object.assign(entry,{sourceZone:'Bank '+(Math.floor(i/100)+1),sourceMemberOrder:i%100});
     return [entry];
    });
    result={kind:'csv',format,channels,rows:channels.map((c,i)=>({line:i+1,channel:c,sourceName:c.name,notes:[]})),emptyRows:0,notes:['Only channel memories are imported.']};
   }else result=await fileTools.readChannelFile(file,target);
   if(replacing&&result.format==='CHIRP'){
    result.notes=result.notes.map(n=>n.replace('Source channel numbers, comments','Comments'));
    for(const row of result.rows)if(row.channel&&row.location!==undefined)row.channel.sourceLocation=row.location;
   }
   for(const row of result.rows)if(row.channel){
    try{importedBytes(row.channel);}catch(e){row.channel=null;row.error=e.message;}
   }
   result.channels=result.rows.flatMap(row=>row.channel?[row.channel]:[]);
   return result;
  },
  onApply(_data,plan){
   const out={...image,ch:image.ch.slice()},bytes=plan.channels.map(importedBytes);
   if(replacing){out.replaceChannelList=true;for(let i=0;i<zones*per;i++)record(out,layout,i).set(EMPTY_REC);}
   plan.slots.forEach((slot,i)=>record(out,layout,slot-1).set(bytes[i]));
   out.overflow=[...(replacing?[]:image.overflow??[]),...bytes.slice(plan.slots.length).map(toHex)];
   const first=plan.slots.length?Math.floor((Math.min(...plan.slots)-1)/per)+1:start;
   if(!replacing&&named?.name&&named.zone===first&&LAYOUTS[layout].zoneNames&&!zoneName(out,layout,first)){
    out.zn=image.zn.slice();renameZone(out,layout,first,named.name);
   }
   apply(out,plan,first);
  }
 });
}
