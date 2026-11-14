// Offline structural regression tests: no database or npm dependencies needed.
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const backend=path.resolve(__dirname,'..');
const frontend=path.resolve(__dirname,'../../frontend');
const read=(base,file)=>fs.readFileSync(path.join(base,file),'utf8');
const server=read(backend,'server.js');
const student=read(backend,'studentRoutes.js');
const faculty=read(backend,'facultyRoutes.js');
const reports=read(backend,'reportRoutes.js');
const schema=read(backend,'database.sql');
const studentJS=read(frontend,'student.js');
const studentHTML=read(frontend,'student.html');
const admin=read(backend,'adminRoutes.js');
test('all four database tables declared',()=>{
 for(const table of ['users','courses','enrollments','attendance']) assert.match(schema,new RegExp('CREATE TABLE IF NOT EXISTS '+table+'\\b','i'));
});
test('login and protected routes use verified JWT',()=>{
 assert.match(server,/jwt\.verify\(/);
 for(const route of ['admin','faculty','student','reports']) assert.match(server,new RegExp("app\\.use\\('/api/"+route+"',\\s*authenticate"));
});
test('roles are checked against current DB values',()=>{
 for(const role of ['Admin','Faculty','Student']) assert.ok(server.includes("!== '"+role+"'")||server.includes("!=='"+role+"'"));
 assert.match(reports,/async function roleOf/);
});
test('faculty attendance is limited to assigned courses and uses transaction',()=>{
 assert.match(faculty,/facultyId=\?/);assert.match(faculty,/beginTransaction/);assert.match(faculty,/commit\(/);
 assert.match(faculty,/new Set\(ids\)/);assert.match(faculty,/ON DUPLICATE KEY UPDATE/);
});
test('students are scoped to JWT user and enrollment',()=>{
 assert.match(student,/req\.user\.userId/);assert.match(student,/WHERE e\.studentId=\?/);
 assert.match(student,/not enrolled/i);
});
test('CSV reports check authorization and escape spreadsheet formulas',()=>{
 assert.match(reports,/Faculty only/);assert.match(reports,/Student only/);
 assert.match(reports,/Course not assigned to you/);assert.match(reports,/Not enrolled in this course/);
 assert.match(reports,/safeCsv/);assert.match(reports,/text\/csv/);
});
test('student page uses actual student controller (not faculty JS)',()=>{
 assert.match(studentHTML,/src="student\.js"/);
 assert.match(studentJS,/Student account required/);
 assert.doesNotMatch(studentJS,/Faculty account required/);
 assert.match(studentJS,/\/api\/student\/courses/);
 assert.match(studentJS,/\/api\/reports\/student\/summary\.csv/);
});
test('admin cannot register new admin via user-creation route',()=>{
 assert.match(admin,/\['Faculty','Student'\]\.includes\(role\)/);
});
test('all frontend references resolve',()=>{
 for(const page of ['index.html','faculty.html','student.html']){
  const html=read(frontend,page);
  for(const match of html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g))assert.ok(fs.existsSync(path.join(frontend,match[1])),`${page}: missing ${match[1]}`);
 }
});
