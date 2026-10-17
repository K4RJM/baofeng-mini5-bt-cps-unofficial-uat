// Executable findings and accepted limitations. TODO marks deliberately failing open expectations.
// Replace a TODO only with a reviewed correction or explicitly accepted, evidenced limitation.
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
import {makePlan,Writer} from '../writer.mjs';
import {decodeRadio} from '../radio-decoder.mjs';
import {crypt} from '../radio-encoder.mjs';
import {readDat,writeDat} from '../dat.mjs';
import {fixture,options,schemas,channel} from './fixtures.mjs';
import {simulatedRadio} from './simulate.mjs';

test('F01 accepted: DAT reconstruction retains the evidenced factory normalization',()=>{
 const source=makePlan(fixture(),options).target,plain=crypt(source);plain[0x7d00]=18;plain[0x8053]=52;plain[0x8058]=1;
 const captured=crypt(plain),rebuilt=makePlan(decodeRadio(captured),options).target;
 const differences=Array.from(captured.keys()).filter(i=>captured[i]!==rebuilt[i]);
 // Retain the original two synthetic probes and the independently observed 0x9018 case.
 // This characterizes accepted normalization, not the meaning of an unmapped byte.
 assert.deepEqual(differences,[0x7d00,0x8053,0x8058]);
 const normalized=crypt(rebuilt),evidence=JSON.parse(readFileSync(new URL('./evidence/f01-factory-captures.json',import.meta.url)));
 for(const native of evidence.files)assert.deepEqual([normalized[0x7d00],normalized[0x8053],normalized[0x8058]],[native.gapPayloadByte,native.radio9013,native.radio9018]);
});
test('F02: accepted non-tone options outside the separately characterized F03 fields survive conversion',()=>{
 const failed=[];let checked=0;
 for(const [type,choices]of Object.entries(options))for(const [key,values]of Object.entries(choices)){
  if(/CtsDcs/.test(key)||/^vfo[AB](Dir|SignalGroup)$/.test(key))continue;
  for(const [value]of values){
   const input=fixture(),object=type==='KDH.Channel'?input.channelList[0][0]:Object.values(input).find(v=>v?.$type===type);
   if(!object)continue;object[key]=value;
   const decoded=decodeRadio(makePlan(input,options).target),output=type==='KDH.Channel'?decoded.channelList[0][0]:Object.values(decoded).find(v=>v?.$type===type);
   checked++;if(output[key]!==value)failed.push({type,key,input:value,output:output[key]});
  }
 }
 assert.equal(checked,292);assert.deepEqual(failed,[]);
});
test('F03 accepted limitation: retain all 120 direction/group cases and their known asymmetry',()=>{
 const failed=[];
 for(const side of ['A','B'])for(const direction of [0,1,2])for(const group of Array.from({length:20},(_,i)=>i)){
  const input=fixture(),prefix='vfo'+side;input.vfos[prefix+'Dir']=direction;input.vfos[prefix+'SignalGroup']=group;
  const result=decodeRadio(makePlan(input,options).target).vfos;
  if(result[prefix+'Dir']!==direction||result[prefix+'SignalGroup']!==group)failed.push({side,direction,group,decodedDirection:result[prefix+'Dir'],decodedGroup:result[prefix+'SignalGroup']});
 }
 // Characterization, not a claim that all combinations are independent or hardware-certified.
 assert.equal(failed.length,52);
 assert.deepEqual(['A','B'].flatMap(side=>[0,1,2].map(direction=>[side,direction,failed.filter(x=>x.side===side&&x.direction===direction).length])),[['A',0,4],['A',1,16],['A',2,20],['B',0,4],['B',1,4],['B',2,4]]);
 assert.deepEqual(failed.find(x=>x.side==='A'&&x.direction===0&&x.group===16),{side:'A',direction:0,group:16,decodedDirection:1,decodedGroup:16});
 assert.deepEqual(failed.find(x=>x.side==='A'&&x.direction===1&&x.group===0),{side:'A',direction:1,group:0,decodedDirection:1,decodedGroup:16});
});
test('F07 representation: out-of-band stored frequency survives decoding and is blocked for programming',()=>{
 const plain=crypt(makePlan(fixture(),options).target);plain.set([0,0,0,0x65],0);
 const decoded=decodeRadio(crypt(plain));assert.equal(decoded.channelList[0][0].rxFreq,'650.00000');
 assert.throws(()=>makePlan(decoded,options),/Channel 1.*frequency/i);
});
test('F08: channel 999 survives DAT export and evidenced reconstruction',()=>{
 const data=fixture();data.channelList[0][998]=channel('LAST');
 assert.deepEqual(readDat(writeDat(data,schemas),schemas),data);
 assert.deepEqual(decodeRadio(makePlan(data,options).target).channelList[0][998],data.channelList[0][998]);
});
test('F10: a stalled native send settles the transaction without retry',async()=>{
 const radio=new Writer({deadlines:{send:25}}),sim=simulatedRadio(radio),send=radio.char.writeValueWithoutResponse.bind(radio.char);let stop,entered;
 const reached=new Promise(resolve=>entered=resolve);
 radio.char.writeValueWithoutResponse=bytes=>bytes[0]===87?new Promise((resolve,reject)=>{stop=reject;entered();}):send(bytes);
 const operation=radio.upload(makePlan(fixture(),options),null,{confirmed:true}).then(()=> 'completed',()=> 'rejected');
 try{await reached;const result=await Promise.race([operation,delay(500).then(()=> 'still-pending')]);assert.equal(result,'rejected');assert.equal(radio.report.stage,'write-incomplete-or-uncertain');assert.equal(radio.busy,false);}
 finally{stop?.(Error('End simulated stalled operation'));await operation;radio.disconnect();}
 assert.equal(sim.writes().length,0);
});
