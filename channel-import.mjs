// Workspace channel operations only. No transport or programming commands.
import {CAPACITY,emptyChannel} from './channels.mjs';
export const PRESETS=[
 {key:'shared',label:'FRS / GMRS shared · 22 channels · USA',notice:'FRS: 1–7 & 15–22 ≤2 W ERP; 8–14 ≤0.5 W. GMRS: 1–7 ≤5 W ERP; 8–14 ≤0.5 W; 15–22 ≤50 W output (mobile/base). Approved equipment required; GMRS requires a license.',rules:'https://www.ecfr.gov/current/title-47/section-95.567'},
 {key:'gmrs',label:'GMRS repeater pairs · 8 channels · USA',notice:'GMRS requires a license and certified equipment. These pairs receive on 462 MHz and transmit 5 MHz higher. Set the repeater’s access tone before transmitting.',rules:'https://www.ecfr.gov/current/title-47/section-95.1763'},
 {key:'murs',label:'MURS · 5 channels · USA',notice:'US MURS permits up to 2 W transmitter output with approved MURS equipment. No individual license is required. These presets use narrow FM.',rules:'https://www.ecfr.gov/current/title-47/section-95.2767'},
 {key:'pmr',label:'PMR446 · 16 channels · Europe',notice:'PMR446 requires compliant handheld equipment with an integral antenna and at most 0.5 W ERP. Check local rules; an amateur-radio license does not authorize PMR446 transmission.',rules:'https://www.ofcom.org.uk/siteassets/resources/documents/manage-your-licence/business-radio/business-radio-guidance/ir_2009_analogue_and_digita1.pdf'}
];
const frequency=units=>`${Math.floor(units/100000)}.${String(units%100000).padStart(5,'0')}`;
const series=(start,step,n)=>Array.from({length:n},(_,i)=>start+i*step);
const shared=[...series(46256250,2500,7),...series(46756250,2500,7),...series(46255000,2500,8)];
export function presetChannels(key,{transmit=true,power=1,repeaters=false}={}){
 if(!PRESETS.some(p=>p.key===key)||![0,1].includes(power))throw Error('Choose a listed preset and power setting.');
 const make=(rx,i,prefix,offset=0)=>({...emptyChannel(),rxFreq:frequency(rx),txFreq:transmit?frequency(rx+offset):'',txPower:power,bandwide:key==='gmrs'||offset?0:1,scanAdd:1,name:`${prefix} ${String(i+1).padStart(2,'0')}`});
 if(key==='shared'){
  const channels=shared.map((rx,i)=>make(rx,i,'FRS-GMRS'));
  if(repeaters)channels.push(...series(46255000,2500,8).map((rx,i)=>make(rx,i,'GMRS RPT',500000)));
  return channels;
 }
 if(key==='gmrs')return series(46255000,2500,8).map((rx,i)=>make(rx,i,'GMRS RPT',500000));
 if(key==='murs')return [15182000,15188000,15194000,15457000,15460000].map((rx,i)=>make(rx,i,'MURS'));
 return series(44600625,1250,16).map((rx,i)=>make(rx,i,'PMR446'));
}
export function datChannels(data){
 if(!Array.isArray(data?.channelList?.[0])||data.channelList[0].length!==1000)throw Error('Choose a native Mini 5 CPS .dat file.');
 // The extra file record is never an importable radio channel.
 return structuredClone(data.channelList[0].slice(0,CAPACITY).filter(c=>c.rxFreq));
}
const channelKey=c=>JSON.stringify(Object.entries(c).filter(([k])=>!['id','name'].includes(k)).sort(([a],[b])=>a.localeCompare(b)));
export function blockAvailability(data,count){
 const list=data.channelList[0];
 return Array.from({length:9},(_,i)=>{const start=(i+1)*100,end=Math.min(start+100,CAPACITY),occupied=list.slice(start,end).filter(c=>c.rxFreq).length;return {start:start+1,end,occupied,available:!occupied&&count<=end-start};});
}
export function planAppend(data,source,{placement='next',skipDuplicates=true}={}){
 if(data?.channelList?.[0]?.length!==1000||!Array.isArray(source))throw Error('Load a radio read or native CPS configuration first.');
 const list=data.channelList[0],known=new Set(list.slice(0,CAPACITY).filter(c=>c.rxFreq).map(channelKey)),channels=[];let duplicates=0;
 for(const ch of source){if(!ch?.rxFreq)continue;const key=channelKey(ch);if(skipDuplicates&&known.has(key)){duplicates++;continue;}channels.push(structuredClone(ch));known.add(key);}
 const plan={channels,duplicates,start:null,end:null,error:''};
 if(!channels.length){plan.error=duplicates?'All matching channels are already present.':'No populated channels to add.';return plan;}
 let start=-1;
 if(placement==='next'){
  let run=0;for(let i=0;i<CAPACITY;i++){run=list[i].rxFreq?0:run+1;if(run===channels.length){start=i-run+1;break;}}
 }else{
  const block=blockAvailability(data,channels.length).find(b=>String(b.start)===String(placement));
  if(!block){plan.error='Choose a listed placement.';return plan;}
  if(block.occupied){plan.error=`Block ${block.start}–${block.end} is occupied. Choose an empty block.`;return plan;}
  if(!block.available){plan.error=`The complete set does not fit in block ${block.start}–${block.end}.`;return plan;}
  start=block.start-1;
 }
 if(start<0){plan.error='Not enough consecutive empty slots for the complete set. No channels will be added.';return plan;}
 plan.start=start+1;plan.end=start+channels.length;return plan;
}
export function appendChannels(data,source,preferences){
 // Re-plan at Apply time; never trust an earlier preview or overwrite a slot.
 const plan=planAppend(data,source,preferences);if(plan.error)throw Error(plan.error);
 const next=structuredClone(data);plan.channels.forEach((ch,i)=>{const at=plan.start-1+i;if(at>=CAPACITY||next.channelList[0][at].rxFreq)throw Error('Placement changed. Review the empty slots again.');next.channelList[0][at]=structuredClone(ch);});
 return {data:next,plan};
}
