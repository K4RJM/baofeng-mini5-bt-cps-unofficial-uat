// Workspace-only operations. No transport, memory mapping or radio commands.
import {padFrequency,editedName} from './fields.mjs';
import {validateEdits} from './validation.mjs';
export const channelKeys=['rxFreq','strRxCtsDcs','txFreq','strTxCtsDcs','txPower','bandwide','scanAdd','sqMode','pttid','signalGroup','busyLock','fhss','name'];
const validIndex=i=>Number.isInteger(i)&&i>=0&&i<999;
export function inlineChannelEdit(data,baseline,index,key,raw,options,charset){
 if(!validIndex(index)||!channelKeys.includes(key))throw Error('Invalid channel cell.');
 const original=data.channelList[0][index],candidate=structuredClone(data),channel=candidate.channelList[0][index];let notice='';
 let value=typeof original[key]==='number'?Number(raw):String(raw);
 if(key==='name')value=editedName(original.name,value);
 if(value===original[key])return {candidate:data,changed:false,notice};
 if(key==='rxFreq'||key==='txFreq'){
  value=padFrequency(value);
  const corrected={'174.00000':'173.99875','520.00000':'519.99875'}[value];
  if(corrected){notice=`${value} MHz adjusted to ${corrected} MHz, the factory CPS upper limit.`;value=corrected;}
 }
 channel[key]=value;
 if(!channel.rxFreq)throw Error('Enter a receive frequency first. Use Delete to clear a channel.');
 const errors=validateEdits(candidate,baseline,options,charset);if(errors.length)throw Error(errors.join('\n'));
 return {candidate,changed:JSON.stringify(channel)!==JSON.stringify(original),notice};
}
export function planChannelMove(data,indices,destination){
 if(!Array.isArray(indices)||!indices.length)throw Error('Select channels to move.');
 if(indices.some(i=>!validIndex(i))||new Set(indices).size!==indices.length)throw Error('Invalid channel selection.');
 if(!validIndex(destination)||destination+indices.length>999)throw Error('The selected block must fit within channels 1–999.');
 const selected=new Set(indices),list=data.channelList[0];
 if(indices.some(i=>!list[i].rxFreq))throw Error('Select occupied channels only; empty slots cannot be moved as a group.');
 const tagged=list.slice(0,999).map((channel,from)=>({channel,from})),moving=tagged.filter(x=>selected.has(x.from)),remaining=tagged.filter(x=>!selected.has(x.from));
 // Stable removal/insertion preserves every record (including empty slots).
 // The preview shows all resulting renumbering, not only the selected block.
 remaining.splice(destination,0,...moving);
 const candidate=structuredClone(data);candidate.channelList[0].splice(0,999,...remaining.map(x=>structuredClone(x.channel)));
 const changes=remaining.flatMap((x,to)=>x.channel.rxFreq&&x.from!==to?[{from:x.from+1,to:to+1,name:x.channel.name.replace(/\u0000+$/u,''),selected:selected.has(x.from)}]:[]);
 return {candidate,start:destination+1,end:destination+indices.length,count:indices.length,changes,displaced:changes.filter(x=>!x.selected).length};
}
