import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Trophy, Users, Calendar, ArrowRight } from "lucide-react";

const Contests = () => {
    // Placeholder data for active/upcoming contests with divisions
    const activeContests = [
        { id: 1, title: "CodingLab Round #102 (Div. 2)", host: "Admin", endsAt: "May 28, 2026", participants: 1240, division: "Div. 2" },
        { id: 2, title: "Educational Round #15", host: "ProblemSetter_X", endsAt: "June 02, 2026", participants: 850, division: "Div. 2" },
        { id: 3, title: "Algorithm Masters 2026", host: "CodingClub", endsAt: "June 10, 2026", participants: 2100, division: "Div. 1" },
        { id: 4, title: "Data Structures Sprint", host: "Professor_Oak", endsAt: "June 15, 2026", participants: 450, division: "Div. 3" },
        { id: 5, title: "Python Speedrun", host: "SnakeCharmer", endsAt: "June 18, 2026", participants: 300 },
        { id: 6, title: "Div 3 Beginners Round", host: "Admin", endsAt: "June 20, 2026", participants: 1500, division: "Div. 3" },
    ];

    // Placeholder data for previous contests
    const previousContests = [
        { id: 101, title: "Spring Coding Cup 2026", host: "Admin", participants: 4500 },
        { id: 102, title: "Winter Invitational", host: "TechCorp", participants: 3200 },
        { id: 103, title: "Beginner Blitz #1", host: "StudentUnion", participants: 2800 },
        { id: 104, title: "Logic Leap #5", host: "Admin", participants: 1900 },
        { id: 105, title: "Functional Fun Round", host: "LambdaLab", participants: 1500 },
    ];

    // Logic: Sort activeContests by participants (descending) to find popular ones
    const sortedByPopularity = useMemo(() => {
        return [...activeContests].sort((a, b) => b.participants - a.participants);
    }, []);

    const popularTop3 = sortedByPopularity.slice(0, 3);
    
    // Logic: Remaining contests that aren't in the top 3
    const moreContests = useMemo(() => {
        const top3Ids = popularTop3.map(c => c.id);
        return activeContests.filter(c => !top3Ids.includes(c.id));
    }, [popularTop3]);

    return (
        <div className="max-w-[1400px] mx-auto py-12 px-4 lg:px-8">
            {/* Header */}
            <div className="mb-12">
                <h1 className="text-5xl font-black uppercase font-spartan text-black">Contests</h1>
                <p className="font-bold italic text-slate-500 mt-2">Join a battle and prove your skills.</p>
            </div>

            {/* Popular Contests (Top 3 Sorted by Participants) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                {[0, 1, 2].map((idx) => {
                    const contest = popularTop3[idx];
                    if (!contest) return (
                        <div key={idx} className="bg-slate-50 border-4 border-dashed border-slate-300 p-8 flex flex-col items-center justify-center text-center opacity-50 grayscale">
                            <Calendar size={40} className="text-slate-300 mb-4" />
                            <p className="font-black uppercase text-xs tracking-widest text-slate-400">No more popular contests</p>
                        </div>
                    );
                    
                    return (
                        <div key={contest.id} className="bg-white neo-brutal border-emerald-400 border-[6px] p-6 space-y-4 hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all cursor-pointer group shadow-[4px_4px_0px_0px_#10b981]">
                            <div className="flex justify-between items-start">
                                <div className="flex flex-col gap-2">
                                    <span className="bg-black text-white text-[10px] font-black px-2 py-1 uppercase w-fit">Popular #{idx + 1}</span>
                                    {contest.division && (
                                        <span className="badge border-2 border-black font-black bg-emerald-400 text-xs px-4 h-8 uppercase shadow-[2px_2px_0px_0px_black]">{contest.division}</span>
                                    )}
                                </div>
                                <Trophy className="text-emerald-500 group-hover:scale-125 transition-transform" />
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-2xl font-black uppercase italic leading-tight group-hover:text-emerald-600">{contest.title}</h2>
                                <p className="font-bold text-slate-500 uppercase text-xs tracking-widest">By {contest.host}</p>
                            </div>
                            <div className="pt-4 border-t-2 border-slate-100 flex justify-between items-center font-black uppercase text-[10px]">
                                <div className="flex items-center gap-2">
                                    <Users size={18} className="text-emerald-500" />
                                    <span className="text-xl text-red-600">{contest.participants} Joined</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar size={18} className="text-emerald-500" />
                                    <span className="text-[14px]">Ends: {contest.endsAt}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
                {/* Active Contests List (60%) */}
                <div className="lg:col-span-6 space-y-6">
                    <div className="bg-white neo-brutal border-black border-4 overflow-hidden min-h-[300px]">
                        <div className="bg-emerald-400 p-4 border-b-4 border-black">
                            <h2 className="text-2xl font-black uppercase text-black font-spartan">Currently Running</h2>
                        </div>
                        {moreContests.length > 0 ? (
                            <div className="divide-y-4 divide-black">
                                {moreContests.map(contest => (
                                    <div key={contest.id} className="p-6 flex flex-col md:flex-row justify-between items-center hover:bg-emerald-50 transition-colors cursor-pointer group">
                                        <div className="space-y-2 flex-1">
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-xl font-black uppercase italic group-hover:text-emerald-600">{contest.title}</h3>
                                                {contest.division && (
                                                    <span className="badge border-2 border-black font-black bg-white text-[10px] uppercase h-5 px-2">{contest.division}</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <p className="font-bold text-slate-500 uppercase text-xs">Host: {contest.host}</p>
                                                <div className="flex items-center gap-2 font-black text-[10px] uppercase text-red-600">
                                                    <Users size={18} className="text-emerald-500"  />
                                                    <span  className="text-[14px] text-red-600">{contest.participants} Participants</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-4 md:mt-0 bg-black text-white px-4 py-2 font-black uppercase text-xs shadow-[4px_4px_0px_0px_#10b981]">
                                            Ends: {contest.endsAt}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-12 flex flex-col items-center justify-center text-center">
                                <span className="text-4xl font-black opacity-20 uppercase italic grayscale mb-4">No other contests</span>
                                <p className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">More coming soon</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Previous Contests Preview (40%) */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white neo-brutal border-black border-4 overflow-hidden">
                        <div className="bg-slate-900 p-4 border-b-4 border-black">
                            <h2 className="text-2xl font-black uppercase text-white font-spartan">Previous Contests</h2>
                        </div>
                        <div className="p-6 space-y-6 bg-slate-50">
                            <p className="font-black uppercase italic text-xs text-slate-500">Try some popular previous contests:</p>
                            <div className="space-y-4">
                                {previousContests.map(contest => (
                                    <div key={contest.id} className="bg-white border-2 border-black p-4 flex justify-between items-center hover:bg-emerald-400 transition-all cursor-pointer group shadow-[4px_4px_0px_0px_black] active:translate-x-1 active:translate-y-1 active:shadow-none">
                                        <div className="space-y-1">
                                            <h4 className="font-black uppercase text-sm group-hover:text-black">{contest.title}</h4>
                                            <p className="text-[14px] font-bold opacity-60">PARTICIPANTS: {contest.participants}</p>
                                        </div>
                                        <ArrowRight size={16} />
                                    </div>
                                ))}
                            </div>
                            <Link 
                                to="/contests/previous" 
                                className="btn w-full bg-slate-900 text-white border-4 border-black rounded-none font-black uppercase hover:bg-emerald-400 hover:text-black mt-4"
                            >
                                See all previous contests
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Contests;
