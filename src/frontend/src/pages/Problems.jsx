import { useState, useMemo } from "react";
import { Search, Filter, ChevronLeft, ChevronRight, X } from "lucide-react";

const Problems = () => {
    // State for Search and Filter Visibility
    const [searchTerm, setSearchTerm] = useState("");
    const [showFilters, setShowFilters] = useState(false);

    // State for Active Filters
    const [activeDifficulty, setActiveDifficulty] = useState(null);
    const [activeTags, setActiveTags] = useState([]); // Multiple tags
    const [sortOrder, setSortOrder] = useState(null); // 'asc' or 'desc'

    // Placeholder data for 20 problems with varied titles and tags
    const allProblems = useMemo(() => [
        { id: 1, title: "Two Sum", tags: ["Array", "Hash Table"], difficulty: "easy" },
        { id: 2, title: "Longest Substring", tags: ["String", "Sliding Window"], difficulty: "medium" },
        { id: 3, title: "Median Array", tags: ["Array", "Binary Search"], difficulty: "hard" },
        { id: 4, title: "Palindrome Number", tags: ["Math"], difficulty: "easy" },
        { id: 5, title: "Regular Expression", tags: ["String", "DP"], difficulty: "hard" },
        { id: 6, title: "Container Water", tags: ["Array", "Two Pointers"], difficulty: "medium" },
        { id: 7, title: "Integer to Roman", tags: ["Math", "String"], difficulty: "medium" },
        { id: 8, title: "Roman to Integer", tags: ["Math", "String"], difficulty: "easy" },
        { id: 9, title: "Longest Common Prefix", tags: ["String"], difficulty: "easy" },
        { id: 10, title: "3Sum", tags: ["Array", "Two Pointers"], difficulty: "medium" },
        { id: 11, title: "3Sum Closest", tags: ["Array", "Two Pointers"], difficulty: "medium" },
        { id: 12, title: "Letter Combinations", tags: ["String", "Backtracking"], difficulty: "medium" },
        { id: 13, title: "4Sum", tags: ["Array", "Two Pointers"], difficulty: "medium" },
        { id: 14, title: "Remove Nth Node", tags: ["Linked List", "Two Pointers"], difficulty: "medium" },
        { id: 15, title: "Valid Parentheses", tags: ["String", "Stack"], difficulty: "easy" },
        { id: 16, title: "Merge Two Lists", tags: ["Linked List"], difficulty: "easy" },
        { id: 17, title: "Generate Parentheses", tags: ["String", "Backtracking"], difficulty: "medium" },
        { id: 18, title: "Merge k Sorted Lists", tags: ["Linked List", "Heap"], difficulty: "hard" },
        { id: 19, title: "Swap Nodes in Pairs", tags: ["Linked List"], difficulty: "medium" },
        { id: 20, title: "Reverse Nodes in k-Group", tags: ["Linked List"], difficulty: "hard" },
    ], []);

    // Filtered and Sorted Logic
    const filteredProblems = useMemo(() => {
        let result = allProblems.filter((prob) => {
            const matchesSearch = prob.title.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesDifficulty = !activeDifficulty || prob.difficulty === activeDifficulty;
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
    }, [searchTerm, activeDifficulty, activeTags, sortOrder, allProblems]);

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
                        className={`btn rounded-none border-4 border-black p-3 transition-all shadow-[4px_4px_0px_0px_black] active:translate-x-1 active:translate-y-1 active:shadow-none ${showFilters ? 'bg-black text-white' : 'bg-white text-black hover:bg-emerald-400'}`}
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
                                    {["easy", "medium", "hard"].map(diff => (
                                        <button 
                                            key={diff}
                                            onClick={() => setActiveDifficulty(activeDifficulty === diff ? null : diff)}
                                            className={`text-left font-bold uppercase text-sm p-3 border-2 border-black transition-colors ${activeDifficulty === diff ? 'bg-emerald-400' : 'hover:bg-slate-100'}`}
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
                                    {["Array", "String", "Math", "DP", "Linked List", "Hash Table", "Binary Search", "Two Pointers"].map(tag => (
                                        <button 
                                            key={tag}
                                            onClick={() => toggleTag(tag)}
                                            className={`text-left font-bold uppercase text-[11px] p-3 border-2 border-black transition-colors ${activeTags.includes(tag) ? 'bg-emerald-400' : 'hover:bg-slate-100'}`}
                                        >
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Alphabet Column */}
                            <div className="space-y-6">
                                <h4 className="font-black uppercase tracking-tighter border-b-4 border-black pb-2 text-lg">Alphabet</h4>
                                <div className="flex flex-col gap-3">
                                    <button 
                                        onClick={() => setSortOrder(sortOrder === 'asc' ? null : 'asc')}
                                        className={`text-left font-bold uppercase text-sm p-3 border-2 border-black transition-colors ${sortOrder === 'asc' ? 'bg-emerald-400' : 'hover:bg-slate-100'}`}
                                    >
                                        Sort Ascending
                                    </button>
                                    <button 
                                        onClick={() => setSortOrder(sortOrder === 'desc' ? null : 'desc')}
                                        className={`text-left font-bold uppercase text-sm p-3 border-2 border-black transition-colors ${sortOrder === 'desc' ? 'bg-emerald-400' : 'hover:bg-slate-100'}`}
                                    >
                                        Sort Descending
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="mt-12 pt-6 border-t-4 border-black flex justify-between items-center">
                            <button onClick={resetFilters} className="text-sm font-black uppercase underline hover:text-red-500 transition-colors">Clear All Filters</button>
                            <span className="text-xs font-black uppercase opacity-50">{filteredProblems.length} results found</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Problems List Container - The Red Box */}
            <div className="bg-red-50/20 border-[6px] border-red-500 rounded-none overflow-hidden neo-brutal min-h-[400px]">
                {filteredProblems.length > 0 ? (
                    <div className="divide-y-4 divide-black">
                        {filteredProblems.map((prob) => (
                            <div key={prob.id} className="flex flex-col md:flex-row hover:bg-sky-100 transition-colors cursor-pointer group border-b-4 border-black last:border-b-0">
                                {/* Left Side: Index, Title, Tags */}
                                <div className="flex-1 p-6 flex gap-6 items-start">
                                    <span className="text-2xl font-black text-red-200 group-hover:text-black transition-colors shrink-0">#{prob.id}</span>
                                    <div className="space-y-2">
                                        <h3 className="text-2xl font-black uppercase italic group-hover:text-black transition-colors">{prob.title}</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {prob.tags.map(tag => (
                                                <span key={tag} className="px-3 py-1 border-2 border-black font-black text-xs uppercase bg-white">{tag}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side: Difficulty */}
                                <div className="w-full md:w-64 border-t-4 md:border-t-0 md:border-l-4 border-black flex items-center justify-center p-6 bg-white/50">
                                    <span className={`text-xl font-black uppercase italic ${
                                        prob.difficulty === 'easy' ? 'text-emerald-500' : 
                                        prob.difficulty === 'medium' ? 'text-amber-500' : 'text-red-500'
                                    }`}>
                                        {prob.difficulty}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center p-20 gap-4">
                        <span className="text-6xl italic grayscale opacity-20">NO RESULTS</span>
                        <p className="font-black uppercase tracking-widest text-slate-400">Try changing your filters or search term</p>
                    </div>
                )}

                {/* Pagination Section */}
                {filteredProblems.length > 0 && (
                    <div className="p-8 border-t-4 border-black flex justify-center gap-8 bg-white">
                        <button className="btn bg-white border-4 border-black rounded-none px-8 font-black uppercase italic hover:bg-black hover:text-white transition-all shadow-[4px_4px_0px_0px_black] active:translate-x-1 active:translate-y-1 active:shadow-none flex gap-2">
                            <ChevronLeft size={20} /> Previous
                        </button>
                        <button className="btn bg-white border-4 border-black rounded-none px-8 font-black uppercase italic hover:bg-black hover:text-white transition-all shadow-[4px_4px_0px_0px_black] active:translate-x-1 active:translate-y-1 active:shadow-none flex gap-2">
                            Next <ChevronRight size={20} />
                        </button>
                    </div>
                )}
            </div>

            <div className="mt-6 text-center">
                <p className="font-black uppercase italic text-sky-500 text-sm">
                    {filteredProblems.length} problems shown in this page
                </p>
            </div>
        </div>
    );
};

export default Problems;
