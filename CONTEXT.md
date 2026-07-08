# CodingLab Project Context & Progress Document

Welcome to **CodingLab**, a comprehensive web-based coding practice and contest platform specifically tailored for university students. This document provides a quick overview, current implementation progress, technical architecture details, and development guidelines for anyone working on the codebase.

---

## 🚀 Project Overview
CodingLab is designed to be a reliable, high-performance platform for students to practice coding, participate in contests, track growth, and submit problem requests. It adopts a high-contrast **Neo-Brutalist** UI design to stand out visually, prioritizing readability and high density.

- **Objective:** Give university students a robust, asynchronous code execution platform with role-based features.
- **Roles:**
  1. **Student (The Solver):** Solve problems, join contests, view growth/analytics, and track progress.
  2. **Problem Setter (The Creator):** Create and draft problems, set constraints, upload test cases, and analyze submission stats.
  3. **Admin (The Moderator):** Oversee user roles, review problem setter submissions, manage contests, and moderate content.

---

## 🛠️ Technology Stack
### Frontend (`src/frontend`)
- **Framework:** React.js (v19)
- **Bundler:** Vite
- **Styling:** Tailwind CSS (v4) + PostCSS
- **UI Component Library:** DaisyUI (v5, active theme: `acid`)
- **Routing:** React Router DOM (v7)
- **Authentication Client:** Better Auth Client SDK
- **Data Visualizations:** Recharts (v2.15) for student performance analytics
- **Icons:** Lucide React (with custom inline SVG fallbacks for SSO to prevent Lucide resolution bugs)
- **Editor:** Monaco Editor (integrated into coding workspace)

### Backend (`src/backend`)
- **Runtime:** Node.js (v18+ / v20+)
- **Server Framework:** Express.js (configured as ES Modules)
- **Database:** MongoDB with Mongoose (local fallback: `mongodb://127.0.0.1:27017/codinglab`)
- **Authentication Engine:** Better Auth Node.js Adapter
- **Background Task Processing:** Inngest (planned for asynchronous execution)
- **Cloud Media Storage:** Cloudinary (configured for raw file uploads and video solutions)
- **Code Execution:** JDoodle API

---

## 📂 Project Structure
```text
SPL-2/
├── doc/                        # Project documentation (PDF specifications, proposals)
│   ├── SPL-2 Project Proposal .pdf
│   ├── SPL-2 features.pdf
│   └── spl2 .pdf
└── src/                        # Source Code
    ├── GEMINI.md               # Developer setup notes & conventions
    ├── plan.md                 # Implementation roadmap (Phased plan)
    ├── backend/                # Backend API Server
    │   ├── lib/                # Database connections, Auth initialization, Cloudinary settings
    │   ├── models/             # Mongoose schemas (User, Problem, SetterRequest)
    │   ├── controllers/        # Route handler functions (logic & validations)
    │   ├── routes/             # Express routes defining API endpoints
    │   ├── index.js            # Entry point for the server
    │   └── .env.example        # Environment variables template
    └── frontend/               # React Client
        ├── src/
        │   ├── main.jsx        # App entry point
        │   ├── App.jsx         # Routes, global guards, base layouts
        │   ├── index.css       # CSS entry, custom Neo-Brutalist styles
        │   ├── components/     # Reusable UI elements & layouts (Navbar, AdminLayout, protected routes)
        │   ├── lib/            # Auth client helper, custom markdown.js parser
        │   └── pages/          # Application views / dashboards
        │       ├── admin/      # Pages restricted to admin users (User mgmt, request approval)
        │       └── ...         # Public & Student pages (Auth, LandingPage, Problems, Contests, Growth)
        └── vite.config.js      # Vite compilation configuration
```

---

## 📈 Current Progress & Feature Status

### Completed Features ✅
1. **Unified Authentication (Better Auth & Simulated Admin):**
   - Implemented email/password signup and login for students.
   - Built **Google** and **GitHub SSO** integration.
   - Dynamically resolves origin address for callbacks to accommodate localhost, local IP network (e.g. `192.168.x.x`), and custom domains.
   - Role-Based Access Control (RBAC) with three roles: `student`, `problem_setter`, `admin`.
   - Simulated local auth configuration + backend bypass header (`x-admin-token`) to separate admin sessions from student cookie sessions.
2. **Dynamic Base Networking:**
   - CORS policy and auth headers allow seamless cross-origin requests.
   - Backend auto-resolving supports async DB connections (starts serving even if MongoDB Atlas is blocked by firewall).
3. **Problem Discovery:**
   - Searchable listing of approved problems fetched from MongoDB.
   - Advanced filters by difficulty, topic tags dynamically loaded from the database, and keyword search.
   - Home page features top 10 most recently approved live problems.
4. **Markdown Support:**
   - Lightweight, dependency-free Markdown parser implemented in frontend (`src/frontend/src/lib/markdown.js`).
   - Integrated live write vs preview tabbed area in Problem Studio for setters.
5. **Become Problem Setter:**
   - Form-based setter elevation request. Automatic sandbox verification logic implemented on backend for evaluation.
6. **Student Performance Analytics:**
   - **Growth Page:** Fully functional dashboard containing Recharts PieCharts/BarCharts visualizing solve statistics, activity logs, and streak calendars.
7. **Contest Hub & Archive:**
   - Live contests display, popular contests list, and historical contest archive with search/pagination.
8. **Platform Governance (Admin Workflows):**
   - Admin Dashboard stats (Total Users -> 124, Total Problems -> 48, etc.) hooked to live API `/api/admin/dashboard-summary`.
   - Moderation portal: Reviewing, approving, or rejecting new problem draft requests using dynamic status update API (`PUT /api/admin/problems/:id/status`).
   - Admin User management page: Live database view displaying platform users (`GET /api/admin/users`).
   - Review Audit Modal: Populates hidden inputs, outputs, time limits, and memory limits for administrators to inspect testcase assets.
9. **Problem Workspace View & Monaco Integration:**
   - Split-screen layout (60/40) for problem statement vs code editor workspace (`/problems/:id`).
   - Parses statement dynamically using custom markdown parser and renders sample testcases.
   - Fully interactive Monaco Editor integrated with custom theme (`codinglab-dark`), syntax switcher, and boilerplate templates (C++, Java, Python).
   - Draggable horizontal and vertical panel splits using `react-resizable-panels`.
10. **High-Fidelity Database Seeder:**
    - Seeding script `seed.js` to create 124 users (1 admin, 2 setters, 2 specific students, 119 generic), 48 approved problems, 5 pending problems (with hidden input/output file strings), and 2 pending setter requests.
11. **Backend Code Compilation Engine (JDoodle API):**
    - Created language mapping utility mapping selections to official JDoodle versions.
    - Implemented `/api/submissions/run` POST handler using `axios` to execute code scripts and custom inputs.
    - Added custom tabbed console terminal (stdin / stdout result panel) matching Neo-Brutalist parameters to display compiler outputs and runtime resource metrics.

### Work in Progress & Future Implementation ⏳
1. **Code Execution Engine:**
   - [ ] Building secure test case evaluation to output verdicts (AC, WA, TLE, MLE, RE).
2. **Background Tasks:**
   - [ ] Setup of Inngest backend queue for asynchronous judging.
3. **Video Solutions:**
   - [ ] Cloudinary media upload integration for video solutions.
4. **Admin Contest Creator:**
   - [ ] Managing upcoming contests and setting schedules.

---

## 🎨 Visual Design Guidelines (Neo-Brutalism)
To preserve the unique look-and-feel of CodingLab, follow these conventions:
- **Neo-Brutalist Card styling:** Add the utility `.neo-brutal` class:
  - 3px solid black border (`border-3 border-black`).
  - 6px black offset shadow (`shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]`).
  - Solid, vibrant background colors.
- **Vibrant Accent Colors:**
  - **Primary Accents:** Emerald-400 (used for Success status, Auth links, Active division tags).
  - **Category Indicators:** Sky-400 (for Problem lists, tags), Amber-400 (for Growth graphs, streaks).
  - **Brand Text / Headers:** Pure Black (`#000000`) and Slate-900 buttons.
- **DaisyUI Theme:** Global theme is set to **`acid`**.
- **Typography:** Brand name is `CodingLab` (Mixed case) using the **League Spartan** font. Section headers should be uppercase, bold, and high contrast.

---

## 💻 Development Commands
### Backend (`src/backend`)
- Run development server (with nodemon):
  ```bash
  npm run dev
  ```
- Run production server:
  ```bash
  npm start
  ```

### Frontend (`src/frontend`)
- Run development server (Vite):
  ```bash
  npm run dev
  ```
- Build production assets:
  ```bash
  npm run build
  ```
- Preview production builds:
  ```bash
  npm run preview
  ```

---

## ⚠️ Critical Rules for AI & Contributors
1. **Preserve Manual Customizations:** Do NOT overwrite or revert custom colors, styling, text overrides, or spacings made manually by the user. Handcrafted styling takes priority over framework defaults.
2. **Single Responsibility Principle (SRP):** Keep components modular. Separate sidebars, headers, and pages into their own files. Avoid mega-files containing multiple separate views.
3. **Robust Database Connects:** The backend server must start immediately. Ensure connection failures to MongoDB (due to firewalls, internet drops, etc.) throw helpful warning logs but do NOT crash the server instance.
4. **Environment Variables:** Never commit `.env` files to git. Use `.env.example` to document keys.
