import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, ChevronLeft, ChevronRight, ArrowLeft, Users, Filter, X, Loader2, AlertCircle } from "lucide-react";

import { getBackendURL } from "../lib/auth-client";
import { buildContestArchive, filterContestArchive, formatArchiveDate } from "../lib/contest-archive";

const PreviousContests = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [showFilters, setShowFilters] = useState(false);
    
    // Filter States
    const [dateSort, setDateSort] = useState("newest");
    const [popularitySort, setPopularitySort] = useState(null); // 'most', 'least'
    const [alphaSort, setAlphaSort] = useState(null); // 'asc', 'desc'
    
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    const [allPrevious, setAllPrevious] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        const controller = new AbortController();
        const fetchArchive = async () => {
            try {
                const response = await fetch(`${getBackendURL()}/api/contests`, {
                    credentials: "include", signal: controller.signal
                });
                if (!response.ok) throw new Error("Unable to load the contest archive.");
                const data = await response.json();
                if (!Array.isArray(data)) throw new Error("Unable to load the contest archive.");
                if (!controller.signal.aborted) setAllPrevious(buildContestArchive(data));
            } catch (error) {
                if (!controller.signal.aborted) setError(error.message || "Unable to connect to the server.");
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        };
        fetchArchive();
        return () => controller.abort();
    }, [attempt]);

    const retry = () => {
        setLoading(true);
        setError("");
        setAttempt(value => value + 1);
    };

    const filteredContests = useMemo(() => filterContestArchive(allPrevious, {
        searchTerm, popularitySort, alphaSort, dateSort
    }), [allPrevious, searchTerm, popularitySort, alphaSort, dateSort]);

    // Pagination
    const totalPages = Math.max(1, Math.ceil(filteredContests.length / itemsPerPage));
    const page = Math.min(currentPage, totalPages);
    const paginatedContests = useMemo(() => {
        const start = (page - 1) * itemsPerPage;
        return filteredContests.slice(start, start + itemsPerPage);
    }, [filteredContests, page]);

    const resetFilters = () => {
        setDateSort("newest");
        setPopularitySort(null);
        setAlphaSort(null);
        setCurrentPage(1);
    };

    return (
        <div className="max-w-[1400px] mx-auto py-12 px-4 lg:px-8 relative">
            {/* Back Button */}
            <Link to="/contests" className="flex items-center gap-2 font-black uppercase text-sm hover:text-emerald-500 transition-colors mb-8 group">
                <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> Back to Contests
            </Link>

            <h1 className="text-5xl font-black uppercase font-spartan text-black mb-8 text-center md:text-left">Previous Contests Archive</h1>

            {/* Search and Filter Section */}
            <div className="flex flex-col gap-2 mb-12 relative z-50">
                <div className="bg-white neo-brutal p-4 flex items-center gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search by contest name or host..."
                            className="w-full pl-12 pr-4 py-3 border-4 border-black font-black focus:bg-slate-50 transition-colors outline-none rounded-none uppercase text-sm"
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        />
                    </div>
                    <button 
                        onClick={() => setShowFilters(!showFilters)}
                        className={`btn rounded-none border-4 border-black p-3 transition-all shadow-[4px_4px_0px_0px_black] active:translate-x-1 active:translate-y-1 active:shadow-none ${showFilters ? 'bg-black text-white' : 'bg-white text-black hover:bg-emerald-400'}`}
                    >
                        {showFilters ? <X size={24} /> : <Filter size={24} />}
                    </button>
                </div>

                {/* Floating Filter Box */}
                {showFilters && (
                    <div className="absolute top-full mt-4 right-0 w-full md:w-[850px] bg-white neo-brutal p-10 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                            <div className="space-y-6">
                                <h4 className="font-black uppercase tracking-tighter border-b-4 border-black pb-2 text-lg">Date</h4>
                                <div className="flex flex-col gap-3">
                                    {[['newest', 'Newest first'], ['oldest', 'Oldest first']].map(([value, label]) => (
                                        <button key={value} onClick={() => { setDateSort(value); setAlphaSort(null); setPopularitySort(null); setCurrentPage(1); }}
                                            className={`text-left font-bold uppercase text-sm p-3 border-2 border-black transition-colors ${dateSort === value && !alphaSort && !popularitySort ? 'bg-emerald-400' : 'hover:bg-slate-100'}`}>
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Popularity Column */}
                            <div className="space-y-6">
                                <h4 className="font-black uppercase tracking-tighter border-b-4 border-black pb-2 text-lg">Popularity</h4>
                                <div className="flex flex-col gap-3">
                                    <button 
                                        onClick={() => { setPopularitySort(popularitySort === 'most' ? null : 'most'); setCurrentPage(1); }}
                                        className={`text-left font-bold uppercase text-sm p-3 border-2 border-black transition-colors ${popularitySort === 'most' ? 'bg-emerald-400' : 'hover:bg-slate-100'}`}
                                    >
                                        Most Popular
                                    </button>
                                    <button 
                                        onClick={() => { setPopularitySort(popularitySort === 'least' ? null : 'least'); setCurrentPage(1); }}
                                        className={`text-left font-bold uppercase text-sm p-3 border-2 border-black transition-colors ${popularitySort === 'least' ? 'bg-emerald-400' : 'hover:bg-slate-100'}`}
                                    >
                                        Least Popular
                                    </button>
                                </div>
                            </div>

                            {/* Alphabet Column */}
                            <div className="space-y-6">
                                <h4 className="font-black uppercase tracking-tighter border-b-4 border-black pb-2 text-lg">Alphabet</h4>
                                <div className="flex flex-col gap-3">
                                    <button 
                                        onClick={() => { setAlphaSort('asc'); setPopularitySort(null); setCurrentPage(1); }}
                                        className={`text-left font-bold uppercase text-sm p-3 border-2 border-black transition-colors ${alphaSort === 'asc' && !popularitySort ? 'bg-emerald-400' : 'hover:bg-slate-100'}`}
                                    >
                                        A-Z Sort
                                    </button>
                                    <button 
                                        onClick={() => { setAlphaSort('desc'); setPopularitySort(null); setCurrentPage(1); }}
                                        className={`text-left font-bold uppercase text-sm p-3 border-2 border-black transition-colors ${alphaSort === 'desc' && !popularitySort ? 'bg-emerald-400' : 'hover:bg-slate-100'}`}
                                    >
                                        Z-A Sort
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="mt-12 pt-6 border-t-4 border-black flex justify-between items-center">
                            <button onClick={resetFilters} className="text-sm font-black uppercase underline hover:text-red-500 transition-colors">Clear All Filters</button>
                            <span className="text-xs font-black uppercase opacity-50">{filteredContests.length} results found</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Contests List */}
            <div className="bg-white border-4 border-slate-900 rounded-none overflow-hidden neo-brutal">
                {loading ? (
                    <div role="status" className="flex justify-center items-center gap-3 p-12"><Loader2 className="animate-spin" size={28} /><span className="font-bold">Loading completed contests...</span></div>
                ) : error ? (
                    <div role="alert" className="p-8 space-y-4"><p className="flex items-center gap-2"><AlertCircle size={20} />{error}</p><button type="button" onClick={retry} className="btn rounded-none bg-white border-2 border-black">Try again</button></div>
                ) : paginatedContests.length > 0 ? (
                    <div className="divide-y-4 divide-black">
                        {paginatedContests.map((contest) => (
                            <Link to={`/contests/${contest.id}`} key={contest.id} className="flex flex-col md:flex-row hover:bg-sky-100 transition-colors cursor-pointer group">
                                <div className="flex-1 p-6 flex gap-6 items-start">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-2xl font-black uppercase italic group-hover:text-black transition-colors">{contest.title}</h3>

                                        </div>
                                        <p className="font-bold text-slate-500 uppercase text-xs">Organized by: {contest.host}</p>
                                        <p className="text-xs text-slate-500 pt-2">Started <time dateTime={contest.startTime}>{formatArchiveDate(contest.startTime)}</time></p>
                                    </div>
                                </div>
                                <div className="w-full md:w-64 border-t-4 md:border-t-0 md:border-l-4 border-black flex items-center justify-center p-6 bg-slate-50">
                                    <div className="flex flex-col items-center">
                                        <div className="flex items-center gap-2">
                                            <Users size={20} className="text-emerald-500" />
                                            <span className="text-2xl font-black text-red-600">{contest.participants}</span>
                                        </div>
                                        <span className="text-[10px] font-black uppercase opacity-60">Participants</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center p-20 gap-4">
                        <p className="text-lg font-black uppercase">{allPrevious.length ? 'No matching contests' : 'No completed contests yet'}</p>
                        <p className="text-sm text-slate-500">{allPrevious.length ? 'Try a different search or clear your filters.' : 'Completed contests will appear here with their results.'}</p>
                        {allPrevious.length > 0 && <button type="button" onClick={() => { resetFilters(); setSearchTerm(''); }} className="underline font-bold">Clear search and filters</button>}
                    </div>
                )}

                {/* Pagination */}
                {!loading && !error && filteredContests.length > itemsPerPage && (
                    <div className="p-8 border-t-4 border-black flex justify-center gap-8 bg-white">
                        <button 
                            disabled={page === 1}
                            onClick={() => setCurrentPage(Math.max(1, page - 1))}
                            className={`btn bg-white border-4 border-black rounded-none px-8 font-black uppercase hover:bg-black hover:text-white transition-all shadow-[4px_4px_0px_0px_black] active:translate-x-1 active:translate-y-1 active:shadow-none flex gap-2 ${page === 1 ? 'opacity-30 cursor-not-allowed shadow-none' : ''}`}
                        >
                            <ChevronLeft size={20} /> Prev
                        </button>
                        <div className="flex items-center font-black uppercase text-xl">
                            {page} / {totalPages}
                        </div>
                        <button 
                            disabled={page === totalPages}
                            onClick={() => setCurrentPage(Math.min(totalPages, page + 1))}
                            className={`btn bg-white border-4 border-black rounded-none px-8 font-black uppercase hover:bg-black hover:text-white transition-all shadow-[4px_4px_0px_0px_black] active:translate-x-1 active:translate-y-1 active:shadow-none flex gap-2 ${page === totalPages ? 'opacity-30 cursor-not-allowed shadow-none' : ''}`}
                        >
                            Next <ChevronRight size={20} />
                        </button>
                    </div>
                )}
            </div>

            {!loading && !error && <div className="mt-6 text-center">
                <p className="font-black uppercase italic text-sky-500 text-sm">
                    Showing {paginatedContests.length} of {filteredContests.length} contests
                </p>
            </div>}
        </div>
    );
};

export default PreviousContests;
