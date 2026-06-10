import { useState, useEffect } from "react";
import { signUp, signIn } from "../lib/auth-client";
import { Eye, EyeOff } from "lucide-react";

// Simple Google Icon SVG Component
const GoogleIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

// Simple GitHub Icon SVG Component to replace lucide-react Github export issue
const GithubIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.379.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
  </svg>
);

const Auth = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [isTransitioning, setIsTransitioning] = useState(false);
    
    // Form State
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [institution, setInstitution] = useState("");
    
    // UI State
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    // Smooth toggle handler
    const handleToggleMode = () => {
        setError("");
        setIsTransitioning(true);
        // Simple delay to show a loading state instead of janky transforms
        setTimeout(() => {
            setIsLogin(!isLogin);
            setIsTransitioning(false);
        }, 150);
    };

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
                    institution,
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

    const handleSocialLogin = async (provider) => {
        setLoading(true);
        try {
            await signIn.social({
                provider: provider,
                callbackURL: "http://localhost:5173/",
            });
        } catch (err) {
            setError(`Failed to connect with ${provider}.`);
            setLoading(false);
        }
    };

    return (
        <div className="flex justify-center items-center min-h-[80svh] px-4 py-12">
            <div className="bg-white neo-brutal w-full max-w-md overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                {/* Header Section */}
                <div className={`${isLogin ? 'bg-black text-white' : 'bg-emerald-400 text-black'} p-6 border-b-4 border-black transition-colors duration-300`}>
                    <h2 className="text-3xl font-black uppercase font-spartan tracking-tight text-center">
                        {isLogin ? "Login" : "Join Now"}
                    </h2>
                </div>

                <div className="p-8 relative min-h-[400px]">
                    {isTransitioning && (
                         <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                            <span className="loading loading-spinner loading-lg text-emerald-400"></span>
                         </div>
                    )}
                    <form onSubmit={handleSubmit} className={`space-y-6 transition-opacity duration-200 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
                        {!isLogin && (
                            <>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-black">Full Name</label>
                                    <input
                                        type="text"
                                        placeholder="Leo Messi"
                                        className="w-full p-3 border-4 border-black font-black focus:bg-emerald-50 transition-colors outline-none rounded-none"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-black">Institution</label>
                                    <input
                                        type="text"
                                        placeholder="University of Examples"
                                        className="w-full p-3 border-4 border-black font-black focus:bg-emerald-50 transition-colors outline-none rounded-none"
                                        value={institution}
                                        onChange={(e) => setInstitution(e.target.value)}
                                        required
                                    />
                                </div>
                            </>
                        )}

                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-black">Email Address</label>
                            <input
                                type="email"
                                placeholder="GOAT@EXAMPLE.COM"
                                className="w-full p-3 border-4 border-black font-black lowercase focus:bg-emerald-50 transition-colors outline-none rounded-none"
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

                    <div className="divider before:bg-black after:bg-black font-black uppercase text-xs my-8">OR CONTINUE WITH</div>

                    {/* Social Login Buttons */}
                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <button 
                            type="button"
                            onClick={() => handleSocialLogin('github')}
                            className="btn bg-white border-4 border-black rounded-none shadow-[2px_2px_0px_0px_black] hover:bg-black hover:text-white transition-all active:translate-x-1 active:translate-y-1 active:shadow-none"
                            disabled={loading}
                        >
                            <GithubIcon size={20} /> GitHub
                        </button>
                        <button 
                            type="button"
                            onClick={() => handleSocialLogin('google')}
                            className="btn bg-white border-4 border-black rounded-none shadow-[2px_2px_0px_0px_black] hover:bg-black hover:text-white transition-all active:translate-x-1 active:translate-y-1 active:shadow-none"
                            disabled={loading}
                        >
                            <GoogleIcon size={20} /> Google
                        </button>
                    </div>

                    <button 
                        className="w-full py-2 font-black uppercase text-sm hover:text-emerald-500 hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
                        onClick={handleToggleMode}
                    >
                        {isLogin ? "Create an Account" : "Back to Login"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Auth;