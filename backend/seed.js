require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./db');
(async () => {
  const db = await pool.getConnection();
  try {
    const accounts = [
      ['Admin Demo','Admin','admin@example.com','Admin123!'],
      ['Dr Kumar','Faculty','faculty@example.com','Faculty123!'],
      ['Dr Ramesh','Faculty','faculty2@example.com','Faculty123!'],
      ['Rahul','Student','rahul@example.com','Student123!'],
      ['Priya','Student','priya@example.com','Student123!'],
      ['Anjali','Student','anjali@example.com','Student123!'],
      ['Arjun','Student','arjun@example.com','Student123!']
    ];
    for (const [name,role,email,pwd] of accounts) {
      const hash = await bcrypt.hash(pwd, 10);
      await db.execute('INSERT IGNORE INTO users (name,role,email,password) VALUES (?,?,?,?)',[name,role,email,hash]);
    }
    const [[faculty]] = await db.execute('SELECT userId FROM users WHERE email=?',['faculty@example.com']);
    const [existing] = await db.execute('SELECT courseId FROM courses WHERE courseName=?',['DBMS']);
    let courseId = existing[0]?.courseId;
    if (!courseId) {
      const [result] = await db.execute('INSERT INTO courses (courseName,facultyId) VALUES (?,?)',['DBMS',faculty.userId]);
      courseId=result.insertId;
    }
    for (const email of ['rahul@example.com','priya@example.com','anjali@example.com','arjun@example.com']) {
      const [[student]] = await db.execute('SELECT userId FROM users WHERE email=?',[email]);
      await db.execute('INSERT IGNORE INTO enrollments (studentId,courseId) VALUES (?,?)',[student.userId,courseId]);
    }
    console.log('Demo accounts and DBMS course created. See README for logins.');
  } finally { db.release(); await pool.end(); }
})().catch(error => {console.error('Seed failed:',error.message);process.exitCode=1;});
