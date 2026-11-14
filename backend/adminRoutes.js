const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('./db');
const router = express.Router();
const intId = value => Number.isSafeInteger(Number(value)) && Number(value)>0 ? Number(value) : null;
const fail = (res,message,code=400) => res.status(code).json({message});
const serverError = (res,error) => {
  console.error('Admin route:',error.message);
  return res.status(500).json({message:'Database operation failed'});
};
// List users by role (avoid returning password hashes)
router.get('/users', async(req,res)=>{
  const role=req.query.role;
  if(role && !['Faculty','Student','Admin'].includes(role))return fail(res,'Invalid role');
  try {
    const [rows]=role ? await db.execute('SELECT userId,name,role,email FROM users WHERE role=? ORDER BY name',[role]) : await db.query('SELECT userId,name,role,email FROM users ORDER BY role,name');
    res.json({users:rows});
  }catch(e){serverError(res,e);}
});
router.post('/users',async(req,res)=>{
  const {name,email,password,role}=req.body||{};
  if(typeof name!=='string'||!name.trim()||name.trim().length>100)return fail(res,'Enter a name (1-100 characters)');
  if(typeof email!=='string'||email.length>120||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))return fail(res,'Enter a valid email');
  if(typeof password!=='string'||password.length<8||password.length>72)return fail(res,'Password must be 8-72 characters');
  if(!['Faculty','Student'].includes(role))return fail(res,'Role must be Faculty or Student');
  try {
    const hash=await bcrypt.hash(password,10);
    const [result]=await db.execute('INSERT INTO users (name,role,email,password) VALUES (?,?,?,?)',[name.trim(),role,email.trim().toLowerCase(),hash]);
    res.status(201).json({message:'User created',user:{userId:result.insertId,name:name.trim(),role,email:email.trim().toLowerCase()}});
  }catch(e){if(e.code==='ER_DUP_ENTRY')return fail(res,'Email already exists',409);serverError(res,e);}
});
router.get('/courses',async(req,res)=>{
  try {
    const [rows]=await db.query(`SELECT c.courseId,c.courseName,c.facultyId,u.name AS facultyName,
      (SELECT COUNT(*) FROM enrollments e WHERE e.courseId=c.courseId) AS studentCount
      FROM courses c LEFT JOIN users u ON u.userId=c.facultyId ORDER BY c.courseId DESC`);
    res.json({courses:rows});
  }catch(e){serverError(res,e);}
});
router.post('/courses/add',async(req,res)=>{
  const {courseName}=req.body||{};
  if(typeof courseName!=='string'||!courseName.trim()||courseName.trim().length>120)return fail(res,'Enter a course name (1-120 characters)');
  try {
    const [result]=await db.execute('INSERT INTO courses (courseName,facultyId) VALUES (?,NULL)',[courseName.trim()]);
    res.status(201).json({message:'Course created',course:{courseId:result.insertId,courseName:courseName.trim(),facultyId:null}});
  }catch(e){serverError(res,e);}
});
router.post('/courses/assignFaculty',async(req,res)=>{
  const courseId=intId(req.body?.courseId), facultyId=intId(req.body?.facultyId);
  if(!courseId||!facultyId)return fail(res,'Valid courseId and facultyId required');
  try {
    const [[faculty]]=await db.execute('SELECT userId FROM users WHERE userId=? AND role=?',[facultyId,'Faculty']);
    if(!faculty)return fail(res,'Faculty user not found',404);
    const [result]=await db.execute('UPDATE courses SET facultyId=? WHERE courseId=?',[facultyId,courseId]);
    if(!result.affectedRows)return fail(res,'Course not found',404);
    res.json({message:'Faculty assigned successfully'});
  }catch(e){serverError(res,e);}
});
router.post('/courses/enrollStudent',async(req,res)=>{
  const courseId=intId(req.body?.courseId), studentId=intId(req.body?.studentId);
  if(!courseId||!studentId)return fail(res,'Valid courseId and studentId required');
  try {
    const [[student]]=await db.execute('SELECT userId FROM users WHERE userId=? AND role=?',[studentId,'Student']);
    if(!student)return fail(res,'Student user not found',404);
    const [[course]]=await db.execute('SELECT courseId FROM courses WHERE courseId=?',[courseId]);
    if(!course)return fail(res,'Course not found',404);
    const [existing]=await db.execute('SELECT 1 FROM enrollments WHERE studentId=? AND courseId=?',[studentId,courseId]);
    if(existing.length)return fail(res,'Student already enrolled in this course',409);
    await db.execute('INSERT INTO enrollments (studentId,courseId) VALUES (?,?)',[studentId,courseId]);
    res.status(201).json({message:'Student enrolled successfully'});
  }catch(e){if(e.code==='ER_DUP_ENTRY')return fail(res,'Student already enrolled',409);serverError(res,e);}
});
router.get('/courses/:courseId/students',async(req,res)=>{
  const courseId=intId(req.params.courseId);
  if(!courseId)return fail(res,'Invalid course ID');
  try{
    const [students]=await db.execute(`SELECT u.userId,u.name,u.email FROM enrollments e JOIN users u ON u.userId=e.studentId
      WHERE e.courseId=? ORDER BY u.name`,[courseId]);
    res.json({students});
  }catch(e){serverError(res,e);}
});
module.exports=router;
