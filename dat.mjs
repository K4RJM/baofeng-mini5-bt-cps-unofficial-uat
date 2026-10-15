// Passive NRBF data codec. No .NET deserialization and no executable type loading.
export const MAX_DAT_BYTES=2000000;
// Bound input allocation at both the browser File boundary and the parser boundary.
export async function readDatFile(file,schemas){
 check(Number.isSafeInteger(file.size)&&file.size>=0&&file.size<MAX_DAT_BYTES,'CPS DAT files must be smaller than 2 MB.');
 return readDat(await file.arrayBuffer(),schemas);
}
const enc=new TextEncoder(),dec=new TextDecoder('utf-8',{fatal:true});
const check=(v,m='Unsupported or damaged CPS DAT')=>{if(!v)throw Error(m);};
export function readDat(input,schemas){
 check(input?.byteLength<MAX_DAT_BYTES,'CPS DAT files must be smaller than 2 MB.');const b=new Uint8Array(input);check(b.length<MAX_DAT_BYTES);let p=0,ended=false,rootId;
 const objects=new Map(),meta=new Map();let records=0,recordDepth=0,materialized=0;
 const reserve=n=>{check((materialized+=n)<=100000,'CPS DAT allocation limit exceeded');};
 const take=n=>{check(n>=0&&p+n<=b.length);const r=b.subarray(p,p+n);p+=n;return r;};
 const byte=()=>take(1)[0],int=()=>new DataView(take(4).buffer,b.byteOffset+p-4,4).getInt32(0,true);
 const count=n=>{check(n>=0&&n<=10000);return n;};
 const str=()=>{let n=0,s=0,v;do{check(s<=28);v=byte();n+=(v&127)*2**s;s+=7;}while(v&128);check(n<100000);return dec.decode(take(n));};
 const prim=t=>{if(t===8)return int();if(t===5)return str();throw Error('Unexpected primitive type');};
 function extra(t){if(t===0||t===7)return byte();if(t===4)return {name:str(),library:int()};check([1,2,6].includes(t));return null;}
 function members(id,m){reserve(m.names.length+1);const o={$type:m.name};objects.set(id,o);for(let i=0;i<m.names.length;i++)o[m.names[i]]=m.types[i]===0?prim(m.extra[i]):record();return o;}
 function array(id,n,t,e){reserve(n+1);const a=[];objects.set(id,a);while(a.length<n){const v=t===0?prim(e):record();if(v?.$nulls){check(a.length+v.$nulls<=n);a.push(...Array(v.$nulls).fill(null));}else a.push(v);}return a;}
 function record(){
  check(++recordDepth<20,'CPS DAT nesting limit exceeded');
  try{return readRecord();}finally{recordDepth--;}
 }
 function readRecord(){check(++records<50000);const t=byte();switch(t){
  case 0:rootId=int();int();check(int()===1&&int()===0);return null;
  case 12:int();check(str()==='BF-5RMini_CPS, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null','Wrong CPS assembly');return null;
  case 5:{const id=int(),name=str(),n=count(int()),names=Array.from({length:n},str),types=Array.from({length:n},byte),extras=types.map(extra),library=int();const m={name,names,types,extra:extras,library};check(JSON.stringify(m)===JSON.stringify(schemas.find(s=>s.name===name)),'Unknown CPS schema');meta.set(id,m);return members(id,m);}
  case 1:{const id=int(),m=meta.get(int());check(m);return members(id,m);}
  case 6:{const id=int(),v=str();objects.set(id,v);return v;}
  case 7:{const id=int(),shape=byte(),rank=count(int());check(rank===1&&[0,1].includes(shape));const n=count(int()),t=byte(),e=extra(t);return array(id,n,t,e);}
  case 9:return {$ref:int()};case 10:return null;case 11:ended=true;return null;
  case 13:return {$nulls:count(byte())};case 14:return {$nulls:count(int())};
  case 16:case 17:{const id=int(),n=count(int());return array(id,n,t===16?2:1,null);}
  default:throw Error('Unsupported DAT record '+t);
 }}
 while(p<b.length&&!ended)record();check(ended,'Incomplete CPS DAT');check(p===b.length,'This DAT has extra bytes after its data record. Open it in CPS and save it under a NEW filename, then use that new copy.');
 // Count every expanded value, including primitive leaves and repeated references.
 // Do not memoize shared objects: separately editable channel slots must not alias.
 let expanded=0;
 function resolve(v,d=0){check(++expanded<=100000,'CPS DAT expansion limit exceeded');check(d<20,'CPS DAT nesting limit exceeded');if(!v||typeof v!=='object')return v;if('$ref'in v){check(objects.has(v.$ref));return resolve(objects.get(v.$ref),d+1);}if(Array.isArray(v))return v.map(x=>resolve(x,d+1));return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,resolve(x,d+1)]));}
 const root=resolve(objects.get(rootId));validate(root,schemas);return root;
}
export function validate(root,schemas){
 check(root?.$type==='KDH.AppData');check(root.channelList?.length===1&&root.channelList[0]?.length===1000,'Expected 1000 channel slots');
 function walk(o,type){const s=schemas.find(x=>x.name===type);check(s&&o?.$type===type);check(Object.keys(o).length===s.names.length+1);
  s.names.forEach((name,i)=>{const v=o[name],t=s.types[i],e=s.extra[i];if(t===0){check(e===8?Number.isInteger(v)&&v>=-2147483648&&v<=2147483647:typeof v==='string'&&/^\d+(\.\d+)?$/.test(v));}else if(t===1)check(typeof v==='string'&&v.length<=1000);else if(t===6)check(Array.isArray(v)&&v.length===20&&v.every(x=>typeof x==='string'&&x.length<=1000));else if(e.name==='KDH.Channel[][]')v[0].forEach(c=>walk(c,'KDH.Channel'));else walk(v,e.name);});
 }walk(root,'KDH.AppData');
}
export function writeDat(root,schemas){
 validate(root,schemas);const out=[];let next=4;const metadata=new Map(),queue=[{id:3,value:root,type:'object'}];
 const byte=v=>out.push(v&255),int=v=>{for(let i=0;i<4;i++)byte(v>>>(8*i));},str=s=>{const b=enc.encode(s);let n=b.length;while(n>=128){byte((n&127)|128);n>>>=7;}byte(n);out.push(...b);};
 function additional(t,e){if(t===0)byte(e);else if(t===4){str(e.name);int(2);}}
 function string(s){byte(6);int(next++);str(s);}
 function ref(value,type){const id=next++;byte(9);int(id);queue.push({id,value,type});}
 function obj(o,id){const s=schemas.find(x=>x.name===o.$type);if(metadata.has(o.$type)){byte(1);int(id);int(metadata.get(o.$type));}else{metadata.set(o.$type,id);byte(5);int(id);str(s.name);int(s.names.length);s.names.forEach(str);s.types.forEach(byte);s.types.forEach((t,i)=>additional(t,s.extra[i]));int(2);}
  s.names.forEach((name,i)=>{const v=o[name],t=s.types[i];if(t===0){if(s.extra[i]===8)int(v);else str(v);}else if(t===1)string(v);else if(t===6)ref(v,'strings');else ref(v,name==='channelList'?'areas':'object');});
 }
 byte(0);int(3);int(-1);int(1);int(0);byte(12);int(2);str('BF-5RMini_CPS, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null');
 for(let q=0;q<queue.length;q++){const {id,value,type}=queue[q];if(type==='object')obj(value,id);else if(type==='strings'){byte(17);int(id);int(value.length);value.forEach(string);}else{byte(7);int(id);byte(type==='areas'?1:0);int(1);int(value.length);byte(4);str(type==='areas'?'KDH.Channel[]':'KDH.Channel');int(2);value.forEach(v=>ref(v,type==='areas'?'channels':'object'));}}
 byte(11);return Uint8Array.from(out);
}
