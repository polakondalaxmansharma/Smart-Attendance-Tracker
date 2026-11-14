'use strict';
const API = location.hostname === 'localhost' || location.hostname === '127.0.0.1' ? (location.port === '3000' ? location.origin : 'http://localhost:3000') : location.origin;
const $ = selector => document.querySelector(selector);
const TOKEN_KEY = 'attendance_student_token';
let token = sessionStorage.getItem(TOKEN_KEY) || '';
let courses = [];

function notice(message, error = false) {
  $('#notice').textContent = message;
  $('#notice').classList.toggle('error', error);
}
function showLogin() {
  $('#loginCard').hidden = false;
  $('#dashboard').hidden = true;
  $('#logout').hidden = true;
}
function showDashboard(name) {
  $('#loginCard').hidden = true;
  $('#dashboard').hidden = false;
  $('#logout').hidden = false;
  $('#welcome').textContent = 'Welcome, ' + name;
}
function logout(message = 'Signed out.') {
  token = '';
  sessionStorage.removeItem(TOKEN_KEY);
  showLogin();
  notice(message);
}
async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(API + path, {
      ...options,
      headers: {
        ...(options.body ? {'Content-Type': 'application/json'} : {}),
        ...(token ? {Authorization: 'Bearer ' + token} : {}),
        ...options.headers
      }
    });
  } catch {
    throw Error('Backend unavailable. Run npm start in the backend folder.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) {
      token = '';
      sessionStorage.removeItem(TOKEN_KEY);
      showLogin();
    }
    throw Error(data.message || 'Request failed');
  }
  return data;
}
async function downloadReport(path, filename) {
  let response;
  try {
    response = await fetch(API + path, {headers: {Authorization: 'Bearer ' + token}});
  } catch { throw Error('Cannot reach backend'); }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw Error(data.message || 'Download failed');
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function cell(row, value) {
  const td = document.createElement('td');
  td.textContent = String(value);
  row.append(td);
  return td;
}
function empty(tableBody, message, columns) {
  tableBody.replaceChildren();
  const row = document.createElement('tr');
  cell(row, message).colSpan = columns;
  tableBody.append(row);
}
function percent(present, total) {
  return total ? (100 * present / total).toFixed(2) + '%' : '—';
}
async function loadCourses() {
  const data = await api('/api/student/courses');
  courses = data.courses || [];
  const total = courses.reduce((sum, c) => sum + Number(c.totalClasses), 0);
  const present = courses.reduce((sum, c) => sum + Number(c.presentClasses), 0);
  $('#courseCount').textContent = courses.length;
  $('#presentCount').textContent = present;
  $('#overallPercent').textContent = percent(present, total);
  const rows = $('#courseRows');
  rows.replaceChildren();
  for (const c of courses) {
    const row = document.createElement('tr');
    for (const value of [c.courseName, c.facultyName, c.totalClasses, c.presentClasses, c.absentClasses, percent(c.presentClasses, c.totalClasses)]) cell(row, value);
    rows.append(row);
  }
  if (!courses.length) empty(rows, 'No enrolled courses. Ask Admin to enroll you.', 6);
  const dropdown = $('#course');
  const previous = dropdown.value;
  dropdown.replaceChildren();
  for (const c of courses) {
    const option = document.createElement('option');
    option.value = c.courseId;
    option.textContent = c.courseName;
    dropdown.append(option);
  }
  if (courses.some(c => String(c.courseId) === previous)) dropdown.value = previous;
  $('#historyCsv').disabled = !courses.length;
  await loadHistory();
}
async function loadHistory() {
  const courseId = Number($('#course').value);
  if (!courseId) {
    $('#historyInfo').textContent = 'Select an enrolled course to view attendance.';
    empty($('#historyRows'), 'No course selected.', 2);
    return;
  }
  const data = await api(`/api/student/attendance/course/${courseId}`);
  const records = data.records || [];
  $('#historyInfo').textContent = `${data.course.courseName} • ${records.length} marked classes`;
  const rows = $('#historyRows');
  rows.replaceChildren();
  for (const item of records) {
    const row = document.createElement('tr');
    cell(row, item.date);
    const status = cell(row, item.status);
    status.className = item.status === 'Present' ? 'statusPresent' : 'statusAbsent';
    rows.append(row);
  }
  if (!records.length) empty(rows, 'No attendance records for this course yet.', 2);
}
$('#loginForm').addEventListener('submit', async event => {
  event.preventDefault();
  const button = event.currentTarget.querySelector('button');
  button.disabled = true;
  try {
    const data = await api('/api/auth/login', {method: 'POST', body: JSON.stringify({email: $('#email').value.trim(), password: $('#password').value})});
    if (data.user.role !== 'Student') throw Error('Student account required. Sign in with a student account.');
    token = data.token;
    sessionStorage.setItem(TOKEN_KEY, token);
    showDashboard(data.user.name);
    await loadCourses();
    notice('Student signed in successfully.');
  } catch (error) { notice(error.message, true); }
  finally { button.disabled = false; }
});
$('#logout').addEventListener('click', () => logout());
$('#refresh').addEventListener('click', () => loadCourses().then(() => notice('Attendance refreshed.')).catch(e => notice(e.message, true)));
$('#course').addEventListener('change', () => loadHistory().catch(e => notice(e.message, true)));
$('#studentCsv').addEventListener('click', () => downloadReport('/api/reports/student/summary.csv', 'my-attendance-summary.csv').then(() => notice('Summary CSV downloaded.')).catch(e => notice(e.message, true)));
$('#historyCsv').addEventListener('click', () => {
  const courseId = Number($('#course').value);
  if (!courseId) return notice('Choose a course first.', true);
  downloadReport(`/api/reports/student/course/${courseId}.csv`, `my-course-${courseId}-history.csv`).then(() => notice('History CSV downloaded.')).catch(e => notice(e.message, true));
});
$('#studentPrint').addEventListener('click', () => {
  document.body.classList.add('printStudent');
  window.print();
  document.body.classList.remove('printStudent');
});
window.addEventListener('afterprint', () => document.body.classList.remove('printStudent'));
(async () => {
  if (!token) return;
  try {
    const {user} = await api('/api/auth/me');
    if (user.role !== 'Student') throw Error('Student account required');
    showDashboard(user.name);
    await loadCourses();
  } catch (error) {
    logout('Please sign in as a student.');
  }
})();
