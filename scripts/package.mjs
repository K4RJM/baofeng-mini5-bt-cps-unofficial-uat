import {mkdir,copyFile,writeFile} from 'node:fs/promises';
const files=['index.html','style.css','radio.svg','app.mjs','connection-recovery.mjs','radio-help.mjs','channel-import.mjs','channel-import-ui.mjs','fields.mjs','channels.mjs','dat.mjs','validation.mjs','writer.mjs','radio-encoder.mjs','radio-decoder.mjs','schemas.json','function-options.json','editor-options.json','name-charset.json','defaults.json','read-test/reader.mjs','read-test/memory.mjs','LICENSE','README.md','docs/SAFETY.md','docs/REPEATERBOOK.md','docs/VERIFICATION.md','docs/protected-core.json','docs/AUDIT-REMEDIATION.md','docs/F02-F03-EVIDENCE-2026-10-15.md','docs/DEPLOYMENT.md'];
await mkdir('dist/read-test',{recursive:true});await mkdir('dist/docs',{recursive:true});
for(const file of files)await copyFile(file,'dist/'+file);
await writeFile('dist/.nojekyll','');console.log('GitHub Pages artifact prepared: dist/ ('+files.length+' files)');
