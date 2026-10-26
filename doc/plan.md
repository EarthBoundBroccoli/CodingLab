# CodingLab - Project Briefing & Improvement Plan

## Executive Summary

**CodingLab** is a comprehensive web-based coding practice platform designed for university students. It provides an environment for solving algorithmic problems, participating in contests, and tracking growth. The platform follows a neo-brutalist UI design philosophy with high-contrast elements and bold typography.

---

## Architecture Overview

```
CodingLab/
├── src/
│   ├── backend/          # Node.js/Express API server
│   │   ├── index.js      # Main server entry point
│   │   ├── lib/          # Authentication (Better Auth)
│   │   └── models/       # Mongoose data models
│   ├── frontend/         # React SPA (Vite)
│   │   ├── src/
│   │   │   ├── components/   # Reusable UI components
│   │   │   ├── pages/        # Route-based page components
│   │   │   ├── lib/          # Auth clients, utilities
│   │   │   └── App.jsx       # Main router
│   │   └── public/       # Static assets
│   └── doc/              # Documentation
├── package.json          # Root package (Gemini CLI devDep)
└── README.md
```

### System Flow

```
┌─────────────────┐     HTTP/REST     ┌─────────────────┐     Mongoose     ┌─────────────────┐
│                 │ ◄──────────────► │                 │ ◄──────────────► │                 │
│    Frontend     │                   │    Backend      │                   │    MongoDB      │
│  (React+Vite)   │                   │  (Express API)  │                   │    (Atlas)      │
│  Port: 5173     │                   │  Port: 5000     │                   │                 │
└─────────────────┘                   └─────────────────┘                   └─────────────────┘
                                              │
                                              │ External APIs
                                              ▼
                                    ┌─────────────────┐
                                    │   JDoodle API   │
                                    │ (Code Execution)│
                                    └─────────────────┘
```

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2.6 | UI framework |
| Vite | 8.0.12 | Build tool & dev server |
| Tailwind CSS | 4.3.0 | Utility-first styling |
| DaisyUI | 5.5.19 | Component library |
| React Router | 7.15.1 | Client-side routing |
| Recharts | 2.15.0 | Data visualization |
| Lucide React | 1.17.0 | Icon library |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18+ | Runtime |
| Express | 5.2.1 | Web framework |
| Mongoose | 9.6.2 | MongoDB ODM |
| Better Auth | 1.6.11 | Authentication |
| MongoDB | 7.2.0 | Database driver |
| Nodemon | 3.1.14 | Dev auto-reload |

### External Services
- **JDoodle API**: Code execution engine
- **MongoDB Atlas**: Cloud database
- **GitHub OAuth**: Social login
- **Google OAuth**: Social login

---

## User Roles & Features

### 1. Student (Default Role)
- Browse and solve coding problems
- Track progress and growth statistics
- Join contests
- Apply to become a Problem Setter

### 2. Problem Setter
- Create and manage coding problems
- Define test cases (visible & hidden)
- Track problem submission analytics

### 3. Admin
- Platform governance and moderation
- User management (ban/unban/remove)
- Problem approval workflow
- Contest management

---

## Current Implementation Status

### Completed Features
- [x] Authentication system (Better Auth)
- [x] Role-based access control (Student/Problem Setter/Admin)
- [x] Landing page with stats
- [x] About & Support pages
- [x] Problem Setter application form
- [x] Problem creation form (AddProblem)
- [x] Admin dashboard
- [x] Admin user management
- [x] Admin problem requests
- [x] Admin contests (UI)

### In Progress
- [ ] Student dashboard with real data
- [ ] Code editor integration (Monaco)
- [ ] Code execution engine (JDoodle)
- [ ] Contest system backend
- [ ] Profile & leaderboard

---

## Critical Issues & Security Concerns

### SECURITY VULNERABILITIES

#### 1. Exposed Credentials (CRITICAL)
**Location**: `src/backend/.env`

```env
# These credentials are committed to git:
# Example credentials (DO NOT PUT REAL SECRETS HERE):
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/codinglab
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

**Impact**: Database access, OAuth impersonation, account takeover
**Fix**: Rotate all credentials immediately, add `.env` to `.gitignore`

#### 2. Hardcoded Admin Credentials (CRITICAL)
**Location**: `src/frontend/src/lib/admin-auth.js`

```javascript
export const ADMIN_EMAIL = "admin@example.com";
export const ADMIN_PASSWORD = "admin123";
```

**Impact**: Anyone can become admin by viewing source code
**Fix**: Implement proper admin authentication via backend

#### 3. Client-side Admin Auth (HIGH)
**Location**: `src/frontend/src/lib/admin-auth.js`

Admin authentication uses `localStorage` flag without server validation:
```javascript
export const isAdminAuthenticated = () => {
  return localStorage.getItem(ADMIN_AUTH_KEY) === "true";
};
```

**Impact**: Bypass admin protection by setting localStorage
**Fix**: Server-side admin session validation

#### 4. Hardcoded Backend URLs (MEDIUM)
**Location**: Multiple frontend files

```javascript
// auth-client.js
baseURL: "http://localhost:5000"

// Auth.jsx
callbackURL: "http://localhost:5173/"

// BecomeSetter.jsx
fetch("http://localhost:5000/api/setter/status", ...
```

**Fix**: Use environment variables

---

## Architecture Improvements

### 1. Backend Restructuring

**Current**: All routes in single `index.js` file
**Proposed**: Modular route structure

```
src/backend/
├── index.js              # Server setup only
├── routes/
│   ├── auth.routes.js    # Authentication endpoints
│   ├── problem.routes.js # Problem CRUD
│   ├── setter.routes.js  # Setter applications
│   └── admin.routes.js   # Admin operations
├── middleware/
│   ├── auth.js          # Session validation
│   └── rbac.js          # Role-based access
├── controllers/
│   ├── auth.controller.js
│   ├── problem.controller.js
│   └── admin.controller.js
├── models/
│   └── *.js             # Existing models
└── lib/
    └── auth.js          # Better Auth config
```

### 2. Frontend Restructuring

**Current**: Flat page structure
**Proposed**: Feature-based organization

```
src/frontend/src/
├── features/
│   ├── auth/
│   │   ├── components/   # Auth forms
│   │   └── hooks/       # useAuth, useSession
│   ├── problems/
│   │   ├── components/   # ProblemList, ProblemCard
│   │   ├── pages/        # Problems, AddProblem
│   │   └── hooks/       # useProblems
│   ├── contests/
│   └── admin/
├── shared/
│   ├── components/       # Navbar, Button, Modal
│   ├── hooks/           # Generic hooks
│   └── utils/           # API client, formatters
├── pages/               # Route-level pages
└── lib/
    └── api.js           # Centralized API client
```

### 3. State Management

**Current**: Local state + prop drilling
**Proposed**: React Context or Zustand

```javascript
// stores/authStore.js
import { create } from 'zustand'

export const useAuthStore = create((set) => ({
  user: null,
  session: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
}))
```

### 4. API Client Abstraction

**Current**: Direct `fetch()` calls with hardcoded URLs
**Proposed**: Centralized API service

```javascript
// lib/api.js
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000"

const api = {
  async request(endpoint, options = {}) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      credentials: "include",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    })
    if (!response.ok) throw new Error(`API Error: ${response.status}`)
    return response.json()
  },
  
  get: (url) => api.request(url),
  post: (url, data) => api.request(url, { method: "POST", body: JSON.stringify(data) }),
}

export default api
```

---

## Feature Improvements

### Phase 1: Core Functionality

#### 1. Code Editor Integration
- Integrate Monaco Editor (VS Code editor)
- Add syntax highlighting for multiple languages
- Implement auto-save and code snippets

#### 2. Code Execution Engine
- Connect to JDoodle API
- Implement async execution queue
- Add compilation error handling
- Support multiple languages (C++, Python, Java, JavaScript)

#### 3. Real Data Integration
- Replace hardcoded placeholder data
- Implement proper pagination
- Add search/filter functionality

### Phase 2: Enhanced Features

#### 1. Contest System
- Real-time contest timer
- Submission locking during contests
- Rank calculation and leaderboard

#### 2. Profile System
- User profile pages
- Submission history
- Problem solve statistics
- Badge/achievement system

#### 3. Problem Categories
- Tag-based filtering
- Difficulty progression
- Recommended problems

### Phase 3: Advanced Features

#### 1. Video Solutions
- Cloudinary integration
- Video upload and streaming
- Problem-solution linking

#### 2. Notification System
- Contest announcements
- Problem approval status
- Achievement notifications

#### 3. Analytics Dashboard
- Admin platform analytics
- User engagement metrics
- Problem difficulty analysis

---

## UI/UX Improvements

### 1. Responsive Design
- Mobile-first approach
- Touch-friendly interactions
- Adaptive layouts

### 2. Accessibility
- ARIA labels
- Keyboard navigation
- Color contrast compliance

### 3. Performance
- Code splitting
- Lazy loading
- Image optimization

### 4. Error Handling
- Global error boundaries
- User-friendly error messages
- Retry mechanisms

---

## Development Workflow

### Code Quality
1. **ESLint**: Already configured
2. **Prettier**: Add for consistent formatting
3. **Husky**: Pre-commit hooks
4. **TypeScript**: Consider migration

### Testing
1. **Unit Tests**: Jest + React Testing Library
2. **Integration Tests**: Cypress
3. **API Tests**: Supertest

### Documentation
1. **API Docs**: Swagger/OpenAPI
2. **Component Docs**: Storybook
3. **User Guide**: Markdown docs

---

## Environment Configuration

### Required Environment Variables

```env
# Backend (.env)
MONGODB_URI=mongodb+srv://...
PORT=5000
BETTER_AUTH_SECRET=your-secret-key
BETTER_AUTH_URL=http://localhost:5000
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
JDOODLE_CLIENT_ID=...
JDOODLE_CLIENT_SECRET=...

# Frontend (.env)
VITE_API_URL=http://localhost:5000
```

---

## Summary of Recommendations

### Immediate Actions (Week 1)
1. **CRITICAL**: Rotate all exposed credentials
2. **CRITICAL**: Fix admin authentication
3. Add environment variable configuration
4. Update `.gitignore` to exclude `.env` files

### Short-term (Month 1)
1. Restructure backend routes
2. Implement centralized API client
3. Add proper error handling
4. Replace placeholder data with real API calls

### Medium-term (Month 2-3)
1. Integrate code editor
2. Implement code execution
3. Build contest system
4. Add profile features

### Long-term (Month 4+)
1. Video solutions
2. Analytics dashboard
3. Mobile app consideration
4. Performance optimization

---

*Document generated: July 2026*
*Last updated: July 21, 2026*
