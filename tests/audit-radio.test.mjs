// Executable open findings. TODO marks deliberately failing expectations, not fixes.
// Remove a TODO only with the corresponding reviewed correction and independent evidence.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
import {makePlan,Writer} from '../writer.mjs';
import {decodeRadio} from '../radio-decoder.mjs';
import {crypt} from '../radio-encoder.mjs';
import {readDat,writeDat} from '../dat.mjs';
import {fixture,options,schemas,channel} from './fixtures.mjs';
import {simulatedRadio} from './simulate.mjs';

test('F01 OPEN: a read/configuration rebuild preserves unmapped captured bytes',{todo:'Needs a reviewed raw-memory preservation policy'},()=>{
 const source=makePlan(fixture(),options).target,plain=crypt(source);plain[0x7d00]=18;plain[0x8053]=52;
 const captured=crypt(plain),rebuilt=makePlan(decodeRadio(captured),options).target;
 const differences=Array.from(captured.keys()).filter(i=>captured[i]!==rebuilt[i]);
 assert.deepEqual(differences,[]);
});
test('F02: accepted non-tone options outside the unresolved F03 fields survive conversion',()=>{
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
test('F03 OPEN: VFO direction and signaling group remain independent',{todo:'Needs verified native packing and firmware interpretation'},()=>{
 const failed=[];
 for(const side of ['A','B'])for(const direction of [0,1,2])for(const group of Array.from({length:20},(_,i)=>i)){
  const input=fixture(),prefix='vfo'+side;input.vfos[prefix+'Dir']=direction;input.vfos[prefix+'SignalGroup']=group;
  const result=decodeRadio(makePlan(input,options).target).vfos;
  if(result[prefix+'Dir']!==direction||result[prefix+'SignalGroup']!==group)failed.push({side,direction,group,decodedDirection:result[prefix+'Dir'],decodedGroup:result[prefix+'SignalGroup']});
 }
 assert.deepEqual(failed,[]);
});
test('F07 representation: accepted frequency text survives decoding without silent clearing',()=>{
 const data=fixture();data.channelList[0][0]=channel('DOMAIN','650.00000');
 const decoded=decodeRadio(makePlan(data,options).target);assert.equal(decoded.channelList[0][0].rxFreq,'650.00000');
});
test('F08 containment: channel 999 survives DAT export while the unresolved write guard stays enforced',()=>{
 const data=fixture();data.channelList[0][998]=channel('LAST');
 assert.deepEqual(readDat(writeDat(data,schemas),schemas),data);
 assert.throws(()=>makePlan(data,options),/last channel pair/);
});
test('F10 OPEN: a stalled native send settles the transaction',{todo:'Needs reviewed native-operation deadlines; the radio protocol is unchanged'},async()=>{
 const radio=new Writer(),sim=simulatedRadio(radio),send=radio.char.writeValueWithoutResponse.bind(radio.char);let stop,entered;
 const reached=new Promise(resolve=>entered=resolve);
 radio.char.writeValueWithoutResponse=bytes=>bytes[0]===87?new Promise((resolve,reject)=>{stop=reject;entered();}):send(bytes);
 const operation=radio.upload(makePlan(fixture(),options),null,{confirmed:true}).then(()=> 'completed',()=> 'rejected');
 try{await reached;const result=await Promise.race([operation,delay(50).then(()=> 'still-pending')]);assert.notEqual(result,'still-pending');}
 finally{stop?.(Error('End simulated stalled operation'));await operation;radio.disconnect();}
 assert.equal(sim.writes().length,0);
});
