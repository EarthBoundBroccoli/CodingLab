# CodingLab - Project Overview

## General Tech Stack
- **Frontend:** React.js (v19), Tailwind CSS (v4), DaisyUI (v5, Theme: `acid`)
- **Backend:** Node.js, Express.js (ES Modules)
- **Authentication:** Better Auth (Unified RBAC) with dynamic callback/host resolution
- **Database:** MongoDB with Mongoose (Atlas with local fallback `mongodb://127.0.0.1:27017/codinglab`)
- **Code Execution:** JDoodle API (Simplified execution)
- **Background Tasks:** Inngest
- **Media Storage:** Cloudinary

## Collaborative & Local Setup
- **Dynamic Networking:** Backend CORS and Better Auth trust origins support `localhost`, `127.0.0.1`, custom domain environment configs, and dynamic `192.168.x.x` local network IPs.
- **Asynchronous Startup:** Express starts immediately on its port even if MongoDB Atlas firewall blocks connection, returning explicit IP whitelisting warnings instead of crashing.
- **Dynamic API Routing:** Frontend dynamically resolves the backend location (`getBackendURL`) and callback domains using the browser's address bar origin.

## General Coding Conventions
- **Single Responsibility Principle (SRP):** Each file should contain exactly one component or logical unit. No "mega-files."
- **Clean Code:** Use descriptive names and maintain short, purposeful comments.
- **Modules:** Use ES Modules (`import/export`) consistently across the codebase.
- **Architecture:** Maintain a clear separation between frontend and backend logic.

## User Roles & Workflow
1. **Student (The Solver):** Solve problems, track progress via the unified Landing Page dashboard, and join contests.
2. **Problem Setter (The Creator):** Role toggle for students. Create/manage problems and analyze data.
3. **Admin (The Moderator):** Platform governance and user management via a restricted portal.

## Project Scope
CodingLab is a comprehensive web-based coding practice platform for university students, emphasizing reliability via asynchronous judging and a modern, high-contrast neo-brutalist UI.

---

### Specialized Documentation
- [Frontend Documentation](./frontend/GEMINI.md) - Design rules, UI conventions, and component structure.
- [Backend Documentation](./backend/GEMINI.md) - Architecture, routes, endpoints, and setup.
- [Admin Panel Documentation](./frontend/src/pages/admin/GEMINI.md) - Admin-specific layouts, routing, and workflows.
- [Collaboration Guide](../C:/Users/raiya/.gemini/antigravity-cli/brain/9f771ab1-d553-408a-bd92-eafce77d1eb0/collaboration_guide.md) - IP whitelisting and local/collaboration config steps.

---

### Critical Instruction: Manual Changes
- **Preserve Manual Edits:** Do NOT change or revert any design, color, size, or text modifications made manually by the coder. The coder's manual overrides always take precedence over AI defaults.
