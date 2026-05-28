import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { isAdminAuthenticated, loginAdmin } from "../lib/admin-auth";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    const success = loginAdmin(email, password);

    if (success) {
      navigate("/admin/dashboard", { replace: true });
      return;
    }

    setError("Invalid credentials");
  };

  if (isAdminAuthenticated()) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return (
    <div className="flex justify-center items-center min-h-[80svh] px-4">
      <div className="bg-white neo-brutal w-full max-w-md overflow-hidden">
        <div className="bg-black text-white p-6 border-b-4 border-black">
          <h2 className="text-3xl font-black uppercase font-spartan tracking-tight text-center">
            Admin Login
          </h2>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-black">
                Email Address
              </label>
              <input
                type="email"
                placeholder="admin@example.com"
                className="w-full p-3 border-4 border-black font-black lowercase focus:bg-emerald-400 transition-colors outline-none rounded-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-black">
                Password
              </label>
              <input
                type="password"
                placeholder="admin123"
                className="w-full p-3 border-4 border-black font-black focus:bg-emerald-400 transition-colors outline-none rounded-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="bg-error text-black border-2 border-black p-3 font-black text-xs uppercase italic">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-4 bg-slate-900 text-white font-black uppercase text-xl border-4 border-black shadow-[4px_4px_0px_0px_black] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all hover:bg-emerald-400 hover:text-black"
            >
              Proceed
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
