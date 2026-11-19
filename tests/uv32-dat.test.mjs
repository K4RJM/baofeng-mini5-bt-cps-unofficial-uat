import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readUv32Dat,writeUv32Dat} from '../scripts/uv32-dat.mjs';
import {applyUv32Dat,updateUv32Dat} from '../scripts/uv32-dat-image.mjs';
import {editUv32Channel} from '../scripts/uat-uv32-edit.mjs';

const prefix='BF_H802_CPS.';
function fixture(){
 const schemas=[];
 const record=(type,integers,strings,extra={})=>{
  const name=prefix+type,names=[],types=[],extras=[],value={$type:name};
  const field=(key,member,kind,detail=null)=>{
   names.push(key);types.push(kind);extras.push(detail);value[key]=member;
  };
  integers.split(' ').filter(Boolean).forEach(key=>field(key,0,0,8));
  for(const [key,member] of Object.entries(strings))field(key,member,1);
  for(const [key,[member,kind,detail]] of Object.entries(extra))field(key,member,kind,detail);
  schemas.push({name,names,types,extras});
  return value;
 };
 const blank=record('Channel','id busyLock txPower bandwide scanAdd sqMode pttid signalGroup fhss',
  {rxFreq:'',txFreq:'',strRxCtsDcs:'OFF',strTxCtsDcs:'OFF',name:''});
 const vfo=record('VFOInfos',
  'vfoABusylock vfoADir vfoASignalGroup vfoATxPower vfoABandwide vfoASQMode vfoAStep vfoAFhss vfoBBusyLock vfoBDir vfoBSignalGroup vfoBTxPower vfoBBandwide vfoBSQMode vfoBStep vfoBFhss',
  {vfoAFreq:'146.52000',vfoBFreq:'446.00000',vfoAOffset:'000.0000',vfoBOffset:'000.0000',vfoScanRang_L:'136',vfoScanRang_H:'174',
   strVFOARxCtsDcs:'OFF',strVFOATxCtsDcs:'OFF',strVFOBRxCtsDcs:'OFF',strVFOBTxCtsDcs:'OFF'});
 const radio=record('Function',
  'sql saveMode vox backlight dualStandby tot beep voiceSw voice sideTone scanMode pttDly chADisType chBDisType autoLock alarmMode alarmTone tailClear rptTailClear rptTailDet roger fmEnable keyLock powerOnDisType tone voxDlyTime menuQuitTime totAlarm ctsDcsScanType gpsSw gpsMode key1Short rstMenu voxSw chAWorkmode chBWorkmode micGain',{});
 radio.micGain=3;
 const dtmf=record('DTMF','wordTime idleTime hangUp',{localID:''},
  {group:[Array(20).fill(''),6],groupName:[Array(20).fill(''),6]});
 const cls=(value,name)=>[value,4,[prefix+name,2]];
 const root=record('AppData','',{model:'UV32PRO'},{
  channelList:cls(Array.from({length:10},()=>Array.from({length:100},()=>({...blank}))),'Channel[][]'),
  areaName:[Array.from({length:10},(_,i)=>'Zone '+(i+1)),6],
  vfos:cls(vfo,'VFOInfos'),funCfgs:cls(radio,'Function'),dtmfs:cls(dtmf,'DTMF')
 });
 root.channelList[9][99]={...blank,rxFreq:'146.55000',name:'LAST',scanAdd:1};
 return {root,schemas};
}

test('UV32PRO DAT round-trips channel 1000, edits and opaque CPS fields',()=>{
 const document=fixture();
 const original=readUv32Dat(writeUv32Dat(document));
 assert.deepEqual(original.root,document.root);
 const memory=applyUv32Dat(original);
 const edited=editUv32Channel(memory,1000,{name:'UPDATED'});
 const updated=readUv32Dat(writeUv32Dat(updateUv32Dat(original,edited)));
 assert.deepEqual(updated.root.channelList[9][99],{...original.root.channelList[9][99],name:'UPDATED'});
 assert.equal(updated.root.funCfgs.micGain,3);
 assert.equal(updated.root.areaName[9],'Zone 10');
 assert.equal(updated.root.vfos.vfoAFreq,'146.52000');
});

test('UV32PRO DAT rejects truncated and other-model files',()=>{
 const document=fixture(),bytes=writeUv32Dat(document);
 assert.throws(()=>readUv32Dat(bytes.subarray(0,-1)),/truncated/);
 document.root.model='UV17PRO';
 assert.throws(()=>readUv32Dat(writeUv32Dat(document)),/UV32PRO/);
});

test('Saving a channel list into a DAT preserves all settings from its template',()=>{
 const template=fixture(),image=new Uint8Array(32000).fill(255);
 const channels=editUv32Channel(image,2,{rx:'146.52',name:'IMPORTED',power:'High'});
 const saved=readUv32Dat(writeUv32Dat(updateUv32Dat(template,channels))).root;
 assert.equal(saved.channelList[0][1].name,'IMPORTED');
 assert.equal(saved.channelList[9][99].rxFreq,'');
 for(const key of Object.keys(template.root).filter(k=>k!=='channelList'))assert.deepEqual(saved[key],template.root[key]);
 assert.equal(template.root.channelList[9][99].name,'LAST');
});
