# NoteLagbe (নোট লাগবে) 🎓

> Academic Resource & Course Notes Platform for **Southeast University (SEU)**

NoteLagbe is a full-stack, enterprise-grade academic platform built specifically for Southeast University students and faculty. It provides verified course curricula, teacher directories, lecture notes, question banks, semester planning, and interactive community resources.

---

## 🏗️ System Architecture

- **Frontend:** Next.js 16 (App Router, Turbopack, Tailwind CSS, Lucide Icons, Bilingual EN/BN support)
- **Backend:** Java 21, Spring Boot 3.3.5, Spring Security 6 (JWT + RBAC), Spring Data JPA, Bucket4j Rate Limiting
- **Database:** TiDB Cloud / MySQL (Production), H2 In-Memory (Zero-config local development)
- **Cloud Storage:** Cloudinary (Permanent cloud storage for lecture notes, slides, and profile pictures)
- **Deployment:** Render (Backend API Web Service) + Vercel (Frontend Next.js App)

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- **Java 21 JDK** or newer
- **Maven 3.9+** (or IntelliJ IDEA bundled Maven)
- **Node.js 18+** & **npm**

### 2. Run Backend
```bash
cd backend
mvn clean package -DskipTests
java -jar target/notelagbe-backend-1.0.0.jar
```
*The backend starts at `http://localhost:8888` using the in-memory H2 database with zero setup.*

### 3. Run Frontend
```bash
cd frontend
npm install
npm run dev
```
*The frontend starts at `http://localhost:3000` with hot-reloading enabled.*

---

## ☁️ Production Deployment Guide

### A. Database Setup: TiDB Cloud (Free Serverless)
1. Go to [TiDB Cloud](https://tidbcloud.com/) and create a free **Serverless Cluster**.
2. Click **Connect** and select **General (MySQL Client / JDBC)**.
3. Note your:
   - **Host** (e.g. `gateway01.ap-southeast-1.prod.aws.tidbcloud.com`)
   - **Port** (typically `4000`)
   - **Database Name** (e.g. `test` or `notelagbe`)
   - **Username** (e.g. `2xxxxxx.root`)
   - **Password** (your cluster password)

### B. Cloud Storage Setup: Cloudinary (Free)
1. Sign up at [Cloudinary](https://cloudinary.com/).
2. From your Cloudinary Dashboard, copy:
   - **Cloud Name**
   - **API Key**
   - **API Secret**

---

### C. Backend Deployment: Render (Web Service)
1. Sign in to [Render](https://render.com/).
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repository: `https://github.com/rabbi1067/noteLagbe`.
4. Configure the Web Service settings:
   - **Name:** `notelagbe-backend`
   - **Root Directory:** `backend`
   - **Runtime:** `Java` (or `Docker`)
   - **Build Command:** `mvn clean package -DskipTests`
   - **Start Command:** `java -jar target/notelagbe-backend-1.0.0.jar`
   - **Plan:** Free
5. Add the following **Environment Variables** in Render Dashboard:

| Environment Variable | Value / Description | Example |
|---|---|---|
| `SPRING_DATASOURCE_URL` | TiDB Cloud JDBC Connection URL | `jdbc:mysql://<host>:4000/<db>?sslMode=VERIFY_IDENTITY&useSSL=true&serverTimezone=UTC` |
| `SPRING_DATASOURCE_USERNAME` | TiDB Cloud Username | `2xxxxxx.root` |
| `SPRING_DATASOURCE_PASSWORD` | TiDB Cloud Password | `YourPasswordHere` |
| `SPRING_DATASOURCE_DRIVER_CLASS_NAME` | MySQL Driver Class | `com.mysql.cj.jdbc.Driver` |
| `JWT_SECRET` | 64+ character random secret | `404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970` |
| `CLOUDINARY_CLOUD_NAME` | Your Cloudinary Cloud Name | `your_cloud_name` |
| `CLOUDINARY_API_KEY` | Your Cloudinary API Key | `123456789012345` |
| `CLOUDINARY_API_SECRET` | Your Cloudinary API Secret | `abcdefghijklmnopqrstuvwxyz12345` |
| `APP_DEMO_ENABLED` | Keep false for real production data | `false` |
| `APP_CATALOG_INIT` | Pre-load SEU curriculum & faculty if DB is empty | `true` |
| `INITIAL_ADMIN_EMAIL` | Optional admin email (First registered user also becomes Super Admin) | `your_email@seu.edu.bd` |

6. Click **Deploy Web Service**. Once deployed, copy your Render URL (e.g. `https://notelagbe-backend.onrender.com`).

---

### D. Frontend Deployment: Vercel
1. Sign in to [Vercel](https://vercel.com/).
2. Click **Add New...** -> **Project**.
3. Import your GitHub repository: `https://github.com/rabbi1067/noteLagbe`.
4. Configure the project settings:
   - **Root Directory:** Edit and select `frontend`.
   - **Framework Preset:** `Next.js` (detected automatically).
5. Add the following **Environment Variables** in Vercel:

| Environment Variable | Value / Description | Example |
|---|---|---|
| `NEXT_PUBLIC_BACKEND_URL` | Your Render Backend URL | `https://notelagbe-backend.onrender.com` |
| `NEXT_PUBLIC_API_URL` | API base path (Next.js automatically proxies this) | `/api` |

6. Click **Deploy**. Your frontend is now live globally with zero CORS issues!

---

## 🔒 Security Best Practices
- **No hardcoded secrets:** All credentials, database keys, and JWT secrets are managed via Environment Variables.
- **Zero demo data in production:** With `APP_DEMO_ENABLED=false`, no mock accounts, dummy reviews, or fake uploads are created.
- **Super Admin Auto-Provisioning:** The first account registered on a fresh deployment is automatically designated as `ROLE_SUPER_ADMIN`.
- **Database-verified Password Reset:** Password reset requires verified university credentials registered in the database.

---

## 📄 License
This project is proprietary and developed for Southeast University students and faculty.
