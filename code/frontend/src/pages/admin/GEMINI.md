# Admin Panel Documentation

## Overview
This directory contains the components and pages exclusively used for the CodingLab Admin Panel. The admin panel operates on a separate layout and routing structure from the main student-facing application.

## Layout & Routing
- **Base Route:** All admin routes are prefixed with `/admin/*`.
- **Layout:** The admin section uses its own dedicated wrapper, `AdminLayout.jsx`, which includes a specific sidebar for navigation (Dashboard, Users, Problem Requests, Contests, Profile).
- **Protection:** Routes are protected by `AdminProtectedRoute.jsx`, which verifies that the authenticated user explicitly has the `admin` role. If not, they are redirected.
- **Navbar Override:** The main student `Navbar.jsx` is intentionally hidden on all `/admin/*` routes to maintain a distraction-free, focused administrative interface.

## Core Pages
1. **Admin Login (`/admin/login`):** A standalone login page. **No sign-up option exists**; admin credentials must be pre-provisioned in the database.
2. **Dashboard (`/admin/dashboard`):** High-level statistics (Total Users, Problems, Pending Requests, Active Sessions).
3. **Users (`/admin/users`):** Management interface to ban, unban, or completely remove users. Includes functionality to approve "Become a Problem Setter" requests.
4. **Problem Requests (`/admin/problem-requests`):** A moderation queue where admins can review, approve, or reject problems submitted by Setters. Includes a view modal to inspect the problem constraints without the code editor.
5. **Contests (`/admin/contests`):** Interface to create new contests, define durations, and explicitly select which problems from the database belong to the contest.
6. **Profile (`/admin/profile`):** Super Admin profile details with password change and logout capabilities.

## Data Handling (Current State)
Currently, much of the Admin UI relies on **dummy data** (e.g., sample user arrays, pending problem mockups) for structural and stylistic purposes.
- **Future Integration:** When connecting to the backend, these arrays must be replaced with API calls fetching live Mongoose documents.
- **Action Handlers:** Modals and "actions" (like banning or approving) currently simulate success via toast notifications. These must be wired to backend PUT/DELETE requests.

## Styling Guidelines
- The Admin Panel strictly adheres to the project's **Neo-Brutalism** guidelines established in the main frontend `GEMINI.md`.
- Expect heavy use of thick black borders, hard shadows, and high-contrast color coding for statuses (e.g., Red for Banned/Rejected, Green for Active/Approved).