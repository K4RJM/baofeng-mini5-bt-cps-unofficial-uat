import {exportChirpImage} from '../../image-files.mjs?v=20.31';
import {imageFile} from '../../read-test/memory.mjs';
import {asyncRadio} from '../async-radio.mjs?v=20.22';
import {blankData,emptyChannel} from '../../channels.mjs';import {writeDat} from '../../dat.mjs';import {makePlan} from '../../writer.mjs';
const root=new URL('../../',import.meta.url),json=p=>fetch(new URL(p,root)).then(r=>r.json());
const [defaults,schemas,f,e]=await Promise.all(['defaults.json','schemas.json','function-options.json','editor-options.json'].map(json));
const data=blankData(defaults);for(const i of [0,2,998])data.channelList[0][i]={...emptyChannel(),name:'BROWSER '+(i+1),rxFreq:'146.52000',txFreq:'146.52000'};
const fake=asyncRadio(makePlan(data,{'KDH.Function':f,...e}).target);
// Fail closed: cannot run application code unless the fake is installed and immutable.
Object.defineProperty(navigator,'bluetooth',{configurable:false,writable:false,value:fake.bluetooth});
if(navigator.bluetooth!==fake.bluetooth)throw Error('Could not isolate Bluetooth');
const state=window.f13={fake,bytes:writeDat(data,schemas),studioImage:imageFile(makePlan(data,{'KDH.Function':f,...e}).target),chirpImage:exportChirpImage(data,{'KDH.Function':f,...e}),downloads:[],ready:false,errors:[],mode:window.f13Mode};
state.confirmations=[];state.confirmResult=true;window.confirm=message=>{state.confirmations.push(message);return state.confirmResult;};
const originalCreate=URL.createObjectURL.bind(URL);URL.createObjectURL=blob=>{if(blob.type!=='text/javascript')state.downloads.push(blob);return originalCreate(blob);};
document.addEventListener('click',event=>{if(event.target.closest('a[download]'))event.preventDefault();});
window.addEventListener('error',event=>state.errors.push(event.message));window.addEventListener('unhandledrejection',event=>state.errors.push(String(event.reason)));
try{
 if(state.mode==='missing-id')document.getElementById('confirmWrite').id='deliberately-missing';
 if(state.mode==='inert-mutant'){
  let source=await fetch(new URL('app.mjs',root)).then(r=>r.text());
  if(!source.includes("$('content').inert=busy;$('tabs').inert=busy;"))throw Error('Mutation target missing');
  source=source.replace("$('content').inert=busy;$('tabs').inert=busy;","$('content').inert=false;$('tabs').inert=false;");
  source=source.replace(/from '\.\/([^']+)'/g,(_,p)=>'from '+JSON.stringify(new URL(p,root).href));
  const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));try{await import(url);}finally{URL.revokeObjectURL(url);}
 }else await import(window.f13AppURL);
 state.ready=true;
}catch(error){state.errors.push(String(error));state.failed=true;}
