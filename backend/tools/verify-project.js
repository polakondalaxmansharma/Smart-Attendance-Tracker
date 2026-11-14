// Run offline validations without launching the app.
'use strict';
const {spawnSync}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
let failed=false;
for(const file of ['server.js','adminRoutes.js','facultyRoutes.js','studentRoutes.js','reportRoutes.js','db.js','seed.js','../frontend/script.js','../frontend/faculty.js','../frontend/student.js']){
 const filename=path.resolve(root,file);
 const result=spawnSync(process.execPath,['--check',filename],{stdio:'pipe',encoding:'utf8'});
 if(result.status!==0){failed=true;console.error('FAIL syntax: '+file+'\n'+result.stderr);}else console.log('OK syntax: '+file);
}
const test=spawnSync(process.execPath,['--test','tests/project.test.js'],{cwd:root,stdio:'inherit'});
if(test.status!==0)failed=true;
if(fs.existsSync(path.join(root,'.env')))console.log('NOTE: backend/.env exists; keep this private and out of ZIP submissions.');
console.log(failed?'Project validation failed':'Offline checks passed (live DB/browser testing still required).');
process.exitCode=failed?1:0;
