# Implementation Plan: CodingLab Roadmap & Phase 1

## Objective
Define a structured, phase-by-phase implementation roadmap for the CodingLab platform. The priority is to establish a solid foundation with unified authentication (Better Auth) handling three distinct roles, followed by an iterative, page-by-page development approach. A strict adherence to clean, modular, and beginner-friendly coding standards will be maintained throughout.

## Coding Standards & Architecture
To ensure the codebase remains maintainable, readable, and easy to modify for a new developer:
1.  **Modularity First:**
    *   **UI Components:** Reusable UI elements will be extracted into a `components/ui` folder. We will utilize **DaisyUI** alongside Tailwind CSS to rapidly build clean, consistent, and accessible components.
    *   **Utility Functions:** Shared logic (API calls, data formatting) will be placed in a `utils` or `services` folder.
2.  **Clean & Readable Code:**
    *   Variables and functions will have explicit, descriptive names (e.g., `fetchStudentProfile` instead of `getDat`).
    *   **Single Responsibility Principle (SRP):** Each file should contain exactly one component or logical unit. Components like Navbars, Footers, and Pages must live in their own dedicated files.
3.  **Purposeful Commenting:**
    *   Code will be annotated with brief, clear comments explaining the *intent* behind the logic (the "why"), especially for state management and API interactions.
4.  **Consistent UI Design:**
    *   A centralized approach to styling using Tailwind CSS + DaisyUI. 
    *   **Theme:** The global theme is set to **`acid`**.

## Phased Implementation Roadmap

### Phase 1: Foundation & Unified Authentication (Immediate Next Step)
*   **Goal:** Set up the core project structure and a secure login system for all users.
*   **Tasks:**
    1.  Initialize the frontend (React + Tailwind + DaisyUI) and backend (Node/Express) applications. [x]
    2.  Set up the database connection (MongoDB). [x]
    3.  Implement **Better Auth** for secure session management. [x]
    4.  Establish Role-Based Access Control (RBAC) defining `Student`, `Problem Setter`, and `Admin` roles. [x]
    5.  Create a unified Login/Signup page that redirects users to their respective dashboards based on their role. [x]
    6.  Build adaptive base layouts (e.g., a dynamic Navbar/Sidebar that changes based on role). [x]

### Phase 2: The Student Experience (Page-by-Page)
*   **Goal:** Build the core end-user experience iteratively.
*   **Pages:**
    1.  **Landing Page:** The main entry point with problem discovery and stats. [x]
    2.  **About Us:** Information about the team and mission. [x]
    3.  Support:** Help and feedback section. [x]
    4.  **Student Dashboard:** A landing page displaying basic placeholder statistics and recent activity. [ ]
    5.  **Problem Discovery:** A page listing problems with search and filtering capabilities. [ ]
    6.  **The Workspace (Code Editor):** Integration of the Monaco Editor into a clean UI. [ ]
    7.  **Execution Engine:** Connecting the workspace to the backend and JDoodle API for code execution, displaying instant verdicts. [ ]
    8.  **Profile & Leaderboard:** Pages for gamification and tracking history. [ ]

### Phase 3: The Problem Setter Experience
*   **Goal:** Enable content creation.
*   **Pages:**
    1.  **Problem Studio:** A comprehensive form page for drafting new problems, defining test cases, and constraints. [ ]
    2.  **Setter Dashboard:** A hub to track the status of created problems (Draft, Pending, Approved) and view submission analytics. [ ]

### Phase 4: The Admin Experience
*   **Goal:** Enable platform governance.
*   **Pages:**
    1.  **Moderation Dashboard:** A queue interface to review, approve, or reject pending problems. [ ]
    2.  **User Management:** An interface to manage users and approve role-elevation requests. [ ]

### Phase 5: Refinement & Polish
*   Integration of Video Solutions (Cloudinary). [ ]
*   Implementation of the Contest System. [ ]
*   Final UI/UX polish and edge-case testing. [ ]

## Next Action
Refactor `App.jsx` to separate components and apply the `acid` theme globally.