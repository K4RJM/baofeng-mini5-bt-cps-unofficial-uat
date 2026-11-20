import {aprsChoices, dtmfChoices, functionChoices, receiverChoices, vfoChoices} from './rt950-factory.mjs';
import {toneBytes, tone} from './rt950-core.mjs';

// Each field describes exactly the bits or bytes it owns. The same descriptors
// drive the controls, validation and field-wise restore onto another radio.
const choice = (region, [key, label, offset, options, mask=15, shift=0], base=0) =>
  ({region, key, label, offset:base+offset, options, mask, shift, length:1, type:'choice'});
const field = (region,key,label,offset,type,length,props={}) => ({region,key,label,offset,type,length,...props});
const integer = (region,key,label,offset,length,min,max,props={}) => field(region,key,label,offset,'number',length,{min,max,...props});
const settings = functionChoices.map(row=>choice('settings',row));
settings.push(integer('settings','scanLow','VFO scan low (MHz)',73,2,18,999),integer('settings','scanHigh','VFO scan high (MHz)',75,2,18,999));
const vfos = ['A','B','C'].map((band,index)=>{
  const base=32*index;
  const rows=vfoChoices.map(row=>choice('vfo',row,base));
  rows.find(f=>f.key==='FreqBand').readonly=true;
  return [
    field('vfo','rx','RX frequency (MHz)',base,'digits',8,{decimals:5,min:18,max:999.99999}),
    field('vfo','rxTone','RX tone',base+8,'tone',2),field('vfo','txTone','TX tone',base+10,'tone',2),
    ...rows,field('vfo','offset','Offset (MHz)',base+20,'digits',7,{decimals:4,min:0,max:999.9999})
  ];
});
const dtmf=[field('dtmf','localId','DTMF current ID',0,'dtmf',5),...dtmfChoices.map(row=>choice('dtmf',row))];
const dtmfGroups=Array.from({length:15},(_,i)=>field('dtmf','group'+(i+1),'Group '+(i+1),32+i*16,'dtmf',6));
const receiver=receiverChoices.map(row=>choice('receiver',row));
const stationRows={};
for(const [band,idx] of [['FM',0],['AM',1],['SSB',2]]){
  stationRows[band]=Array.from({length:16},(_,i)=>{
    const at=band==='FM'?2*i:band==='AM'?34+2*i:69+5*i;
    const freq=integer('receiver','frequency',band==='FM'?'MHz':'kHz',at,2,band==='FM'?64:band==='AM'?153:150,band==='FM'?108:band==='AM'?26100:30000,
      {scale:band==='FM'?100:1,empty:i>0,range:band==='AM'?[[153,279],[520,1710],[2300,26100]]:undefined});
    const rows=[freq];
    if(band==='SSB' && i>0){
      rows.push(choice('receiver',['bandwidth','Bandwidth',at+2,['0.5 kHz','1.0 kHz','1.2 kHz','2.2 kHz','3.0 kHz','4.0 kHz'],255]));
      rows.push(integer('receiver','beat','Beat offset (Hz)',at+3,2,-32760,27240,{signed:true}));
    }
    if(i>0)rows.push(field('names','name','Name',idx*256+i*16,'name',12));
    return rows;
  });
}
const aprs=aprsChoices.map(row=>choice('aprs',row));
aprs.push(field('aprs','call','Call sign',17,'call',6),field('aprs','path1','Custom routing 1',43,'call',6),
  field('aprs','path2','Custom routing 2',50,'call',6),field('aprs','message','Custom message',79,'name',40),
  integer('aprs','altitude','Altitude (m)',15,2,-10000,10000,{signed:true}));
for(const [axis,start,max,hemispheres] of [['Latitude',7,90,['N','S']],['Longitude',11,180,['W','E']]]){
  aprs.push(field('aprs',axis+'Dir',axis+' hemisphere',start,'letter',1,{options:hemispheres}),
    integer('aprs',axis+'Degrees',axis+' degrees',start+2,1,0,max),
    integer('aprs',axis+'Minutes',axis+' minutes',start+1,1,0,59),
    integer('aprs',axis+'Seconds',axis+' seconds',start+3,1,0,59));
}
export {settings, vfos, dtmf, dtmfGroups, receiver, stationRows, aprs};
const allFields=[...settings,...vfos.flat(),...dtmf,...dtmfGroups,...receiver,...Object.values(stationRows).flat(2),...aprs];
const dtmfAlphabet='0123456789ABCD*#';
const decoder=new TextDecoder('gb18030');
let gbCharacters;
function encodeText(value){
  if(/^[\x20-\x7e]*$/.test(value))return Uint8Array.from(value,c=>c.charCodeAt(0));
  if(!gbCharacters){
    gbCharacters=new Map();
    for(let high=0xa1;high<=0xf7;high++)for(let low=0xa1;low<=0xfe;low++){
      const char=decoder.decode(Uint8Array.of(high,low));
      if(char!=='�'&&!gbCharacters.has(char))gbCharacters.set(char,[high,low]);
    }
  }
  return Uint8Array.from([...value].flatMap(c=>{
    if(/^[ -~]$/.test(c))return [c.charCodeAt(0)];
    const bytes=gbCharacters.get(c);
    if(!bytes)throw Error('Use characters supported by the radio.');
    return bytes;
  }));
}
export function getValue(bytes,f){
  if(!bytes)return '';
  const view=bytes.subarray(f.offset,f.offset+f.length), b=view[0];
  switch(f.type){
    case 'choice': return b===255?'':String((b&f.mask)>>f.shift);
    case 'letter': return f.options.includes(String.fromCharCode(b))?String.fromCharCode(b):'';
    case 'tone': return tone(view);
    case 'digits': return view.some(n=>n>9)?'':(Number([...view].join(''))/10**f.decimals).toFixed(f.decimals);
    case 'dtmf': {let s='';for(const n of view){if(n>15)break;s+=dtmfAlphabet[n];}return s;}
    case 'name':case 'call': {const end=view.findIndex(n=>n===0||n===255);return decoder.decode(end<0?view:view.subarray(0,end));}
    case 'number': {
      let n=f.length===2?b+(view[1]<<8):b;
      if(f.signed&&n>=32768)n-=65536;
      if(f.empty&&(n===0||n===65535))return '';
      return String(n/(f.scale||1));
    }
  }
}
function writeValue(bytes,f,value){
  const view=bytes.subarray(f.offset,f.offset+f.length);
  const invalid=()=>{throw Error('Invalid value for '+f.label+'.');};
  if(f.type==='choice'){
    const n=Number(value);
    if(value===''||!Number.isInteger(n)||!Object.hasOwn(f.options,n))invalid();
    const packed=(view[0]&~f.mask)|((n<<f.shift)&f.mask);
    // 0xff denotes an unset enum. Materialize the selected value if it would alias that sentinel.
    view[0]=packed===255&&view[0]===255?(n<<f.shift):packed;
    return;
  }
  if(f.type==='letter'){if(!f.options.includes(value))invalid();view[0]=value.charCodeAt(0);return;}
  if(f.type==='tone'){view.set(toneBytes(value));return;}
  if(f.type==='call'||f.type==='name'||f.type==='dtmf'){
    let data;
    if(f.type==='dtmf'){
      const s=value.toUpperCase();
      if(!/^[0-9A-D*#]*$/.test(s))invalid();
      data=Uint8Array.from(s,c=>dtmfAlphabet.indexOf(c));
    }else{
      if(f.type==='call'&&!/^[A-Z0-9]*$/i.test(value))invalid();
      data=encodeText(f.type==='call'?value.toUpperCase():value);
    }
    if(data.length>f.length)throw Error(f.label+' allows up to '+f.length+' bytes.');
    view.fill(255);view.set(data);return;
  }
  if(value===''&&f.empty){view.fill(0);return;}
  const n=Number(value),scale=f.type==='digits'?10**f.decimals:(f.scale||1);
  const raw=Math.round(n*scale);
  if(value===''||!Number.isFinite(n)||n<f.min||n>f.max||Math.abs(raw-n*scale)>1e-6)invalid();
  if(f.range&&!f.range.some(([a,b])=>n>=a&&n<=b))throw Error(f.label+' must be in '+f.range.map(([a,b])=>a+'–'+b).join(', ')+'.');
  if(f.type==='digits'){view.set(Array.from(String(raw).padStart(f.length,'0'),Number));return;}
  view[0]=raw&255;if(f.length===2)view[1]=(raw>>8)&255;
}
export function editField(image,f,value){
  if(f.readonly||!image[f.region])throw Error('Read Bluetooth or open a backup with these settings first.');
  const bytes=image[f.region].slice();
  writeValue(bytes,f,String(value).trim());
  if(f.region==='vfo'&&f.key==='rx'){
    const band=f.offset+18;bytes[band]=(bytes[band]&0xf0)|(Number(value)>=300?1:0);
  }
  return {...image,[f.region]:bytes};
}
export function validateSettings(image,baseline){
  if(image.settings&&!baseline?.settings?.slice(73,77).every((b,i)=>b===image.settings[73+i])){
    const [low,high]=settings.slice(-2).map(f=>Number(getValue(image.settings,f)));
    if(low<18||high>999||low>high)throw Error('Use a VFO scan range between 18 and 999 MHz, with low at or below high.');
  }
  for(const [offset,limit,label] of [[7,90,'Latitude'],[11,180,'Longitude']]){
    const coord=image.aprs?.slice(offset,offset+4);
    if(!coord||coord.every((v,i)=>baseline?.aprs?.[offset+i]===v))continue;
    const [,minutes,degrees,seconds]=coord;
    if(degrees>limit||minutes>59||seconds>59||(degrees===limit&&(minutes||seconds))){
      throw Error(label+' must be within '+limit+' degrees, with valid minutes and seconds.');
    }
  }
}
export function overlaySettings(result,before,after){
  for(const f of allFields){
    const src=after[f.region],old=before[f.region],dest=result[f.region];
    if(!src||!dest)continue;
    const a=f.offset,mask=f.mask??255;
    const differs=!old||src.subarray(a,a+f.length).some((b,i)=>((b^old[a+i])&mask)!==0);
    if(!differs)continue;
    for(let i=a;i<a+f.length;i++)dest[i]=(dest[i]&~mask)|(src[i]&mask);
  }
}
