# Smart Attendance Tracker — Suggested 9-slide PPT Content

1. **Title** — Smart Attendance Tracker; team name and members.
2. **Problem** — Manual attendance is time-consuming, inconsistent, and difficult to report.
3. **Objective** — Web-based application; faculty marks assigned-course attendance; students view history and reports.
4. **Roles** — Admin: manage faculty, students, courses, enrollments. Faculty: assigned roster, attendance, reports. Student: only own attendance and reports.
5. **Technology** — HTML/CSS/JavaScript; Node.js + Express; MySQL; JWT + bcryptjs.
6. **Database** — Users, Courses, Enrollments, Attendance; emphasize `UNIQUE(courseId,studentId,date)`.
7. **Architecture / Flow** — Browser → Express REST API → role/JWT verification → MySQL → JSON/CSV response.
8. **Live Demonstration** — Admin creates course/enrolls student → Faculty marks attendance → Student views percentage/history → download CSV or print PDF.
9. **Conclusion and Future Scope** — Reduced manual work, role-scoped access, fast reporting. Future: notifications, timetable/calendar, mobile app.

## Suggested short speech
“Good morning. Our project is Smart Attendance Tracker. It replaces manual class attendance with a role-based web application. Admin manages courses and enrollments. Faculty can only access assigned courses and mark Present or Absent for enrolled students on a selected date. Students view their own course-wise history and percentages. We store the data in MySQL, authenticate using JWT, and provide CSV reports and browser-based PDF printing. We will now demonstrate the Admin-to-Faculty-to-Student workflow.”

Do not describe the project as deployed or fully tested unless the corresponding tests and deployment are actually complete.
