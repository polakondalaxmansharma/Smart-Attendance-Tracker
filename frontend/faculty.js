'use strict';
const API = location.hostname === 'localhost' || location.hostname === '127.0.0.1' ? (location.port === '3000' ? location.origin : 'http://localhost:3000') : location.origin;
const $=s=>document.querySelector(s);
let token=sessionStorage.getItem('attendance_faculty_token')||'',courses=[],roster=[];
function notice(msg,bad=false){$('#notice').textContent=msg;$('#notice').classList.toggle('error',bad);}
function showLogin(){$('#loginCard').hidden=false;$('#dashboard').hidden=true;$('#logout').hidden=true;}
function showDashboard(name){$('#loginCard').hidden=true;$('#dashboard').hidden=false;$('#logout').hidden=false;$('#welcome').textContent='Welcome, '+name;}
async function api(path,options={}){
 let res;try{res=await fetch(API+path,{...options,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})}});}
 catch{throw Error('Backend is unavailable. Run npm start inside backend.');}
 const data=await res.json().catch(()=>({}));
 if(!res.ok){if(res.status===401){token='';sessionStorage.removeItem('attendance_faculty_token');showLogin();}throw Error(data.message||'Request failed');}
 return data;
}

async function downloadReport(path,filename){
 const response=await fetch(API+path,{headers:{Authorization:'Bearer '+token}}).catch(()=>{throw Error('Cannot reach backend');});
 if(!response.ok){const data=await response.json().catch(()=>({}));throw Error(data.message||'Download failed');}
 const blob=await response.blob();const url=URL.createObjectURL(blob);
 const link=document.createElement('a');link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function id(){return Number($('#course').value);}
function todayLocal(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
const td=(row,text)=>{const el=document.createElement('td');el.textContent=String(text);row.append(el);return el;};
function blank(tbody,message,cols){tbody.replaceChildren();const tr=document.createElement('tr');const cell=td(tr,message);cell.colSpan=cols;tbody.append(tr);}
async function loadCourses(){
 const data=await api('/api/faculty/courses');courses=data.courses;
 const previous=$('#course').value;$('#course').replaceChildren();
 for(const c of courses){const op=document.createElement('option');op.value=c.courseId;op.textContent=`${c.courseName} (${c.studentCount} students)`;$('#course').append(op);}
 if(courses.some(c=>String(c.courseId)===previous))$('#course').value=previous;
 if(!courses.length){roster=[];blank($('#roster'),'No assigned courses. Ask Admin to assign a course.',3);blank($('#reportRows'),'No courses',5);blank($('#dateRows'),'No dates',4);$('#rosterStatus').textContent='';$('#save').disabled=true;return;}
 await loadRoster();await loadReport();
}
async function loadRoster(){
 if(!id())return;
 const [students,marks]=await Promise.all([api(`/api/faculty/courses/${id()}/students`),api(`/api/faculty/attendance/course/${id()}?date=${$('#date').value}`)]);
 roster=students.students;const marked=new Map(marks.records.map(r=>[Number(r.studentId),r.status]));
 const body=$('#roster');body.replaceChildren();
 for(const student of roster){const tr=document.createElement('tr');td(tr,student.name);td(tr,student.email);const cell=document.createElement('td');const select=document.createElement('select');select.setAttribute('aria-label','Attendance for '+student.name);select.dataset.id=student.userId;
 for(const status of ['Present','Absent']){const option=document.createElement('option');option.value=status;option.textContent=status;select.append(option);}
 select.value=marked.get(student.userId)||'Present';cell.append(select);tr.append(cell);body.append(tr);}
 if(!roster.length)blank(body,'This course has no enrolled students.',3);
 $('#save').disabled=!roster.length;$('#rosterStatus').textContent=`${roster.length} enrolled students • ${marks.records.length} previously saved for ${$('#date').value}`;
}
async function loadReport(){if(!id())return;const data=await api(`/api/faculty/attendance/report/${id()}`);
 const body=$('#reportRows');body.replaceChildren();
 $('#printCourse').textContent=`Course: ${data.course.courseName} | Generated: ${new Date().toLocaleString()}`;for(const s of data.summary){const row=document.createElement('tr');for(const x of [s.name,s.totalClasses,s.presentClasses,s.absentClasses,s.percentage+'%'])td(row,x);body.append(row);}
 if(!data.summary.length)blank(body,'No enrolled students.',5);
 const dates=$('#dateRows');dates.replaceChildren();for(const d of data.dates){const row=document.createElement('tr');for(const x of [d.date,d.marked,d.present,d.absent])td(row,x);dates.append(row);}
 if(!data.dates.length)blank(dates,'No attendance marked yet.',4);
}
$('#loginForm').addEventListener('submit',async e=>{e.preventDefault();const button=e.currentTarget.querySelector('button');button.disabled=true;try{
 const result=await api('/api/auth/login',{method:'POST',body:JSON.stringify({email:$('#email').value,password:$('#password').value})});
 if(result.user.role!=='Faculty')throw Error('Faculty account required. Use Admin page for Admin login.');
 token=result.token;sessionStorage.setItem('attendance_faculty_token',token);showDashboard(result.user.name);await loadCourses();notice('Faculty signed in successfully.');
 }catch(err){notice(err.message,true);}finally{button.disabled=false;}});
$('#course').addEventListener('change',()=>Promise.all([loadRoster(),loadReport()]).catch(e=>notice(e.message,true)));
$('#date').addEventListener('change',()=>loadRoster().catch(e=>notice(e.message,true)));
$('#loadDate').addEventListener('click',()=>loadRoster().then(()=>notice('Saved attendance loaded for the selected date.')).catch(e=>notice(e.message,true)));
$('#report').addEventListener('click',()=>loadReport().then(()=>notice('Report refreshed.')).catch(e=>notice(e.message,true)));
$('#refresh').addEventListener('click',()=>loadCourses().then(()=>notice('Courses refreshed.')).catch(e=>notice(e.message,true)));
$('#save').addEventListener('click',async()=>{const button=$('#save');button.disabled=true;try{
 const attendance=Array.from(document.querySelectorAll('#roster select[data-id]')).map(s=>({studentId:Number(s.dataset.id),status:s.value}));
 const result=await api('/api/faculty/attendance/mark',{method:'POST',body:JSON.stringify({courseId:id(),date:$('#date').value,attendance})});
 await loadRoster();await loadReport();notice(result.message+` (${result.saved} students).`);
 }catch(e){notice(e.message,true);}finally{button.disabled=!roster.length;}});
$('#facultyCsv').addEventListener('click',()=>{if(!id())return notice('Select a course first.',true);downloadReport(`/api/reports/faculty/course/${id()}.csv`,`faculty-course-${id()}-attendance.csv`).then(()=>notice('CSV report downloaded.')).catch(e=>notice(e.message,true));});
$('#facultyPrint').addEventListener('click',()=>{if(!id())return notice('Select a course first.',true);document.body.classList.add('printFaculty');window.print();document.body.classList.remove('printFaculty');});
window.addEventListener('afterprint',()=>document.body.classList.remove('printFaculty'));
$('#logout').addEventListener('click',()=>{token='';sessionStorage.removeItem('attendance_faculty_token');showLogin();notice('Signed out.');});
$('#date').value=todayLocal();$('#date').max=todayLocal();
(async()=>{if(!token)return;try{const {user}=await api('/api/auth/me');if(user.role!=='Faculty')throw Error('Faculty only');showDashboard(user.name);await loadCourses();}catch(e){token='';sessionStorage.removeItem('attendance_faculty_token');showLogin();notice('Please sign in as Faculty.',true);}})();
