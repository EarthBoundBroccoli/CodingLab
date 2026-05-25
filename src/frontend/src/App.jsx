import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Auth from "./pages/Auth";
import LandingPage from "./pages/LandingPage";
import About from "./pages/About";
import Support from "./pages/Support";
import Navbar from "./components/Navbar";

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-base-200 selection:bg-emerald-400 selection:text-black">
        <Navbar />
        <main>
            <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/about" element={<About />} />
                <Route path="/support" element={<Support />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
