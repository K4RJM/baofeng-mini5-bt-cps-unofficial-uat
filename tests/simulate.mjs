import {Writer,makePlan} from '../writer.mjs';import {offset} from '../read-test/memory.mjs';import {options,fixture} from './fixtures.mjs';const plan=makePlan(fixture(),options);
export function simulatedRadio(w=new Writer(),fault={}){
 let raw=plan.target.slice();const sent=[];
 function connect(){w.device={id:fault.deviceId||'simulated-radio',gatt:{connected:true,disconnect(){this.connected=false;}},removeEventListener(){}};w.char={properties:{writeWithoutResponse:true},removeEventListener(){},async writeValueWithoutResponse(b){sent.push(b.slice());let reply;
 if(b[0]===82){const addr=(b[1]<<8)|b[2];reply=new Uint8Array(68);reply.set([82,b[1],fault.badHeader?b[2]^1:b[2],64]);reply.set(raw.subarray(offset(addr),offset(addr)+64),4);if(fault.readMismatch)reply[4]^=1;}
 else if(b[0]===87){const i=sent.filter(x=>x[0]===87).length-1;if(i===fault.sendFailure)throw Error('Ambiguous send failure');const a=(b[1]<<8)|b[2],end=a<0x8040?0x8040:a<0x9040?0x9040:0xa1c0;raw.set(b.subarray(4,4+Math.min(128,end-a)),offset(a));if(i===fault.missingAck)return;reply=Uint8Array.of(i===fault.badAck?21:6);}
 else if(b.length===1&&b[0]===70)reply=new Uint8Array(16);
 else if(b.length===1&&b[0]===77)reply=new TextEncoder().encode(fault.wrongModel?'OTHER   +L00000':'5RMINI  +L00000');
 else if(b.length===1&&b[0]===69)return;
 else reply=Uint8Array.of(6);
 if(fault.disconnect&&b[0]===87){w.disconnect();return;}
 for(let i=0;i<reply.length;i+=13){const piece=reply.subarray(i,i+13),backing=new Uint8Array(piece.length+4);backing.set(piece,2);w.receive(new DataView(backing.buffer,2,piece.length));}
 }};}
 const wait=w.wait.bind(w);w.wait=n=>wait(n,20);connect();return {w,connect,sent,writes:()=>sent.filter(x=>x[0]===87)};
}