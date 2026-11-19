// Translate fields shared by the UV32PRO factory DAT and the cable image.
// Keep factory-only fields in the original DAT and radio-only bytes in the cable image.
import {UV32_CHANNEL_BYTES,decodeUv32Channels,decodeUv32Tone,uv32WireDecode} from './uv32-codec.mjs';
import {decodeUv32Image,UV32_IMAGE_BYTES} from './uat-uv32-image.mjs';
import {editUv32Channel,editUv32Vfo,editUv32Dtmf,editUv32ZoneName} from './uat-uv32-edit.mjs';

const imageOffsets={
 sql:0,saveMode:1,vox:2,backlight:3,dualStandby:4,tot:5,beep:6,voiceSw:7,voice:8,sideTone:9,scanMode:10,
 pttDly:12,chADisType:13,chBDisType:14,autoLock:16,alarmMode:17,alarmTone:18,tailClear:20,rptTailClear:21,
 rptTailDet:22,roger:23,fmEnable:25,keyLock:27,powerOnDisType:28,tone:29,voxDlyTime:32,menuQuitTime:33,
 totAlarm:40,ctsDcsScanType:43,gpsSw:48,gpsMode:49,key1Short:50,rstMenu:55,voxSw:58
};
export const UV32_DAT_SETTING_OFFSETS=Object.freeze(Object.values(imageOffsets));
const power=['High','Low','Medium'];
const ptt=['Off','BOT','EOT','Both'];
const onOff=value=>value?'On':'Off';
const datTone=value=>value.toUpperCase();
const freq=value=>{
 if(typeof value!=='string'||!/^\d{1,3}\.\d{1,5}$/.test(value))throw Error('Invalid frequency in UV-32 DAT.');
 const [mhz,fraction]=value.split('.');
 return mhz.padStart(3,'0')+'.'+fraction.padEnd(5,'0');
};
const bounded=(n,max,label)=>{
 if(!Number.isInteger(n)||n<0||n>max)throw Error('Invalid UV-32 DAT value for '+label+'.');
 return n;
};
const word=(image,offset)=>image[offset]|image[offset+1]<<8;
function storeWord(image,offset,value){
 bounded(value,65535,'scan range');
 image[offset]=value&255;image[offset+1]=value>>8;
}
const datChannelProperties=['busyLock','txPower','bandwide','scanAdd','sqMode','pttid','signalGroup','fhss'];
function installChannel(image,number,channel){
 return editUv32Channel(image,number,{
  rx:freq(channel.rxFreq),tx:channel.txFreq?freq(channel.txFreq):'Off',
  rxTone:channel.strRxCtsDcs||'Off',txTone:channel.strTxCtsDcs||'Off',
  busyLock:onOff(bounded(channel.busyLock,1,'busy lock')),power:power[bounded(channel.txPower,2,'power')],
  bandwidth:bounded(channel.bandwide,1,'bandwidth')?'Narrow':'Wide',scan:bounded(channel.scanAdd,1,'scan')?'Add':'Skip',
  squelch:'Code '+bounded(channel.sqMode,3,'squelch mode'),pttId:ptt[bounded(channel.pttid,3,'PTT-ID')],
  signal:bounded(channel.signalGroup,19,'signaling group')+1,fhss:onOff(bounded(channel.fhss,1,'FHSS')),
  name:channel.name??''
 });
}

export function datChannelsForUv32(document){
 const blank=new Uint8Array(UV32_IMAGE_BYTES).fill(255);
 let image=blank;
 document.root.channelList.flat().forEach((channel,index)=>{
  if(channel.rxFreq)image=installChannel(image,index+1,channel);
 });
 return image;
}

export function applyUv32Dat(document,base){
 const {root}=document;
 const channels=datChannelsForUv32(document);
 let image=base?new Uint8Array(base):new Uint8Array(UV32_IMAGE_BYTES).fill(255);
 // Retain bytes the factory file does not carry for matching existing radio slots.
 for(let offset=0;offset<32000;offset+=32){
  if(image[offset]===255||channels[offset]===255){image.set(channels.subarray(offset,offset+32),offset);continue;}
  image.set(channels.subarray(offset,offset+13),offset);
  image[offset+13]=(image[offset+13]&~3)|(channels[offset+13]&3);
  image[offset+14]=(image[offset+14]&~3)|(channels[offset+14]&3);
  image[offset+15]=(image[offset+15]&~0x7d)|(channels[offset+15]&0x7d);
  image.set(channels.subarray(offset+20,offset+32),offset+20);
 }
 const settings=0x8040;
 for(const [field,offset] of Object.entries(imageOffsets))image[settings+offset]=bounded(root.funCfgs[field],255,field);
 image[settings+26]=bounded(root.funCfgs.chAWorkmode,1,'VFO A mode')|(bounded(root.funCfgs.chBWorkmode,1,'VFO B mode')<<4);
 storeWord(image,settings+44,Number(root.vfos.vfoScanRang_L));
 storeWord(image,settings+46,Number(root.vfos.vfoScanRang_H));
 for(const side of ['A','B']){
  const prefix='vfo'+side,source=root.vfos;
  const at=side==='A'?0x8000:0x8020;
  if(!base)image.fill(0,at,at+28);
  const fields={
   'Frequency MHz':freq(source[prefix+'Freq']),
   'RX tone code':source['strVFO'+side+'RxCtsDcs']||'Off',
   'TX tone code':source['strVFO'+side+'TxCtsDcs']||'Off',
   'Busy Lock':onOff(source[prefix+(side==='A'?'Busylock':'BusyLock')]),
   'Offset direction code':source[prefix+'Dir'],'Signalling code':source[prefix+'SignalGroup'],
   'Power code':power[source[prefix+'TxPower']],Bandwidth:source[prefix+'Bandwide']?'Narrow':'Wide',
   FHSS:onOff(source[prefix+'Fhss']),'Step code':source[prefix+'Step'],'SQ Mode code':source[prefix+'SQMode']
  };
  const offset=source[prefix+'Offset'].match(/^(\d{1,3})\.(\d{3})(\d)?$/);
  if(!offset||offset[3]&&offset[3]!=='0')throw Error('UV-32 DAT contains an unsupported VFO offset precision.');
  fields['Offset MHz']=offset[1]+'.'+offset[2];
  for(const [field,value] of Object.entries(fields))image=editUv32Vfo(image,side,field,value);
 }
 image=editUv32Dtmf(image,{field:'localId',value:root.dtmfs.localID});
 image[0x8087]=bounded(root.dtmfs.wordTime,4,'DTMF code time');
 image[0x8088]=bounded(root.dtmfs.idleTime,4,'DTMF idle time');
 image[settings+57]=bounded(root.dtmfs.hangUp,7,'DTMF hang-up time');
 for(let i=0;i<20;i++){
  image=editUv32Dtmf(image,{number:i+1,field:'code',value:root.dtmfs.group[i]});
  image=editUv32Dtmf(image,{number:i+1,field:'name',value:root.dtmfs.groupName[i]});
 }
 for(let i=0;i<10;i++)image=editUv32ZoneName(image,i+1,root.areaName[i]);
 return image;
}

export function updateUv32Dat(document,image){
 const result=structuredClone(document),{root}=result;
 const decoded=decodeUv32Channels(uv32WireDecode(image.subarray(0,32000)));
 const populated=new Map(decoded.channels.map(channel=>[channel.number,channel]));
 root.channelList.forEach((zone,bank)=>zone.forEach((entry,index)=>{
  const channel=populated.get(bank*100+index+1);
  if(!channel){
   for(const key of datChannelProperties)entry[key]=0;
   Object.assign(entry,{rxFreq:'',txFreq:'',strRxCtsDcs:'OFF',strTxCtsDcs:'OFF',name:''});
   return;
  }
  if(channel.rx==='Invalid'||channel.tx==='Invalid')throw Error('Cannot save a DAT with an invalid channel frequency.');
  Object.assign(entry,{
   rxFreq:channel.rx,txFreq:channel.tx==='Off'?'':channel.tx,strRxCtsDcs:datTone(channel.rxTone),strTxCtsDcs:datTone(channel.txTone),
   name:channel.name,busyLock:Number(channel.busyLock==='On'),txPower:bounded(power.indexOf(channel.power),2,'power'),
   bandwide:Number(channel.bandwidth==='Narrow'),scanAdd:Number(channel.scan==='Add'),
   sqMode:Number(channel.squelch.slice(5)),pttid:ptt.indexOf(channel.pttId),signalGroup:bounded(Number(channel.signal)-1,19,'signaling group'),fhss:Number(channel.fhss==='On')
  });
 }));
 if(image.length===UV32_CHANNEL_BYTES)return result;
 const settings=0x8040;
 for(const [field,offset] of Object.entries(imageOffsets))root.funCfgs[field]=image[settings+offset];
 root.funCfgs.chAWorkmode=image[settings+26]&15;
 root.funCfgs.chBWorkmode=image[settings+26]>>4;
 for(const [name,offset] of [['vfoScanRang_L',44],['vfoScanRang_H',46]])root.vfos[name]=String(word(image,settings+offset));
 const decodedImage=decodeUv32Image(image);
 for(const side of ['A','B']){
  const prefix='vfo'+side,at=side==='A'?0x8000:0x8020,values=new Map(decodedImage[prefix]);
  root.vfos[prefix+'Freq']=freq(values.get('Frequency MHz'));
  const offset=Array.from(image.slice(at+20,at+26)).join('');
  if(!/^\d{6}$/.test(offset))throw Error('Cannot save a DAT with an invalid VFO offset.');
  root.vfos[prefix+'Offset']=offset.slice(0,3)+'.'+offset.slice(3)+'0';
  for(const [key,name] of Object.entries({
   Dir:'Offset direction code',SignalGroup:'Signalling code',TxPower:'Power code',Step:'Step code',SQMode:'SQ Mode code'
  }))root.vfos[prefix+key]=values.get(name);
  root.vfos[prefix+(side==='A'?'Busylock':'BusyLock')]=Number(values.get('Busy Lock')==='On');
  root.vfos[prefix+'Bandwide']=Number(values.get('Bandwidth')==='Narrow');
  root.vfos[prefix+'Fhss']=Number(values.get('FHSS')==='On');
  root.vfos['strVFO'+side+'RxCtsDcs']=datTone(decodeUv32Tone(values.get('RX tone code')));
  root.vfos['strVFO'+side+'TxCtsDcs']=datTone(decodeUv32Tone(values.get('TX tone code')));
 }
 root.dtmfs.localID=decodedImage.dtmf.localId;
 root.dtmfs.wordTime=image[0x8087];root.dtmfs.idleTime=image[0x8088];root.dtmfs.hangUp=image[settings+57];
 root.dtmfs.group=decodedImage.dtmf.entries.map(entry=>entry.code);
 root.dtmfs.groupName=decodedImage.dtmf.entries.map(entry=>entry.name);
 root.areaName=decodedImage.zones.map(zone=>zone.name);
 return result;
}
