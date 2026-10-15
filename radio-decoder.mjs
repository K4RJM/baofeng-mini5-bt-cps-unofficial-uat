// Passive native-CPS data decoder. No transport, executable deserialization, or dependency on installed CPS.
import {crypt,tones} from './radio-encoder.mjs';
import {writeDat} from './dat.mjs';
const fields={sql:[0,10],saveMode:[1,2],vox:[2,10],backlight:[3,9],dualStandby:[4,2],tot:[5,13],beep:[6,2],voice:[7,2],language:[8,2],sideTone:[9,4],scanMode:[10,3],chADisType:[13,3],chBDisType:[14,3],autoLock:[16,2],alarmMode:[17,3],alarmTone:[18,2],tailClear:[20,2],rptTailClear:[21,11],rptTailDet:[22,11],roger:[23,2],fmEnable:[25,2],powerOnDisType:[28,3],tone:[29,4],voxDlyTime:[32,16],menuQuitTime:[33,11],totAlarm:[40,11],ctsDcsScanType:[43,3],key2Short:[50,256],rstMenu:[55,256],voxSw:[58,2]};
const nameDecoder=new TextDecoder('gbk',{fatal:true});
function name(b){const end=b.indexOf(255);return nameDecoder.decode(end<0?b:b.subarray(0,end));}
function tone(b,o){const lo=b[o],hi=b[o+1];return hi===0?(lo>0&&lo<=210?tones[50+lo]:'OFF'):(lo!==0&&lo!==255?((hi*256+lo)/10).toFixed(1):'OFF');}
function freq(b,o){let n=0;for(let i=3;i>=0;i--)n=n*100+(b[o+i]>>4)*10+(b[o+i]&15);return n>=10000000&&n<60000000?(n/100000).toFixed(5):'';}
function channel(b){const c={$type:'KDH.Channel',id:0,rxFreq:'',strRxCtsDcs:'OFF',txFreq:'',strTxCtsDcs:'OFF',busyLock:0,txPower:0,bandwide:0,scanAdd:0,sqMode:0,pttid:0,signalGroup:0,fhss:0,name:''};
 c.rxFreq=freq(b,0);if(!c.rxFreq)return c;
 Object.assign(c,{txFreq:freq(b,4),strRxCtsDcs:tone(b,8),strTxCtsDcs:tone(b,10),signalGroup:b[12]%20,pttid:b[13]%4,txPower:b[14]%2,bandwide:(b[15]>>6)&1,sqMode:(b[15]>>4)&1,busyLock:(b[15]>>3)&1,scanAdd:(b[15]>>2)&1,fhss:b[15]&1,name:name(b.subarray(20,32))});return c;
}
function vfo(v,b,side){const p='vfo'+side;let f=b[0]===255?'40012500':[...b.subarray(0,8)].join('');v[p+'Freq']=f.slice(0,-5)+'.'+f.slice(-5);
 v['strVFO'+side+'RxCtsDcs']=tone(b,8);v['strVFO'+side+'TxCtsDcs']=tone(b,10);
 v[p+(side==='A'?'Busylock':'BusyLock')]=b[13]%2;v[p+'Dir']=(b[14]>>4)&3;v[p+'SignalGroup']=side==='A'?b[14]:b[14]&15;v[p+'TxPower']=b[16];v[p+'Bandwide']=(b[17]>>6)&1;v[p+'Fhss']=b[17]&1;v[p+'Step']=b[19];v[p+'SQMode']=b[27];
 const o=b[20]===255?'0000000':[...b.subarray(20,27)].map(n=>n<10?n:0).join('');v[p+'Offset']=o.slice(0,3)+'.'+o.slice(3);
}
function digits(b,o,n){let s='';for(let i=0;i<n&&b[o+i]!==255;i++)s+='0123456789ABCD*#'[b[o+i]%16];return s;}
export function decodeRadio(raw){
 if(!(raw instanceof Uint8Array)||raw.length!==33344)throw Error('A complete radio read is required to save a CPS DAT');
 const b=crypt(raw),s=b.subarray(0x8040,0x8080),d=b.subarray(0x8080),funCfgs={$type:'KDH.Function'},vfos={$type:'KDH.VFOInfos'};
 for(const [k,[o,m]] of Object.entries(fields))funCfgs[k]=s[o]%m;
 // Preserve F02 option bytes, including unknown codes; the write validator rejects unsupported values.
 Object.assign(funCfgs,{pttDly:s[12],chAWorkmode:(s[26]&15)%2,chBWorkmode:(s[26]>>4)%2,keyLock:s[27]&1});
 vfo(vfos,b.subarray(0x8000,0x8020),'A');vfo(vfos,b.subarray(0x8020,0x8040),'B');
 vfos.vfopttid=s[11];vfos.busyLock=s[15]%2;
 let low=s[44]+s[45]*256,high=s[46]+s[47]*256;vfos.vfoScanRang_L=String(low>1000?400:low);vfos.vfoScanRang_H=String(high>1000?520:high);
 const dtmfs={$type:'KDH.DTMF',localID:digits(d,0,3),group:Array.from({length:20},(_,i)=>digits(d,32+i*16,3)),groupName:Array.from({length:20},(_,i)=>name(d.subarray(37+i*16,47+i*16))),wordTime:d[7]%6,idleTime:d[8]%6,separator:d[9]%6,groupCall:d[10]%7,hangUp:s[57]%8,onlineCode:digits(d,384,16),offlineCode:digits(d,400,16)};
 return {$type:'KDH.AppData',channelList:[Array.from({length:1000},(_,i)=>channel(b.subarray(i*32,i*32+32)))],vfos,funCfgs,dtmfs};
}
export function radioDat(raw,schemas){return writeDat(decodeRadio(raw),schemas);}
