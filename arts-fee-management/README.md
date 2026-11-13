# ART'S Coaching Fee Management System

ART'S Coaching Fee Management System is an administrator-only application built with React, Vite, Tailwind CSS, React Router DOM, Axios, and React Icons. The Express API uses JWT sessions, bcryptjs, and MySQL. Current features include the dashboard, student management, fee collection, payment history, PDF receipts, and reports. Online payment processing and settings remain future-phase items; payment modes record payments already received.

## Capabilities

- Administrator sign-in and sign-out.
- Responsive, protected dashboard with a six-month collection chart, today's and this month's collections, active-student count, payment count, and estimated current-month pending fees.
- Add, edit, soft-delete, search, and paginate student records, including course, monthly fee, mobile number, and guardian name.
- Search active students, record fee payments by Cash, UPI, or Bank Transfer, and review searchable payment history.
- Generate unique receipt numbers and download or print branded PDF receipts with a QR code.
- View daily and monthly collection, payment-mode totals, student ledgers, and pending-fee estimates; export reports as PDF or Excel.
- Sidebar navigation, header, and shared stat-card components.
- HTTP-only JWT cookie, rate-limited login, and server-side authorization on dashboard data.
- MySQL connection pool and `admins`, `students`, legacy `payments`, and `fee_payments` schema, with seed-free interactive administrator provisioning.
- No online payment processing is configured. Payment modes record payments that were received outside the application.

## Project layout

```text
arts-fee-management/
├── frontend/
│   ├── src/
│   │   ├── pages/                 # Login.jsx, Dashboard.jsx, Students.jsx, CollectFee.jsx, Reports.jsx
│   │   ├── components/            # Layout, Sidebar, Header, ProtectedRoute, student and fee forms/history
│   │   ├── services/api.js
│   │   ├── context/AuthContext.jsx
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
├── backend/
│   ├── config/db.js
│   ├── controllers/                # authController.js, dashboardController.js, studentController.js, feeController.js, reportController.js
│   ├── middleware/authMiddleware.js
│   ├── models/                     # Admin.js, Student.js, FeePayment.js, Reports.js
│   ├── routes/                     # authRoutes.js, dashboardRoutes.js, studentRoutes.js, feeRoutes.js, reportRoutes.js
│   ├── services/                   # receiptService.js, reportExportService.js
│   ├── templates/receiptTemplate.js
│   ├── scripts/create-admin.js
│   ├── server.js
│   └── package.json
└── database/
    ├── schema.sql
    └── migrations/                # Existing-database upgrades
```

## Local setup

Requirements: Node.js 20+, npm, and MySQL 8+.

1. For a new installation, run `database/schema.sql` with a MySQL account that can create a database and tables. To upgrade an existing installation, back up the database and run `database/migrations/002_student_management.sql` and then `database/migrations/003_fee_payments.sql` once each. The migrations retain existing payment records; migration 002 copies legacy class/phone values and fills in student codes and guardian names. Reports use the existing payment tables and do not need a separate schema migration. Do not run migration files on a fresh schema.
2. Create a dedicated least-privilege MySQL user with access to `arts_fee_management`.
3. Copy `backend/.env.example` to `backend/.env`. Configure `PORT`, `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, and `FRONTEND_ORIGIN=http://localhost:5173`. Generate a strong JWT signing secret with a cryptographically secure random generator, for example `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"`, and set the generated value as `JWT_SECRET`. Do not use the example placeholder or a human-chosen password as the JWT secret. Keep `.env` files and credentials local and untracked; never commit them.
4. Start the API and create the initial admin:

   ```sh
   cd backend
   npm install
   npm run create-admin
   npm run dev
   ```

   The provisioning command prompts for an administrator email and a password of at least 12 characters; the password is not echoed and is stored as a bcrypt hash. It creates or resets only the requested admin account.
5. In another terminal, start the frontend:

   ```sh
   cd frontend
   npm install
   npm run dev
   ```

   Visit `http://localhost:5173`. Vite proxies `/api` requests to `http://localhost:4000`; set `VITE_API_URL` in `frontend/.env.local` only when using a separate API origin.

## Production configuration

- Build and deploy `frontend` as a Vite static site (Vercel build command `npm run build`, output folder `dist`). Set `VITE_API_URL` at build time to the public HTTPS API origin. The included Vercel rewrite sends application routes to `index.html`.
- Deploy `backend` as an Express service (for example on Railway), provision MySQL, and configure `PORT`, `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`, and `FRONTEND_ORIGIN` using the host's private environment/secret settings. Generate a separate strong random `JWT_SECRET` for each environment; do not copy it into source files, frontend variables, logs, or deployment documentation.
- Set `FRONTEND_ORIGIN` to the exact deployed frontend origin. For browser session cookies on production, host the frontend and API on HTTPS subdomains of the same registrable domain (for example `fees.example.com` and `fees-api.example.com`); this supports `SameSite=Lax` without third-party cookies.
- Provision the first administrator by running `npm run create-admin` in a private interactive deployment shell. Do not expose administrator provisioning over a public API.
- The production `Secure`, `HttpOnly`, and `SameSite=Lax` session cookie contains a signed JWT. Passwords and secrets are never sent to or stored in the frontend.

## API

| Method | Route | Access | Purpose |
|---|---|---|---|
| GET | `/health` | Public | Service liveness |
| POST | `/api/auth/login` | Public, rate-limited | Authenticate an admin and set the session cookie |
| GET | `/api/auth/me` | Admin | Return the authenticated admin |
| POST | `/api/auth/logout` | Public | Clear the session cookie |
| GET | `/api/dashboard/summary` | Admin | Return database-backed student/payment totals and six-month collection series in `summary` |
| GET | `/api/students?page=1&search=` | Admin | Search and paginate active students (10 per page) |
| POST | `/api/students` | Admin | Create a student |
| PUT | `/api/students/:id` | Admin | Update a student |
| DELETE | `/api/students/:id` | Admin | Soft-delete a student; payment history is retained |
| GET | `/api/fees/students?search=` | Admin | Search up to 20 active students for fee collection |
| POST | `/api/fees` | Admin | Record a Cash, UPI, or Bank Transfer payment and generate a unique receipt number |
| GET | `/api/fees/history?page=1&search=` | Admin | Search and paginate persisted fee-payment history |
| GET | `/api/fees/:id/receipt` | Admin | Download a branded PDF receipt with a receipt-number QR code |
| GET | `/api/reports/students?search=` | Admin | Search active students for a ledger report |
| GET | `/api/reports?from=YYYY-MM-DD&to=YYYY-MM-DD&month=YYYY-MM&studentId=` | Admin | Daily/monthly collections, payment modes, optional ledger, and pending-fee report |
| GET | `/api/reports/export?format={pdf\|xlsx}&from=...&to=...&month=...&studentId=` | Admin | Export the filtered report as PDF or Excel |

Student, fee, and report endpoints require the authenticated admin session cookie. Student records include `studentCode`, `name`, `course`, `monthlyFee`, `mobileNumber`, and `guardianName`. Deletes mark students inactive rather than removing them, preserving payment history and referential integrity. The PDF receipt QR code contains only the receipt number; it does not contain a session token or credentials.

**Report calculation notes:** Daily/monthly collection and payment-mode charts use the payment-record date (`payments.created_at` for legacy records and `fee_payments.collected_at` for new records). Legacy pending-fee calculations use their existing `fee_month`; new fee payments have no separately chosen billing period, so they count toward the calendar month in which they were collected. Pending fee is `max(monthly_fee - recorded payments for that month, 0)` for each active student. Because the schema does not track enrollments by month, partial fees, waivers, or due dates, this is a monthly estimate, not an accounting of contractual balances. Daily and ledger date ranges are limited to 366 days; monthly collection includes the selected month and preceding 11 months.

The dashboard summary includes `totalStudents`, `todaysCollection`, `pendingFees`, and `monthlyCollection` alongside its existing dashboard fields. These totals use active students and both payment tables; `pendingFees` uses the same estimated current-month calculation described above.
