// UV-32 read-only image sections. Offsets follow the CHIRP UV-17Pro family
// layout; values without a verified factory-CPS mapping remain numeric.
import {UV32_BLUETOOTH_IMAGE_BYTES} from './uv32-codec.mjs';
export const UV32_IMAGE_BYTES=0x8380;
const hex=b=>Array.from(b,x=>x.toString(16).padStart(2,'0')).join(' ').toUpperCase();
const label=b=>{
 let s='';for(const x of b){if(x===0||x===255)break;s+=x>=32&&x<127?String.fromCharCode(x):'�';}return s.trim();
};
const dtmf=b=>Array.from(b,x=>x<16?'0123456789ABCD*#'[x]:'').join('');
const value=(raw,options)=>options?.[raw]??(raw===255?'Unconfirmed (FF)':`Code ${raw}`);
const onoff=['Off','On'];
const fields=[
 ['SQL',0],['Save Mode',1],['VOX level',2],['Backlight Timer',3],['Dual Standby',4],['TOT',5],['Beep',6],
 ['Voice Switch',7],['Language',8],['Sidetone',9],['Scan Mode',10],['PTT-ID',11],['Send ID Delay',12],
 ['CH.A Display Type',13],['CH.B Display Type',14],['Busy Lock',15],['Key Auto Lock',16],['Alarm Mode',17],
 ['Sound Alarm',18],['Tail Clear',20],['Rpt Tail Clear',21],['Rpt Tail Delay',22],['Roger',23],
 ['Selected VFO',24],['FM',25],['Work Modes',26],['Key Lock',27],['Power On Dls Type',28],['Pilot Tone',29],
 ['VOX Dly Time',32],['Menu Quit Timer',33],['Bluetooth',34],['Display ANI',36],['TOT Alarm',40],
 ['QT Save Mode',43],['VFO Scan Min',44],['VFO Scan Max',46],['GPS Switch',48],['GPS Mode',49],
 // Byte 52 was previously shown as “Skey2 Short”, but neither the UV-32 manual nor
 // the stock CPS establishes that mapping. Do not present an unverified label.
 ['Skey1 Short',50],['Enable Menu Rst',55],['Single Watch',56],['Hang-Up Time',57],
 ['VOX Switch',58],['GPS Timezone',59],['Input DTMF',61],['GPS Units',62],['Power On Time',63]
];
const maps={
 'SQL':{2:'2'},'Save Mode':{0:'Off'},'VOX level':{4:'5'},'Backlight Timer':{4:'20 s'},
 'TOT':{8:'120 s'},'Beep':{0:'Off'},'Sidetone':{1:'Side Key'},
 'Send ID Delay':{5:'500 ms'},'Tail Clear':{1:'On'},
 'Rpt Tail Clear':{5:'500 ms'},'Rpt Tail Delay':{5:'500 ms'},
 'Power On Dls Type':{0:'Logo'},'VOX Dly Time':{5:'1.0 s'},
 'Menu Quit Timer':{10:'60 s'},'TOT Alarm':{0:'Off'},'QT Save Mode':{0:'Both'},
 'GPS Mode':{2:'GPS + Beidou'},'Skey1 Short':{0:'FM'},
 'Dual Standby':onoff,'FM':{0:'Enable'},'Key Lock':onoff,'Key Auto Lock':onoff,'Sound Alarm':onoff,
 'VOX Switch':onoff,'GPS Switch':onoff,'Enable Menu Rst':onoff,'Roger':onoff,
 'Scan Mode':['Time','Carrier','Search'],'Language':['English','Chinese'],
 'CH.A Display Type':['Name','Frequency','Channel Number'],'CH.B Display Type':['Name','Frequency','Channel Number'],
 'Selected VFO':['A','B'],'Alarm Mode':['Local','Send Tone','Send Code'],
 'Pilot Tone':['1000 Hz','1450 Hz','1750 Hz','2100 Hz'],
};
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
const settingAliases={'Power On Dls Type':'Power On Dis Type','VOX Switch':'Vox Switch','VOX level':'Vox Lv'};
function decodeVfo(bytes){
 const b=bytes;const digits=b.slice(0,8),freq=digits.every(x=>x<=9)?Number(digits.slice(0,3).join('')+'.'+digits.slice(3).join('')):null;
 return [
  ['Frequency MHz',freq===null?'Unconfirmed ('+hex(digits)+')':freq.toFixed(5)],['RX tone code',b[8]|b[9]<<8],['TX tone code',b[10]|b[11]<<8],
  ['Busy Lock',value(b[13],onoff)],['Offset direction code',b[14]>>5],['Signalling code',b[14]&31],
  ['Power code',b[16]],['Bandwidth',b[17]&0x40?'Narrow':'Wide'],['FHSS',b[17]&1?'On':'Off'],
  ['Step code',b[19]],['Offset bytes',hex(b.slice(20,26))],['SQ Mode code',b[28]]
 ];
}
export function decodeUv32BankNames(image,start){
 return Array.from({length:10},(_,i)=>({number:i+1,name:label(image.subarray(start+i*16,start+(i+1)*16))}));
}
export function emptyUv32Readout(){
 const vfo=decodeVfo(new Uint8Array(32)).map(([key])=>[key,'']);
 return {functionFields:fields.map(([key])=>[key,'']),vfoA:vfo,vfoB:vfo,dtmf:{localId:'',codeTime:'',idleTime:'',hangUp:'',entries:[]}};
}
export function decodeUv32Image(wire){
 if(!(wire instanceof Uint8Array)||![UV32_IMAGE_BYTES,UV32_BLUETOOTH_IMAGE_BYTES].includes(wire.length))throw Error(`A full ${UV32_IMAGE_BYTES}-byte UV-32 image is required`);
 const settings=wire.slice(0x8040,0x8080);
 const functionFields=fields.map(([name,offset])=>[name,offset===44||offset===46?settings[offset]|settings[offset+1]<<8:value(settings[offset],UV32_SETTING_OPTIONS[settingAliases[name]??name]?.values??maps[name])]);
 functionFields.find(x=>x[0]==='Work Modes')[1]=`A ${settings[26]&15}, B ${settings[26]>>4}`;
 const ani=wire.slice(0x8080,0x808b);
 const dtmfEntries=Array.from({length:20},(_,i)=>{const b=wire.slice(0x80a0+i*16,0x80b0+i*16);return {number:i+1,code:dtmf(b.slice(0,5)),name:label(b.slice(5,15))};});
 const zones=decodeUv32BankNames(wire,0x8280);
 return {
  functionFields,
  vfoA:decodeVfo(wire.slice(0x8000,0x8020)),vfoB:decodeVfo(wire.slice(0x8020,0x8040)),
  dtmf:{localId:dtmf(ani.slice(0,5)),codeTime:value(ani[7],[50,100,200,300,500].map(x=>x+' ms')),
   idleTime:value(ani[8],[50,100,200,300,500].map(x=>x+' ms')),
   hangUp:value(settings[57],Array.from({length:8},(_,i)=>(i+3)+' s')),entries:dtmfEntries},
  zones
 };
}
