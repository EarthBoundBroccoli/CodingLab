import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, ChevronLeft, ChevronRight, ArrowLeft, Users, Filter, X } from "lucide-react";

const PreviousContests = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [showFilters, setShowFilters] = useState(false);
    
    // Filter States
    const [activeDivision, setActiveDivision] = useState(null);
    const [popularitySort, setPopularitySort] = useState(null); // 'most', 'least'
    const [alphaSort, setAlphaSort] = useState("asc"); // 'asc', 'desc'
    
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    // Placeholder data for 35+ previous contests
    const allPrevious = useMemo(() => Array.from({ length: 35 }, (_, i) => ({
        id: 200 + i,
        title: `Contest Archive #${35 - i} - ${i % 2 === 0 ? 'Spring' : 'Winter'} Edition`,
        host: i % 3 === 0 ? "Admin" : i % 3 === 1 ? "ProblemSetter_X" : "CodingClub",
        participants: Math.floor(Math.random() * 5000) + 500,
        division: i % 3 === 0 ? "Div. 1" : i % 3 === 1 ? "Div. 2" : "Div. 3",
    })), []);

    // Filtered and Sorted Logic
    const filteredContests = useMemo(() => {
        let result = allPrevious.filter((c) => {
            const matchesSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                 c.host.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesDiv = !activeDivision || c.division === activeDivision;
            return matchesSearch && matchesDiv;
        });

        // Alphabetical Sort
        if (alphaSort === "asc") {
            result.sort((a, b) => a.title.localeCompare(b.title));
        } else if (alphaSort === "desc") {
            result.sort((a, b) => b.title.localeCompare(a.title));
        }

        // Popularity Override
        if (popularitySort === "most") {
            result.sort((a, b) => b.participants - a.participants);
        } else if (popularitySort === "least") {
            result.sort((a, b) => a.participants - b.participants);
        }

        return result;
    }, [searchTerm, alphaSort, popularitySort, activeDivision, allPrevious]);

    // Pagination
    const totalPages = Math.ceil(filteredContests.length / itemsPerPage);
    const paginatedContests = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredContests.slice(start, start + itemsPerPage);
    }, [filteredContests, currentPage]);

    const resetFilters = () => {
        setActiveDivision(null);
        setPopularitySort(null);
        setAlphaSort("asc");
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
                            {/* Divisions Column */}
                            <div className="space-y-6">
                                <h4 className="font-black uppercase tracking-tighter border-b-4 border-black pb-2 text-lg">Divisions</h4>
                                <div className="flex flex-col gap-3">
                                    {["Div. 1", "Div. 2", "Div. 3"].map(div => (
                                        <button 
                                            key={div}
                                            onClick={() => { setActiveDivision(activeDivision === div ? null : div); setCurrentPage(1); }}
                                            className={`text-left font-bold uppercase text-sm p-3 border-2 border-black transition-colors ${activeDivision === div ? 'bg-emerald-400' : 'hover:bg-slate-100'}`}
                                        >
                                            {div}
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
                {paginatedContests.length > 0 ? (
                    <div className="divide-y-4 divide-black">
                        {paginatedContests.map((contest) => (
                            <div key={contest.id} className="flex flex-col md:flex-row hover:bg-sky-100 transition-colors cursor-pointer group">
                                <div className="flex-1 p-6 flex gap-6 items-start">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-2xl font-black uppercase italic group-hover:text-black transition-colors">{contest.title}</h3>
                                            <span className="badge border-2 border-black font-black bg-emerald-400 text-xs px-4 h-8 uppercase shadow-[2px_2px_0px_0px_black]">{contest.division}</span>
                                        </div>
                                        <p className="font-bold text-slate-500 uppercase text-xs">Organized by: {contest.host}</p>
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
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center p-20 gap-4">
                        <span className="text-6xl italic grayscale opacity-20 uppercase">No Archive Found</span>
                    </div>
                )}

                {/* Pagination */}
                {filteredContests.length > itemsPerPage && (
                    <div className="p-8 border-t-4 border-black flex justify-center gap-8 bg-white">
                        <button 
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => prev - 1)}
                            className={`btn bg-white border-4 border-black rounded-none px-8 font-black uppercase hover:bg-black hover:text-white transition-all shadow-[4px_4px_0px_0px_black] active:translate-x-1 active:translate-y-1 active:shadow-none flex gap-2 ${currentPage === 1 ? 'opacity-30 cursor-not-allowed shadow-none' : ''}`}
                        >
                            <ChevronLeft size={20} /> Prev
                        </button>
                        <div className="flex items-center font-black uppercase text-xl">
                            {currentPage} / {totalPages}
                        </div>
                        <button 
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(prev => prev + 1)}
                            className={`btn bg-white border-4 border-black rounded-none px-8 font-black uppercase hover:bg-black hover:text-white transition-all shadow-[4px_4px_0px_0px_black] active:translate-x-1 active:translate-y-1 active:shadow-none flex gap-2 ${currentPage === totalPages ? 'opacity-30 cursor-not-allowed shadow-none' : ''}`}
                        >
                            Next <ChevronRight size={20} />
                        </button>
                    </div>
                )}
            </div>

            <div className="mt-6 text-center">
                <p className="font-black uppercase italic text-sky-500 text-sm">
                    Showing {paginatedContests.length} of {filteredContests.length} contests
                </p>
            </div>
        </div>
    );
};

export default PreviousContests;
