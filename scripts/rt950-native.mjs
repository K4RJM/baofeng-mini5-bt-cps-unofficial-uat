import {readCpsDocument,writeCpsDocument} from './cps-nrbf.mjs';
import {defaults,schemas,blockDefaults} from './rt950-native-defaults.mjs';
import {EMPTY_REC,LAYOUTS,sections,eq,hex} from './rt950-core.mjs';
import {blankImage,record,fullChannel,editRecord,zoneName,channelMenus,powers} from './rt950-channels.mjs';
import {settings,vfos,dtmf,dtmfGroups,receiver,stationRows,aprs,getValue,writeValue} from './rt950-sections.mjs';

const profile={
 assembly:'BT-RT950PRO_CPS, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null',
 className:/^KDH\.(RadioData|ChannelData|Channel|FreqModeData|VFOData|FunConfigData|DTMFData|ModulationData|ModulationChannel|APRSData)$/,
 arrayClasses:['KDH.Channel[]','KDH.ModulationChannel[]']
};
const menuFields=[
 ['signal','signallingGroup'],['ptt','pttId'],['power','txPower'],['scramble','scram'],['learn','learnFHSS'],
 ['bandwidth','bandWide'],['encryption','encrypt'],['lock','busyLockout'],['rxMode','rxModulation']
];
const blankChannel=defaults.channelData.channelList[0];
const menus={...channelMenus,power:powers};
const textField=(offset,length)=>({offset,length,type:'name',label:'Name'});
function newDocument(){
 const root=structuredClone(defaults);
 root.channelData.channelList=Array.from({length:990},()=>({...blankChannel}));
 const stations=root.modulationData.modulationChannels;
 for(let i=2;i<16;i++)stations.push({...stations[1]});
 return root;
}
function readChannel(ch){
 if(!ch.rxFreq)return new Uint8Array(32).fill(255);
 const patch={rx:ch.rxFreq,tx:ch.txFreq||'',rxTone:ch.rxQT,txTone:ch.txQT,fhss:ch.fhssCode,scan:!!ch.scanAdd};
 for(const [key,member] of menuFields)patch[key]=menus[key][ch[member]];
 const bytes=editRecord(EMPTY_REC,patch);
 if(!patch.tx)bytes.fill(255,4,8);
 writeValue(bytes,textField(20,12),ch.chName||'');
 return bytes;
}
function writeChannel(bytes){
 const row=fullChannel(bytes);
 if(!row.rx)return {...blankChannel};
 const channel={...blankChannel,rxFreq:row.rx,txFreq:row.tx,rxQT:row.rxTone.toUpperCase(),txQT:row.txTone.toUpperCase(),chName:row.name,scanAdd:Number(row.scan),fhssCode:row.fhss};
 for(const [key,member] of menuFields){
  const index=menus[key].indexOf(row[key]);
  if(index<0)throw Error('Unsupported '+key+' value in the channel.');
  channel[member]=index;
 }
 return channel;
}
const members={
 scanLow:'nUD_VfoScanRangeLow',scanHigh:'nUD_VfoScanRangeHigh',rx:'tB_RxFreq',rxTone:'cbB_RxQT',txTone:'cbB_TxQT',offset:'tB_OffsetFreq',localId:'tB_DTMFCurId',
 call:'tB_CallSign',path1:'tB_CustomRoutingOne',path2:'tB_CustomRoutingTwo',message:'tB_CustomMessages',altitude:'nUD_Altitude',
 LatitudeDir:'cbB_NorthSouthLatitude',LongitudeDir:'cbB_EastWestLongitude',
 LatitudeDegrees:'nUD_LatitudeDegree',LatitudeMinutes:'nUD_LatitudeMinute',LatitudeSeconds:'nUD_LatitudeSecond',
 LongitudeDegrees:'nUD_LongitudeDegree',LongitudeMinutes:'nUD_LongitudeMinute',LongitudeSeconds:'nUD_LongitudeSecond'
};
function visitSettings(root,visit){
 function fields(list,object){
  for(const f of list)visit(f,object,members[f.key]??'cbB_'+f.key);
 }
 fields(settings,root.funConfigData);fields(dtmf,root.dtmfData);fields(receiver,root.modulationData);fields(aprs,root.aprsData);
 vfos.forEach((list,i)=>{
  const vfo=root.freqModeData['vfo'+'ABC'[i]];
  fields(list,vfo);
  visit({region:'vfo',offset:17+i*32,length:1,type:'choice',mask:128,shift:7,options:['Off','On']},vfo,'cbB_LearnFHSS');
 });
 for(let i=0;i<root.dtmfData.dtmfCodeGroup.length;i++)visit({...dtmfGroups[0],offset:32+16*i},root.dtmfData.dtmfCodeGroup,i);
 for(const [band,rows] of Object.entries(stationRows)){
  for(let i=0;i<16;i++){
   const station=root.modulationData.modulationChannels[i],prefix=band.toLowerCase();
   const fields=i===0?[rows[0][0],...rows[1].slice(1).map(f=>({...f,offset:f.offset-(f.region==='names'?16:5)}))]:rows[i];
   for(const f of fields)visit(f,station,prefix+({frequency:'Freq',name:'Name',bandwidth:'Bandwidth',beat:'BeatFreqOffset'}[f.key]));
  }
 }
}
function fromField(value,f){
 if(f.type==='letter')return f.options[value]??'';
 if(f.scale)return String(value/f.scale);
 return String(value??'');
}
function toField(value,f,old){
 if(f.type==='letter')return f.options.indexOf(value);
 if(f.type==='tone')return value.toUpperCase();
 if(f.type==='digits'&&f.key==='offset')return value.padStart(8,'0');
 if(f.scale)return Math.round(Number(value)*f.scale);
 return typeof old==='number'?Number(value):value;
}
export function openNative(input){
 const doc=readCpsDocument(input,profile),root=doc.root;
 if(root?.$type!=='KDH.RadioData'||doc.schemas.length!==schemas.length||
  !schemas.every(s=>JSON.stringify(doc.schemas.find(o=>o.name===s.name))===JSON.stringify(s))||
  root.channelData?.channelList?.length!==990||root.channelData.arrayZoneName?.length!==10||
  root.modulationData?.modulationChannels?.length!==16||root.dtmfData?.dtmfCodeGroup?.length!==22)throw Error('Choose a Radtel RT-950 Pro CPS 1.3.3 DAT file.');
 const image=blankImage();image.factoryDat=true;
 for(const {key,length} of sections){
  image[key]=new Uint8Array(length).fill(255);
  if(blockDefaults[key])image[key].set(hex(blockDefaults[key]));
 }
 root.channelData.channelList.forEach((ch,i)=>{
  if(ch?.$type!=='KDH.Channel')throw Error('Invalid Radtel channel '+(i+1)+'.');
  try{record(image,'990',i).set(readChannel(ch));}catch(e){throw Error('Channel '+(i+1)+': '+e.message);}
 });
 root.channelData.arrayZoneName.forEach((s,i)=>writeValue(image.zn,textField(i*16,12),s||''));
 visitSettings(root,(f,o,k)=>{
  if(!Object.hasOwn(o,k))throw Error('Missing native field '+k);
  const value=fromField(o[k],f);
  writeValue(image[f.region],f,value==='0'&&f.empty?'':value);
 });
 return {image,layout:'990',native:{root,image}};
}
export function saveNative(image,layout,native){
 if(image.overflow?.length)throw Error('Place or remove over-capacity channels before saving a CPS DAT.');
 const root=native?structuredClone(native.root):newDocument();
 const {zones,per,zoneNames}=LAYOUTS[layout];
 for(let i=0;i<zones*per;i++){
  const bytes=record(image,layout,i);
  if(native&&eq(bytes,record(native.image,layout,i)))continue;
  try{root.channelData.channelList[i]=writeChannel(bytes);}catch(e){throw Error('Channel '+(i+1)+': '+e.message);}
 }
 if(zoneNames)for(let z=1;z<=zones;z++)root.channelData.arrayZoneName[z-1]=zoneName(image,layout,z);
 visitSettings(root,(f,o,k)=>{
  const bytes=image[f.region];if(!bytes)return;
  const value=getValue(bytes,f);
  if(native&&value===getValue(native.image[f.region],f))return;
  if(value===''&&['number','choice','digits','letter'].includes(f.type)&&!f.empty)return;
  if(f.type==='choice'&&!Object.hasOwn(f.options,value))return;
  if(f.type==='number'&&value!==''&&(Number(value)<f.min||Number(value)>f.max))return;
  o[k]=toField(value,f,o[k]);
 });
 return writeCpsDocument({root,schemas},profile.assembly);
}
