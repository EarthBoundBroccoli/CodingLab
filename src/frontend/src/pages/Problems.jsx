import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, Filter, ChevronLeft, ChevronRight, X, Loader2, AlertCircle } from "lucide-react";
import { getBackendURL } from "../lib/auth-client";

const Problems = () => {
    // State for live problems
    const [problems, setProblems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [studentStats, setStudentStats] = useState(null);

    // State for Search and Filter Visibility
    const [searchTerm, setSearchTerm] = useState("");
    const [showFilters, setShowFilters] = useState(false);

    // State for Active Filters
    const [activeDifficulty, setActiveDifficulty] = useState(null);
    const [activeTags, setActiveTags] = useState([]); // Multiple tags
    const [sortOrder, setSortOrder] = useState(null); // 'asc' or 'desc'
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 20;

    // Fetch approved problems and student stats from backend
    useEffect(() => {
        const fetchProblems = async () => {
            try {
                setLoading(true);
                const response = await fetch(`${getBackendURL()}/api/problem`, {
                    credentials: "include"
                });
                if (response.ok) {
                    const data = await response.json();
                    // Filter to only render status: 'approved'
                    const approved = data.filter(p => p.status === "approved");
                    setProblems(approved);
                } else {
                    setError("Failed to fetch problems from database");
                }
            } catch (err) {
                console.error("Error loading problems:", err);
                setError("Failed to connect to backend server");
            } finally {
                setLoading(false);
            }
        };
        const fetchStudentStats = async () => {
            try {
                const response = await fetch(`${getBackendURL()}/api/submissions/profile-stats`, {
                    credentials: "include"
                });
                if (response.ok) {
                    const data = await response.json();
                    setStudentStats(data);
                }
            } catch (err) {
                console.error("Error fetching student stats in problems list:", err);
            }
        };
        fetchProblems();
        fetchStudentStats();
    }, []);

    // Extract tags dynamically from the live dataset
    const availableTags = useMemo(() => {
        const tagSet = new Set();
        problems.forEach(prob => {
            if (Array.isArray(prob.tags)) {
                prob.tags.forEach(tag => tagSet.add(tag));
            }
        });
        return Array.from(tagSet).sort();
    }, [problems]);

    // Reset pagination to page 1 whenever filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, activeDifficulty, activeTags, sortOrder]);

    // Filtered and Sorted Logic
    const filteredProblems = useMemo(() => {
        let result = problems.filter((prob) => {
            const matchesSearch = prob.title.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesDifficulty = !activeDifficulty || prob.difficulty.toLowerCase() === activeDifficulty.toLowerCase();
            // Must match ALL selected tags
            const matchesTags = activeTags.length === 0 || activeTags.every(tag => prob.tags.includes(tag));
            return matchesSearch && matchesDifficulty && matchesTags;
        });

        if (sortOrder === "asc") {
            result.sort((a, b) => a.title.localeCompare(b.title));
        } else if (sortOrder === "desc") {
            result.sort((a, b) => b.title.localeCompare(a.title));
        }

        return result;
    }, [searchTerm, activeDifficulty, activeTags, sortOrder, problems]);

    // Paginated list
    const paginatedProblems = useMemo(() => {
        const startIndex = (currentPage - 1) * PAGE_SIZE;
        return filteredProblems.slice(startIndex, startIndex + PAGE_SIZE);
    }, [filteredProblems, currentPage]);

    const totalPages = Math.ceil(filteredProblems.length / PAGE_SIZE) || 1;

    const toggleTag = (tag) => {
        setActiveTags(prev => 
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    const resetFilters = () => {
        setActiveDifficulty(null);
        setActiveTags([]);
        setSortOrder(null);
    };

    const renderIndex = (prob, idx) => {
        const indexText = `#${(currentPage - 1) * PAGE_SIZE + idx + 1}`;
        if (!studentStats) {
            return (
                <div className="bg-white border-r-2 border-black text-rose-200 group-hover:text-black transition-colors flex items-center justify-center text-lg font-bold w-16 shrink-0 self-stretch">
                    {indexText}
                </div>
            );
        }

        const solvedList = studentStats.solvedProblems || [];
        const attemptedList = studentStats.attemptedProblems || [];
        const latestVerdicts = studentStats.latestVerdicts || {};

        const isSolved = solvedList.some(pId => pId.toString() === prob._id.toString());
        const isAttempted = attemptedList.some(pId => pId.toString() === prob._id.toString());

        if (isSolved) {
            return (
                <div className="bg-emerald-400 border-r-2 border-black text-black font-black text-xl flex items-center justify-center w-16 shrink-0 self-stretch">
                    {indexText}
                </div>
            );
        } else if (isAttempted) {
            const lastVerdict = latestVerdicts[prob._id.toString()];
            const bgClass = lastVerdict === "Time Limit Exceeded" ? "bg-amber-400" : "bg-rose-400";
            return (
                <div className={`${bgClass} border-r-2 border-black text-black font-black text-xl flex items-center justify-center w-16 shrink-0 self-stretch`}>
                    {indexText}
                </div>
            );
        }

        return (
            <div className="bg-white border-r-2 border-black text-rose-200 group-hover:text-black transition-colors flex items-center justify-center text-lg font-bold w-16 shrink-0 self-stretch">
                {indexText}
            </div>
        );
    };

    return (
        <div className="max-w-[1400px] mx-auto py-12 px-4 lg:px-8 relative">
            {/* Search and Sort Section */}
            <div className="flex flex-col gap-2 mb-8 relative z-50">
                <div className="bg-white neo-brutal p-4 flex items-center gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search for problems..."
                            className="w-full pl-12 pr-4 py-3 border-4 border-black font-black focus:bg-slate-50 transition-colors outline-none rounded-none uppercase text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button 
                        className={`btn rounded-none border-4 border-black p-3 transition-all shadow-[4px_4px_0px_0px_black] active:translate-x-1 active:translate-y-1 active:shadow-none ${showFilters ? 'bg-black text-white hover:bg-black' : 'bg-white text-black hover:bg-emerald-400'} cursor-pointer`}
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        {showFilters ? <X size={24} /> : <Filter size={24} />}
                    </button>
                </div>

                {/* Floating Filter Box */}
                {showFilters && (
                    <div className="absolute top-full mt-4 right-0 w-full md:w-[850px] bg-white neo-brutal p-10 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                            {/* Difficulty Column */}
                            <div className="space-y-6">
                                <h4 className="font-black uppercase tracking-tighter border-b-4 border-black pb-2 text-lg">Difficulty</h4>
                                <div className="flex flex-col gap-3">
                                    {["Easy", "Medium", "Hard"].map(diff => (
                                        <button 
                                            key={diff}
                                            onClick={() => setActiveDifficulty(activeDifficulty === diff ? null : diff)}
                                            className={`text-left font-bold uppercase text-sm p-3 border-2 border-black transition-colors cursor-pointer ${activeDifficulty === diff ? 'bg-emerald-400' : 'hover:bg-slate-100'}`}
                                        >
                                            {diff}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Tags Column */}
                            <div className="space-y-6">
                                <h4 className="font-black uppercase tracking-tighter border-b-4 border-black pb-2 text-lg">Tags</h4>
                                <div className="flex flex-col gap-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                                    {availableTags.length === 0 ? (
                                        <p className="text-xs font-bold text-slate-400 uppercase italic">No tags available</p>
                                    ) : (
                                        availableTags.map(tag => (
                                            <button 
                                                key={tag}
                                                onClick={() => toggleTag(tag)}
                                                className={`text-left font-bold uppercase text-[11px] p-3 border-2 border-black transition-colors cursor-pointer ${activeTags.includes(tag) ? 'bg-emerald-400' : 'hover:bg-slate-100'}`}
                                            >
                                                {tag}
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Alphabet Column */}
                            <div className="space-y-6">
                                <h4 className="font-black uppercase tracking-tighter border-b-4 border-black pb-2 text-lg">Alphabet</h4>
                                <div className="flex flex-col gap-3">
                                    <button 
                                        onClick={() => setSortOrder(sortOrder === 'asc' ? null : 'asc')}
                                        className={`text-left font-bold uppercase text-sm p-3 border-2 border-black transition-colors cursor-pointer ${sortOrder === 'asc' ? 'bg-emerald-400' : 'hover:bg-slate-100'}`}
                                    >
                                        Sort Ascending
                                    </button>
                                    <button 
                                        onClick={() => setSortOrder(sortOrder === 'desc' ? null : 'desc')}
                                        className={`text-left font-bold uppercase text-sm p-3 border-2 border-black transition-colors cursor-pointer ${sortOrder === 'desc' ? 'bg-emerald-400' : 'hover:bg-slate-100'}`}
                                    >
                                        Sort Descending
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="mt-12 pt-6 border-t-4 border-black flex justify-between items-center">
                            <button onClick={resetFilters} className="text-sm font-black uppercase underline hover:text-red-500 transition-colors cursor-pointer">Clear All Filters</button>
                            <span className="text-xs font-black uppercase opacity-50">{filteredProblems.length} results found</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Problems List Container */}
            <div className="bg-red-50/20 border-[6px] border-red-500 rounded-none overflow-hidden neo-brutal min-h-[400px]">
                {loading ? (
                    <div className="flex items-center justify-center p-20">
                        <Loader2 className="animate-spin text-black" size={48} />
                    </div>
                ) : error ? (
                    <div className="p-8 text-center text-error font-black uppercase flex flex-col items-center justify-center gap-2">
                        <AlertCircle size={48} />
                        {error}
                    </div>
                ) : paginatedProblems.length > 0 ? (
                    <div className="divide-y-4 divide-black">
                        {paginatedProblems.map((prob, idx) => (
                            <Link key={prob._id} to={`/problems/${prob._id}`} className="flex flex-row hover:bg-sky-100 transition-colors cursor-pointer group border-b-4 border-black last:border-b-0">
                                {renderIndex(prob, idx)}
                                <div className="flex-1 flex flex-col md:flex-row">
                                    {/* Left Side: Title, Tags */}
                                    <div className="flex-1 p-6 space-y-2">
                                        <h3 className="text-2xl font-black uppercase italic group-hover:text-black transition-colors text-black">{prob.title}</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {prob.tags?.map(tag => (
                                                <span key={tag} className="px-3 py-1 border-2 border-black font-black text-xs uppercase bg-white text-black">{tag}</span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Right Side: Difficulty */}
                                    <div className="w-full md:w-64 border-t-4 md:border-t-0 md:border-l-4 border-black flex items-center justify-center p-6 bg-white/50">
                                        <span className={`text-xl font-black uppercase italic ${
                                            prob.difficulty.toLowerCase() === 'easy' ? 'text-emerald-500' : 
                                            prob.difficulty.toLowerCase() === 'medium' || prob.difficulty.toLowerCase() === 'normal' ? 'text-amber-500' : 'text-red-500'
                                        }`}>
                                            {prob.difficulty}
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center p-20 gap-4">
                        <span className="text-6xl italic grayscale opacity-20 text-slate-500">NO RESULTS</span>
                        <p className="font-black uppercase tracking-widest text-slate-400">Try changing your filters or search term</p>
                    </div>
                )}

                {/* Pagination Section */}
                {filteredProblems.length > 0 && !loading && !error && (
                    <div className="p-8 border-t-4 border-black flex justify-center gap-8 bg-white">
                        <button 
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className={`btn bg-white border-4 border-black rounded-none px-8 font-black uppercase italic transition-all shadow-[4px_4px_0px_0px_black] active:translate-x-1 active:translate-y-1 active:shadow-none flex gap-2 cursor-pointer ${currentPage === 1 ? 'opacity-50 cursor-not-allowed shadow-none translate-x-1 translate-y-1' : 'hover:bg-black hover:text-white'}`}
                        >
                            <ChevronLeft size={20} /> Previous
                        </button>
                        <button 
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className={`btn bg-white border-4 border-black rounded-none px-8 font-black uppercase italic transition-all shadow-[4px_4px_0px_0px_black] active:translate-x-1 active:translate-y-1 active:shadow-none flex gap-2 cursor-pointer ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed shadow-none translate-x-1 translate-y-1' : 'hover:bg-black hover:text-white'}`}
                        >
                            Next <ChevronRight size={20} />
                        </button>
                    </div>
                )}
            </div>

            <div className="mt-6 text-center">
                <p className="font-black uppercase italic text-sky-500 text-sm">
                    Showing Page {currentPage} of {totalPages} ({filteredProblems.length} problems total)
                </p>
            </div>
        </div>
    );
};

export default Problems;
