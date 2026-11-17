import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openUv32Capture} from '../scripts/uat-uv32-capture.mjs';
import {uv32ImageFromHex,uv32ImageToHex,uv32Preview,editUv32Channel,editUv32Dtmf,editUv32Setting,editUv32ZoneName,changedUv32Blocks} from '../scripts/uat-uv32-edit.mjs';
import {writeUv32SerialImage,UV32_SERIAL_REGIONS} from '../scripts/uat-uv32-serial.mjs';

const regionList=UV32_SERIAL_REGIONS.map(x=>[...x]);
const blank=()=>({kind:'uv32-cable-full-read-v1',completed:true,identity:'UV32PRO',regions:regionList,completedBlocks:526,totalBlocks:526,memoryReads:526,memoryWrites:0,wireHex:'ff'.repeat(0x8380)});
const image=()=>uv32ImageFromHex(blank().wireHex);

test('UV-32 edits preserve unrelated bytes and survive wire re-encoding',()=>{
 const original=image();let edited=editUv32Channel(original,354,{rx:'146.52000',tx:'Off',rxTone:'Off',txTone:'123.0',power:'Medium',bandwidth:'Narrow',scan:'Add',name:'TEST 354'});
 edited=editUv32ZoneName(edited,4,'Local Zone');edited=editUv32Dtmf(edited,{number:1,field:'code',value:'20202'});edited=editUv32Setting(edited,'SQL','2');
 const changes=changedUv32Blocks(original,edited),decoded=uv32Preview(edited);
 assert.deepEqual(changes.map(x=>x.address),[0x2c00,0x9000,0xa000,0xa200]);
 assert.equal(decoded.preview.channels.find(x=>x.number===354).name,'TEST 354');
 assert.equal(decoded.readout.zones[3].name,'Local Zone');
 assert.equal(decoded.readout.dtmf.entries[0].code,'20202');
 assert.equal(uv32ImageToHex(uv32ImageFromHex(uv32ImageToHex(edited))),uv32ImageToHex(edited));
 for(let i=0;i<original.length;i++)if(!changes.some(x=>i>=x.imageOffset&&i<x.imageOffset+64))assert.equal(edited[i],original[i]);
});

test('UV-32 rejects invalid edits before memory can change',()=>{
 const original=image();
 assert.throws(()=>editUv32Channel(original,1,{rx:'999.00000'}),/range/);
 assert.throws(()=>editUv32Channel(original,1,{name:'name longer than twelve'}),/12/);
 assert.throws(()=>editUv32Channel(original,1,{txTone:'D999N'}),/DCS/);
 assert.equal(uv32ImageToHex(original),blank().wireHex);
});

function simulatedPort(initial,{badAckAt=-1,alterPreflight=false}={}){
 const memory=new Uint8Array(initial),replies=[],writes=[];let opens=0,writeBlocks=0;
 const offsets=new Map();let offset=0;for(const [start,size] of UV32_SERIAL_REGIONS)for(let address=start;address<start+size;address+=64){offsets.set(address,offset);offset+=64;}
 const port={
  async open(options){assert.equal(options.baudRate,115200);opens++;},
  readable:{getReader(){return {async read(){if(!replies.length)throw Error('No simulated reply');return {done:false,value:replies.shift()};},async cancel(){},releaseLock(){}};}},
  writable:{getWriter(){return {async write(data){const b=Uint8Array.from(data);writes.push(b);if(b.length===16){replies.push(Uint8Array.of(6));return;}if(b.length===1&&b[0]===0x46){replies.push(new Uint8Array(16));return;}if(b.length===1&&b[0]===0x4d){replies.push(new TextEncoder().encode('UV32PRO'));return;}if(b[0]===0x53){replies.push(Uint8Array.of(6));return;}const address=b[1]*256+b[2],at=offsets.get(address);assert.notEqual(at,undefined);if(b[0]===0x52){const payload=memory.slice(at,at+64);if(alterPreflight&&opens===1&&address===0)payload[0]^=1;replies.push(Uint8Array.of(0x52,b[1],b[2],64,...payload));}else if(b[0]===0x57){assert.equal(b.length,68);writeBlocks++;if(writeBlocks!==badAckAt)memory.set(b.slice(4),at);replies.push(Uint8Array.of(writeBlocks===badAckAt?0:6));}else throw Error('Unexpected command');},releaseLock(){}};}},
  async close(){}
 };
 return {port,memory,writes,get opens(){return opens;},get writeBlocks(){return writeBlocks;}};
}

test('UV-32 cable write checks baseline, uploads CHIRP regions, and verifies read-back',async()=>{
 const baseline=blank(),original=uv32ImageFromHex(baseline.wireHex),edited=editUv32Channel(original,1,{rx:'146.52000',tx:'Off',name:'TEST'}),radio=simulatedPort(Uint8Array.from(Buffer.from(baseline.wireHex,'hex')));
 const result=await writeUv32SerialImage(radio.port,baseline,edited);
 assert.equal(result.completed,true);assert.equal(result.readBackVerified,true);assert.equal(result.completedBlocks,526);assert.equal(radio.writeBlocks,526);assert.equal(radio.opens,3);
 assert.deepEqual(Array.from(radio.writes.find(x=>x[0]===0x57).slice(0,4)),[0x57,0,0,64]);
 assert.equal(Buffer.from(radio.memory).toString('hex'),uv32ImageToHex(edited));
});

test('UV-32 refuses stale baseline and stops at rejected write ACK',async()=>{
 const baseline=openUv32Capture(blank()),edited=editUv32Channel(uv32ImageFromHex(baseline.wireHex),1,{rx:'146.52000'});
 const stale=simulatedPort(Uint8Array.from(Buffer.from(baseline.wireHex,'hex')),{alterPreflight:true});
 await assert.rejects(writeUv32SerialImage(stale.port,baseline,edited),/changed since this capture/);assert.equal(stale.writeBlocks,0);
 const rejected=simulatedPort(Uint8Array.from(Buffer.from(baseline.wireHex,'hex')),{badAckAt:2});
 await assert.rejects(writeUv32SerialImage(rejected.port,baseline,edited),error=>{assert.equal(error.uv32WriteReport.completedBlocks,1);return /rejected write/.test(error.message);});assert.equal(rejected.writeBlocks,2);
});
