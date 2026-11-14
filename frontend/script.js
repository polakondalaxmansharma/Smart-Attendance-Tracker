'use strict';
const API = location.hostname === 'localhost' || location.hostname === '127.0.0.1' ? (location.port === '3000' ? location.origin : 'http://localhost:3000') : location.origin;
const $=selector=>document.querySelector(selector);
let token=sessionStorage.getItem('attendance_admin_token')||'';
let courses=[],faculty=[],students=[];
function message(text,isError=false){$('#notice').textContent=text;$('#notice').classList.toggle('error',isError);}
async function request(path,options={}){
  const headers={'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})};
  let response;
  try{response=await fetch(API+path,{...options,headers});}
  catch{throw Error('Cannot connect to backend. Start it with npm start in the backend folder.');}
  const data=await response.json().catch(()=>({}));
  if(!response.ok){if(response.status===401){sessionStorage.removeItem('attendance_admin_token');token='';showLogin();}throw Error(data.message||`Request failed (${response.status})`);}
  return data;
}
function showLogin(){$('#loginCard').hidden=false;$('#dashboard').hidden=true;$('#logout').hidden=true;}
function showDashboard(name){$('#loginCard').hidden=true;$('#dashboard').hidden=false;$('#logout').hidden=false;$('#welcome').textContent=`Welcome, ${name}`;}
function setOptions(selector,items,idKey,labelKey){const element=$(selector);element.replaceChildren();for(const item of items){const option=document.createElement('option');option.value=item[idKey];option.textContent=item[labelKey];element.append(option);}}
function selectCourseOptions(){setOptions('#assignCourse',courses,'courseId','courseName');setOptions('#enrollCourse',courses,'courseId','courseName');setOptions('#assignFaculty',faculty,'userId','name');setOptions('#enrollStudent',students,'userId','name');}
async function loadData(){
 const [userData,courseData]=await Promise.all([request('/api/admin/users'),request('/api/admin/courses')]);
 faculty=userData.users.filter(u=>u.role==='Faculty');students=userData.users.filter(u=>u.role==='Student');courses=courseData.courses;
 $('#facultyCount').textContent=faculty.length;$('#studentCount').textContent=students.length;$('#courseCount').textContent=courses.length;
 selectCourseOptions();$('#courseRows').replaceChildren();
 if(!courses.length){const tr=document.createElement('tr');const td=document.createElement('td');td.colSpan=5;td.textContent='No courses yet. Create your first course.';tr.append(td);$('#courseRows').append(tr);}
 for(const course of courses){const tr=document.createElement('tr');for(const value of [course.courseId,course.courseName,course.facultyName||'Unassigned',course.studentCount]){const td=document.createElement('td');td.textContent=String(value);tr.append(td);}const td=document.createElement('td');const button=document.createElement('button');button.textContent='Students';button.className='secondary';button.addEventListener('click',()=>displayStudents(course));td.append(button);tr.append(td);$('#courseRows').append(tr);}
}
async function displayStudents(course){
 try{const result=await request(`/api/admin/courses/${course.courseId}/students`);$('#studentsTitle').textContent=`${course.courseName} — enrolled students`;
 $('#studentList').replaceChildren();for(const s of result.students){const li=document.createElement('li');li.textContent=`${s.name} (${s.email})`;$('#studentList').append(li);}
 if(!result.students.length){const li=document.createElement('li');li.textContent='No enrolled students';$('#studentList').append(li);}$('#studentsPanel').hidden=false;
 }catch(e){message(e.message,true);}
}
$('#loginForm').addEventListener('submit',async event=>{event.preventDefault();const button=event.currentTarget.querySelector('button');button.disabled=true;try{
 const data=await request('/api/auth/login',{method:'POST',body:JSON.stringify({email:$('#email').value,password:$('#password').value})});
 if(data.user.role!=='Admin')throw Error('Only Admin accounts can use this dashboard.');
 token=data.token;sessionStorage.setItem('attendance_admin_token',token);showDashboard(data.user.name);await loadData();message('Admin login successful.');
 }catch(e){message(e.message,true);}finally{button.disabled=false;}});
async function submitForm(selector,path,successLabel){const form=$(selector);form.addEventListener('submit',async event=>{event.preventDefault();const button=form.querySelector('button');button.disabled=true;
 try{const body=Object.fromEntries(new FormData(form).entries());await request(path,{method:'POST',body:JSON.stringify(body)});form.reset();await loadData();$('#studentsPanel').hidden=true;message(successLabel);}
 catch(e){message(e.message,true);}finally{button.disabled=false;}});}
submitForm('#userForm','/api/admin/users','User created successfully.');
submitForm('#courseForm','/api/admin/courses/add','Course created successfully.');
submitForm('#assignForm','/api/admin/courses/assignFaculty','Faculty assigned successfully.');
submitForm('#enrollForm','/api/admin/courses/enrollStudent','Student enrolled successfully.');
$('#refresh').addEventListener('click',()=>loadData().then(()=>message('Information refreshed.')).catch(e=>message(e.message,true)));
$('#logout').addEventListener('click',()=>{token='';sessionStorage.removeItem('attendance_admin_token');showLogin();message('Logged out.');});
(async()=>{if(!token)return;try{const data=await request('/api/auth/me');if(data.user.role!=='Admin')throw Error('Admin account required');showDashboard(data.user.name);await loadData();}catch(e){token='';sessionStorage.removeItem('attendance_admin_token');showLogin();message('Please sign in as Admin.',true);}})();
