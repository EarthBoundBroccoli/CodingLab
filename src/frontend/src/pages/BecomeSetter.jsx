import { useState, useEffect } from "react";
import { useSession, authClient, getBackendURL } from "../lib/auth-client";
import { CheckCircle, Clock, AlertCircle, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";

const BecomeSetter = () => {
    const { data: session } = useSession();
    const navigate = useNavigate();
    
    // Form state
    const [formData, setFormData] = useState({
        institute: "",
        deptProgram: "",
        currSemester: "",
        cgpa: "",
        profileLinks: "",
        motivation: ""
    });

    // Submission status: null, 'pending', 'rejected', 'accepted'
    const [submissionStatus, setSubmissionStatus] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    // Fetch status from backend on mount
    useEffect(() => {
        const fetchStatus = async () => {
            if (!session?.user?.id) return;
            try {
                const response = await fetch(`${getBackendURL()}/api/setter/status`, {
                    credentials: "include"
                });
                if (response.ok) {
                    const data = await response.json();
                    setSubmissionStatus(data.status);
                    if (data.request) {
                        setFormData({
                            institute: data.request.institute || "",
                            deptProgram: data.request.deptProgram || "",
                            currSemester: data.request.currSemester || "",
                            cgpa: data.request.cgpa || "",
                            profileLinks: data.request.profileLinks || "",
                            motivation: data.request.motivation || ""
                        });
                    }
                }
            } catch (err) {
                console.error("Error fetching setter status:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStatus();
    }, [session]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError("");
        
        try {
            const response = await fetch(`${getBackendURL()}/api/setter/apply`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                setSubmissionStatus(data.status);
                // Refresh Better Auth session on frontend so roles are updated
                await authClient.getSession();
                // Optionally reload to ensure navbar updates
                window.location.reload();
            } else {
                setError(data.message || "Something went wrong.");
            }
        } catch (err) {
            console.error("Error submitting application:", err);
            setError("Failed to connect to backend server.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-base-200">
                <span className="loading loading-ring loading-lg text-black"></span>
            </div>
        );
    }

    // If user is already a problem setter, redirect or show message
    if (session?.user?.role === 'problem_setter' || submissionStatus === 'accepted') {
        return (
            <div className="max-w-2xl mx-auto py-20 px-4 text-center space-y-6">
                <div className="bg-emerald-400 border-4 border-black p-10 neo-brutal inline-block">
                    <CheckCircle size={80} className="mx-auto mb-4" />
                    <h1 className="text-4xl font-black uppercase font-spartan tracking-tight">Welcome aboard!</h1>
                    <p className="text-xl font-bold mt-4 uppercase italic">You are now a Problem Setter.</p>
                </div>
                <div>
                    <button 
                        onClick={() => navigate("/add-problem")}
                        className="btn bg-slate-900 text-white rounded-none border-4 border-black font-black uppercase px-10 neo-brutal hover:bg-emerald-400 hover:text-black cursor-pointer"
                    >
                        Go to Add Problems
                    </button>
                </div>
            </div>
        );
    }

    // Pending Status View
    if (submissionStatus === 'pending') {
        return (
            <div className="max-w-2xl mx-auto py-20 px-4 text-center space-y-6">
                <div className="bg-sky-400 border-4 border-black p-10 neo-brutal inline-block">
                    <Clock size={80} className="mx-auto mb-4 animate-pulse" />
                    <h1 className="text-3xl font-black uppercase font-spartan tracking-tight">Application Under Review</h1>
                    <p className="text-lg font-bold mt-4 uppercase italic">Our admins are currently checking your credentials. We'll get back to you soon!</p>
                </div>
            </div>
        );
    }

    // Rejected Status View
    if (submissionStatus === 'rejected') {
        return (
            <div className="max-w-2xl mx-auto py-20 px-4 text-center space-y-6">
                <div className="bg-error border-4 border-black p-10 neo-brutal inline-block">
                    <AlertCircle size={80} className="mx-auto mb-4" />
                    <h1 className="text-3xl font-black uppercase font-spartan tracking-tight">Application Rejected</h1>
                    <p className="text-lg font-bold mt-4 uppercase italic">Unfortunately, your application was not approved at this time. (No resubmission available yet)</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-[1400px] mx-auto py-12 px-4 lg:px-8">
            <div className="bg-white border-4 border-black neo-brutal overflow-hidden">
                {/* Header */}
                <div className="bg-black text-white p-6 border-b-4 border-black text-center">
                    <h1 className="text-3xl lg:text-5xl font-black uppercase font-spartan tracking-tight italic">
                        Become a Problem Setter Today!!!!!!
                    </h1>
                </div>

                <div className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Institute */}
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-black flex items-center gap-1">
                                    Institute <span className="text-error">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="institute"
                                    placeholder="e.g. University of Coding"
                                    className="w-full p-3 border-4 border-black font-black focus:bg-emerald-50 transition-colors outline-none rounded-none"
                                    value={formData.institute}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            {/* Dept & Program */}
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-black flex items-center gap-1">
                                    Dept & Program <span className="text-error">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="deptProgram"
                                    placeholder="e.g. CSE - B.Sc."
                                    className="w-full p-3 border-4 border-black font-black focus:bg-emerald-50 transition-colors outline-none rounded-none"
                                    value={formData.deptProgram}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            {/* Current Semester */}
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-black flex items-center gap-1">
                                    Current Semester <span className="text-error">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="currSemester"
                                    placeholder="e.g. 4th Year, 1st Sem"
                                    className="w-full p-3 border-4 border-black font-black focus:bg-emerald-50 transition-colors outline-none rounded-none"
                                    value={formData.currSemester}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            {/* CGPA */}
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-black flex items-center gap-1">
                                    CGPA <span className="text-error">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="cgpa"
                                    placeholder="e.g. 3.85"
                                    className="w-full p-3 border-4 border-black font-black focus:bg-emerald-50 transition-colors outline-none rounded-none"
                                    value={formData.cgpa}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        {/* Profile Links */}
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-black flex items-center gap-1">
                                External Profiles (CF, LeetCode, Vjudge, GitHub etc) <span className="text-error">*</span>
                            </label>
                            <input
                                type="text"
                                name="profileLinks"
                                placeholder="Handles or Profile URLs"
                                className="w-full p-3 border-4 border-black font-black focus:bg-emerald-50 transition-colors outline-none rounded-none"
                                value={formData.profileLinks}
                                onChange={handleChange}
                                required
                            />
                            <p className="text-[11px] font-black opacity-50 uppercase">Provide links or handles to showcase your competitive programming background.</p>
                        </div>

                        {/* Motivation (Friendly Text Field) */}
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-black flex items-center gap-1">
                                Tell us about your interest or experience in problem setting <span className="text-error">*</span>
                            </label>
                            <textarea
                                name="motivation"
                                rows="4"
                                placeholder="Share your vision or any previous experience in creating problems..."
                                className="w-full p-3 border-4 border-black font-black focus:bg-emerald-50 transition-colors outline-none rounded-none resize-none"
                                value={formData.motivation}
                                onChange={handleChange}
                                required
                            ></textarea>
                            <p className="text-[11px] font-black opacity-50 uppercase italic">We'd love to know what motivates you to contribute to our community!</p>
                        </div>

                        {error && (
                            <div className="bg-error border-4 border-black p-4 text-black font-black uppercase text-sm flex items-center gap-2">
                                <AlertCircle size={20} />
                                {error}
                            </div>
                        )}

                        {/* Submit Button */}
                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`w-full py-4 bg-slate-900 text-white font-black uppercase text-2xl border-4 border-black shadow-[6px_6px_0px_0px_black] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-3 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-emerald-400 hover:text-black'}`}
                            >
                                {isSubmitting ? (
                                    <span className="loading loading-spinner"></span>
                                ) : (
                                    <><Send size={24} /> Submit Application</>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Hint Footer */}
            <div className="mt-8 bg-error text-black p-4 border-4 border-black italic text-[12px] font-black uppercase text-center">
                Note: You can only submit once. Admins will review your application and update your role accordingly.
            </div>
        </div>
    );
};

export default BecomeSetter;
