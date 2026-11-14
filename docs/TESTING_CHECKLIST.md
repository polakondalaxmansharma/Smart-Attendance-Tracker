# Phase 8 — Integration Test Checklist

Fill **PASS/FAIL** and add a screenshot or explanation for each item. Never claim untested steps passed.

| # | Test action | Expected result | Status |
|---|---|---|---|
| 1 | Run `npm run verify` in backend | Syntax and structural tests pass | NOT RUN |
| 2 | Start MySQL, run `npm start`, open `/api/health` | HTTP 200; `database: connected` | NOT RUN |
| 3 | Run `npm run smoke` in another backend terminal | Health + rejection of unsigned requests pass | NOT RUN |
| 4 | Admin login | Admin dashboard appears | NOT RUN |
| 5 | Admin creates Faculty and Student | Records visible without password hashes | NOT RUN |
| 6 | Admin creates Web Technologies | Course appears in list | NOT RUN |
| 7 | Admin assigns Faculty to Web Technologies | Correct faculty name shown | NOT RUN |
| 8 | Admin enrolls Student in course | Student appears in roster | NOT RUN |
| 9 | Enroll same Student twice | Duplicate enrollment rejected | NOT RUN |
| 10 | Faculty login | Only assigned courses displayed | NOT RUN |
| 11 | Faculty marks all roster students for one date | Success; records saved in MySQL | NOT RUN |
| 12 | Faculty revisits same date and changes status | Status updates, record count does not double | NOT RUN |
| 13 | Faculty requests unassigned course | HTTP 403 | NOT RUN |
| 14 | Student login on `student.html` | Student dashboard opens (no faculty error) | NOT RUN |
| 15 | Student attendance history | Correct date/status values displayed | NOT RUN |
| 16 | Student percentages | Present / marked × 100; unmarked excluded | NOT RUN |
| 17 | Student requests another student's course | HTTP 403 | NOT RUN |
| 18 | Faculty CSV export | Assigned course only; correct totals | NOT RUN |
| 19 | Student CSV summary and history | Own courses only; downloaded CSV opens | NOT RUN |
| 20 | Faculty and student Print / Save PDF | Print dialog opens; document readable | NOT RUN |
| 21 | Student token sent to admin route | HTTP 403 | NOT RUN |
| 22 | No token sent to protected route | HTTP 401 | NOT RUN |
| 23 | Refresh each page, log out and log in | No stale data or wrong-role error | NOT RUN |
| 24 | Console and Network tab | No uncaught errors / unexpected 500s | NOT RUN |

**Testing advice:** Mark attendance for 3 dates with a 4-student roster; e.g., a student present 2 of 3 dates should display 66.67%. Use a past or current date, not future dates. Capture screenshots of Admin course assignment, Faculty roster/marking, Student percentage/history, and CSV/PDF.

**If tests fail:** Record which step, URL, HTTP status, browser Console message, and backend terminal message. Never include `.env`, JWTs or database passwords in screenshots.
