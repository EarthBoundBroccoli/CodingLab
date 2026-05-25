# CodingLab - Project Overview

## General Tech Stack
- **Frontend:** React.js, Tailwind CSS (v4), DaisyUI (Theme: `acid`)
- **Backend:** Node.js, Express.js (ES Modules)
- **Authentication:** Better Auth (Unified RBAC)
- **Database:** MongoDB with Mongoose
- **Code Execution:** JDoodle API
- **Background Tasks:** Inngest
- **Media Storage:** Cloudinary

## General Coding Conventions
- **Single Responsibility Principle (SRP):** Each file should contain exactly one component or logical unit. No "mega-files."
- **Clean Code:** Use descriptive names and maintain short, purposeful comments.
- **Modules:** Use ES Modules (`import/export`) consistently across the codebase.
- **Architecture:** Maintain a clear separation between frontend and backend logic.

## User Roles
1. **Student (The Solver):** Solve problems, track progress, join contests.
2. **Problem Setter (The Creator):** Create/manage problems and analyze data.
3. **Admin (The Moderator):** Platform governance and user management.

## Project Scope
CodingLab is a comprehensive web-based coding practice platform for university students, emphasizing reliability via asynchronous judging and a modern, gamified user experience.

---

### Documentation Sub-folders
- [Frontend Documentation](./frontend/GEMINI.md)

---

### Implementation Note: Simplification
The project uses the **JDoodle API** for code execution to simplify the judging logic, replacing Judge0/Docker.
