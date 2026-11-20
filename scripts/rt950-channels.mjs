import {CH_LEN, DCS_CODES, EMPTY_REC, LAYOUTS, REC, ZN_LEN, backupJSON, buildRecord, decFreq, encCtcss, encDcs, encFreq, encName, eq, hex, parseCSV, zoneFromFilename} from './rt950-core.mjs';

export const powers=['High','Medium','Low'];
export const modes=['FM','NFM','AM'];
const layoutFor=id=>{
 const layout=LAYOUTS[id];
 if(!layout)throw Error('Choose the firmware layout from the radio’s About menu.');
 return layout;
};
export function blankImage(){
 const ch=new Uint8Array(CH_LEN).fill(255);
 for(let i=0;i<990;i++)ch.set(EMPTY_REC,i*REC);
 return {model:'RT-950',ch,zn:new Uint8Array(ZN_LEN).fill(255)};
}
export function record(image,layout,slot){
 const {zones,per}=layoutFor(layout);
 if(!Number.isInteger(slot)||slot<0||slot>=zones*per)throw Error('Channel is outside this firmware layout.');
 return image.ch.subarray(slot*REC,(slot+1)*REC);
}
const nameBytes=name=>{
 if(!/^[ -~]{0,12}$/.test(name))throw Error('Use up to 12 printable ASCII characters for the name.');
 return encName(name);
};
function frequency(value){
 if(!/^\d{1,3}(?:\.\d+)?$/.test(String(value))||Number(value)<18||Number(value)>=1000)throw Error('Enter a frequency from 18 to below 1000 MHz.');
 if(!Number.isInteger(Math.round(Number(value)*1e8)/1000))throw Error('Use a 10 Hz frequency step (five decimal places in MHz).');
 return encFreq(value);
}
function toneBytes(value){
 if(!value||/^off$/i.test(value))return [0,0];
 const dcs=/^D([0-7]{3})([NIR])$/i.exec(value);
 if(dcs)return encDcs(dcs[1],dcs[2]);
 if(!/^\d{2,3}(?:\.\d)?$/.test(value)||Number(value)<60||Number(value)>260)throw Error('Enter Off, a CTCSS tone in Hz, or a DCS code such as D023N.');
 return encCtcss(value);
}
function tone(raw){
 const n=raw[0]+256*raw[1];
 if(!n||n===65535)return 'Off';
 return DCS_CODES[n-1]??(n>=600&&n<=2600?(n/10).toFixed(1):'Raw '+n);
}
const nameDecoder=new TextDecoder('gb18030');
function label(bytes){
 const end=bytes.findIndex(b=>!b||b===255);
 const str=bytes.subarray(0,end<0?bytes.length:end);
 return nameDecoder.decode(str);
}
export function channel(bytes){
 const flags=bytes[15],rx=decFreq(bytes.subarray(0,4)),tx=decFreq(bytes.subarray(4,8));
 return {name:label(bytes.subarray(20)),rx:rx?.toFixed(5)??'',tx:flags&2?tx?.toFixed(5)??'':'',rxTone:tone(bytes.subarray(8,10)),txTone:tone(bytes.subarray(10,12)),mode:flags&1?'AM':flags&64?'NFM':'FM',power:powers[bytes[14]]??('Raw '+bytes[14]),scan:!!(flags&4)};
}
export function editRecord(bytes,patch){
 const isEmpty=!channel(bytes).rx;
 const next=isEmpty?buildRecord({Frequency:patch.rx,Duplex:'off'}):bytes.slice();
 for(const [key,value] of Object.entries(patch)){
  switch(key){
   case 'name': next.set(nameBytes(value),20);break;
   case 'rx': next.set(frequency(value));break;
   case 'tx':
    if(value){next.set(frequency(value),4);next[15]|=2;}
    else{next[15]&=~2;if(isEmpty)next.set(next.subarray(0,4),4);}
    break;
   case 'rxTone': case 'txTone': next.set(toneBytes(value),key==='rxTone'?8:10);break;
   case 'power': if(!powers.includes(value))throw Error('Choose a power level.');next[14]=powers.indexOf(value);break;
   case 'mode': if(!modes.includes(value))throw Error('Choose FM, NFM or AM.');next[15]=(next[15]&~65)|(value==='AM'?1:value==='NFM'?64:0);break;
   case 'scan': next[15]=(next[15]&~4)|(value?4:0);break;
   default: throw Error('Unknown channel field.');
  }
 }
 return next;
}
export function zoneName(image,layout,zone){
 return layoutFor(layout).zoneNames?label(image.zn.subarray((zone-1)*16,zone*16)):'';
}
export function renameZone(image,layout,zone,name){
 const {zones,zoneNames}=layoutFor(layout);
 if(!zoneNames||!Number.isInteger(zone)||zone<1||zone>zones)throw Error('This firmware uses fixed zone names.');
 const bytes=nameBytes(name),start=(zone-1)*16;
 image.zn.fill(255,start,start+16);
 image.zn.set(bytes,start);
}
// Import only mapped data. Retain the destination radio’s unrelated bytes, including
// the two non-channel records in the block shared with channels 989 and 990.
export function overlayChanges(target,before,after,layout){
 const result={...target,ch:target.ch.slice(),zn:target.zn.slice()};
 const {zones,per,zoneNames}=layoutFor(layout);
 for(let i=0;i<zones*per;i++){
  const a=record(before,layout,i),b=record(after,layout,i),out=record(result,layout,i);
  if(eq(a,b))continue;
  const empty=channel(b).rx==='';
  if(empty&&!b.subarray(0,4).every(v=>v===255)&&!b.subarray(0,4).every(v=>v===0))throw Error('Invalid receive frequency in channel '+(i+1)+'.');
  if(!empty&&(b[15]&2)&&!decFreq(b.subarray(4,8)))throw Error('Invalid transmit frequency in channel '+(i+1)+'.');
  if(empty){if(channel(a).rx)out.set(EMPTY_REC);continue;}
  const includeAll=!channel(a).rx;
  if(!channel(out).rx)out.set(buildRecord({Frequency:channel(b).rx,Duplex:'off'}));
  for(const [start,end] of [[0,4],[4,8],[8,10],[10,12],[14,15],[20,32]]){
   if(includeAll||!eq(a.subarray(start,end),b.subarray(start,end)))out.set(b.subarray(start,end),start);
  }
  for(const mask of [1|64,2,4])if(includeAll||((a[15]^b[15])&mask))out[15]=(out[15]&~mask)|(b[15]&mask);
 }
 if(zoneNames)for(let z=0;z<zones;z++){
  const start=z*16,end=start+16;
  if(!eq(before.zn.subarray(start,end),after.zn.subarray(start,end)))result.zn.set(after.zn.subarray(start,end),start);
 }
 return result;
}
export function saveBackup(image,layout){
 layoutFor(layout);
 return JSON.stringify({...JSON.parse(backupJSON(image).text),firmwareLayout:layout});
}
export function openBackup(text,fallback){
 const obj=JSON.parse(text);
 if(obj.model!=='RT-950')throw Error('Choose a backup with the RT-950 model identifier.');
 const layout=obj.firmwareLayout??fallback;
 layoutFor(layout);
 const decode=(key,len)=>{
  const s=obj.segments?.[key];
  if(typeof s!=='string'||s.length!==len*2||!/^[0-9a-f]+$/i.test(s))throw Error('Incomplete RT-950 backup segment '+key+'.');
  return hex(s);
 };
 return {layout,image:{model:obj.model,ch:decode('0000',CH_LEN),zn:decode('C000',ZN_LEN)}};
}
export function appendCsv(image,layout,startZone,text,filename){
 const {zones,per,zoneNames:canRename}=layoutFor(layout);
 const named=zoneFromFilename(filename),z=named?.zone??startZone;
 if(z<1||z>zones)throw Error('CSV zone is outside the selected firmware layout.');
 const rows=parseCSV(text);
 const next={...image,ch:image.ch.slice(),zn:image.zn.slice()};
 let slot=(z-1)*per,count=0,skipped=0;
 for(const row of rows){
  if(!row.Frequency)continue;
  if(!modes.includes((row.Mode||'FM').toUpperCase())){skipped++;continue;}
  while(slot<(named?z*per:zones*per)&&channel(record(next,layout,slot)).rx)slot++;
  if(slot>=(named?z*per:zones*per))throw Error('The selected channels do not fit in the available slots. No channels were added.');
  frequency(row.Frequency);
  if(row.Offset&&!/^\d+(?:\.\d+)?$/.test(row.Offset))throw Error('Invalid CSV offset for '+row.Name);
  if(row.Power&&!['HIGH','MID','MEDIUM','LOW'].includes(row.Power.toUpperCase()))throw Error('Unknown power level for '+row.Name+'. Use High, Medium or Low.');
  nameBytes(row.Name||'');
  const decoded=buildRecord(row);
  if(decoded[15]&2)frequency(channel(decoded).tx);
  record(next,layout,slot++).set(decoded);
  count++;
 }
 if(!count)throw Error('No supported analog channels found.');
 if(named&&canRename&&!zoneName(next,layout,z))renameZone(next,layout,z,named.name);
 return {image:next,count,skipped,zone:z};
}
