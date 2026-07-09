import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { getBackendURL } from "../lib/auth-client";
import { 
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend
} from "recharts";
import { 
    Target, ChevronLeft, ChevronRight, 
    Code2, Flame, Award, Zap, CheckCircle2, AlertCircle, TrendingUp
} from "lucide-react";

const Growth = () => {
    const navigate = useNavigate();
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const [userStats, setUserStats] = useState({
        successRate: 0,
        totalAttempted: 0,
        totalSolved: 0,
        contestRating: 0,
        ratingTier: "",
        points: 0,
        ratingHistory: []
    });
    const [loading, setLoading] = useState(true);
    const [recentSubmissions, setRecentSubmissions] = useState([]);
    const [dailyChallenge, setDailyChallenge] = useState(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Fetch stats, recent submissions, and daily challenge in parallel
                const [statsRes, recentRes, dailyRes] = await Promise.all([
                    axios.get(`${getBackendURL()}/api/submissions/user-stats`, { withCredentials: true }),
                    axios.get(`${getBackendURL()}/api/submissions/recent`, { withCredentials: true }),
                    axios.get(`${getBackendURL()}/api/problems/daily`)
                ]);

                setUserStats({
                    successRate: statsRes.data.successRate || 0,
                    totalAttempted: statsRes.data.totalAttempted || 0,
                    totalSolved: statsRes.data.totalSolved || 0,
                    contestRating: statsRes.data.contestRating || 0,
                    ratingTier: statsRes.data.ratingTier || "NOVICE",
                    points: statsRes.data.points || 0,
                    ratingHistory: statsRes.data.ratingHistory || []
                });

                // Format backend submissions to match frontend UI exactly
                const formattedSubmissions = recentRes.data.map(sub => {
                    const diffMins = Math.floor((new Date() - new Date(sub.createdAt)) / 60000);
                    let timeStr = `${diffMins}m ago`;
                    if (diffMins >= 60 * 24) timeStr = `${Math.floor(diffMins / (60 * 24))}d ago`;
                    else if (diffMins >= 60) timeStr = `${Math.floor(diffMins / 60)}h ago`;
                    else if (diffMins < 1) timeStr = "Just now";

                    return {
                        id: sub._id,
                        problemId: sub.problemId?._id,
                        name: sub.problemId?.title || "Unknown Problem",
                        language: sub.language === "cpp" ? "C++" : sub.language === "python" ? "Python" : "Java",
                        time: timeStr,
                        status: sub.verdict === "Accepted" ? "ACCEPTED" : "REJECTED"
                    };
                });
                setRecentSubmissions(formattedSubmissions);
                setDailyChallenge(dailyRes.data);
            } catch (error) {
                console.error("Failed to fetch user stats", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    // Placeholder Data - Structured for easy DB integration
    const stats = {
        successRate: loading ? "..." : userStats.successRate + "%",
        totalSolved: loading ? "..." : userStats.totalSolved,
        totalAttempted: loading ? "..." : userStats.totalAttempted,
        contestRating: loading ? "..." : userStats.contestRating,
        ratingTier: loading ? "..." : userStats.ratingTier,
        points: loading ? "..." : userStats.points,
        ratingHistory: userStats.ratingHistory,
        ranking: "#1,240",
        currentStreak: 12,
        maxStreak: 25,
        daysActive: 48,
        lastSubmission: "May 26, 2026",
    };

    // Difficulty breakdown
    const difficultyData = [
        { name: "Easy", value: 82, color: "#10b981" },   // Emerald-500
        { name: "Normal", value: 38, color: "#f59e0b" }, // Amber-500
        { name: "Hard", value: 22, color: "#ef4444" }    // Red-500
    ];

    // Recent Submissions Pagination
    const totalPages = Math.ceil(recentSubmissions.length / itemsPerPage);
    const paginatedSubmissions = recentSubmissions.slice(
        (currentPage - 1) * itemsPerPage, 
        (currentPage - 1) * itemsPerPage + itemsPerPage
    );

    return (
        <div className="max-w-[1400px] mx-auto py-12 px-4 lg:px-8 space-y-12">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="bg-white neo-brutal p-8 flex flex-col items-center justify-center text-center space-y-2 group hover:bg-emerald-50 transition-colors relative">
                    <Target size={40} className="text-emerald-500 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-4xl font-black">{stats.successRate}</span>
                    <span className="font-black uppercase text-xs tracking-[0.2em] opacity-50">Success Rate</span>
                    <p className="text-[10px] font-bold italic opacity-40">Solved / Attempted</p>

                    {/* Hover Tooltip */}
                    <div className="hidden group-hover:block absolute top-[105%] left-1/2 -translate-x-1/2 w-64 bg-[#F7F4EB] border-4 border-black p-4 z-10 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] text-left cursor-default">
                        <h4 className="font-black text-sm uppercase mb-3 border-b-2 border-black pb-1 text-black">Accuracy Breakdown</h4>
                        
                        <div className="mb-4">
                            <div className="flex justify-between text-xs font-bold mb-1 text-black">
                                <span>Total Submissions</span>
                                <span>{stats.totalSolved} / {stats.totalAttempted}</span>
                            </div>
                            <div className="h-3 w-full bg-red-500 border-2 border-black flex">
                                <div 
                                    className="h-full bg-emerald-500 border-r-2 border-black" 
                                    style={{ width: `${(stats.totalSolved / stats.totalAttempted) * 100}%` }}
                                ></div>
                            </div>
                        </div>

                        <div className="space-y-2 text-xs font-bold">
                            <div className="flex justify-between items-center">
                                <span className="text-emerald-600">Easy</span>
                                <span className="text-black">82%</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-amber-600">Normal</span>
                                <span className="text-black">65%</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-red-600">Hard</span>
                                <span className="text-black">45%</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Practice XP Card */}
                <div className="bg-white neo-brutal p-8 flex flex-col items-center justify-center text-center space-y-2 group hover:bg-amber-50 transition-colors relative">
                    <Zap size={40} className="text-amber-500 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-4xl font-black">{stats.points}</span>
                    <span className="font-black uppercase text-xs tracking-[0.2em] opacity-50">Practice XP</span>
                    <p className="text-[10px] font-bold italic opacity-40">Lifetime Earned</p>
                </div>

                {/* Contest Rating Card */}
                <div className="bg-white neo-brutal p-8 flex flex-col items-center justify-center text-center space-y-2 group hover:bg-sky-50 transition-colors relative">
                    <TrendingUp size={40} className="text-sky-500 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-4xl font-black">{stats.contestRating}</span>
                    <div className={`text-black px-3 py-1 font-black uppercase text-xs border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${stats.ratingTier === 'EXPERT' ? 'bg-[#FFC700]' : 'bg-slate-200'}`}>
                        {stats.ratingTier}
                    </div>
                    <span className="font-black uppercase text-xs tracking-[0.2em] opacity-50">Contest Rating</span>

                    {/* Hover Tooltip */}
                    <div className="hidden group-hover:block absolute top-[105%] left-1/2 -translate-x-1/2 w-72 bg-[#F7F4EB] border-4 border-black p-4 z-10 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] text-left cursor-default">
                        <h4 className="font-black text-sm uppercase mb-3 border-b-2 border-black pb-1 text-black">Rating Details</h4>
                        
                        <div className="mb-4 text-xs font-bold space-y-1">
                            <div className="flex justify-between text-black">
                                <span className="opacity-70">Current</span>
                                <span>{stats.contestRating}</span>
                            </div>
                        </div>

                        <div className="mb-4">
                            <div className="flex justify-between text-xs font-bold mb-1 text-black">
                                <span>Next Target (1600)</span>
                                <span>{Math.max(0, 1600 - (Number(stats.contestRating) || 0))} pts to go</span>
                            </div>
                            <div className="h-3 w-full bg-slate-200 border-2 border-black flex">
                                <div 
                                    className="h-full bg-sky-500 border-r-2 border-black" 
                                    style={{ width: `${((Number(stats.contestRating) || 0) / 1600) * 100}%` }}
                                ></div>
                            </div>
                        </div>

                        <div>
                            <h5 className="font-black text-[10px] uppercase mb-2 text-black opacity-70">Recent Contests</h5>
                            <div className="space-y-1 text-xs font-bold">
                                {stats.ratingHistory && stats.ratingHistory.length > 0 ? (
                                    stats.ratingHistory.map((history, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-black">
                                            <span>{history.contestName}</span>
                                            <span className={history.ratingChange.startsWith('+') ? "text-emerald-600" : "text-red-600"}>
                                                {history.ratingChange}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-black opacity-50">No contests yet</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                <button 
                    onClick={() => alert('Redirecting to Campus Leaderboard...')}
                    className="bg-white neo-brutal border-[3px] border-black p-8 flex flex-col items-center justify-center text-center space-y-2 group hover:bg-amber-50 transition-all cursor-pointer shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] w-full"
                >
                    <Award size={40} className="text-amber-500 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-4xl font-black text-black">#12</span>
                    <span className="font-black uppercase text-xs tracking-[0.2em] opacity-50 text-black">Campus Rank</span>
                    <div className="text-xl font-black uppercase text-black mt-2 bg-amber-200 border-2 border-black px-4 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        Rank in IUT
                    </div>
                </button>
            </div>

            {/* Daily Challenge - Full Width */}
            {dailyChallenge && (
            <div className="bg-[#f0fdf4] p-10 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] neo-brutal">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b-4 border-black pb-6 gap-4 md:gap-0">
                    <div className="flex items-center gap-4">
                        <div className="bg-emerald-400 p-3 border-4 border-black shadow-[4px_4px_0px_0px_black]">
                            <Code2 className="text-black" size={32} />
                        </div>
                        <h2 className="text-4xl font-black uppercase font-spartan text-black tracking-tight">Daily Challenge</h2>
                    </div>
                    <div className={`text-black px-4 py-2 font-black uppercase text-xs tracking-[0.2em] border-2 border-black shadow-[4px_4px_0px_0px_black] ${dailyChallenge.difficulty === 'Easy' ? 'bg-emerald-400' : dailyChallenge.difficulty === 'Medium' ? 'bg-amber-400' : 'bg-red-400'}`}>
                        {dailyChallenge.difficulty || 'MEDIUM'}
                    </div>
                </div>
                
                {/* Body Split */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                    {/* Left: Problem Info */}
                    <div className="space-y-4">
                        <h3 className="text-3xl font-black text-black leading-tight">
                            {dailyChallenge.title}
                        </h3>
                        <div className="flex flex-wrap gap-3">
                            {dailyChallenge.tags && dailyChallenge.tags.map((tag, idx) => (
                                <span key={idx} className="bg-white border-2 border-black text-black px-3 py-1 font-bold text-xs uppercase shadow-[2px_2px_0px_0px_black]">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                    
                    {/* Right: CTA */}
                    <div className="flex lg:justify-end">
                        <button 
                            onClick={() => navigate(`/problems/${dailyChallenge._id}`)}
                            className="bg-black text-white px-8 py-6 font-black uppercase tracking-[0.1em] text-xl border-4 border-black shadow-[6px_6px_0px_0px_#10b981] hover:shadow-[8px_8px_0px_0px_#10b981] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all w-full lg:w-auto text-center cursor-pointer group"
                        >
                            START SOLVING <span className="inline-block group-hover:translate-x-2 transition-transform">→</span>
                        </button>
                    </div>
                </div>
            </div>
            )}

            {/* Recent Submissions - Full Width */}
            <div className="w-full">
                <div className="bg-white border-[6px] border-amber-400 rounded-none overflow-hidden neo-brutal flex flex-col shadow-[8px_8px_0px_0px_#f59e0b]">
                    <div className="bg-amber-400 p-6 border-b-4 border-black flex justify-between items-center">
                        <h2 className="text-2xl font-black uppercase text-black font-spartan tracking-tight italic">Recent Activity</h2>
                        <Zap size={24} className="text-black fill-black" />
                    </div>
                    
                    <div className="flex-1 divide-y-4 divide-black">
                        {paginatedSubmissions.map((sub) => (
                            <div 
                                key={sub.id} 
                                onClick={() => sub.problemId && navigate(`/problems/${sub.problemId}`)}
                                className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center hover:bg-amber-50 transition-colors gap-4 md:gap-0 cursor-pointer group"
                            >
                                <div className="w-full md:w-[40%] flex items-center">
                                    <span className="font-black text-lg uppercase italic truncate text-black group-hover:underline">{sub.name}</span>
                                </div>
                                <div className="w-full md:w-[20%] flex justify-start md:justify-center">
                                    <span className="font-bold text-sm uppercase text-black bg-white border-2 border-black px-4 py-1 shadow-[2px_2px_0px_0px_black]">{sub.language}</span>
                                </div>
                                <div className="w-full md:w-[20%] flex justify-start md:justify-center">
                                    <span className="text-sm font-black opacity-60 uppercase text-black">{sub.time}</span>
                                </div>
                                <div className="w-full md:w-[20%] flex justify-start md:justify-end">
                                    <span className={`font-black text-base uppercase ${sub.status === 'ACCEPTED' ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {sub.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination UI */}
                    <div className="p-6 border-t-4 border-black bg-slate-50 flex justify-center items-center gap-6">
                        <button 
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className={`btn btn-sm bg-white border-4 border-black rounded-none px-8 font-black uppercase text-black hover:bg-black hover:text-white shadow-[4px_4px_0px_0px_black] active:translate-x-1 active:translate-y-1 active:shadow-none flex gap-2 ${currentPage === 1 ? 'opacity-30' : ''}`}
                        >
                            <ChevronLeft size={16} /> Prev
                        </button>
                        <div className="font-black text-xl text-black bg-white border-4 border-black px-4 py-1">
                            {currentPage} / {totalPages}
                        </div>
                        <button 
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className={`btn btn-sm bg-white border-4 border-black rounded-none px-8 font-black uppercase text-black hover:bg-black hover:text-white shadow-[4px_4px_0px_0px_black] active:translate-x-1 active:translate-y-1 active:shadow-none flex gap-2 ${currentPage === totalPages ? 'opacity-30' : ''}`}
                        >
                            Next <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Growth;
