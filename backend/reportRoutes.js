'use strict';
const express=require('express');
const db=require('./db');
const router=express.Router();
const validId=v=>/^\d+$/.test(String(v)) && Number.isSafeInteger(Number(v)) && Number(v)>0 ? Number(v):null;
const safeCsv=v=>{
  const value=String(v??'');
  // Prevent spreadsheet formula execution when CSV files are opened in Excel.
  const escaped=/^[\s]*[=+@\-]/.test(value)?"'"+value:value;
  return '"'+escaped.replace(/"/g,'""')+'"';
};
function sendCsv(res,filename,headers,rows){
  const content='\ufeff'+[headers,...rows].map(row=>row.map(safeCsv).join(',')).join('\r\n')+'\r\n';
  res.set('Content-Type','text/csv; charset=utf-8');
  res.set('Content-Disposition',`attachment; filename="${filename}"`);
  res.set('Cache-Control','no-store');
  res.send(content);
}
async function roleOf(req){const [rows]=await db.execute('SELECT role FROM users WHERE userId=?',[req.user.userId]);return rows[0]?.role;}
function internalError(res,e){console.error('CSV report error:',e.message);res.status(500).json({message:'Could not generate report'});}
router.get('/faculty/course/:courseId.csv',async(req,res)=>{
  const id=validId(req.params.courseId);if(!id)return res.status(400).json({message:'Invalid course ID'});
  try{
    if(await roleOf(req)!=='Faculty')return res.status(403).json({message:'Faculty only'});
    const [courses]=await db.execute('SELECT courseId,courseName FROM courses WHERE courseId=? AND facultyId=?',[id,req.user.userId]);
    if(!courses.length)return res.status(403).json({message:'Course not assigned to you'});
    const [rows]=await db.execute(`SELECT u.userId,u.name,u.email,
      COUNT(a.attendanceId) AS totalClasses,
      COALESCE(SUM(a.status='Present'),0) AS presentClasses,
      COALESCE(SUM(a.status='Absent'),0) AS absentClasses
      FROM enrollments e JOIN users u ON u.userId=e.studentId AND u.role='Student'
      LEFT JOIN attendance a ON a.courseId=e.courseId AND a.studentId=e.studentId
      WHERE e.courseId=? GROUP BY u.userId,u.name,u.email ORDER BY u.name,u.userId`,[id]);
    sendCsv(res,`faculty-course-${id}-attendance.csv`,
      ['Course ID','Course','Student ID','Student','Email','Marked Classes','Present','Absent','Attendance %'],
      rows.map(r=>[id,courses[0].courseName,r.userId,r.name,r.email,Number(r.totalClasses),Number(r.presentClasses),Number(r.absentClasses),Number(r.totalClasses)?(100*Number(r.presentClasses)/Number(r.totalClasses)).toFixed(2):'Not marked']));
  }catch(e){internalError(res,e);}
});
router.get('/student/summary.csv',async(req,res)=>{
 try{
  if(await roleOf(req)!=='Student')return res.status(403).json({message:'Student only'});
  const [rows]=await db.execute(`SELECT c.courseId,c.courseName,
   COUNT(a.attendanceId) AS totalClasses,
   COALESCE(SUM(a.status='Present'),0) AS presentClasses,
   COALESCE(SUM(a.status='Absent'),0) AS absentClasses
   FROM enrollments e JOIN courses c ON c.courseId=e.courseId
   LEFT JOIN attendance a ON a.courseId=e.courseId AND a.studentId=e.studentId
   WHERE e.studentId=? GROUP BY c.courseId,c.courseName ORDER BY c.courseName`,[req.user.userId]);
  sendCsv(res,'my-attendance-summary.csv',
    ['Course ID','Course','Marked Classes','Present','Absent','Attendance %'],
    rows.map(r=>[r.courseId,r.courseName,Number(r.totalClasses),Number(r.presentClasses),Number(r.absentClasses),Number(r.totalClasses)?(100*Number(r.presentClasses)/Number(r.totalClasses)).toFixed(2):'Not marked']));
 }catch(e){internalError(res,e);}
});
router.get('/student/course/:courseId.csv',async(req,res)=>{
 const id=validId(req.params.courseId);if(!id)return res.status(400).json({message:'Invalid course ID'});
 try{
  if(await roleOf(req)!=='Student')return res.status(403).json({message:'Student only'});
  const [courses]=await db.execute(`SELECT c.courseName FROM enrollments e JOIN courses c ON c.courseId=e.courseId
    WHERE e.studentId=? AND e.courseId=?`,[req.user.userId,id]);
  if(!courses.length)return res.status(403).json({message:'Not enrolled in this course'});
  const [rows]=await db.execute(`SELECT DATE_FORMAT(date,'%Y-%m-%d') AS date,status
    FROM attendance WHERE courseId=? AND studentId=? ORDER BY date DESC`,[id,req.user.userId]);
  sendCsv(res,`my-course-${id}-history.csv`,['Course ID','Course','Date','Status'],rows.map(r=>[id,courses[0].courseName,r.date,r.status]));
 }catch(e){internalError(res,e);}
});
module.exports=router;
