# CodingLab - Backend Documentation

## Backend Tech Stack & Architecture
- **Runtime:** Node.js (v18+)
- **Server:** Express.js (ES Modules syntax)
- **Database:** MongoDB with Mongoose
- **Authentication:** Better Auth (Node integration adapter)
- **Pattern:** Route-Controller-Model architecture for clean separation of concerns

---

## Directory Structure
- **[index.js](file:///D:/Code%20folder/SPL-2/src/backend/index.js):** Entry point. Sets up Express, CORS policies, global middleware, Better Auth splat routes, database connections, and mounts modular routes.
- **[routes/](file:///D:/Code%20folder/SPL-2/src/backend/routes):** Defines endpoints and maps them to controllers.
  - [setterRoutes.js](file:///D:/Code%20folder/SPL-2/src/backend/routes/setterRoutes.js): Routes for setter registration and status checking.
  - [problemRoutes.js](file:///D:/Code%20folder/SPL-2/src/backend/routes/problemRoutes.js): Routes for problem management.
- **[controllers/](file:///D:/Code%20folder/SPL-2/src/backend/controllers):** Express route handlers containing business and validation logic.
  - [setterController.js](file:///D:/Code%20folder/SPL-2/src/backend/controllers/setterController.js): Handles registration requests and status updates.
  - [problemController.js](file:///D:/Code%20folder/SPL-2/src/backend/controllers/problemController.js): Handles creating coding problems.
- **[models/](file:///D:/Code%20folder/SPL-2/src/backend/models):** Mongoose database schemas.
  - `User.js`: Schema for users and roles.
  - `SetterRequest.js`: Schema tracking problem setter applications.
  - `Problem.js`: Schema for coding challenges, test cases, and constraints.
- **[lib/](file:///D:/Code%20folder/SPL-2/src/backend/lib):** Core integrations.
  - [auth.js](file:///D:/Code%20folder/SPL-2/src/backend/lib/auth.js): Better Auth adapter configuration.
  - [cloudinary.js](file:///D:/Code%20folder/SPL-2/src/backend/lib/cloudinary.js): Configures Cloudinary and exports `uploadTextFile` for uploading raw text testcases.

---

## API Endpoints

### 🔑 Authentication (Better Auth)
- `ALL /api/auth/*` - Intercepted and handled by the Better Auth node adapter.

### 📝 Problem Setter Applications
- `GET /api/setter/status` - Checks status of current user's elevation request.
- `POST /api/setter/apply` - Submits an elevation application (creates a pending SetterRequest document).

### 💻 Problem Management
- `POST /api/problem/add` - Adds a new coding problem (requires `problem_setter` role).
- `GET /api/problem` (also mounted at `GET /api/problems`) - Fetches all coding problems in the database (newest first).
- `GET /api/problem/:id` - Fetches the details of a single coding problem by its document ID.

### 🛡️ Admin Panel & Governance
- `GET /api/admin/setter-requests` - Returns all pending setter applications.
- `PUT /api/admin/setter-requests/:id/decide` - Approves or rejects a setter request (approved turns the student into a `problem_setter`).
- `GET /api/admin/users` - Fetches all users registered on the platform.
- `GET /api/admin/dashboard-summary` - Returns counts (totalUsers, totalProblems, pendingProblems), recent problem requests (last 5 pending), and top contributors (based on approved problems).
- `PUT /api/admin/problems/:id/status` - Moderates a problem request, setting its status to `'approved'` or `'rejected'`.

### 🔔 Notifications
- `GET /api/notifications` - Fetches all notifications for the logged-in student (sorted newest first).
- `PATCH /api/notifications/read-all` - Marks all unread notifications as read.

---

## Configuration & Local Setup
1. Copy [backend/.env.example](file:///D:/Code%20folder/SPL-2/src/backend/.env.example) to `.env`.
2. Configure your environment keys (Atlas URI, GITHUB/GOOGLE keys, and secrets).
3. **Database Fallback:** If `MONGODB_URI` is not configured, the app defaults to `mongodb://127.0.0.1:27017/codinglab` (requires local MongoDB server running).
4. **IP Whitelisting:** If connecting to MongoDB Atlas, ensure your IP is whitelisted in Atlas Network Access.

---

## Development Commands
In `src/backend`:
- **Start Production Server:** `npm start` (runs `node index.js`)
- **Start Development Server:** `npm run dev` (runs `nodemon index.js` with hot-reload)
