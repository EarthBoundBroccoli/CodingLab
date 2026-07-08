# CodingLab - Frontend Documentation

## Frontend Tech Stack
- **Library:** React.js (v19)
- **Styling:** Tailwind CSS (v4)
- **UI Components:** DaisyUI (v5, Theme: `acid`)
- **Visualizations:** Recharts (v2.15.0 - Used for performance analytics)
- **Icons:** Lucide React
- **Editor:** Monaco Editor

## Design Guidelines (Neo-Brutalism)
To maintain visual consistency, all frontend contributors must follow these UI rules:
- **Core Style:** Use the `.neo-brutal` utility class (3px black border, 6px black shadow).
- **Color Palette:**
  - **Brand:** Black (#000000) for headers and primary text.
  - **Buttons:** Slate-900 with White text.
  - **Accents:** Emerald-400 for primary highlights (Auth, success states, division tags).
  - **Categorization:** Sky-400 (Problems), Amber-400 (Growth/Stats).
- **Typography:** 
  - The "CodingLab" brand name MUST use **League Spartan** and maintain `normal-case` (Mixed case).
  - Use high-contrast, bold, and uppercase for section headers.
- **Layout:** High-density, high-contrast layouts. Prefer 60/40 splits for complex dashboards.

## Core Pages & Components
- **Landing Page (`/`):** Unified entry point. Fetches and slices the top 10 most recently approved live problems from the database for the "Featured Problems" section.
- **Problems (`/problems`):** Full list of approved coding challenges fetched from MongoDB with search, dynamic tag extraction/filtering, difficulty filtering, and active client-side pagination.
- **Problem Workspace (`/problems/:id`):** Split-screen editor environment (60/40 statement vs code IDE). Renders problem statements using the custom markdown parser, lists input/output formats, maps public samples, and contains language drop-downs and execution controls.
- **Contests (`/contests`):** Hub for popular top 3 and currently running contests.
- **Archive (`/contests/previous`):** Paginated historical contest database.
- **Growth (`/growth`):** Performance dashboard with solve analysis charts and activity streaks.
- **Auth (`/auth`):** Unified login/signup with role-based redirection, **Google/GitHub SSO**, and custom SVG icons (to avoid `lucide-react` export bugs). Includes an 'Institution' field for registration.
- **Inbox (`/inbox`):** User notification list showing color-coded Neo-Brutalist cards containing elevation request rejections with reason notes.
- **Admin Panel (`/admin/*`):** Restricted portal for administrators containing a live dashboard summary stats grid, user list management page (`/admin/users`), problem request moderation queue (`/admin/problem-requests`), and setter approval queue (`/admin/setter-approvals`). Includes review modals with hidden testcase asset auditing capabilities.

## UI Logic & Conventions
- **Unified Dashboard:** The Student Dashboard is integrated into the Landing Page. Navigation labels dynamically change from "Explore" to "Home" after login.
- **Admin Layout:** The Admin Panel uses a completely separate layout (`AdminLayout.jsx`) and hides the standard student Navbar to provide a distraction-free administrative experience.
- **Access Control:** All interactive lists (Problems/Contests) on the Landing Page must redirect to `/auth` for guests. Admin routes are strictly protected by `AdminProtectedRoute.jsx`.
- **Filtering UI:** Standardized floating filter menu used in Problems and Archives. Support for multi-select tags and complex sorting (Alphabetical, Popularity, Division).
- **Pagination:** Standard limit of **20 items per page** for all lists (except Growth activity table, which uses 10).
- **SRP Enforcement:** Components like Navbars, Footers, and Pages must live in their own dedicated files.
- **Modularity:** Abstract repeated UI patterns into modular components in `src/components`.
- **Markdown Rendering:** Problem statements support basic Markdown syntax (headers, bold, italic, lists, variables, code blocks) parsed via the custom utility [markdown.js](file:///D:/Code%20folder/SPL-2/src/frontend/src/lib/markdown.js). The creation form includes a dual-tabbed input box (Write vs. Preview) to inspect rendered results.

## Project Progress (Technical)
- [x] **Authentication:** Fully functional Better Auth setup with MongoDB Atlas, including **Google & GitHub SSO**.
- [x] **Redirection:** Role-based logic and protected route guards implemented. Social callbacks use dynamic callback URLs (resolved via `window.location.origin`) to support local/collaboration environments.
- [x] **Dynamic Base URLs:** Frontend dynamically resolves the backend location (`getBackendURL()`) to avoid hardcoded ports and support local networking.
- [x] **Markdown Support:** Lightweight, dependency-free Markdown parser implemented in [markdown.js](file:///D:/Code%20folder/SPL-2/src/frontend/src/lib/markdown.js) to render statements. Built dual-tabbed Write/Preview editor in [AddProblem.jsx](file:///D:/Code%20folder/SPL-2/src/frontend/src/pages/AddProblem.jsx).
- [x] **Problem Discovery:** Searchable and filterable problems list.
- [x] **Contest Hub:** Multi-tiered contest views (Popular, Running, Archive).
- [x] **Analytics:** Growth page with PieCharts and Activity Lists.
- [x] **Code Workspace & Editor:** Fully functional dynamic workspace page featuring split-screen markdown parsing and a custom-themed Monaco Editor with multi-language boilerplate configuration.

## Critical Instruction: Manual Changes
- **Preserve Manual Edits:** Do NOT change or revert any colors, sizes, or text modifications made by the coder unless explicitly asked. If a design element has been manually customized, prioritize the new version over previous defaults.
- **Partial Rewrites:** When updating a file, keep as much of the existing code as possible. Only modify the sections necessary for the current task.
