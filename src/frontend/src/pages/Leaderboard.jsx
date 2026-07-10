import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getBackendURL } from "../lib/auth-client";
import { Trophy, ArrowRight, Loader } from "lucide-react";

const Leaderboard = () => {
    const [universities, setUniversities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        const fetchUniversities = async () => {
            setLoading(true);
            try {
                const res = await fetch(`${getBackendURL()}/api/leaderboard/universities?page=${page}&limit=10`);
                if (!res.ok) throw new Error("Failed to fetch leaderboard");
                const data = await res.json();
                setUniversities(data.universities);
                setTotalPages(data.totalPages);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchUniversities();
    }, [page]);

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-5xl">
            {/* Header section */}
            <div className="bg-emerald-400 p-8 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mb-12">
                <div className="flex items-center gap-4 mb-2">
                    <Trophy size={48} className="text-black" strokeWidth={2.5} />
                    <h1 className="text-5xl md:text-6xl font-black font-spartan tracking-tighter text-black uppercase">
                        National University Rankings
                    </h1>
                </div>
                <p className="text-xl font-bold text-black border-l-4 border-black pl-4 ml-2 mt-4">
                    See which campus dominates the algorithm arena.
                </p>
                <p className="text-sm font-bold bg-white inline-block mt-4 px-3 py-1 border-2 border-black uppercase shadow-[2px_2px_0px_0px_black]">
                    *Scores are calculated using the sum of the Top 10 highest-rated competitive programmers per university.
                </p>
            </div>

            {error && (
                <div className="bg-red-400 p-4 border-4 border-black font-bold text-black mb-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="flex justify-center p-12">
                    <Loader className="animate-spin text-black" size={48} strokeWidth={3} />
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {universities.map((uni, index) => {
                        const globalRank = (page - 1) * 10 + index + 1;
                        let bgClass = "bg-white";
                        let textClass = "text-black";
                        
                        // Top 3 specific coloring
                        if (globalRank === 1) bgClass = "bg-amber-300"; // Gold
                        else if (globalRank === 2) bgClass = "bg-slate-300"; // Silver
                        else if (globalRank === 3) bgClass = "bg-orange-300"; // Bronze

                        return (
                            <Link 
                                to={`/leaderboard/university/${uni._id}`} 
                                key={uni._id}
                                className={`flex items-center p-4 md:p-6 border-4 border-black ${bgClass} ${textClass} hover:-translate-y-1 hover:translate-x-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer group`}
                            >
                                <div className="text-3xl md:text-5xl font-black font-spartan w-16 md:w-24 shrink-0">
                                    #{globalRank}
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight line-clamp-1">
                                        {uni.name}
                                    </h2>
                                    <p className="font-bold text-lg md:text-xl opacity-80 uppercase">
                                        {uni.shortName}
                                    </p>
                                </div>
                                <div className="text-right flex flex-col items-end gap-1">
                                    <div className="text-2xl md:text-4xl font-black font-spartan">
                                        {uni.totalRating.toLocaleString()} <span className="text-sm md:text-xl">CR</span>
                                    </div>
                                    <div className="flex items-center gap-1 font-bold group-hover:text-emerald-600 transition-colors">
                                        View Campus <ArrowRight size={20} strokeWidth={3} />
                                    </div>
                                </div>
                            </Link>
                        );
                    })}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex justify-center items-center gap-4 mt-8 font-bold text-xl">
                            <button 
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-6 py-2 bg-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-black hover:text-white disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-black transition-colors"
                            >
                                Prev
                            </button>
                            <span className="bg-black text-white px-6 py-2 font-black border-4 border-black">
                                {page} / {totalPages}
                            </span>
                            <button 
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="px-6 py-2 bg-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-black hover:text-white disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-black transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Leaderboard;
