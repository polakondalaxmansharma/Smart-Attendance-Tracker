-- Phase 8: READ-ONLY database verification. Safe for an existing database.
USE smart_attendance;
SHOW TABLES;
SELECT userId,name,role,email FROM users ORDER BY role,userId;
SELECT c.courseId,c.courseName,u.name AS facultyName FROM courses c LEFT JOIN users u ON c.facultyId=u.userId ORDER BY c.courseId;
SELECT c.courseName,u.name AS studentName FROM enrollments e JOIN courses c ON c.courseId=e.courseId JOIN users u ON u.userId=e.studentId ORDER BY c.courseName,u.name;
SELECT a.attendanceId,c.courseName,u.name AS studentName,a.date,a.status FROM attendance a JOIN courses c ON c.courseId=a.courseId JOIN users u ON u.userId=a.studentId ORDER BY a.date DESC,u.name;
SELECT u.name,c.courseName,COUNT(a.attendanceId) AS markedClasses,
 COALESCE(SUM(a.status='Present'),0) AS presentClasses,
 COALESCE(SUM(a.status='Absent'),0) AS absentClasses,
 CASE WHEN COUNT(a.attendanceId)=0 THEN NULL ELSE ROUND(100*COALESCE(SUM(a.status='Present'),0)/COUNT(a.attendanceId),2) END AS attendancePercent
FROM enrollments e JOIN users u ON u.userId=e.studentId JOIN courses c ON c.courseId=e.courseId
LEFT JOIN attendance a ON a.courseId=e.courseId AND a.studentId=e.studentId
GROUP BY u.userId,c.courseId ORDER BY u.name,c.courseName;
-- Should return zero rows if unique daily attendance constraint is working:
SELECT courseId,studentId,date,COUNT(*) AS duplicateCount FROM attendance GROUP BY courseId,studentId,date HAVING COUNT(*)>1;
