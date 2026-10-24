// Synthetic records for file conversion tests; no personal codeplug data.
export function rdtFixture({model='D168UV',prefix=300,records=[{}],tables=1}={}){
 const tailSize=model==='D890UV'?50:35;
 const record=(r,id)=>{
  const name=new TextEncoder().encode(r.name??'RDT TEST'),b=new Uint8Array(48+name.length+1+tailSize),v=new DataView(b.buffer);
  v.setUint16(0,r.id??id,true);v.setUint32(2,r.rx??14550000,true);b[6]=r.dir??2;v.setUint32(7,r.tx??60000,true);
  b[11]=r.mode??0;b[12]=r.power??2;b[13]=r.width??1;b[15]=r.rxOnly??0;
  b[18]=1;b[19]=16;b[22]=1;b[23]=16;v.setUint16(26,2511,true);b[28]=2;b[34]=255;b[40]=1;
  b.set(name,48);const t=b.subarray(49+name.length);t[0]=1;t[12]=1;t[t.length-1]=1;if(tailSize===50){t[37]=1;t[45]=255;}
  for(const [p,value] of Object.entries(r.fields||{}))b[Number(p)]=value;
  for(const [p,value] of Object.entries(r.tail||{}))t[Number(p)]=value;
  return b;
 };
 const all=[...records.map((r,i)=>record(r,i)),record({id:4000,name:'VFO A'},4000),record({id:4001,name:'VFO B'},4001)];
 const tableLength=2+all.reduce((n,b)=>n+b.length,0),b=new Uint8Array(prefix+tables*tableLength+40),v=new DataView(b.buffer);
 b.set(new TextEncoder().encode(model==='D890UV'?'V1323':'V1292'));v.setUint32(5,b.length-14,true);b.set(new TextEncoder().encode(model),9);b.set(new TextEncoder().encode('V100'),19);
 let p=prefix;for(let i=0;i<tables;i++){v.setUint16(p,all.length,true);p+=2;for(const r of all){b.set(r,p);p+=r.length;}}
 return b;
}
