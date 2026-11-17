// UV-32 edits operate on a copy of a complete, decoded CHIRP-region image.
// All offsets are in image order, not physical radio addresses.
import {DCS,decodeUv32Channels,uv32WireDecode} from './uat-uv32-read.mjs?v=20.54b';
import {UV32_IMAGE_BYTES,decodeUv32Image} from './uat-uv32-image.mjs';

const assertImage=image=>{if(!(image instanceof Uint8Array)||image.length!==UV32_IMAGE_BYTES)throw Error('A complete UV-32 image is required');};
const ascii=(value,max)=>{const s=String(value??'');if(s.length>max||/[^\x20-\x7e]/.test(s))throw Error(`Use at most ${max} plain-text characters`);return s;};
const integer=(value,min,max,label)=>{const n=Number(value);if(!Number.isInteger(n)||n<min||n>max)throw Error(`${label} must be ${min}–${max}`);return n;};
export const uv32ImageFromHex=hex=>{if(typeof hex!=='string'||hex.length!==UV32_IMAGE_BYTES*2||!/^[0-9a-f]+$/i.test(hex))throw Error('A complete UV-32 capture is required');return uv32WireDecode(Uint8Array.from(hex.match(/../g),x=>parseInt(x,16)));};
export const uv32ImageToHex=image=>{assertImage(image);return Array.from(uv32WireDecode(image),x=>x.toString(16).padStart(2,'0')).join('');};
export const uv32Preview=image=>{assertImage(image);const wire=uv32WireDecode(image);return {preview:decodeUv32Channels(wire.slice(0,32000)),readout:decodeUv32Image(image)};};
const freq=value=>{const s=String(value).trim();if(!/^\d{3}\.\d{5}$/.test(s))throw Error('Frequency must have five decimal places, for example 146.52000');const n=Number(s);if(n<108||n>520)throw Error('Frequency is outside the UV-32 range');const digits=s.replace('.','').split('').reverse();const out=new Uint8Array(4);for(let i=0;i<4;i++)out[i]=Number(digits[i*2])+Number(digits[i*2+1])*16;return out;};
const tone=value=>{const s=String(value).trim().toUpperCase();if(s==='OFF')return 0;let code;if(/^\d{2,3}\.\d$/.test(s)){code=Math.round(Number(s)*10);if(code<600||code>2600)throw Error('CTCSS tone must be 60.0–260.0 Hz');}else{const match=s.match(/^D(\d{3})([NR])$/);if(!match)throw Error('Use Off, a CTCSS tone, or D023N/D023R');const index=DCS.indexOf(Number(match[1]));if(index<0)throw Error('DCS code is not supported');code=index+(match[2]==='R'?106:1);}return code;};
const set16=(b,offset,n)=>{b[offset]=n&255;b[offset+1]=n>>8;};
const choice=(value,options,label)=>{const n=options.indexOf(String(value));if(n<0)throw Error(`Choose a valid ${label}`);return n;};
const setName=(image,offset,length,value)=>{const s=ascii(value,length);image.fill(255,offset,offset+length);for(let i=0;i<s.length;i++)image[offset+i]=s.charCodeAt(i);};

export function editUv32Channel(source,number,patch){
 assertImage(source);integer(number,1,1000,'Channel');const b=new Uint8Array(source),at=(number-1)*32;
 if(patch.delete===true){b.fill(255,at,at+32);return b;}
 if(b[at]===255){b.fill(0,at,at+16);b.fill(255,at+16,at+32);b[at+12]=0;b[at+13]=0;b[at+15]=4;}
 for(const [key,value] of Object.entries(patch)){
  switch(key){
   case 'rx': b.set(freq(value),at);break;
   case 'tx': if(String(value).toLowerCase()==='off')b.fill(255,at+4,at+8);else b.set(freq(value),at+4);break;
   case 'rxTone':set16(b,at+8,tone(value));break;
   case 'txTone':set16(b,at+10,tone(value));break;
   case 'signal':b[at+12]=integer(value,1,20,'Signal')-1;break;
   case 'pttId':b[at+13]=choice(value,['Off','BOT','EOT','Both'],'PTT-ID');break;
   case 'power':b[at+14]=(b[at+14]&~3)|choice(value,['High','Low','Medium'],'power');break;
   case 'bandwidth':b[at+15]=value==='Narrow'?b[at+15]|64:value==='Wide'?b[at+15]&~64:(()=>{throw Error('Choose Wide or Narrow')})();break;
   case 'scan':b[at+15]=value==='Add'?b[at+15]|4:value==='Skip'?b[at+15]&~4:(()=>{throw Error('Choose Add or Skip')})();break;
   case 'squelch':b[at+15]=(b[at+15]&~48)|(integer(String(value).replace(/^Code /,''),0,3,'SQ mode')<<4);break;
   case 'busyLock':b[at+15]=value==='On'?b[at+15]|8:value==='Off'?b[at+15]&~8:(()=>{throw Error('Choose On or Off')})();break;
   case 'fhss':b[at+15]=value==='On'?b[at+15]|1:value==='Off'?b[at+15]&~1:(()=>{throw Error('Choose On or Off')})();break;
   case 'name':setName(b,at+20,12,value);break;
   default:throw Error('Unknown UV-32 channel field: '+key);
  }
 }
 if(b[at]===255||!uv32Preview(b).preview.channels.find(c=>c.number===number||c.number===Number(number)))throw Error('Channel requires a valid RX frequency');
 return b;
}

export function editUv32ZoneName(source,number,value){assertImage(source);integer(number,1,10,'Zone');const b=new Uint8Array(source);setName(b,0x8280+(number-1)*16,16,value);return b;}
const DTMF='0123456789ABCD*#';
const setDtmf=(b,at,length,value)=>{const s=String(value??'').toUpperCase();if(s.length>length||[...s].some(c=>!DTMF.includes(c)))throw Error(`DTMF code must use 0-9, A-D, * or # and fit ${length} characters`);b.fill(255,at,at+length);for(let i=0;i<s.length;i++)b[at+i]=DTMF.indexOf(s[i]);};
export function editUv32Dtmf(source,{number,field,value}){assertImage(source);const b=new Uint8Array(source);if(field==='localId')setDtmf(b,0x8080,5,value);else if(field==='codeTime'||field==='idleTime'){const n=choice(value,['50 ms','100 ms','200 ms','300 ms','500 ms'],field);b[0x8080+(field==='codeTime'?7:8)]=n;}else if(field==='hangUp')b[0x8040+57]=choice(value,Array.from({length:8},(_,i)=>`${i+3} s`),field);else{integer(number,1,20,'DTMF entry');const at=0x80a0+(number-1)*16;if(field==='code')setDtmf(b,at,5,value);else if(field==='name')setName(b,at+5,10,value);else throw Error('Unknown DTMF field');}return b;}

// Factory CPS and CHIRP agree on these direct settings offsets and options.
export const UV32_SETTING_OPTIONS={
 'SQL':{offset:0,values:['Off','1','2','3','4','5']},'TOT':{offset:5,values:['Off',...Array.from({length:12},(_,i)=>`${(i+1)*15} s`)]},
 'Save Mode':{offset:1,values:['Off','On']},'Dual Standby':{offset:4,values:['Off','On']},'Pilot Tone':{offset:29,values:['1000 Hz','1450 Hz','1750 Hz','2100 Hz']},
 'Sidetone':{offset:9,values:['Off','Side Key','ANI','Side Key + ANI']},'Tail Clear':{offset:20,values:['Off','On']},
 'Power On Dis Type':{offset:28,values:['Logo','Battery voltage']},'Beep':{offset:6,values:['Off','Beep','Voice','Both']},'Roger':{offset:23,values:['Off','On']},
 'Language':{offset:8,values:['English','Chinese']},'Scan Mode':{offset:10,values:['Time','Carrier','Search']},'Alarm Mode':{offset:17,values:['Local','Send Tone','Send Code']},
 'Key Lock':{offset:27,values:['Off','On']},'FM':{offset:25,values:['Enable','Disable']},'Key Auto Lock':{offset:16,values:['Off','On']},
 'CH.A Display Type':{offset:13,values:['Name','Frequency','Channel Number']},'CH.B Display Type':{offset:14,values:['Name','Frequency','Channel Number']},
 'Work Mode A':{offset:26,values:['Frequency Mode','Ch Mode'],nibble:'low'},'Work Mode B':{offset:26,values:['Frequency Mode','Ch Mode'],nibble:'high'},
 'Vox Switch':{offset:58,values:['Off','On']},'Vox Lv':{offset:2,values:Array.from({length:9},(_,i)=>String(i+1))},
 'GPS Switch':{offset:48,values:['Off','On']},'GPS Mode':{offset:49,values:['GPS','Beidou','GPS + Beidou']},
 'Enable Menu Rst':{offset:55,values:['Off','On']},'QT Save Mode':{offset:43,values:['Both','RX','TX']},
 'Skey1 Short':{offset:50,values:['FM','Scan','Search','Vox']},'Selected VFO':{offset:24,values:['A','B']}
};
export function editUv32Setting(source,name,value){assertImage(source);const spec=UV32_SETTING_OPTIONS[name];if(!spec)throw Error('This setting is not mapped for editing');const b=new Uint8Array(source),n=choice(value,spec.values,name),at=0x8040+spec.offset;if(spec.nibble==='low')b[at]=(b[at]&240)|n;else if(spec.nibble==='high')b[at]=(b[at]&15)|(n<<4);else b[at]=n;return b;}

export function editUv32Vfo(source,side,field,value){
 assertImage(source);if(!['A','B'].includes(side))throw Error('Choose VFO A or B');
 const b=new Uint8Array(source),at=0x8000+(side==='B'?32:0);
 if(field==='Frequency MHz'){const s=String(value).trim();freq(s);b.set([...s.replace('.','')].map(Number),at);}
 else if(field==='RX tone code'||field==='TX tone code')set16(b,at+(field==='RX tone code'?8:10),/^\d+$/.test(String(value).trim())?integer(value,0,65535,'Tone code'):tone(value));
 else if(field==='Busy Lock')b[at+13]=choice(value,['Off','On'],'Busy Lock');
 else if(field==='Power code')b[at+16]=choice(value,['High','Low','Medium'],'power');
 else if(field==='Bandwidth')b[at+17]=value==='Narrow'?b[at+17]|64:value==='Wide'?b[at+17]&~64:(()=>{throw Error('Choose Wide or Narrow')})();
 else if(field==='FHSS')b[at+17]=value==='On'?b[at+17]|1:value==='Off'?b[at+17]&~1:(()=>{throw Error('Choose On or Off')})();
 else if(field==='Signalling code')b[at+14]=(b[at+14]&224)|integer(value,0,19,'Signalling');
 else if(field==='Offset direction code')b[at+14]=(b[at+14]&31)|(integer(value,0,2,'Offset direction')<<5);
 else if(field==='Step code')b[at+19]=integer(value,0,7,'Step');
 else if(field==='Offset MHz'){const s=String(value).trim();if(!/^\d{1,3}\.\d{3}$/.test(s)||Number(s)>999.999)throw Error('Offset must be 0.000–999.999 MHz');b.set([...s.replace('.','').padStart(6,'0')].map(Number),at+20);}
 else if(field==='SQ Mode code')b[at+28]=integer(value,0,3,'SQ Mode');
 else throw Error('This VFO field is not mapped for editing');
 return b;
}

export function changedUv32Blocks(original,edited){assertImage(original);assertImage(edited);const addresses=[];let index=0;for(const [start,size] of [[0,0x8040],[0x9000,0x40],[0xa000,0x2c0],[0xd000,0x40]])for(let at=start;at<start+size;at+=64){let changed=false;for(let i=0;i<64;i++)if(original[index+i]!==edited[index+i]){changed=true;break;}if(changed)addresses.push({address:at,imageOffset:index});index+=64;}return addresses;}
