// Edit checks only. These do not establish hardware band limits or transmit authority.
export function validateEdits(current,baseline,options,charset){
 const originalChannels=new Set(baseline.channelList[0].slice(0,999).map(c=>JSON.stringify(c)));
 const errors=[];const add=(path,message)=>errors.push(`${path.replace(/Radio\.channelList\[1\]\.(\d+)/,(_,i)=>`Channel ${Number(i)+1}`).replace('Radio.funCfgs','Optional settings').replace('Radio.vfos','VFO').replace('Radio.dtmfs','DTMF')}: ${message}`);
 if(JSON.stringify(current.channelList[0][999])!==JSON.stringify(baseline.channelList[0][999]))add('Extra file record','must remain unchanged; the radio is limited to 999 user channels.');
 function name(value,path,max){let bytes=0;for(const char of value){const n=char.codePointAt(0),range=charset.find(([a,b])=>n>=a&&n<=b);if(!range){add(path,'contains a character CPS cannot store losslessly (or a control character).');return;}bytes+=range[2];}if(bytes>max)add(path,`uses ${bytes} encoded bytes; the maximum is ${max}. Shorten the name.`);}
 function frequency(v,path,blank=false){if(blank&&v==='')return;if(typeof v!=='string'||!/^\d{3}\.\d{5}$/.test(v)||Number(v)<100){add(path,'enter MHz from 100.00000 to 999.99999 with five decimal places, for example 146.52000. This is a format limit, not a verified radio band limit.');return;}}
 function dtmf(value,path,max){if(typeof value!=='string'||!new RegExp(`^[0-9ABCD*#]{0,${max}}$`,'i').test(value))add(path,`use at most ${max} DTMF characters: 0–9, A–D, * or #.`);}
 function walk(o,b,path){
  // Moving an unchanged channel must preserve its original padding and stored
  // option values, just as leaving that same record in its old slot does.
  if(o.$type==='KDH.Channel'&&originalChannels.has(JSON.stringify(o)))return;
  for(const [k,v] of Object.entries(o)){if(k==='$type')continue;const old=b?.[k],p=`${path}.${k}`;if(v===old)continue;
   if(Array.isArray(v)){v.forEach((item,i)=>{if(item&&typeof item==='object')walk(item,old?.[i],`${p}[${i+1}]`);else if(item!==old?.[i]){if(k==='groupName')name(item,`${p}[${i+1}]`,10);if(k==='group')dtmf(item,`${p}[${i+1}]`,3);}});continue;}
   if(v&&typeof v==='object'){walk(v,old,p);continue;}
   const choices=options[o.$type]?.[k];if(choices){if(!choices.some(([code])=>code===v))add(p,'select a listed CPS choice.');continue;}
   if(k==='name')name(v,p,12);
   else if(k==='rxFreq'||k==='txFreq'||/^vfo[AB]Freq$/.test(k))frequency(v,p,k==='rxFreq'||k==='txFreq');
   else if(/^vfo[AB]Offset$/.test(k)){if(typeof v!=='string'||!/^\d{3}\.\d{4}$/.test(v))add(p,'enter an offset like 000.6000 (three digits and four decimal places).');}
   else if(k==='localID')dtmf(v,p,3);
   else if(k==='onlineCode'||k==='offlineCode')dtmf(v,p,16);
   else if(k==='vfoScanRang_L'||k==='vfoScanRang_H'){if(!/^\d{1,3}$/.test(v)||Number(v)<1)add(p,'enter a whole MHz value from 1 to 999. Hardware range checks are still pending.');}
   else if(['vfoABusylock','vfoBBusyLock'].includes(k))add(p,'this unverified field is read-only.');
  }
 }
 walk(current,baseline,'Radio');
 current.channelList[0].forEach((c,i)=>{const b=baseline.channelList[0][i];if((c.rxFreq!==b.rxFreq||c.txFreq!==b.txFreq)&&!c.rxFreq&&c.txFreq)add(`Channel ${i+1}`,'a transmit frequency needs a receive frequency. Clear both to empty this channel.');});
 const v=current.vfos,b=baseline.vfos;
 if((v.vfoScanRang_L!==b.vfoScanRang_L||v.vfoScanRang_H!==b.vfoScanRang_H)&&Number(v.vfoScanRang_L)>Number(v.vfoScanRang_H))add('VFO scan range','the lower limit must not exceed the upper limit.');
 for(const side of ['A','B']){const keys=[`vfo${side}Freq`,`vfo${side}Offset`,`vfo${side}Dir`];if(keys.some(k=>v[k]!==b[k])&&v[keys[2]]!==0){const f=Number(v[keys[0]]),offset=Number(v[keys[1]]),tx=f+(v[keys[2]]===1?offset:-offset);if(Number.isFinite(tx)&&(tx<100||tx>=1000))add(`VFO ${side}`,'the offset produces a transmit frequency outside the supported three-digit representation.');}}
 return errors;
}
