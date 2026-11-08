# NoteLagbe (নোট লাগবে) 🎓

<div align="center">

![NoteLagbe Banner](https://img.shields.io/badge/Southeast%20University-Official%20CSE%20Academic%20Platform-0052cc?style=for-the-badge&logo=google-scholar&logoColor=white)

[![Next.js 16](https://img.shields.io/badge/Next.js-16.4.3-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Spring Boot 3](https://img.shields.io/badge/Spring%20Boot-3.3.5-6DB33F?style=for-the-badge&logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![Java 21](https://img.shields.io/badge/Java-21%20LTS-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)](https://www.oracle.com/java/)
[![TiDB Cloud](https://img.shields.io/badge/TiDB%20Cloud-MySQL%208%20Compatible-E30C34?style=for-the-badge&logo=mysql&logoColor=white)](https://tidbcloud.com/)
[![Cloudinary](https://img.shields.io/badge/Cloudinary-Permanent%20Cloud%20Storage-3448C5?style=for-the-badge&logo=cloudinary&logoColor=white)](https://cloudinary.com/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind%20CSS-v4.0-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: Proprietary](https://img.shields.io/badge/License-Proprietary%20%2F%20SEU-red?style=for-the-badge)](LICENSE)

**An Enterprise-Grade, Full-Stack Academic Resource & Student Productivity Platform for Southeast University (SEU)**

[Explore Features](#-comprehensive-feature-breakdown) • [System Architecture](#-system-architecture) • [3D Animation Experience](#-interactive-3d-academic-hub) • [Deployment Guide](#-production-deployment-guide) • [API Directory](#-api-endpoints-directory)

</div>

---

## 🌟 Executive Overview

**NoteLagbe** is a comprehensive academic portal built specifically for Southeast University students and faculty members. It unites course curricula, faculty evaluations, archived mid-term & final examination question papers, handwritten lecture notes, official academic calendars, and a suite of student automation tools into a single, high-performance platform.

Built with an isolated, cloud-native architecture:
- **Zero Mock / Dummy Data in Production**: The database runs 100% authentic data with live scraper fallbacks to official SEU registrar portals.
- **Strict Security & Zero YAML Leaks**: No `.yml` or `.yaml` files are tracked in version control; all credentials, database keys, and JWT secrets are managed securely via runtime environment variables.
- **Smart Super Admin Auto-Enrollment**: When deploying to a brand-new database, the first user account registered via the UI is automatically granted `ROLE_SUPER_ADMIN` with no hardcoded credentials.
- **Permanent Cloud Storage**: Integrated with **Cloudinary** so lecture notes, exam papers, and faculty photographs are stored persistently in the cloud, completely independent of container lifecycles.
- **Distributed Database**: Pre-configured for **TiDB Cloud** (distributed MySQL 8 serverless) with automated SSL handshakes and connection pooling.

---

## 🏛️ System Architecture

```
                                      +---------------------------------------------+
                                      |         Southeast University Students       |
                                      |          & Faculty Web / Mobile Browsers    |
                                      +---------------------------------------------+
                                                             |
                                           HTTPS / Dynamic Client Requests
                                                             |
                                                             v
+------------------------------------------------------------------------------------------------------------------------+
|                                      FRONTEND (Vercel Global Edge Network)                                             |
|                                                                                                                        |
|  * Next.js 16 (App Router + Turbopack)         * React 19 Client Components          * Tailwind CSS v4 Modern Theme   |
|  * Interactive 3D Academic Hero                * Bilingual Context (EN 🇬🇧 / BN 🇧🇩)   * Next.js Internal Reverse Proxy |
|  * SSE Real-time Event Receiver                * Client-side LocalStorage Cache      * Dark / Light Mode Instant Toggle|
+------------------------------------------------------------------------------------------------------------------------+
                                                             |
                                         Internal Reverse Proxy: /api/:path*
                                         (Zero Cross-Origin / Zero CORS Friction)
                                                             |
                                                             v
+------------------------------------------------------------------------------------------------------------------------+
|                                        BACKEND (Render Web Service Container)                                         |
|                                                                                                                        |
|  * Spring Boot 3.3.5 / Java 21 LTS             * Spring Security 6 (Stateless JWT)   * Bucket4j IP Rate Limiter       |
|  * Dynamic CORS Pattern Handlers               * SSE LiveSync Event Broadcaster      * Spring Data JPA / Hibernate    |
|  * Cloudinary Cloud File Manager               * Academic Catalog DB Initializer     * DB-Verified Password Reset Flow|
+------------------------------------------------------------------------------------------------------------------------+
                                      /                                        \
              Direct MySQL 8 SSL JDBC /                                          \ Cloudinary REST Multipart Uploads
                                     /                                            \
                                    v                                              v
+------------------------------------------------------+        +----------------------------------------------------+
|               TiDB CLOUD (Serverless)                |        |                CLOUDINARY STORAGE                  |
|                                                      |        |                                                    |
|  * Distributed MySQL 8 Relational Database Engine    |        |  * Permanent Document & Image CDN                  |
|  * Tables: Users, Courses, Teachers, TeacherCourse,  |        |  * Folders: notelagbe/materials, notelagbe/avatars,|
|    Resources, Reviews, Notices, Chats, Payments,     |        |    notelagbe/faculty                               |
|    Subscriptions, ActivityLogs, SystemSettings       |        |  * Auto WebP/PDF compression & secure delivery     |
+------------------------------------------------------+        +----------------------------------------------------+
```

---

## 💎 Interactive 3D Academic Hub

NoteLagbe features a custom-engineered **3D Academic Engine Visualizer** (`ThreeDimensionalHeroVisual.tsx`) right in the homepage Hero section:
- **Interactive 3D Mouse Parallax & Gyroscopic Tilt**: Smooth physical tilt calculations with dynamic CSS `rotateX`, `rotateY`, and deep layered `translateZ` multi-plane perspective.
- **Real-Time 3D Particle & Geometric Constellation**: A 60 FPS HTML5 Canvas engine rendering rotating 3D coordinate orbits with dynamic depth-based opacity and proximity inter-connection lines.
- **Holographic Specular Sheen**: Real-time cursor reflection sheen simulating high-end glassmorphism across dark and light modes.
- **Touch-Optimized Auto-Sway on Mobile**: Automatic smooth periodic sway on smartphones and tablets, transitioning to tactile cursor tracking on desktop screens.

---

## 🚀 Comprehensive Feature Breakdown

### 1. 📚 Complete Southeast University Curriculum Catalog
- **50+ Official CSE Courses**: Exhaustive syllabus mapping for Batch 60 through Batch 71 across all 12 undergraduate semesters.
- **Credit & Lab Categorization**: Precise breakdown between theory credits, lab credits, and credit hours.
- **Prerequisite Dependency Graph**: Clear prerequisite tracking (e.g. `CSE141` $\rightarrow$ `CSE241` $\rightarrow$ `CSE341`).
- **SEU 11 Official Departments**: Direct synchronization with `https://seu.edu.bd/programs` covering:
  - Computer Science & Engineering (CSE) — *Live & Fully Populated*
  - Electrical & Electronic Engineering (EEE), Architecture (ARCH), Textile Engineering (TEX)
  - Pharmacy (PHR), Southeast Business School (BBA), Law & Justice (LAW)
  - English (ENG), Bangla (BNG), Economics (ECO), Information & Communication Technology (ICT)

### 2. 👨‍🏫 RateMyFaculty — University Teacher Directory
- **35+ Verified Southeast University Faculty Profiles**: Scraped from official university listings and student portals.
- **Teacher Initials Index**: Full support for quick searching by university initials (e.g., `MSH`, `BA`, `MHB`, `KMR`).
- **Room Numbers & Official Contacts**: Campus room numbers, email addresses, and official office locations.
- **Course-Teacher Offerings Matrix**: See exactly which sections and courses are taught by each professor.
- **Authentic 5-Dimension Student Reviews**:
  - Teaching Clarity & Presentation ⭐
  - Grading Fairness & Leniency ⭐
  - Attendance Strictness ⭐
  - Behavior & Helpfulness ⭐
  - Examination Difficulty ⭐
- **Architectural Anonymity Handler**: Verified enrolled students can post frank, constructive reviews while keeping their identity 100% anonymous from public view.

### 3. 📝 Curated Academic Notes & Exam Paper Bank
- **Mid-Term & Final Examination Question Papers**: Archive of previous exam papers organized by course and instructor.
- **Handwritten Lecture Notes & Lab Reports**: Student-contributed and teacher-verified notes.
- **Multi-Format Support**: Instant browser rendering and downloads for PDF, DOCX, PPTX, PNG, JPG, WEBP, and ZIP files.
- **Unlocked Access Model**: Clean, freemium tiering offering 1 free course unlock upon registration, or semester-long unlimited passes.

### 4. 📅 4-Year Official Academic Calendar (2023–2026)
- **359 Registrar-Verified Events**: Synchronized from official Southeast University registrar notices.
- **3 Semesters per Year**: Spring, Summer, and Fall across 2026, 2025, 2024, and 2023.
- **Interactive Category Filters**:
  - `Orientation` — Freshers orientation and semester kickoff events
  - `Add / Drop` — Course add, drop, and section change windows
  - `Pre-registration` — Advising and pre-registration deadlines
  - `Exams & Tests` — Mid-term exams, make-up tests, and final exam weeks
  - `Holidays & Breaks` — National holidays, semester breaks, and religious vacations
  - `Results` — Official semester grade sheet publication dates
- **Print-Ready PNG & PDF Generator**: Export customized, high-resolution calendars branded with the official Southeast University header.

### 5. 🛠️ Student Productivity Tools Suite
- **30+ SEU Cover Page Generator**:
  - 15 Monochrome (Black & White) templates for affordable university printing.
  - 15 Full-Color official templates for presentations and formal submissions.
  - Formats: Assignments, Lab Reports, Project Reports, Research Term Papers, Theses, Case Studies, and Seminar Reports.
  - Real-time client-side live preview and instant `.docx` Word document download.
- **SEU Tuition Waiver & Scholarship Calculator**:
  - Calculates exact tuition fee reductions based on SSC & HSC GPA criteria.
  - Semester-by-semester CGPA merit waiver estimation according to official Southeast University syndicate policies.
- **Certificate of Participation Maker**:
  - Generates verifiable participation certificates for SEU club activities, hackathons, and seminars.
- **Academic Formula Cheat Sheet Generator**:
  - Build and download quick formula sheets for math, algorithms, and electronics exams.

### 6. 💬 Community Hub & Real-time Collaboration
- **Live Community Chat (`FloatingCommunityChat`)**: Floating real-time messaging supporting text, images, and voice notes.
- **Pinned Messages & Replies**: Important notices pinned by admins; threaded student replies.
- **Top Contributors Leaderboard**: Recognition and reward points for students who upload verified lecture notes.
- **Live Campus Notice Board**: Real-time ticker with urgent campus notices and semester reminders.
- **Enterprise Server-Sent Events (SSE)**: Instant browser UI refresh whenever an admin updates courses, teachers, or notices.

### 7. 🔐 Enterprise Security, Auth & RBAC
- **Spring Security 6 Stateless JWT**: Access tokens with 24-hour validity and 7-day refresh tokens.
- **Four-Tier Role-Based Access Control**:
  - `ROLE_STUDENT` — Course browsing, note access, community chat, review submission.
  - `ROLE_MANAGER` — Exam question verification and community chat moderation.
  - `ROLE_ADMIN` — Department management, course assignments, note approvals.
  - `ROLE_SUPER_ADMIN` — Complete system governance, staff creation, audit log clearance, cache eviction.
- **Database-Verified Password Reset**:
  - Step 1: Checks user email against database. If email does not exist, strictly rejects with HTTP 404.
  - Step 2: Generates a secure 30-minute UUID cryptographic reset token, presents verified student details, and saves the new BCrypt-hashed password.
- **Bucket4j Rate Limiting**: IP-based token bucket protecting endpoints from brute-force attacks (120 requests/minute).

### 8. 🎛️ Comprehensive Admin Dashboard (`/admin`)
- **Real-Time Analytics & KPIs**: Total registered students, active subscriptions, uploaded notes, pending approvals, and system health.
- **Course & Faculty Assignment Manager**: Assign professors to courses and sections with live UI sync.
- **Resource Moderation Queue**: Review student-submitted notes with one-click approve, reject, or delete.
- **Faculty Profile CRUD**: Create, edit, and remove faculty profiles with Cloudinary photo uploading.
- **Activity Audit Trail**: Full chronological log of administrative operations.
- **Cache Eviction**: Clear application and Spring Cache memory with a single click.

---

## 🛠️ Tech Stack & Dependencies

### Frontend (`/frontend`)
| Technology | Version | Purpose |
|---|---|---|
| **Next.js** | 16.4.3 | React Framework (App Router, Turbopack) |
| **React** | 19.3.0 | UI Component Library |
| **Tailwind CSS** | 4.0 | Utility-First Styling Engine |
| **Lucide React** | 1.62.0 | Modern Vector Iconography |
| **Canvas Confetti** | 1.9.4 | Celebratory Animations |
| **HTML2Canvas & jsPDF**| Latest | Client-Side Document & Calendar Export |
| **Sonner** | 2.0.8 | Smooth Interactive Toast Notifications |

### Backend (`/backend`)
| Technology | Version | Purpose |
|---|---|---|
| **Java** | 21 LTS | Programming Language (Modern Records, Pattern Matching) |
| **Spring Boot** | 3.3.5 | Enterprise Web & REST API Framework |
| **Spring Security** | 6.x | JWT Authentication, CORS & Method Security |
| **Spring Data JPA** | 3.3.5 | ORM & Entity Persistence |
| **MySQL Connector/J** | 8.x | Database Driver for TiDB Cloud & MySQL |
| **Cloudinary SDK** | 1.38.0 | Permanent Cloud Media & Document Storage |
| **JJWT** | 0.12.6 | JSON Web Token Generation & Validation |
| **Bucket4j** | 8.10.1 | High-Performance Token Bucket Rate Limiting |
| **H2 Database** | Runtime | Embedded Zero-Config In-Memory DB for Local Dev |

---

## ☁️ Production Deployment Guide

### Phase 1: Free Cloud Database (TiDB Cloud)
1. Go to [TiDB Cloud](https://tidbcloud.com/) and create a free **Serverless Cluster**.
2. Under **Connection Details**, choose **General / MySQL Client**.
3. Note your credentials:
   - **Host:** e.g. `gateway01.ap-southeast-1.prod.aws.tidbcloud.com`
   - **Port:** `4000`
   - **Username:** e.g. `2xxxxxx.root`
   - **Password:** `<your_password>`
   - **Database:** `notelagbe` (or default `test`)

### Phase 2: Free Cloud Media Storage (Cloudinary)
1. Register at [Cloudinary](https://cloudinary.com/).
2. On your Cloudinary Dashboard, copy:
   - **Cloud Name**
   - **API Key**
   - **API Secret**

### Phase 3: Backend Deployment (Render)
1. Log in to [Render](https://render.com/) and click **New +** $\rightarrow$ **Web Service**.
2. Connect your GitHub repository: `https://github.com/rabbi1067/noteLagbe`.
3. Fill in the service configuration:
   - **Name:** `notelagbe-backend`
   - **Root Directory:** `backend`
   - **Runtime:** `Java`
   - **Build Command:** `mvn clean package -DskipTests`
   - **Start Command:** `java -jar target/notelagbe-backend-1.0.0.jar`
   - **Instance Type:** `Free`
4. In the **Environment Variables** tab, add:

```env
SPRING_DATASOURCE_URL=jdbc:mysql://<your-tidb-host>:4000/<database>?sslMode=VERIFY_IDENTITY&useSSL=true&serverTimezone=UTC
SPRING_DATASOURCE_USERNAME=<your-tidb-username>
SPRING_DATASOURCE_PASSWORD=<your-tidb-password>
SPRING_DATASOURCE_DRIVER_CLASS_NAME=com.mysql.cj.jdbc.Driver
JWT_SECRET=404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970
CLOUDINARY_CLOUD_NAME=<your-cloudinary-cloud-name>
CLOUDINARY_API_KEY=<your-cloudinary-api-key>
CLOUDINARY_API_SECRET=<your-cloudinary-api-secret>
APP_DEMO_ENABLED=false
APP_CATALOG_INIT=true
INITIAL_ADMIN_EMAIL=your_email@seu.edu.bd
```

5. Click **Create Web Service**. Render will build and launch your backend jar (e.g. `https://notelagbe-backend.onrender.com`).

### Phase 4: Frontend Deployment (Vercel)
1. Log in to [Vercel](https://vercel.com/) and click **Add New...** $\rightarrow$ **Project**.
2. Select your repository `rabbi1067/noteLagbe`.
3. Set the build settings:
   - **Root Directory:** Click **Edit** and choose `frontend`.
   - **Framework Preset:** `Next.js` (auto-detected).
4. Add the following **Environment Variables**:

```env
NEXT_PUBLIC_BACKEND_URL=https://notelagbe-backend.onrender.com
NEXT_PUBLIC_API_URL=/api
```

5. Click **Deploy**. Vercel will build and publish your frontend globally.

### Phase 5: Super Admin Activation
1. Navigate to your live Vercel URL.
2. Click **Sign In** $\rightarrow$ **Create Account**.
3. Register with your personal email address.
4. Because the database starts fresh with 0 users, **you are automatically promoted to `ROLE_SUPER_ADMIN`!**
5. Visit `/admin` to access the full administrative dashboard.

---

## 💻 Local Development Setup

### 1. Prerequisites
- **Java 21 JDK**
- **Maven 3.9+**
- **Node.js 18+** & **npm**

### 2. Backend (Local H2 Database)
```bash
cd backend
mvn clean package -DskipTests
java -jar target/notelagbe-backend-1.0.0.jar
```
*Backend runs at `http://localhost:8888`.*

### 3. Frontend (Local Next.js)
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs at `http://localhost:3000`.*

---

## 📡 API Endpoints Directory

### Authentication & Profiles (`/api/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register new student account (1st user becomes Super Admin) |
| `POST` | `/api/auth/login` | Public | Authenticate user & receive JWT token |
| `POST` | `/api/auth/forgot-password` | Public | Verify email in database & issue 30-min reset token |
| `POST` | `/api/auth/reset-password` | Public | Set new password with verified cryptographic token |
| `GET` | `/api/auth/me` | User | Retrieve authenticated user profile |
| `POST` | `/api/auth/avatar` | User | Upload new profile avatar (Cloudinary / Disk) |

### Academic Courses (`/api/courses`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/courses` | Public | List courses (filter by department, semester, search) |
| `GET` | `/api/courses/{code}` | Public | Detailed course syllabus, teachers & available resources |
| `POST` | `/api/courses/unlock` | Student | Unlock course study materials with active subscription |

### Faculty Directory (`/api/teachers`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/teachers` | Public | List all teachers (Full-Time, Adjunct, Officers) |
| `GET` | `/api/teachers/{id}` | Public | Teacher profile, initials, room number & courses taught |
| `GET` | `/api/teachers/{id}/reviews`| Public | View student reviews & 5-star ratings |

### Academic Resources & Question Bank (`/api/resources`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/resources/course/{code}` | Public | View study notes & exam papers for course |
| `GET` | `/api/resources/teacher/{id}` | Public | View study notes & exams for specific teacher |
| `POST` | `/api/resources/{id}/download`| Public | Record download counter for resource |

### Administration (`/api/admin`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/admin/stats` | Admin | Real-time student, course, and resource metrics |
| `GET` | `/api/admin/analytics` | Admin | 6-month historical activity charts |
| `POST` | `/api/admin/resources/upload`| Admin | Upload document to Cloudinary/Disk |
| `POST` | `/api/admin/courses` | Admin | Create or update course curriculum |
| `POST` | `/api/admin/teachers` | Admin | Add new faculty profile with image |
| `DELETE` | `/api/admin/activity-logs`| Super Admin | Clear administrative audit logs |

---

## 🔒 Security Specifications

- **BCrypt Password Hashing**: Passwords are encrypted using Spring Security's `BCryptPasswordEncoder` with strength factor 10.
- **Stateless Authorization**: All API calls authenticate via standard `Authorization: Bearer <token>` headers.
- **Zero Cross-Site Scripting (XSS)**: Sanitized React templates and profanity filtering on reviews.
- **SQL Injection Immune**: All queries use parameterized Hibernate HQL or Spring Data JPA interfaces.
- **No Credentials in Version Control**: `.gitignore` comprehensively blocks all `.env`, `*.yml`, `*.yaml`, and `application-*.properties`.

---

## 📄 License & Ownership
Copyright © 2026 **Fazle Rabbi** & Southeast University CSE Community.  
All rights reserved. Developed for Southeast University students and faculty.
