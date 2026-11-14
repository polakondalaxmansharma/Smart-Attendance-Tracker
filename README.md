# Smart Attendance Tracker — Phase 8 (Final Review Package)

**Contains the corrected Phase 7 student login fix**. This package retains the 4-table MySQL schema, the Admin, Faculty and Student dashboards, faculty attendance, CSV exports and browser Print/Save PDF.

Phase 8 adds **repeatable offline checks**, an **optional live API smoke test**, a full **manual testing checklist**, **demo script**, **submission guide** and **PPT slide content**. It does **not** claim live MySQL/browser tests have passed; run the tests on your laptop.

## Quick start (Windows, VS Code)

1. Extract the ZIP; open `Smart_Attendance_Phase_8` in VS Code.
2. Keep your current working `smart_attendance` MySQL database: **do not drop/recreate it**. Copy your working Phase 7 `backend/.env` to Phase 8 `backend/.env` (the ZIP deliberately excludes real secrets).
3. In VS Code terminal: `cd backend` then `npm install`.
4. From `backend`, run `npm run verify` for syntax/structural checks. Run `npm test` for only the regression tests.
5. Start your MySQL server and run `npm start`. Test `http://localhost:3000/api/health` (expect `database: connected`).
6. In a **second terminal** inside `backend`, run `npm run smoke` to test health, unauthenticated authorization and 404 behavior.
7. Open `frontend/index.html`, `faculty.html`, and `student.html` with VS Code **Live Server** (do not just double-click). Use **Ctrl+Shift+R** if an older JavaScript file is cached.
8. Follow `docs/TESTING_CHECKLIST.md` to complete all functional and permissions checks.

### Fresh database only
Run `backend/database.sql` in MySQL Workbench once and then `npm run seed` in `backend`.

### Seeded demo accounts — local only
- Admin: `admin@example.com` / `Admin123!`
- Faculty: `faculty@example.com` / `Faculty123!`
- Student: `rahul@example.com` / `Student123!`

If Phase 7 demo accounts already exist, **do not reset your database**; reuse existing logins.

### Student login troubleshooting
The student page must load `student.js`, which should say **Student account required**, never **Faculty account required**. If old behavior remains, verify you extracted the *Phase 8* project, restart Live Server, and hard-refresh. Each role stores its token in a separate sessionStorage key.

### Environment
Node.js 18+ (22+ recommended), npm, MySQL 8+, VS Code and Live Server. The .env file requires `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, and a random `JWT_SECRET` of at least 32 characters. For a 32-byte random secret, use `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` and paste the value into `.env`.

### Data and report scope
- Admin creates faculty/student accounts, courses, course assignments and enrollments.
- Faculty marks Present/Absent once per enrolled student on a selected date; updates overwrite the same date rather than creating duplicates.
- Student sees own enrolled courses, marked attendance totals and history only.
- Faculty CSV is scoped to assigned courses; Student summary/history CSV is scoped to their own courses. Print / Save PDF uses the browser print dialog (not a PDF-generation API).
- Unmarked classes do not contribute to denominators.

### Deliverables
- `frontend/` (3 HTML pages + JS/CSS)
- `backend/` (Express APIs, MySQL schema/seed, authentication, authorization, reports)
- `backend/tests/` + `backend/tools/` (offline + read-only live smoke checks)
- `docs/` (testing checklist, SQL verification, presentation and video demo guidance)

### Verification boundary
Offline tests check syntax and selected security/integration invariants by inspecting source; they cannot prove live authorization or MySQL correctness. The live smoke test is read-only and does not mark attendance. Complete hands-on tests before submission. Do not commit `.env`, real student records, or any downloaded reports with personal data. Demo credentials must be replaced before publishing online.
