import {importChannelCsv} from './csv-import.mjs?v=20.33';
// Read-only channel interchange; never a MINI-5 memory image. See docs/RDT-IMPORT.md.
export const MAX_RDT_BYTES=32_000_000;
const layouts={'D168UV:V1292':35,'D890UV:V1323':50};
const tones='62.5 67.0 69.3 71.9 74.4 77.0 79.7 82.5 85.4 88.5 91.5 94.8 97.4 100.0 103.5 107.2 110.9 114.8 118.8 123.0 127.3 131.8 136.5 141.3 146.2 151.4 156.7 159.8 162.2 165.5 167.9 171.3 173.8 177.3 179.9 183.5 186.2 189.9 192.8 196.6 199.5 203.5 206.5 210.7 218.1 225.7 229.1 233.6 241.8 250.3 254.1'.split(' ');
const ascii=b=>String.fromCharCode(...b),u16=(b,p)=>b[p]+256*b[p+1],u32=(b,p)=>u16(b,p)+65536*u16(b,p+2);
const fail=m=>{throw Error(m);},mhz=n=>(n/100000).toFixed(5);
// Validate a COMPLETE table, including both terminal VFO records. Never pick the
// longest/best-looking candidate, guess a count, or anchor to a channel name.
function tableAt(b,start,tailSize,budget){
 const count=u16(b,start);if(count<2||count>4002)return null;
 let p=start+2,previous=-1;const records=[];
 for(let i=0;i<count;i++){
  if(++budget.used>100000)fail('RDT structure exceeds the inspection limit; file not imported.');
  if(p+48+1+tailSize>b.length)return null;
  const id=u16(b,p),rx=u32(b,p+2);
  if(id<=previous||id>4001||(i<count-2&&id>=4000)||(i===count-2&&id!==4000)||(i===count-1&&id!==4001))return null;
  if(rx<100000||rx>99999999||b[p+6]>2||b[p+11]>5||b[p+12]>3||b[p+13]>1)return null;
  let q=p+48;while(q<Math.min(p+65,b.length)&&b[q])q++;
  if(q>=b.length||q>p+64||b[q]!==0||q+1+tailSize>b.length)return null;
  const name=b.subarray(p+48,q);if(name.some(x=>x<32||x===127))return null;
  records.push({id,h:b.subarray(p,p+48),name,tail:b.subarray(q+1,q+1+tailSize)});
  previous=id;p=q+1+tailSize;
 }
 return {records,start,end:p};
}
export function parseRdt(input){
 const b=input instanceof Uint8Array?input:new Uint8Array(input);
 if(b.length<200||b.length>MAX_RDT_BYTES)fail('RDT must be a complete codeplug smaller than 32 MB.');
 const version=ascii(b.subarray(0,5)),model=ascii(b.subarray(9,17)).replace(/\0+$/,'');
 const tailSize=layouts[model+':'+version];if(!tailSize)fail('Unsupported RDT model/format: '+model+' / '+version+'. Supported: D168UV V1292 and D890UV V1323.');
 if(u32(b,5)!==b.length-14||ascii(b.subarray(19,23))!=='V100')fail('RDT length or header is invalid; file not imported.');
 const candidates=[],budget={used:0};
 // These versions place their variable-length settings before the channel table.
 // Limit work and reject anything outside the verified envelope.
 for(let p=23;p<Math.min(8192,b.length-2);p++){
  const table=tableAt(b,p,tailSize,budget);if(table){candidates.push(table);if(candidates.length>1)fail('RDT channel layout is ambiguous; file not imported.');}
 }
 if(candidates.length!==1)fail('RDT channel layout is incomplete or unrecognized; file not imported.');
 return {model,version,...candidates[0]};
}
function tone(h,p){
 const mode=h[p];if(mode===0)return 'Off';
 if(mode===1){if(h[p+1]>=tones.length)fail('Custom or unrecognized RDT CTCSS needs verification.');return tones[h[p+1]];}
 if(mode===2){const code=u16(h,p+2);if(code>511)fail('Unverified inverted/extended RDT DCS encoding.');return 'D'+code.toString(8).padStart(3,'0')+'N';}
 fail('Unrecognized RDT tone mode.');
}
function analogFields(r,model){
 const h=r.h,t=r.tail;
 if(r.name.some(x=>x>126))fail('RDT name encoding is unverified for non-ASCII characters.');
 if(h[14]||h[16]||h[17]||h[32]||h[33]||h[15]>1)fail('RDT reverse, signaling, squelch or transmit-permission options need review.');
 // Conservative profile: unknown analog options must match the verified inactive
 // baseline. Digital-only contact/ID/color-code/slot fields are never imported.
 for(const p of [35,36,37,38,39,42,43,44,45,46,47])if(h[p])fail('Unverified RDT channel option at field '+p+'.');
 const expected=new Uint8Array(t.length);expected[0]=1;expected[12]=1;expected[t.length-1]=t[t.length-1];
 if(model==='D890UV'){expected[37]=1;expected[45]=255;}
 if(t.some((v,i)=>v!==expected[i])||t[t.length-1]>15)fail('RDT extended channel options differ from the verified analog profile.');
 const rx=u32(h,2),value=u32(h,7),tx=h[6]===0?value:h[6]===1?rx+value:rx-value;
 if(!Number.isSafeInteger(tx)||tx<0||tx>99999999)fail('Invalid RDT transmit frequency.');
 return [ascii(r.name),mhz(rx),mhz(tx),'A-Analog',['Low','Mid','High','Turbo'][h[12]],h[13]?'25K':'12.5K',tone(h,18),tone(h,22),h[15]?'On':'Off','Off','Off','Off','Off','Off',h[34]===255?'Off':'Named scan list'];
}
const heads=['Channel Name','Receive Frequency','Transmit Frequency','Channel Type','Transmit Power','Band Width','CTCSS/DCS Decode','CTCSS/DCS Encode','PTT Prohibit','Optional Signal','PTT ID','Busy Lock/TX Permit','Talk Around(Simplex)','Reverse','Scan List'];
const csvRow=cells=>cells.map(s=>'"'+String(s).replaceAll('"','""')+'"').join(',');
export function importRdt(input,settings){
 const parsed=parseRdt(input),rows=[];let skippedDigital=0;const baseNotes=[];
 for(const r of parsed.records){
  if(r.id>=4000)continue;
  if(r.h[11]!==0){skippedDigital++;continue;}
  try{
   const converted=importChannelCsv(csvRow(heads)+'\n'+csvRow(analogFields(r,parsed.model)),settings);
   const row=converted.rows[0];rows.push({...row,line:r.id+1});if(!baseNotes.length)baseNotes.push(...converted.notes);
  }catch(e){rows.push({line:r.id+1,sourceName:ascii(r.name),channel:null,notes:[],error:e.message});}
 }
 return {kind:'rdt',format:'AnyTone '+parsed.model+' RDT',rows,channels:rows.filter(r=>r.channel).map(r=>r.channel),emptyRows:0,skippedDigital,skippedVfo:2,
  notes:['Digital/mixed-mode channels are filtered out. The two source VFO records and radio-wide settings are not imported.',...baseNotes,'RDT support is limited to the verified model/format pairs. Unverified analog options are excluded for review.'],model:parsed.model,version:parsed.version};
}
export async function readRdtFile(file,settings){
 if(!file||!Number.isFinite(file.size)||file.size>MAX_RDT_BYTES)fail('RDT must be smaller than 32 MB.');
 return importRdt(new Uint8Array(await file.arrayBuffer()),settings);
}
