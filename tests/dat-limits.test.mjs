import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readDat,writeDat} from '../dat.mjs';
import {schemas,fixture} from './fixtures.mjs';

// A small NRBF DAG with repeated references, independent of the app serializer.
function referenceGraph(levels,fanout){
 const bytes=[],byte=n=>bytes.push(n),int=n=>{for(let i=0;i<4;i++)byte((n>>>(8*i))&255);};
 byte(0);int(1);int(-1);int(1);int(0);
 for(let id=1;id<=levels;id++){byte(16);int(id);int(fanout);for(let i=0;i<fanout;i++){byte(9);int(id+1);}}
 byte(6);int(levels+1);byte(1);byte(88);byte(11);return Uint8Array.from(bytes);
}
test('F04: reference expansion stops at a global budget before root validation',()=>{
 // 461 bytes describe 160,000 leaves. Keep this bounded even against the old parser.
 assert.throws(()=>readDat(referenceGraph(4,20),schemas),/expansion limit/);
});
test('F04: deeply nested inline arrays fail with a controlled nesting error',()=>{
 const bytes=[0,1,0,0,0,255,255,255,255,1,0,0,0,0,0,0,0];
 for(let id=1;id<=30;id++)bytes.push(16,id,0,0,0,1,0,0,0);
 bytes.push(10,11);assert.throws(()=>readDat(Uint8Array.from(bytes),schemas),/nesting limit/);
});
test('F04: compressed null arrays cannot bypass the allocation budget',()=>{
 const bytes=[0,1,0,0,0,255,255,255,255,1,0,0,0,0,0,0,0];
 // Eleven 10,000-element arrays, each encoded using one null-run record.
 for(let id=1;id<=11;id++)bytes.push(16,id,0,0,0,16,39,0,0,14,16,39,0,0);
 bytes.push(11);assert.throws(()=>readDat(Uint8Array.from(bytes),schemas),/allocation limit/);
});
test('F04: shared native channel references become independently editable records',()=>{
 const bytes=writeDat(fixture(),schemas),marker=new TextEncoder().encode('KDH.Channel');
 let at=Buffer.from(bytes).indexOf(marker),refs=-1;
 while(at>=0){const candidate=at+marker.length+4;if(bytes[candidate]===9&&bytes[candidate+5]===9){refs=candidate;break;}at=Buffer.from(bytes).indexOf(marker,at+1);}
 assert.ok(refs>=0);bytes.set(bytes.subarray(refs+1,refs+5),refs+6);
 const parsed=readDat(bytes,schemas);assert.deepEqual(parsed.channelList[0][0],parsed.channelList[0][1]);
 parsed.channelList[0][0].name='ONLY FIRST';assert.notEqual(parsed.channelList[0][1].name,'ONLY FIRST');
});
test('F04: full native layout, unknown values, long strings and extra record remain intact',()=>{
 const data=fixture();
 for(const channel of data.channelList[0])channel.name='X'.repeat(500);
 data.channelList[0][0].txPower=7;data.channelList[0][999].name='RESERVED\0';
 const bytes=writeDat(data,schemas);assert.ok(bytes.length<2000000);
 assert.deepEqual(readDat(bytes,schemas),data);
});
