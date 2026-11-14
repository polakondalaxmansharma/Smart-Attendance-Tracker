// Read-only live API smoke test. Requires npm start and working MySQL.
'use strict';
const BASE=process.env.API_BASE||'http://localhost:3000';
async function check(){
 let failed=false;
 async function request(method,path,init={},expected){
  try {const r=await fetch(BASE+path,{method,...init});const ok=expected.includes(r.status);console.log(`${ok?'PASS':'FAIL'} ${method} ${path}: HTTP ${r.status} (expected ${expected.join('/')})`);if(!ok)failed=true;return r;}
  catch(err){failed=true;console.error(`FAIL ${method} ${path}: ${err.message}`);return null;}
 }
 const health=await request('GET','/api/health',{},[200]);
 if(health?.ok){const j=await health.json();if(j.database!=='connected'){failed=true;console.error('FAIL database not connected');}}
 await request('GET','/api/admin/courses',{},[401]);
 await request('GET','/api/faculty/courses',{},[401]);
 await request('GET','/api/student/courses',{},[401]);
 await request('GET','/api/reports/student/summary.csv',{},[401]);
 await request('GET','/api/not-a-route',{},[404]);
 // Optional: export SMOKE_STUDENT_EMAIL/SMOKE_STUDENT_PASSWORD to test read-only student endpoints.
 const email=process.env.SMOKE_STUDENT_EMAIL,password=process.env.SMOKE_STUDENT_PASSWORD;
 if(email&&password){
  const r=await request('POST','/api/auth/login',{headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})},[200]);
  if(r?.ok){const data=await r.json();if(data.user?.role!=='Student'){failed=true;console.error('FAIL demo credential did not log in as Student');}
  else {const headers={Authorization:'Bearer '+data.token};await request('GET','/api/student/courses',{headers},[200]);await request('GET','/api/reports/student/summary.csv',{headers},[200]);await request('GET','/api/admin/courses',{headers},[403]);}}
 }
 console.log(failed?'Smoke checks failed':'Smoke checks passed');process.exitCode=failed?1:0;
}
check().catch(e=>{console.error(e);process.exitCode=1;});
