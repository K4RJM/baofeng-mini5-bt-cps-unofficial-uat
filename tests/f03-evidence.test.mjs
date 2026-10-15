// Characterization of the unresolved mapping; these tests do not claim a fix.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {vfoBlock} from '../radio-encoder.mjs';
import {decodeRadio} from '../radio-decoder.mjs';
import {makePlan} from '../writer.mjs';
import {fixture,options} from './fixtures.mjs';

test('F03 evidence: factory-reported A group 17 / Plus corresponds to byte 0x10',()=>{
 const data=fixture();data.vfos.vfoADir=1;data.vfos.vfoASignalGroup=16;
 assert.equal(vfoBlock(data.vfos,'A')[14],0x10);
 const raw=makePlan(fixture(),options).target;raw[0x800e]=0x10;
 // Byte 14 is not transformed by the transport cipher.
 const decoded=decodeRadio(raw);
 assert.equal(decoded.vfos.vfoADir,1);assert.equal(decoded.vfos.vfoASignalGroup,16);
});

test('F03 evidence: current packing has collisions across the full 3 by 20 domain on both VFOs',()=>{
 for(const side of ['A','B']){
  const bytes=new Map();
  for(let direction=0;direction<3;direction++)for(let group=0;group<20;group++){
   const v=fixture().vfos;v['vfo'+side+'Dir']=direction;v['vfo'+side+'SignalGroup']=group;
   const byte=vfoBlock(v,side)[14];bytes.set(byte,[...(bytes.get(byte)||[]),[direction,group]]);
  }
  assert.equal(bytes.size,52,'60 configurations collapse to 52 bytes; F03 remains open');
  assert.deepEqual([...bytes].filter(([,pairs])=>pairs.length>1),[
   [16,[[0,16],[1,0],[1,16]]],[17,[[0,17],[1,1],[1,17]]],
   [18,[[0,18],[1,2],[1,18]]],[19,[[0,19],[1,3],[1,19]]]
  ]);
 }
});

test('F03 evidence: retained native writer examples do not distinguish overlapping configurations',()=>{
 const v=fixture().vfos;Object.assign(v,{vfoADir:1,vfoASignalGroup:19,vfoBDir:2,vfoBSignalGroup:19});
 assert.equal(vfoBlock(v,'A')[14],0x13);assert.equal(vfoBlock(v,'B')[14],0x33);
 // These two constants were extracted from retained native CPS write frames.
 // They corroborate observed factory packing, not correct firmware semantics.
});
