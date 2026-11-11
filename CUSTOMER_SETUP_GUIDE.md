# IT Operations Manager — Customer Deployment & Setup Guide

This document contains complete step-by-step instructions for installing dependencies, configuring MySQL database, initializing the schema, and running the **IT Operations Manager** application (Frontend & Backend).

---

## 1. System Requirements & Prerequisites

Before setting up the project, ensure the following software is installed on the host machine:

| Requirement | Supported Version | Download Link |
| :--- | :--- | :--- |
| **Node.js** | v18.x, v20.x, or v22+ (LTS recommended) | [https://nodejs.org](https://nodejs.org) |
| **npm** | v9.x or v10+ (bundled with Node.js) | Included with Node.js |
| **MySQL Server** | MySQL 8.0+ or MariaDB 10.6+ (or XAMPP / WampServer) | [https://dev.mysql.com/downloads/](https://dev.mysql.com/downloads/) |
| **Git** (optional) | Latest | [https://git-scm.com](https://git-scm.com) |

To verify installations, open PowerShell / Terminal and run:
```bash
node -v
npm -v
mysql --version
```

---

## 2. Project Architecture Overview

```text
it-operations-manager/
├── prisma/               # Database Schema and Seeding scripts
│   ├── schema.prisma     # Prisma Data Model
│   └── seed.ts           # Initial master data & default users seed
├── backend/              # Node.js + Express + TypeScript REST API
│   ├── src/              # API source code (controllers, routes, services)
│   ├── uploads/          # Uploaded documents, invoices & asset files
│   ├── .env              # Backend environment variables
│   └── package.json      # Backend dependencies & scripts
├── frontend/             # React + Vite + TypeScript + Tailwind CSS UI
│   ├── src/              # UI components, pages, state management
│   ├── vite.config.ts    # Vite bundler & reverse proxy configuration
│   └── package.json      # Frontend dependencies & scripts
├── .env                  # Root database configuration for Prisma
├── .env.example          # Sample environment configuration
└── package.json          # Root scripts and Prisma CLI tools
```

---

## 3. Step 1: MySQL Database Configuration

### 3.1 Start MySQL Service
Ensure your MySQL service is running. If using:
- **Windows Service:** Check Windows Services (`services.msc`) -> ensure `MySQL` service is **Running**.
- **XAMPP / WampServer:** Open the XAMPP Control Panel and click **Start** next to MySQL.

### 3.2 Create the Database
Open MySQL Command-Line Client, MySQL Workbench, or phpMyAdmin, and run:
```sql
CREATE DATABASE it_operations_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3.3 Configure the `.env` Connection String
Open both the root `.env` and `backend/.env` files. Verify or update the `DATABASE_URL`:

```env
DATABASE_URL="mysql://<DB_USER>:<DB_PASSWORD>@<DB_HOST>:<DB_PORT>/it_operations_db"
```

#### Example Configurations:

* **Standard Default MySQL (Port 3306, user `root`, password `root`):**
  ```env
  DATABASE_URL="mysql://root:root@localhost:3306/it_operations_db"
  ```

* **XAMPP Default (Port 3306, user `root`, no password):**
  ```env
  DATABASE_URL="mysql://root:@localhost:3306/it_operations_db"
  ```

* **Custom Port (e.g., Port 3308 with password):**
  ```env
  DATABASE_URL="mysql://root:YourPassword@localhost:3308/it_operations_db"
  ```

> [!NOTE]
> If your MySQL password contains special characters (like `@`, `#`, `$`, `%`), they **must be URL-encoded**.
> For example:
> - `@` becomes `%40`
> - `#` becomes `%23`
> - `$` becomes `%24`
> 
> *Example:* `Tamil@7876@` becomes `Tamil%407876%40`.

---

## 4. Step 2: Install Dependencies

You must install dependencies in three locations: Root, Backend, and Frontend.

### 1. Root Directory (Prisma CLI & Seeder tools)
Open a terminal in the project root folder:
```bash
npm install
```

### 2. Backend Directory
```bash
cd backend
npm install
cd ..
```

### 3. Frontend Directory
```bash
cd frontend
npm install
cd ..
```

---

## 5. Step 3: Database Schema Migration & Seeding

Run the following commands from the **root directory** to generate the Prisma client, create all required database tables, and insert default initial data:

### 5.1 Generate the Prisma Client
```bash
npx prisma generate
```

### 5.2 Push Schema to MySQL Database
This creates all tables, relations, and indices inside `it_operations_db`:
```bash
npx prisma db push
```

### 5.3 Seed Default Roles, Users, and Master Data
Populate the database with departments, default admin accounts, and master data:
```bash
npx tsx prisma/seed.ts
```
*(You will see a success message: `🌱 Starting database seed...` followed by created departments, locations, and users).*

---

## 6. Step 4: Run the Application (Development Mode)

For development, keep two separate terminals open:

### Terminal 1: Start Backend API
```bash
cd backend
npm run dev
```
* **Backend API URL:** `http://localhost:3001`
* **API Base:** `http://localhost:3001/api/v1`
* **Health Check:** `http://localhost:3001/health`

### Terminal 2: Start Frontend Web UI
```bash
cd frontend
npm run dev
```
* **Frontend Web App:** `http://localhost:5173`

> Open your web browser and navigate to: **`http://localhost:5173`**

---

## 7. Step 5: Production Build & Deployment

If deploying to a production server:

### 1. Build & Run Backend
```bash
cd backend
npm run build
npm start
```

### 2. Build Frontend (Static Files)
```bash
cd frontend
npm run build
```
* The production-ready optimized HTML, CSS, and JS files will be generated in `frontend/dist`.
* You can serve `frontend/dist` using Nginx, Apache, IIS, or `npm run preview`.

---

## 8. Default Login Credentials

Use any of the following pre-configured user credentials to log into the application:

| Role | Email Address | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@company.com` | `Admin@1234` | Full system access, user management, audit logs |
| **IT Manager** | `it.manager@company.com` | `Admin@1234` | Asset approvals, vendor management, reports |
| **Sys Admin** | `sysadmin@company.com` | `Admin@1234` | Server & network assets, maintenance, backups |
| **IT Engineer** | `engineer@company.com` | `Admin@1234` | Ticket management, hardware & software logging |
| **IT Support** | `support@company.com` | `Admin@1234` | Helpdesk, incident resolution, asset checkouts |
| **Viewer** | `viewer@company.com` | `Admin@1234` | Read-only access to dashboards and asset lists |

*(Passwords can be changed after initial login from user profile settings).*

---

## 9. Environment Variables Reference

Below is a summary of variables defined in `.env` and `backend/.env`:

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `development` | Environment mode (`development` or `production`) |
| `PORT` | `3001` | Port on which the backend server listens |
| `FRONTEND_URL` | `http://localhost:5173` | Allowed frontend origin for CORS |
| `DATABASE_URL` | *(MySQL connection string)* | Prisma MySQL connection URL |
| `JWT_SECRET` | *(32+ character string)* | Secret key for signing access tokens |
| `JWT_REFRESH_SECRET` | *(32+ character string)* | Secret key for signing refresh tokens |
| `JWT_ACCESS_EXPIRES_IN`| `15m` | Lifetime of access tokens |
| `JWT_REFRESH_EXPIRES_IN`| `7d` | Lifetime of refresh tokens |
| `UPLOAD_DIR` | `./uploads` | Directory where uploaded files are stored |
| `MAX_FILE_SIZE_MB` | `10` | Maximum file upload size limit (MB) |
| `SMTP_HOST` | `smtp.gmail.com` | Mail server host (optional) |
| `SMTP_PORT` | `587` | Mail server port (optional) |
| `SMTP_USER` | *(Optional)* | Mail sender email username |
| `SMTP_PASS` | *(Optional)* | Mail app password |

---

## 10. Troubleshooting & Common Issues

### Issue 1: `PrismaClientInitializationError: Can't reach database server at localhost:<port>`
* **Reason:** MySQL server is stopped, or the port/credentials in `DATABASE_URL` do not match your MySQL instance.
* **Fix:**
  1. Verify MySQL is running (`mysqladmin -u root -p ping` or via Services/XAMPP).
  2. Verify the port in `DATABASE_URL` (usually `3306`, or `3308` if configured differently).
  3. Ensure special characters in passwords are percent-encoded (e.g., `@` -> `%40`).

### Issue 2: Port Already in Use (`EADDRINUSE: 3001` or `5173`)
* **Fix:** Change `PORT=3001` in `.env` to another port (e.g., `3002`) and update `target` in `frontend/vite.config.ts`, or terminate the lingering process:
  ```powershell
  # Windows PowerShell
  Stop-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess -Force
  ```

### Issue 3: Prisma Schema Changes Not Reflected
* **Fix:** Whenever `prisma/schema.prisma` is modified, run:
  ```bash
  npx prisma generate
  npx prisma db push
  ```

