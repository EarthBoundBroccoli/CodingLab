import { useState } from "react";
import { signIn } from "../lib/auth-client";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";

const AdminLogin = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            await signIn.email({
                email,
                password,
                callbackURL: "/admin/dashboard"
            });
        } catch (err) {
            setError(err.message || "Invalid Admin Credentials");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex justify-center items-center min-h-[80svh] px-4">
            <div className="bg-white neo-brutal w-full max-w-md overflow-hidden">
                <div className="bg-slate-900 text-white p-6 border-b-4 border-black flex flex-col items-center gap-2">
                    <ShieldCheck size={40} className="text-emerald-400" />
                    <h2 className="text-3xl font-black uppercase font-spartan tracking-tight text-center">
                        Admin Portal
                    </h2>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Restricted Access Only</p>
                </div>

                <div className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-black">Admin ID / Email</label>
                            <input
                                type="email"
                                placeholder="ADMIN@CODINGLAB.COM"
                                className="w-full p-3 border-4 border-black font-black focus:bg-emerald-50 transition-colors outline-none rounded-none"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-black">Master Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    className="w-full p-3 border-4 border-black font-black focus:bg-emerald-50 transition-colors outline-none rounded-none pr-12"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-black hover:text-emerald-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-error text-black border-2 border-black p-3 font-black text-xs uppercase italic">
                                {error}
                            </div>
                        )}

                        <button 
                            type="submit" 
                            className={`w-full py-4 bg-emerald-400 text-black font-black uppercase text-xl border-4 border-black shadow-[4px_4px_0px_0px_black] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all ${loading ? "opacity-50 cursor-not-allowed" : "hover:bg-black hover:text-white"}`}
                            disabled={loading}
                        >
                            {loading ? "AUTHENTICATING..." : "VERIFY & ENTER →"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AdminLogin;
