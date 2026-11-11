<div align="center">

# ⚡ EngiFlow

### IT Operations & Engineer Workflow Management Platform

One place to manage IT assets, support tickets, vendors, infrastructure and the daily work of your engineering team.

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat-square&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0%2B-4479A1?style=flat-square&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

</div>

---

## Table of Contents

1. [Overview](#1-overview)
2. [Features](#2-features)
3. [Architecture](#3-architecture)
4. [Technology Stack](#4-technology-stack)
5. [Developer Guide: Setup in 7 Steps](#5-developer-guide-setup-in-7-steps)
6. [User Guide: Getting Started](#6-user-guide-getting-started)
7. [Roles and Permissions](#7-roles-and-permissions)
8. [Configuration Reference](#8-configuration-reference)
9. [Production Deployment](#9-production-deployment)
10. [Security](#10-security)
11. [Troubleshooting](#11-troubleshooting)
12. [Project Structure](#12-project-structure)
13. [Contributing](#13-contributing)
14. [License](#14-license)

---

## 1. Overview

EngiFlow brings hardware and software assets, helpdesk tickets, vendor contracts, network and facility monitoring, and engineers' daily tasks into a single dashboard. It is built for IT managers, system administrators, engineers and support staff who currently juggle spreadsheets, email and separate tools.

![EngiFlow Dashboard](./image.png)

---

## 2. Features

| Area | What you can do |
| :--- | :--- |
| **IT Asset Management** | Track laptops, desktops, servers, switches and monitors through their full lifecycle. Manage rented or leased equipment, software license seats and expiry dates, warranties and AMC contracts. |
| **Helpdesk** | Create, assign, categorize and resolve incident and request tickets. Four priority levels (Low, Medium, High, Critical) with SLA response and resolution tracking. |
| **Engineer Workflow** | **My Day** personal dashboard, structured activity logs for routine maintenance, task assignments with status tracking and follow-up reminders. |
| **Infrastructure** | ISP circuits, bandwidth and IP allocations. CCTV and NVR/DVR directory. Backup jobs and restore validation logs. |
| **Procurement & Finance** | Vendor directory, purchase orders, invoices and approvals, OPEX/CAPEX expense reports, preventive maintenance schedules. |
| **Analytics & Governance** | KPI dashboard, calendar (month, week, day, agenda), audit log of user actions, role-based access control with six built-in roles. |

---

## 3. Architecture

```mermaid
flowchart LR
    subgraph Client["Frontend (React 19 + Vite)"]
        UI["UI + Tailwind CSS"]
        Query["TanStack Query"]
        Store["Zustand"]
    end

    subgraph Server["Backend (Express + TypeScript)"]
        Router["REST API /api/v1"]
        Auth["JWT Auth + RBAC"]
        Upload["Multer (file uploads)"]
    end

    subgraph Data["Data Layer"]
        Prisma["Prisma ORM"]
        DB[("MySQL 8+ / MariaDB")]
        Files[("Uploads storage")]
    end

    UI --> Query --> Router
    Store --- UI
    Router --> Auth --> Prisma --> DB
    Router --> Upload --> Files
```

---

## 4. Technology Stack

| Layer | Technology |
| :--- | :--- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, TanStack Query, Zustand, Recharts, Lucide icons, Axios |
| Backend | Node.js 18+ (20 or 22 LTS recommended), Express.js, Zod validation, JWT, Multer |
| Database | MySQL 8.0+ or MariaDB 10.6+ with Prisma ORM |

> Exact versions are pinned in each `package.json`. Check those files rather than this table when upgrading.

---

## 5. Developer Guide: Setup in 7 Steps

### Prerequisites

| Tool | Minimum version |
| :--- | :--- |
| Node.js | 18 (20 or 22 LTS recommended) |
| npm | 9 |
| MySQL or MariaDB | 8.0 / 10.6 (XAMPP and WampServer also work) |
| Git | Any recent version |

### Step 1: Clone the repository

```bash
git clone https://github.com/<your-username>/EngiFlow.git
cd EngiFlow
```

### Step 2: Create the database

Make sure MySQL is running, then create the database and a **dedicated user** (do not use `root` for the app):

```sql
CREATE DATABASE it_operations_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER 'engiflow'@'localhost' IDENTIFIED BY 'use-a-long-random-password';
GRANT ALL PRIVILEGES ON it_operations_db.* TO 'engiflow'@'localhost';
FLUSH PRIVILEGES;
```

### Step 3: Configure environment variables

Copy the example file to both locations:

```bash
# macOS / Linux
cp .env.example .env
cp .env.example backend/.env
```

```powershell
# Windows PowerShell
Copy-Item .env.example .env
Copy-Item .env.example backend\.env
```

Then edit both files. A minimal development configuration:

```env
NODE_ENV=development
APP_NAME=EngiFlow
APP_URL=http://localhost:3001
FRONTEND_URL=http://localhost:5173
PORT=3001

# mysql://<USER>:<PASSWORD>@<HOST>:<PORT>/<DATABASE>
DATABASE_URL="mysql://engiflow:your-db-password@localhost:3306/it_operations_db"

# Generate each secret separately (see below). Never reuse them.
JWT_SECRET=<paste-generated-value>
JWT_REFRESH_SECRET=<paste-generated-value>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=10

CORS_ORIGIN=http://localhost:5173
```

**Generate strong secrets:**

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Run it twice, once for each secret.

> **Special characters in passwords:** URL-encode them inside `DATABASE_URL` (`@` → `%40`, `#` → `%23`, `$` → `%24`).

### Step 4: Install dependencies

```bash
npm install                        # root (Prisma tooling)
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

### Step 5: Create tables and seed demo data

```bash
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts
```

> ⚠️ `db push` and the demo seed are for **development only**. See [Production Deployment](#9-production-deployment) for the correct approach.

### Step 6: Start the servers

Use two terminals.

| Terminal | Commands | URL |
| :--- | :--- | :--- |
| Backend | `cd backend` then `npm run dev` | http://localhost:3001 (health: `/health`) |
| Frontend | `cd frontend` then `npm run dev` | http://localhost:5173 |

### Step 7: Verify

1. Open http://localhost:3001/health. You should see a success response.
2. Open http://localhost:5173 and sign in with a demo account (see [User Guide](#6-user-guide-getting-started)).

---

## 6. User Guide: Getting Started

### 6.1 Demo accounts (development only)

The seed script creates one account per role. All use the same demo password: **`Admin@1234`**.

| Role | Email |
| :--- | :--- |
| Super Admin | `admin@company.com` |
| IT Manager | `it.manager@company.com` |
| Sys Admin | `sysadmin@company.com` |
| IT Engineer | `engineer@company.com` |
| IT Support | `support@company.com` |
| Viewer | `viewer@company.com` |

> 🔒 **Never use these accounts in production.** Change or delete them before real users sign in.

### 6.2 Daily workflow, step by step

**Planning your day (Engineers)**
1. Sign in and open **My Day**.
2. Review tasks due today and tickets assigned to you.
3. Update task status as you work and log routine maintenance as an **Activity**.

**Handling a ticket (Support and Engineers)**
1. Open **Tickets** and select **Create Ticket**.
2. Enter a clear title, category and description, then choose a priority: Low, Medium, High or Critical.
3. Assign it to an engineer.
4. The assignee updates progress and adds resolution notes, then marks it **Resolved**.

**Managing assets (Support, Engineers, Managers)**
1. Open **Assets** and choose the category (hardware, rental, software license).
2. Add a new item with serial number, location, vendor and warranty or expiry date.
3. Check items out and in to users as needed.
4. Watch for warranty and license renewal warnings on the dashboard.

**Approvals and finance (IT Manager)**
1. Open the pending approvals list on the dashboard.
2. Review invoices, purchase orders and expenses, then approve or reject.
3. Use the vendor and AMC views to track contract renewals.

**Infrastructure checks (Sys Admin)**
1. Review ISP circuits, CCTV/NVR status and backup jobs.
2. Record backup restore validations and maintenance visits.
3. Schedule recurring preventive maintenance from the calendar.

> Menu names above reflect the module names in this project. Adjust them to match your final UI labels.

---

## 7. Roles and Permissions

| Role | Primary responsibility |
| :--- | :--- |
| 👑 Super Admin | Full control: users, roles, audit logs |
| 👔 IT Manager | Approvals, financial oversight, vendors and AMC |
| 🛡️ Sys Admin | Infrastructure, ISP, network, CCTV, backups |
| 🔧 IT Engineer | Daily tasks, tickets, activity logs |
| 🎧 IT Support | First-line tickets, asset check-out and check-in |
| 👁️ Viewer | Read-only access to dashboards and reports |

Permissions are enforced on the **server**, not just hidden in the UI.

---

## 8. Configuration Reference

| Variable | Required | Description |
| :--- | :---: | :--- |
| `NODE_ENV` | Yes | `development` or `production` |
| `PORT` | Yes | Backend port (default `3001`) |
| `APP_URL` | Yes | Public URL of the backend |
| `FRONTEND_URL` | Yes | Public URL of the frontend |
| `DATABASE_URL` | Yes | MySQL connection string |
| `JWT_SECRET` | Yes | Signs access tokens. Minimum 32 characters, random |
| `JWT_REFRESH_SECRET` | Yes | Signs refresh tokens. Must differ from `JWT_SECRET` |
| `JWT_ACCESS_EXPIRES_IN` | No | Access token lifetime (default `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | No | Refresh token lifetime (default `7d`) |
| `UPLOAD_DIR` | No | Folder for uploaded files |
| `MAX_FILE_SIZE_MB` | No | Maximum upload size |
| `CORS_ORIGIN` | Yes | Exact frontend origin allowed to call the API |

---

## 9. Production Deployment

### 9.1 Build

```bash
# Backend
cd backend
npm ci
npm run build

# Frontend
cd ../frontend
npm ci
npm run build        # output: frontend/dist/
```

### 9.2 Database

Use migrations, not `db push`:

```bash
npx prisma migrate deploy
```

Create your first admin account through a secure one-time script or the admin UI. **Do not run the demo seed in production.**

### 9.3 Run

1. Start the backend with `npm start` under a process manager (PM2 or systemd).
2. Serve `frontend/dist/` with Nginx, Apache or a static host.
3. Put both behind a reverse proxy with **HTTPS** and route `/api` to the backend.

### 9.4 Go-live checklist

- [ ] `NODE_ENV=production`
- [ ] Unique, random 64-byte JWT secrets
- [ ] HTTPS enabled and HTTP redirected
- [ ] `CORS_ORIGIN` set to the exact production domain
- [ ] Demo users removed
- [ ] Dedicated least-privilege database user
- [ ] Automated database and uploads backups, with a tested restore
- [ ] `npm audit` reviewed with no unresolved high or critical findings

---

## 10. Security

### Best practices for operators

| Area | Recommendation |
| :--- | :--- |
| **Secrets** | Keep `.env` out of Git (confirm `.gitignore`). Store production secrets in a secret manager or server environment, and rotate them if exposed. |
| **Authentication** | Use strong, unique passwords. Enforce password change on first login. Consider two-factor authentication for admins. |
| **Tokens** | Prefer storing refresh tokens in `httpOnly`, `Secure`, `SameSite` cookies rather than browser storage, and rotate them on use. |
| **HTTP hardening** | Use `helmet`, strict CORS, request size limits and rate limiting (especially on login). |
| **File uploads** | Allow only needed file types, check content type and extension, rename files with random names, store outside the public web root, serve through an authenticated route and consider virus scanning. |
| **Sensitive data** | Vendor bank details and GSTIN are sensitive. Restrict them to authorized roles, mask them in lists and encrypt at rest where possible. |
| **Audit log** | Restrict database write access to the audit table. If you need true tamper evidence, add hash chaining or ship logs to an external append-only store. |
| **Dependencies** | Run `npm audit` regularly, keep Express, Prisma and other packages current, and enable Dependabot. |
| **Database** | Do not expose MySQL to the internet. Allow connections only from the app server. |
| **Health endpoint** | Return only a simple status. Do not expose versions or configuration. |

### Reporting a vulnerability

Please do **not** open a public issue for security problems. Email the maintainers privately with steps to reproduce, and allow reasonable time for a fix before disclosure.

---

## 11. Troubleshooting

| Problem | Likely cause | Fix |
| :--- | :--- | :--- |
| `Can't reach database server` | MySQL not running or wrong `DATABASE_URL` | Start MySQL, check host, port, user and password |
| `Access denied for user` | Wrong credentials or missing grants | Recheck the user and `GRANT` statement from Step 2 |
| Login works but API calls fail with CORS errors | `CORS_ORIGIN` mismatch | Set it to the exact frontend URL, including port |
| Port already in use | Another process on 3001 or 5173 | Change `PORT` or stop the other process |
| `Prisma Client not generated` | Step 5 skipped | Run `npx prisma generate` |
| Special characters break the connection | Password not URL-encoded | Encode characters in `DATABASE_URL` |
| Uploads fail | Folder missing or file too large | Create `UPLOAD_DIR` and check `MAX_FILE_SIZE_MB` |

---

## 12. Project Structure

```text
EngiFlow/
├── backend/                 # Express REST API (TypeScript)
│   └── src/
│       ├── config/          # Environment, database, logger
│       ├── controllers/     # Route handlers
│       ├── middleware/      # Auth, validation, errors, rate limiting
│       ├── routes/          # /api/v1 endpoints
│       ├── services/        # Business logic
│       ├── utils/           # Audit logger, ID generators, date helpers
│       ├── app.ts           # Express setup
│       └── server.ts        # Server startup
├── frontend/                # React SPA (Vite + Tailwind)
│   └── src/
│       ├── components/      # Reusable UI
│       ├── layouts/         # Sidebar, top bar, dashboard shell
│       ├── pages/           # Assets, Tickets, Calendar, My Day, ...
│       ├── services/        # API clients
│       └── store/           # Zustand stores
├── prisma/
│   ├── schema.prisma        # Data model
│   └── seed.ts              # Demo data (development only)
├── CUSTOMER_SETUP_GUIDE.md  # Client handover guide
├── .env.example             # Sample configuration
└── package.json             # Root tooling
```

---

## 13. Contributing

Contributions are welcome.

1. Fork the repository
2. Create a branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "Add your feature"`
4. Push the branch: `git push origin feature/your-feature`
5. Open a Pull Request

Before submitting, make sure the project builds and linting passes.

---

## 14. License

Released under the [MIT License](LICENSE).

<div align="center">
<sub>Built for IT engineers and operations teams.</sub>
</div>
