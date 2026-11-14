'use strict';
const express = require('express');
const db = require('./db');
const router = express.Router();
const intId = v => /^\d+$/.test(String(v)) && Number.isSafeInteger(Number(v)) && Number(v)>0 ? Number(v) : null;
const fail=(res,message,code=400)=>res.status(code).json({message});
const error=(res,e)=>{console.error('Faculty attendance:',e.message);res.status(500).json({message:'Database operation failed'});};
const dateOK=d=>typeof d==='string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d+'T00:00:00Z')) && new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d && d<=new Date().toISOString().slice(0,10);
async function assigned(courseId,userId,connection=db){
  const [rows]=await connection.execute('SELECT courseId,courseName FROM courses WHERE courseId=? AND facultyId=?',[courseId,userId]);
  return rows[0];
}
router.get('/courses',async(req,res)=>{
 try{const [courses]=await db.execute(`SELECT c.courseId,c.courseName,
 (SELECT COUNT(*) FROM enrollments e WHERE e.courseId=c.courseId) AS studentCount
 FROM courses c WHERE c.facultyId=? ORDER BY c.courseName`,[req.user.userId]);res.json({courses});}
 catch(e){error(res,e);}
});
router.get('/courses/:courseId/students',async(req,res)=>{
 const id=intId(req.params.courseId);if(!id)return fail(res,'Invalid course ID');
 try{const course=await assigned(id,req.user.userId);if(!course)return fail(res,'Course is not assigned to you',403);
 const [students]=await db.execute(`SELECT u.userId,u.name,u.email FROM enrollments e
 JOIN users u ON u.userId=e.studentId WHERE e.courseId=? AND u.role='Student' ORDER BY u.name,u.userId`,[id]);
 res.json({course,students});}catch(e){error(res,e);}
});
router.get('/attendance/course/:courseId',async(req,res)=>{
 const id=intId(req.params.courseId), date=req.query.date;
 if(!id||!dateOK(date))return fail(res,'Valid course ID and a date not in the future required');
 try{const course=await assigned(id,req.user.userId);if(!course)return fail(res,'Course is not assigned to you',403);
 const [records]=await db.execute(`SELECT a.studentId,a.status FROM attendance a
 JOIN enrollments e ON e.courseId=a.courseId AND e.studentId=a.studentId
 WHERE a.courseId=? AND a.date=? ORDER BY a.studentId`,[id,date]);
 res.json({course,date,records});}catch(e){error(res,e);}
});
router.post('/attendance/mark',async(req,res)=>{
 const id=intId(req.body?.courseId), date=req.body?.date, entries=req.body?.attendance;
 if(!id||!dateOK(date))return fail(res,'Valid course ID and a date not in the future required');
 if(!Array.isArray(entries)||!entries.length||entries.length>500)return fail(res,'Provide 1-500 students in attendance');
 const ids=entries.map(x=>intId(x?.studentId));
 if(ids.some(x=>!x)||new Set(ids).size!==ids.length||entries.some(x=>!['Present','Absent'].includes(x?.status)))
  return fail(res,'Each student must appear once with Present or Absent status');
 let conn;
 try{
  conn=await db.getConnection();await conn.beginTransaction();
  const course=await assigned(id,req.user.userId,conn);
  if(!course){await conn.rollback();return fail(res,'Course is not assigned to you',403);}
  const [roster]=await conn.execute(`SELECT e.studentId FROM enrollments e JOIN users u ON u.userId=e.studentId
   WHERE e.courseId=? AND u.role='Student'`,[id]);
  const valid=new Set(roster.map(r=>r.studentId));
  if(valid.size!==ids.length||ids.some(x=>!valid.has(x))){await conn.rollback();return fail(res,'Submit one status for every currently enrolled student',400);}
  for(const entry of entries){await conn.execute(`INSERT INTO attendance (courseId,studentId,date,status) VALUES (?,?,?,?)
    ON DUPLICATE KEY UPDATE status=VALUES(status)`,[id,entry.studentId,date,entry.status]);}
  await conn.commit();res.json({message:'Attendance saved successfully',courseId:id,date,saved:entries.length});
 }catch(e){if(conn)await conn.rollback().catch(()=>{});error(res,e);}finally{if(conn)conn.release();}
});
router.get('/attendance/report/:courseId',async(req,res)=>{
 const id=intId(req.params.courseId);if(!id)return fail(res,'Invalid course ID');
 try{const course=await assigned(id,req.user.userId);if(!course)return fail(res,'Course is not assigned to you',403);
 const [summary]=await db.execute(`SELECT u.userId,u.name,u.email,
 COUNT(a.attendanceId) AS totalClasses,
 SUM(CASE WHEN a.status='Present' THEN 1 ELSE 0 END) AS presentClasses,
 SUM(CASE WHEN a.status='Absent' THEN 1 ELSE 0 END) AS absentClasses
 FROM enrollments e JOIN users u ON u.userId=e.studentId
 LEFT JOIN attendance a ON a.courseId=e.courseId AND a.studentId=e.studentId
 WHERE e.courseId=? AND u.role='Student' GROUP BY u.userId,u.name,u.email ORDER BY u.name`,[id]);
 const [dates]=await db.execute(`SELECT DATE_FORMAT(date,'%Y-%m-%d') AS date,COUNT(*) AS marked,
 SUM(status='Present') AS present, SUM(status='Absent') AS absent
 FROM attendance WHERE courseId=? GROUP BY date ORDER BY date DESC LIMIT 40`,[id]);
 res.json({course,summary:summary.map(r=>({...r,percentage:Number(r.totalClasses)?Math.round(Number(r.presentClasses)*10000/Number(r.totalClasses))/100:0})),dates});
 }catch(e){error(res,e);}
});
module.exports=router;
