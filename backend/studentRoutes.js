'use strict';
const express = require('express');
const db = require('./db');
const router = express.Router();
const toId = value => /^\d+$/.test(String(value)) && Number.isSafeInteger(Number(value)) && Number(value)>0 ? Number(value) : null;
const failure = (res, err) => {console.error('Student endpoint:',err.message);return res.status(500).json({message:'Unable to load attendance information'});};

// Only data for the authenticated student is ever returned. The student ID is taken
// from the verified access token, not from user-supplied URL or query parameters.
router.get('/courses',async(req,res)=>{
 try{
  const [rows]=await db.execute(`SELECT c.courseId,c.courseName,
  u.name AS facultyName,
  COUNT(a.attendanceId) AS totalClasses,
  COALESCE(SUM(a.status='Present'),0) AS presentClasses,
  COALESCE(SUM(a.status='Absent'),0) AS absentClasses
  FROM enrollments e JOIN courses c ON c.courseId=e.courseId
  LEFT JOIN users u ON u.userId=c.facultyId AND u.role='Faculty'
  LEFT JOIN attendance a ON a.courseId=e.courseId AND a.studentId=e.studentId
  WHERE e.studentId=? GROUP BY c.courseId,c.courseName,u.name
  ORDER BY c.courseName,c.courseId`,[req.user.userId]);
  const courses=rows.map(r=>{
   const totalClasses=Number(r.totalClasses),presentClasses=Number(r.presentClasses),absentClasses=Number(r.absentClasses);
   return {courseId:r.courseId,courseName:r.courseName,facultyName:r.facultyName||'Not assigned',totalClasses,presentClasses,absentClasses,
    percentage:totalClasses?Math.round(presentClasses*10000/totalClasses)/100:0};
  });
  res.json({courses});
 }catch(e){failure(res,e);}
});

router.get('/attendance/course/:courseId',async(req,res)=>{
 const courseId=toId(req.params.courseId);
 if(!courseId)return res.status(400).json({message:'Invalid course ID'});
 try{
  const [enrolled]=await db.execute(`SELECT c.courseId,c.courseName FROM enrollments e
    JOIN courses c ON c.courseId=e.courseId WHERE e.studentId=? AND e.courseId=?`,[req.user.userId,courseId]);
  if(!enrolled.length)return res.status(403).json({message:'You are not enrolled in this course'});
  const [records]=await db.execute(`SELECT DATE_FORMAT(date,'%Y-%m-%d') AS date,status
   FROM attendance WHERE studentId=? AND courseId=? ORDER BY date DESC,attendanceId DESC`,[req.user.userId,courseId]);
  res.json({course:enrolled[0],records});
 }catch(e){failure(res,e);}
});
module.exports=router;
