# CodingLab - Frontend Documentation

## Frontend Tech Stack
- **Library:** React.js (v19)
- **Styling:** Tailwind CSS (v4)
- **UI Components:** DaisyUI (v5, Theme: `acid`)
- **Editor:** Monaco Editor

## Design Guidelines (Neo-Brutalism)
To maintain visual consistency, all frontend contributors must follow these UI rules:
- **Core Style:** Use the `.neo-brutal` utility class (3px black border, 6px black shadow).
- **Color Palette:**
  - **Brand:** Black (#000000) for headers and primary text.
  - **Buttons:** Slate-900 with White text.
  - **Accents:** Emerald-400 for primary highlights and success states.
  - **Categorization:** Sky-400 (Problems), Amber-400 (Growth/Stats).
- **Typography:** 
  - The "CodingLab" brand name MUST use **League Spartan** and maintain `normal-case` (Mixed case).
  - Use high-contrast, bold, and uppercase for section headers.
- **Layout:** High-density, high-contrast layouts. Prefer 60/40 splits for complex dashboards.

## Frontend Folder Structure
- `src/components`: Generic UI components (Navbar, Modal, etc.).
- `src/pages`: Full-page route components.
- `src/lib`: Configuration files (auth-client.js, hooks).
- `src/assets`: Static assets (images, global fonts).

## UI Conventions
- **SRP Enforcement:** Components like Navbars, Footers, and Pages must live in their own dedicated files.
- **Modularity:** Abstract repeated UI patterns (like problem rows or contest cards) into modular components.
- **DaisyUI usage:** Prefer using DaisyUI classes over custom CSS where possible to maintain theme consistency.
