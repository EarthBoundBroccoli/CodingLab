import { useState } from "react";
import { signUp, signIn } from "../lib/auth-client";
import { Eye, EyeOff } from "lucide-react";

const Auth = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            if (isLogin) {
                const { error: signInError } = await signIn.email({
                    email,
                    password,
                });
                
                if (signInError) {
                    setError(signInError.message || "Invalid Email or Password");
                    setLoading(false);
                    return;
                }
            } else {
                const { error: signUpError } = await signUp.email({
                    email,
                    password,
                    name,
                });

                if (signUpError) {
                    setError(signUpError.message || "Signup failed. Please try again.");
                    setLoading(false);
                    return;
                }
            }
            
            // Hard refresh to clear any state and land clean on home page
            window.location.href = "/";
            
        } catch (err) {
            setError("A network error occurred. Please try again.");
            setLoading(false);
        }
    };

    return (
        <div className="flex justify-center items-center min-h-[80svh] px-4">
            <div className="bg-white neo-brutal w-full max-w-md overflow-hidden">
                <div className={`${isLogin ? 'bg-black text-white' : 'bg-emerald-400 text-black'} p-6 border-b-4 border-black`}>
                    <h2 className="text-3xl font-black uppercase font-spartan tracking-tight text-center">
                        {isLogin ? "Login" : "Join Now"}
                    </h2>
                </div>

                <div className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {!isLogin && (
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-black">Full Name</label>
                                <input
                                    type="text"
                                    placeholder="Leo Messi"
                                    className="w-full p-3 border-4 border-black font-black focus:bg-emerald-400 transition-colors outline-none rounded-none"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-black">Email Address</label>
                            <input
                                type="email"
                                placeholder="GOAT@EXAMPLE.COM"
                                className="w-full p-3 border-4 border-black font-black lowercase focus:bg-emerald-400 transition-colors outline-none rounded-none"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-black">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    className="w-full p-3 border-4 border-black font-black focus:bg-emerald-400 transition-colors outline-none rounded-none pr-12"
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
                            <div className="bg-red-100 text-red-600 border-4 border-red-600 p-3 font-black text-xs uppercase italic animate-bounce">
                                {error}
                            </div>
                        )}

                        <button 
                            type="submit" 
                            className={`w-full py-4 bg-slate-900 text-white font-black uppercase text-xl border-4 border-black shadow-[4px_4px_0px_0px_black] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all ${loading ? "opacity-50 cursor-not-allowed" : "hover:bg-emerald-400 hover:text-black"}`}
                            disabled={loading}
                        >
                            {loading ? "PROCESSING..." : (isLogin ? "PROCEED →" : "REGISTER →")}
                        </button>
                    </form>

                    <div className="divider before:bg-black after:bg-black font-black uppercase text-xs my-8">OR</div>

                    <button 
                        className="w-full py-2 font-black uppercase text-sm hover:text-emerald-400 hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 active:scale-95"
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setError("");
                        }}
                    >
                        {isLogin ? "Create an Account" : "Back to Login"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Auth;
