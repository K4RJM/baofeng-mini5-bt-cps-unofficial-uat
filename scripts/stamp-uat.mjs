// UAT-only build overlay. Never modifies source modules or the LIVE repository.
import {readFile,writeFile} from 'node:fs/promises';
const repository='K4RJM/baofeng-mini5-bt-cps-unofficial-uat';
if(process.env.GITHUB_REPOSITORY && process.env.GITHUB_REPOSITORY!==repository)throw Error('UAT packaging is restricted to the UAT repository');
const sha=process.env.GITHUB_SHA||'local';
if(sha!=='local'&&!/^[a-f0-9]{40}$/.test(sha))throw Error('Invalid source revision');
const pkg=JSON.parse(await readFile('package.json','utf8'));
const base=pkg.version.replace(/^0\./,'');
const version=base+'-UAT.'+sha.slice(0,7);
let html=await readFile('dist/index.html','utf8');
if(!html.includes('<body>')||!html.includes('Experimental · build '+base))throw Error('UAT branding anchors missing');
html=html.replace('<title>','<title>UAT · ').replace('<body>','<body>\n<div role="note" style="padding:8px 20px;background:#663d00;color:#fff3d4;display:flex;gap:12px;flex-wrap:wrap;align-items:center"><strong>UAT · DEVELOPMENT</strong><span>Build '+version+'</span><a style="color:inherit;margin-left:auto" href="https://k4rjm.github.io/baofeng-mini5-bt-cps-unofficial/" target="_blank" rel="noopener noreferrer">Open LIVE ↗</a></div>').replace('Experimental · build '+base,'UAT · build '+version);
html=html.replace('href="https://github.com/K4RJM/baofeng-mini5-bt-cps-unofficial" target="_blank"','href="https://github.com/'+repository+'" target="_blank"');
await writeFile('dist/index.html',html);
const app=await readFile('dist/app.mjs','utf8');
if(!app.includes("build:'"+base+"'"))throw Error('Diagnostic version anchor missing');
await writeFile('dist/app.mjs',app.replace("build:'"+base+"'","environment:'UAT',build:'"+version+"'"));
await writeFile('dist/deployment.json',JSON.stringify({environment:'UAT',version,sourceSha:sha,repository},null,2)+'\n');
console.log('Packaged '+version+' for '+repository);
