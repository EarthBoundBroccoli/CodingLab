import { useState, useMemo } from "react";
import { 
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend
} from "recharts";
import { 
    Target, ChevronLeft, ChevronRight, 
    Code2, Flame, Award, Zap, CheckCircle2, AlertCircle
} from "lucide-react";

const Growth = () => {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Placeholder Data - Structured for easy DB integration
    const stats = {
        successRate: "72.4%",
        totalSolved: 142,
        totalAttempted: 196,
        ranking: "#1,240",
        points: 4250, 
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

    // Recent Submissions
    const allSubmissions = useMemo(() => Array.from({ length: 25 }, (_, i) => ({
        id: 5000 - i,
        name: i % 4 === 0 ? "Two Sum" : i % 4 === 1 ? "Longest Substring" : i % 4 === 2 ? "Median Array" : "Integer to Roman",
        language: i % 3 === 0 ? "C++" : i % 3 === 1 ? "Python" : "Java",
        time: `${10 + i}m ago`,
        status: i % 5 === 0 ? "REJECTED" : "ACCEPTED"
    })), []);

    const totalPages = Math.ceil(allSubmissions.length / itemsPerPage);
    const paginatedSubmissions = allSubmissions.slice(
        (currentPage - 1) * itemsPerPage, 
        (currentPage - 1) * itemsPerPage + itemsPerPage
    );

    return (
        <div className="max-w-[1400px] mx-auto py-12 px-4 lg:px-8 space-y-12">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white neo-brutal p-8 flex flex-col items-center justify-center text-center space-y-2 group hover:bg-emerald-50 transition-colors">
                    <Target size={40} className="text-emerald-500 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-4xl font-black">{stats.successRate}</span>
                    <span className="font-black uppercase text-xs tracking-[0.2em] opacity-50">Success Rate</span>
                    <p className="text-[10px] font-bold italic opacity-40">Solved / Attempted</p>
                </div>
                <div className="bg-white neo-brutal p-8 flex flex-col items-center justify-center text-center space-y-2 group hover:bg-sky-50 transition-colors">
                    <Code2 size={40} className="text-sky-500 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-4xl font-black">{stats.totalSolved}</span>
                    <span className="font-black uppercase text-xs tracking-[0.2em] opacity-50">Problems Solved</span>
                    <p className="text-[10px] font-bold italic opacity-40">Across all difficulties</p>
                </div>
                <div className="bg-white neo-brutal p-8 flex flex-col items-center justify-center text-center space-y-2 group hover:bg-amber-50 transition-colors">
                    <Award size={40} className="text-amber-500 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-4xl font-black">{stats.ranking}</span>
                    <span className="font-black uppercase text-xs tracking-[0.2em] opacity-50">Global Ranking</span>
                    <p className="text-[10px] font-bold italic opacity-40">Out of platform total</p>
                </div>
            </div>

            {/* Activity Streak - Full Width & Improved Contrast */}
            <div className="bg-amber-50 neo-brutal p-10 border-amber-400 border-[6px] shadow-[8px_8px_0px_0px_#f59e0b]">
                <div className="flex justify-between items-center mb-10 border-b-4 border-black pb-6">
                    <div className="flex items-center gap-4">
                        <div className="bg-amber-400 p-3 border-4 border-black shadow-[4px_4px_0px_0px_black]">
                            <Flame className="text-black fill-black" size={32} />
                        </div>
                        <h2 className="text-4xl font-black uppercase font-spartan text-black tracking-tight">Activity Streak</h2>
                    </div>
                    <div className="bg-black text-white px-4 py-2 font-black uppercase text-xs tracking-[0.2em] shadow-[4px_4px_0px_0px_#f59e0b]">
                        Last Submission: {stats.lastSubmission}
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div className="flex flex-col bg-slate-900 text-white border-4 border-black p-6 shadow-[6px_6px_0px_0px_black] hover:-translate-y-1 transition-all">
                        <span className="text-7xl font-black text-amber-400">{stats.currentStreak}</span>
                        <span className="text-xs font-black uppercase tracking-[0.2em] opacity-60">Days Active Streak</span>
                    </div>
                    <div className="flex flex-col bg-white border-4 border-black p-6 shadow-[6px_6px_0px_0px_black]">
                        <span className="text-7xl font-black text-black/30">{stats.maxStreak}</span>
                        <span className="text-xs font-black uppercase tracking-[0.2em] opacity-30">Personal Best</span>
                    </div>
                    <div className="flex flex-col bg-amber-400 border-4 border-black p-6 shadow-[6px_6px_0px_0px_black]">
                        <span className="text-7xl font-black text-black">{stats.daysActive}</span>
                        <span className="text-xs font-black uppercase tracking-[0.2em]">Total Submissions</span>
                    </div>
                    <div className="flex flex-col justify-center items-center bg-emerald-400 border-4 border-black p-6 shadow-[6px_6px_0px_0px_black]">
                        <span className="text-6xl font-black text-black italic">TOP</span>
                        <span className="text-xs font-black uppercase tracking-[0.2em] text-black opacity-80 text-center">Global Consistency</span>
                    </div>
                </div>
            </div>

            {/* Middle Section: Analysis & Submissions */}
            <div className="flex flex-col lg:flex-row gap-8">
                {/* Left: Visualization & Extra Details (40%) */}
                <div className="lg:w-[40%] space-y-8">
                    <div className="bg-white neo-brutal p-8 flex flex-col h-full min-h-[550px]">
                        <h2 className="text-2xl font-black uppercase font-spartan border-b-4 border-black pb-2 mb-6 text-sky-500">Solve Analysis</h2>
                        <div className="flex-1 w-full flex flex-col items-center justify-center">
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={difficultyData}
                                        innerRadius={70}
                                        outerRadius={110}
                                        paddingAngle={8}
                                        dataKey="value"
                                        stroke="black"
                                        strokeWidth={4}
                                    >
                                        {difficultyData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: 'white', border: '4px solid black', borderRadius: '0', fontWeight: 'bold' }}
                                    />
                                    <Legend 
                                        verticalAlign="bottom" 
                                        align="center"
                                        formatter={(value) => <span className="font-black uppercase text-xs ml-2 text-black">{value}</span>}
                                    />
                                </PieChart>
                            </ResponsiveContainer>

                            {/* Extra Crowded Details */}
                            <div className="w-full grid grid-cols-2 gap-4 mt-8 pt-8 border-t-4 border-black">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-slate-900 text-white border-2 border-black"><Zap size={16} /></div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black uppercase opacity-40">Points Earned</span>
                                        <span className="font-black text-sm">{stats.points}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-400 text-black border-2 border-black"><CheckCircle2 size={16} /></div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black uppercase opacity-40">Total Attempts</span>
                                        <span className="font-black text-sm">{stats.totalAttempted}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-amber-400 text-black border-2 border-black"><Award size={16} /></div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black uppercase opacity-40">Core Skills</span>
                                        <span className="font-black text-sm">Logic, DS, Algo</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-red-500 text-white border-2 border-black"><AlertCircle size={16} /></div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black uppercase opacity-40">Top Errors</span>
                                        <span className="font-black text-sm">WA, TLE</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Submissions Box (60%) */}
                <div className="lg:w-[60%]">
                    <div className="bg-white border-[6px] border-amber-400 rounded-none overflow-hidden neo-brutal h-full flex flex-col shadow-[8px_8px_0px_0px_#f59e0b]">
                        <div className="bg-amber-400 p-6 border-b-4 border-black flex justify-between items-center">
                            <h2 className="text-2xl font-black uppercase text-black font-spartan tracking-tight italic">Recent Activity</h2>
                            <Zap size={24} className="text-black fill-black" />
                        </div>
                        
                        <div className="flex-1 divide-y-4 divide-black overflow-y-auto">
                            {paginatedSubmissions.map((sub) => (
                                <div key={sub.id} className="p-4 grid grid-cols-4 items-center hover:bg-amber-50 transition-colors">
                                    <span className="font-black text-sm uppercase italic truncate">{sub.name}</span>
                                    <span className="text-center font-bold text-xs uppercase opacity-60 bg-white border-2 border-black px-2 mx-auto">{sub.language}</span>
                                    <span className="text-center text-[10px] font-black opacity-40 uppercase">{sub.time}</span>
                                    <span className={`text-right font-black text-xs uppercase ${sub.status === 'ACCEPTED' ? 'text-emerald-500' : 'text-red-500'}`}>
                                        {sub.status}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Pagination UI */}
                        <div className="p-6 border-t-4 border-black bg-slate-50 flex justify-center items-center gap-6">
                            <button 
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className={`btn btn-sm bg-white border-4 border-black rounded-none px-8 font-black uppercase hover:bg-black hover:text-white shadow-[4px_4px_0px_0px_black] active:translate-x-1 active:translate-y-1 active:shadow-none flex gap-2 ${currentPage === 1 ? 'opacity-30' : ''}`}
                            >
                                <ChevronLeft size={16} /> Prev
                            </button>
                            <div className="font-black text-xl bg-white border-4 border-black px-4 py-1">
                                {currentPage} / {totalPages}
                            </div>
                            <button 
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className={`btn btn-sm bg-white border-4 border-black rounded-none px-8 font-black uppercase hover:bg-black hover:text-white shadow-[4px_4px_0px_0px_black] active:translate-x-1 active:translate-y-1 active:shadow-none flex gap-2 ${currentPage === totalPages ? 'opacity-30' : ''}`}
                            >
                                Next <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Growth;
