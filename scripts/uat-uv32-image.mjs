// UV-32 read-only image sections. Offsets follow the CHIRP UV-17Pro family
// layout; values without a verified factory-CPS mapping remain numeric.
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
 ['Skey1 Short',50],['Skey2 Short',52],['Enable Menu Rst',55],['Single Watch',56],['Hang-Up Time',57],
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
function decodeVfo(bytes){
 const b=bytes;const digits=b.slice(0,8),freq=digits.every(x=>x<=9)?Number(digits.slice(0,3).join('')+'.'+digits.slice(3).join('')):null;
 return [
  ['Frequency MHz',freq===null?'Unconfirmed ('+hex(digits)+')':freq.toFixed(5)],['RX tone code',b[8]|b[9]<<8],['TX tone code',b[10]|b[11]<<8],
  ['Busy Lock',value(b[13],onoff)],['Offset direction code',b[14]>>5],['Signalling code',b[14]&31],
  ['Power code',b[16]],['Bandwidth',b[17]&0x40?'Narrow':'Wide'],['FHSS',b[17]&1?'On':'Off'],
  ['Step code',b[19]],['Offset bytes',hex(b.slice(20,26))],['SQ Mode code',b[28]]
 ];
}
export function decodeUv32Image(wire){
 if(!(wire instanceof Uint8Array)||wire.length!==UV32_IMAGE_BYTES)throw Error(`A full ${UV32_IMAGE_BYTES}-byte UV-32 image is required`);
 const settings=wire.slice(0x8040,0x8080);
 const functionFields=fields.map(([name,offset])=>[name,offset===44||offset===46?settings[offset]|settings[offset+1]<<8:value(settings[offset],maps[name])]);
 functionFields.find(x=>x[0]==='Work Modes')[1]=`A ${settings[26]&15}, B ${settings[26]>>4}`;
 const ani=wire.slice(0x8080,0x808b);
 const dtmfEntries=Array.from({length:20},(_,i)=>{const b=wire.slice(0x80a0+i*16,0x80b0+i*16);return {number:i+1,code:dtmf(b.slice(0,5)),name:label(b.slice(5,15))};});
 const zones=Array.from({length:10},(_,i)=>({number:i+1,name:label(wire.slice(0x8280+i*16,0x8290+i*16))}));
 return {
  functionFields,
  vfoA:decodeVfo(wire.slice(0x8000,0x8020)),vfoB:decodeVfo(wire.slice(0x8020,0x8040)),
  dtmf:{localId:dtmf(ani.slice(0,5)),codeTime:value(ani[7],[50,100,200,300,500].map(x=>x+' ms')),
   idleTime:value(ani[8],[50,100,200,300,500].map(x=>x+' ms')),
   hangUp:value(settings[57],Array.from({length:8},(_,i)=>(i+3)+' s')),entries:dtmfEntries},
  zones
 };
}
