# CodingLab

CodingLab is a React and Node.js coding-practice and contest platform.

## Repository layout

```text
CodingLab/
|-- code/                  # Application source and Node.js workspace
|   |-- backend/           # Express API
|   `-- frontend/          # React/Vite client
|-- doc/                   # Final reports, design documents and evidence
`-- README.md
```

The final submission documents should use these paths:

- `doc/srs.pdf`
- `doc/design.pdf`
- `doc/final-presentation.pdf`
- `doc/final-report.docx`
- `doc/final-report.pdf`

## Prerequisites

- Node.js 18 or newer
- npm
- MongoDB, or a configured remote MongoDB connection

## Install

From the repository root:

```bash
cd code
npm install
npm run install:all
```

Copy `code/backend/.env.example` to `code/backend/.env` and fill in the required values. If the frontend needs local environment overrides, copy `code/frontend/.env.example` to `code/frontend/.env`.

## Run

Start the backend and frontend together from `code/`:

```bash
npm start
```

The frontend URL is printed by Vite (normally `http://localhost:5173`). The backend can also be run independently with `npm run dev:backend`, and the frontend with `npm run dev:frontend`.

## Build

Build the production frontend from `code/`:

```bash
npm run build
```

The generated assets are written to `code/frontend/dist/`.

## Test

Run both backend and frontend tests from `code/`:

```bash
npm test
```

To run one suite independently:

```bash
npm run test --prefix backend
npm run test --prefix frontend
```
