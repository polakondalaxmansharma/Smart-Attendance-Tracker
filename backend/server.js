require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');
const app = express();
app.use(cors());
app.use(express.json({limit:'20kb'}));
app.get('/api/health', async (req,res)=>{
  try {await db.query('SELECT 1');res.json({status:'ok',database:'connected'});}
  catch(e){console.error('DB health:',e.message);res.status(503).json({status:'error',database:'unavailable'});}
});
app.post('/api/auth/login',async(req,res)=>{
  const {email,password}=req.body||{};
  if(typeof email!=='string'||typeof password!=='string'||!email.trim()||!password)return res.status(400).json({message:'Email and password required'});
  try {
    const [rows]=await db.execute('SELECT userId,name,role,email,password FROM users WHERE email=?',[email.trim().toLowerCase()]);
    const user=rows[0];
    if(!user||!(await bcrypt.compare(password,user.password)))return res.status(401).json({message:'Invalid credentials'});
    const token=jwt.sign({userId:user.userId,role:user.role},process.env.JWT_SECRET,{expiresIn:'4h'});
    res.json({token,user:{userId:user.userId,name:user.name,role:user.role,email:user.email}});
  }catch(e){console.error('Login error:',e.message);res.status(500).json({message:'Server error'});}
});
function authenticate(req,res,next){
  const match=/^Bearer (.+)$/.exec(req.headers.authorization||'');
  if(!match)return res.status(401).json({message:'Authentication required'});
  try{req.user=jwt.verify(match[1],process.env.JWT_SECRET);next();}
  catch(e){return res.status(401).json({message:'Invalid or expired token'});}
}
app.get('/api/auth/me',authenticate,async(req,res)=>{
  try {const [rows]=await db.execute('SELECT userId,name,role,email FROM users WHERE userId=?',[req.user.userId]);
    if(!rows.length)return res.status(404).json({message:'User not found'});
    res.json({user:rows[0]});
  }catch(e){console.error(e.message);res.status(500).json({message:'Server error'});}
});
// Phase 4: administrator management APIs. Every route requires a valid Admin token.
app.use('/api/admin', authenticate, async (req,res,next)=>{
  try {
    const [rows]=await db.execute('SELECT role FROM users WHERE userId=?',[req.user.userId]);
    if(!rows.length || rows[0].role !== 'Admin')return res.status(403).json({message:'Admin access required'});
    next();
  }catch(e){next(e);}
}, require('./adminRoutes'));
// Phase 5: faculty-only endpoints. Verify the current DB role, not merely JWT claims.
app.use('/api/faculty', authenticate, async (req,res,next)=>{
  try {
    const [rows]=await db.execute('SELECT role FROM users WHERE userId=?',[req.user.userId]);
    if(!rows.length || rows[0].role !== 'Faculty')return res.status(403).json({message:'Faculty access required'});
    next();
  }catch(e){next(e);}
}, require('./facultyRoutes'));
// Phase 6: each student sees ONLY their own courses and attendance.
app.use('/api/student', authenticate, async (req,res,next)=>{
  try {
    const [rows]=await db.execute('SELECT role FROM users WHERE userId=?',[req.user.userId]);
    if(!rows.length || rows[0].role!=='Student')return res.status(403).json({message:'Student access required'});
    next();
  }catch(e){next(e);}
}, require('./studentRoutes'));
// Phase 7: authenticated CSV exports; each route also checks the current DB role.
app.use('/api/reports',authenticate,require('./reportRoutes'));
// Serve the three dashboards and assets from this same Render web service.
app.use(express.static(path.join(__dirname, '..', 'frontend')));
app.use((err,req,res,next)=>{console.error('API error:',err.message);res.status(500).json({message:'Server error'});});
app.use((req,res)=>res.status(404).json({message:'Route not found'}));
if(require.main===module){
 if(!process.env.JWT_SECRET||process.env.JWT_SECRET.length<32){console.error('Set JWT_SECRET to at least 32 characters in backend/.env');process.exit(1);}
 app.listen(Number(process.env.PORT||3000),()=>console.log('API listening on http://localhost:'+(process.env.PORT||3000)));
}
module.exports=app;
