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
export function importChannels({files,layout,zone,image,fileTools,apply,modelName='RT-950 Pro'}){
 const {zones,per}=LAYOUTS[layout],named=files.length===1?zoneFromFilename(files[0].name):null;
 if(named&&(named.zone<1||named.zone>zones))throw Error('The CSV zone is outside this firmware layout.');
 const start=named?.zone??zone;
 const current={channelList:[Array.from({length:zones*per},(_,i)=>commonChannel(record(image,layout,i)))],pending:(image.overflow??[]).map(h=>commonChannel(hex(h)))};
 const makePlan=(data,source,prefs)=>planBankedImport(data,source,prefs,{zones,per,label:'Zone',key:duplicateKey});
 return fileTools.openChannelAppend({
  mode:'append',initialFile:files,capacity:zones*per,getData:()=>current,bankImport:{start,count:zones,label:'Zone',plan:makePlan},
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
   for(const row of result.rows)if(row.channel){
    try{importedBytes(row.channel);}catch(e){row.channel=null;row.error=e.message;}
   }
   result.channels=result.rows.flatMap(row=>row.channel?[row.channel]:[]);
   return result;
  },
  onApply(_data,plan){
   const out={...image,ch:image.ch.slice()},bytes=plan.channels.map(importedBytes);
   plan.slots.forEach((slot,i)=>record(out,layout,slot-1).set(bytes[i]));
   out.overflow=[...(image.overflow??[]),...bytes.slice(plan.slots.length).map(toHex)];
   const first=plan.slots.length?Math.floor((plan.slots[0]-1)/per)+1:start;
   if(named?.name&&LAYOUTS[layout].zoneNames&&!zoneName(out,layout,first)){
    out.zn=image.zn.slice();renameZone(out,layout,first,named.name);
   }
   apply(out,plan,first);
  }
 });
}
