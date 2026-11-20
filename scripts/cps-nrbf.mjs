// Data-only reader and writer for the factory CPS object streams.
const decoder=new TextDecoder('utf-8',{fatal:true});
const MAX_BYTES=2000000;
const checked=(ok,message='Unsupported or damaged CPS DAT')=>{if(!ok)throw Error(message);};

export function readCpsDocument(input,{assembly,className,arrayClasses}){
 checked(input instanceof Uint8Array&&input.length<MAX_BYTES,'CPS DAT must be smaller than 2 MB.');
 let cursor=0,rootId,libraryId,ended=false,records=0,depth=0,allocated=0;
 const objects=new Map(),schemas=new Map();
 const take=n=>{checked(n>=0&&cursor+n<=input.length);const start=cursor;cursor+=n;return input.subarray(start,cursor);};
 const byte=()=>take(1)[0];
 const int=()=>{const bytes=take(4);return new DataView(bytes.buffer,bytes.byteOffset,4).getInt32(0,true);};
 const count=n=>{checked(n>=0&&n<=10000);return n;};
 const reserve=n=>checked((allocated+=n)<=150000,'CPS DAT allocation limit exceeded.');
 function string(){
  let length=0;
  for(let shift=0;shift<=28;shift+=7){
   const value=byte();length+=(value&127)*2**shift;
   if(value<128){checked(length<=100000);return decoder.decode(take(length));}
  }
  throw Error('Invalid CPS DAT string length.');
 }
 function primitive(type){
  if(type===8)return int();
  if(type===7){const b=take(2);return new DataView(b.buffer,b.byteOffset,2).getInt16(0,true);}
  if(type===5)return string();
  if(type===1||type===2)return byte();
  throw Error('Unsupported CPS DAT primitive '+type);
 }
 function extra(type){
  if(type===0||type===7)return byte();
  if(type===4){
   const name=string(),library=int();
   const allowed=className.test(name)||arrayClasses.includes(name);
   checked(allowed&&libraryId!==undefined&&library===libraryId,'Unexpected type in CPS DAT.');
   return [name,library];
  }
  checked([1,2,6].includes(type),'Unsupported CPS DAT member type '+type);
  return null;
 }
 function members(id,schema){
  checked(!objects.has(id));
  reserve(schema.names.length+1);
  const value=Object.create(null);value.$type=schema.name;objects.set(id,value);
  schema.names.forEach((name,i)=>{value[name]=schema.types[i]===0?primitive(schema.extras[i]):record();});
  return value;
 }
 function array(id,length,type,detail){
  checked(!objects.has(id));reserve(length+1);
  const values=[];objects.set(id,values);
  while(values.length<length){
   const item=type===0?primitive(detail):record();
   if(item?.nulls){checked(values.length+item.nulls<=length);values.push(...Array(item.nulls).fill(null));}
   else values.push(item);
  }
  return values;
 }
 function record(){
  checked(++records<50000&&++depth<24,'CPS DAT nesting or record limit exceeded.');
  try{
   switch(byte()){
    case 0: checked(cursor===1);rootId=int();int();checked(int()===1&&int()===0);return null;
    case 12: checked(libraryId===undefined);libraryId=int();checked(string()===assembly,'This DAT belongs to a different factory CPS.');return null;
    case 5:{
     const id=int(),name=string(),size=count(int());
     checked(className.test(name));
     const names=Array.from({length:size},string);
     checked(new Set(names).size===size&&names.every(name=>/^[A-Za-z_][A-Za-z_0-9]*$/.test(name)));
     const types=Array.from({length:size},byte),extras=types.map(extra);
     checked(libraryId!==undefined&&int()===libraryId);
     const schema={name,names,types,extras};schemas.set(id,schema);return members(id,schema);
    }
    case 1:{const id=int(),schema=schemas.get(int());checked(schema);return members(id,schema);}
    case 6:{const id=int(),value=string();checked(!objects.has(id));objects.set(id,value);return value;}
    case 7:{
     const id=int(),shape=byte(),rank=int(),length=count(int()),type=byte(),detail=extra(type);
     checked(rank===1&&[0,1].includes(shape));
     return array(id,length,type,detail);
    }
    case 9:return {reference:int()};
    case 10:return null;
    case 11:checked(depth===1);ended=true;return null;
    case 13:{const nulls=count(byte());checked(nulls>0);return {nulls};}
    case 14:{const nulls=count(int());checked(nulls>0);return {nulls};}
    case 15:{const id=int(),n=count(int()),type=byte();return array(id,n,0,type);}
    case 16:{const id=int(),n=count(int());return array(id,n,2,null);}
    case 17:{const id=int(),n=count(int());return array(id,n,1,null);}
    default:throw Error('Unsupported CPS DAT record at byte '+(cursor-1));
   }
  }finally{depth--;}
 }
 while(cursor<input.length&&!ended)record();
 checked(ended&&cursor===input.length,'CPS DAT is truncated or has trailing data. Resave it from stock CPS under a new name.');
 let expanded=0;
 function resolve(value,level=0){
  checked(++expanded<=150000&&level<24,'CPS DAT expansion limit exceeded.');
  if(value===null||typeof value!=='object')return value;
  if(Object.hasOwn(value,'reference')){checked(objects.has(value.reference));return resolve(objects.get(value.reference),level+1);}
  if(Array.isArray(value))return value.map(item=>resolve(item,level+1));
  return Object.fromEntries(Object.entries(value).map(([name,item])=>[name,resolve(item,level+1)]));
 }
 const root=resolve(objects.get(rootId));
 return {root,schemas:[...new Map([...schemas.values()].map(schema=>[schema.name,schema])).values()]};
}

// Serialize data as ordinary NRBF records understood by the stock CPS.
export function writeCpsDocument({root,schemas},assembly){
 const encoder=new TextEncoder(),output=[],queue=[],metadata=new Map();
 let next=4;
 const byte=value=>output.push(value&255);
 const int=value=>{
  checked(Number.isInteger(value)&&value>=-2147483648&&value<=2147483647,'Invalid integer in CPS DAT.');
  for(let i=0;i<4;i++)byte(value>>>(8*i));
 };
 const string=value=>{
  checked(typeof value==='string'&&value.length<=1000,'Invalid text in CPS DAT.');
  const bytes=encoder.encode(value);
  let length=bytes.length;
  while(length>=128){byte((length&127)|128);length>>>=7;}
  byte(length);output.push(...bytes);
 };
 const objectString=value=>{if(value==null){byte(10);return;}byte(6);int(next++);string(value);};
 const reference=(value,type,detail)=>{
  if(value==null){byte(10);return;}
  const id=next++;byte(9);int(id);queue.push({id,value,type,detail});
 };
 const primitive=(value,type)=>{if(type===8)int(value);else if(type===7){checked(Number.isInteger(value)&&value>=-32768&&value<=32767);byte(value);byte(value>>8);}else if(type===5)string(value);else throw Error('Unsupported DAT primitive.');};
 const extra=(type,detail)=>{if(type===0||type===7)byte(detail);else if(type===4){string(detail[0]);int(2);}};
 function object(id,value){
  const schema=schemas.find(item=>item.name===value.$type);
  checked(schema,'Missing CPS DAT class.');
  if(metadata.has(schema.name)){byte(1);int(id);int(metadata.get(schema.name));}
  else{
   metadata.set(schema.name,id);byte(5);int(id);string(schema.name);int(schema.names.length);
   schema.names.forEach(string);schema.types.forEach(byte);schema.types.forEach((type,i)=>extra(type,schema.extras[i]));int(2);
  }
  schema.names.forEach((name,i)=>{
   const type=schema.types[i],detail=schema.extras[i],member=value[name];
   if(type===0)primitive(member,detail);
   else if(type===1)objectString(member);
   else reference(member,type,detail);
  });
 }
 byte(0);int(3);int(-1);int(1);int(0);byte(12);int(2);string(assembly);
 queue.push({id:3,value:root,type:4,detail:[root.$type,2]});
 for(const {id,value,type,detail} of queue){
  if(type===6){byte(17);int(id);int(value.length);value.forEach(objectString);}
  else if(type===7){byte(15);int(id);int(value.length);byte(detail);value.forEach(item=>primitive(item,detail));}
  else if(type===4&&Array.isArray(value)){
   const element=detail[0].slice(0,-2);
   byte(7);int(id);byte(Number(element.endsWith('[]')));int(1);int(value.length);byte(4);string(element);int(2);
   value.forEach(item=>reference(item,4,[element,2]));
  }else if(type===4)object(id,value);
  else throw Error('Unsupported CPS DAT member.');
 }
 byte(11);
 return Uint8Array.from(output);
}
