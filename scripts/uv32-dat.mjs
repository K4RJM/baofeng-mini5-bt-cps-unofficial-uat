import {readCpsDocument,writeCpsDocument} from './cps-nrbf.mjs';

const profile={
 assembly:'BF-UVs CPS, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null',
 className:/^BF_H802_CPS\.(AppData|Channel|VFOInfos|Function|FMChannel|DTMF)$/,
 arrayClasses:['BF_H802_CPS.Channel[]','BF_H802_CPS.Channel[][]']
};
const checked=(ok,message)=>{if(!ok)throw Error(message);};

export function readUv32Dat(input){
 const result=readCpsDocument(input,profile),{root}=result;
 checked(root?.$type==='BF_H802_CPS.AppData'&&root.model==='UV32PRO','This DAT does not identify the UV32PRO.');
 checked(root.channelList?.length===10&&root.channelList.every(zone=>Array.isArray(zone)&&zone.length===100&&zone.every(channel=>channel?.$type==='BF_H802_CPS.Channel')),'Expected ten UV-32 zones of 100 channels.');
 checked(root.areaName?.length===10&&root.dtmfs?.group?.length===20&&root.dtmfs?.groupName?.length===20&&root.vfos&&root.funCfgs,'UV-32 CPS settings are missing or incomplete.');
 return result;
}
export const writeUv32Dat=document=>writeCpsDocument(document,profile.assembly);
