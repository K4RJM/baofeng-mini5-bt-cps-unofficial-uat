import {test} from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {fileURLToPath} from 'node:url';import {spawnSync} from 'node:child_process';
const root=fileURLToPath(new URL('../',import.meta.url));
// Only disposable copies are changed. Each mutant must fail the intended assertion,
// not a parser/import error or the protected-file checksum guard.
test('F13 mutation controls: independent evidence rejects wrong enum bounds and altered VFO packing',()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'mini5-f13-'));
 try{
  for(const p of ['radio-decoder.mjs','radio-encoder.mjs','dat.mjs'])fs.copyFileSync(path.join(root,p),path.join(directory,p));
  fs.mkdirSync(path.join(directory,'tests'));fs.copyFileSync(path.join(root,'tests/f13-independent.test.mjs'),path.join(directory,'tests/f13-independent.test.mjs'));
  const env={...process.env};delete env.NODE_TEST_CONTEXT;
  const run=()=>spawnSync(process.execPath,['--test','--test-reporter=tap','tests/f13-independent.test.mjs'],{cwd:directory,env,encoding:'utf8',timeout:15000});
  const baseline=run();assert.equal(baseline.status,0,baseline.stdout+baseline.stderr);assert.match(baseline.stdout,/# tests 2/);
  const mutations=[['radio-decoder.mjs','pttDly:s[12]','pttDly:s[12]%7'],['radio-decoder.mjs','vfos.vfopttid=s[11]','vfos.vfopttid=s[11]%3'],['radio-decoder.mjs',"v[p+'SQMode']=b[27]","v[p+'SQMode']=b[27]%2"],['radio-encoder.mjs',"(v[p+'Dir']<<4)|v[p+'SignalGroup']","(v[p+'Dir']<<5)|v[p+'SignalGroup']"]];
  for(const [file,from,to]of mutations){const target=path.join(directory,file),source=fs.readFileSync(target,'utf8');assert.equal(source.split(from).length,2,'Unique mutation target: '+from);fs.writeFileSync(target,source.replace(from,to));const result=run();fs.writeFileSync(target,source);assert.equal(result.status,1,'Mutation survived or execution failed: '+from+'\n'+result.stdout+result.stderr);assert.match(result.stdout,/ERR_ASSERTION|AssertionError/);assert.doesNotMatch(result.stdout+result.stderr,/SyntaxError|ERR_MODULE_NOT_FOUND/);}
 }finally{
  // Only the exact directory returned by mkdtemp is removed, within the OS temp root.
  const resolved=path.resolve(directory),temp=path.resolve(os.tmpdir())+path.sep;if(!resolved.startsWith(temp)||!path.basename(resolved).startsWith('mini5-f13-'))throw Error('Unsafe test cleanup path');fs.rmSync(resolved,{recursive:true});
 }
});
