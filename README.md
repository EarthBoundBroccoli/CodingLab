# CodingLab

## Run the project

### Prerequisites

- Node.js installed (recommended version 18+)
- npm available from the terminal

### Backend

1. Open a terminal and go to the backend folder:

   ```bash
   cd src/backend
   ```

2. Install backend dependencies:

   ```bash
   npm install
   ```

3. Start the backend server in development mode:

   ```bash
   npm run dev
   ```

4. Or start the backend server normally:

   ```bash
   npm start
   ```

### Frontend

1. Open a second terminal and go to the frontend folder:

   ```bash
   cd src/frontend
   ```

2. Install frontend dependencies:

   ```bash
   npm install
   ```

3. Start the frontend development server:

   ```bash
   npm run dev
   ```

4. Open the app in a browser at the URL shown by Vite, usually:

   ```text
   http://localhost:5173/
   ```

### Notes

- Run backend and frontend in separate terminals.
- The backend script uses `nodemon` for `npm run dev`.
- If the backend uses environment variables, create a `.env` file in `src/backend` as needed.
