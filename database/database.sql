CREATE DATABASE IF NOT EXISTS smart_attendance;
USE smart_attendance;

CREATE TABLE IF NOT EXISTS users (
  userId INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  role ENUM('Admin','Faculty','Student') NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS courses (
  courseId INT AUTO_INCREMENT PRIMARY KEY,
  courseName VARCHAR(120) NOT NULL,
  facultyId INT NULL,
  CONSTRAINT fk_course_faculty FOREIGN KEY (facultyId) REFERENCES users(userId) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS enrollments (
  studentId INT NOT NULL,
  courseId INT NOT NULL,
  PRIMARY KEY(studentId, courseId),
  FOREIGN KEY (studentId) REFERENCES users(userId) ON DELETE CASCADE,
  FOREIGN KEY (courseId) REFERENCES courses(courseId) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS attendance (
  attendanceId INT AUTO_INCREMENT PRIMARY KEY,
  courseId INT NOT NULL,
  studentId INT NOT NULL,
  date DATE NOT NULL,
  status ENUM('Present','Absent') NOT NULL,
  UNIQUE KEY one_attendance_per_day (courseId, studentId, date),
  FOREIGN KEY (studentId, courseId) REFERENCES enrollments(studentId, courseId) ON DELETE CASCADE
);
