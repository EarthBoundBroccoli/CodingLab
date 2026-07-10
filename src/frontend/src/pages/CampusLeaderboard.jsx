import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useSession, getBackendURL } from "../lib/auth-client";
import { ArrowLeft, MapPin, Loader, User } from "lucide-react";

const CampusLeaderboard = () => {
    const { universityId } = useParams();
    const { data: session } = useSession();
    const [university, setUniversity] = useState(null);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        const fetchCampusData = async () => {
            setLoading(true);
            try {
                const res = await fetch(`${getBackendURL()}/api/leaderboard/university/${universityId}?page=${page}&limit=20`);
                if (!res.ok) throw new Error("Failed to fetch campus leaderboard");
                const data = await res.json();
                setUniversity(data.university);
                setStudents(data.students);
                setTotalPages(data.totalPages);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchCampusData();
    }, [universityId, page]);

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-5xl">
            {/* Header section */}
            <div className="mb-6 flex items-center">
                <Link to="/leaderboard" className="btn bg-white border-4 border-black hover:bg-black hover:text-white rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] uppercase font-black text-sm transition-colors mr-4">
                    <ArrowLeft size={16} strokeWidth={3} className="mr-1" /> Back
                </Link>
            </div>

            {loading && !university ? (
                <div className="flex justify-center p-12">
                    <Loader className="animate-spin text-black" size={48} strokeWidth={3} />
                </div>
            ) : error ? (
                <div className="bg-red-400 p-4 border-4 border-black font-bold text-black mb-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    {error}
                </div>
            ) : (
                <>
                    <div className="bg-sky-400 p-8 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mb-12">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <MapPin size={32} className="text-black" strokeWidth={3} />
                                    <h2 className="text-3xl md:text-5xl font-black font-spartan tracking-tighter text-black uppercase">
                                        {university?.shortName} Campus
                                    </h2>
                                </div>
                                <h1 className="text-xl md:text-2xl font-bold text-black border-l-4 border-black pl-4 ml-1 uppercase">
                                    {university?.name}
                                </h1>
                            </div>
                            <div className="bg-white border-4 border-black p-4 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                <div className="text-sm font-black uppercase text-slate-500">Campus Total</div>
                                <div className="text-3xl md:text-5xl font-black font-spartan">{university?.totalRating.toLocaleString()}</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                        <div className="grid grid-cols-12 gap-4 p-4 border-b-4 border-black bg-slate-100 font-black uppercase text-sm md:text-base">
                            <div className="col-span-2 md:col-span-1 text-center">Rank</div>
                            <div className="col-span-7 md:col-span-8">Student</div>
                            <div className="col-span-3 text-right pr-4">Rating</div>
                        </div>
                        
                        <div className="flex flex-col">
                            {students.length === 0 && (
                                <div className="p-8 text-center font-bold text-slate-500 uppercase">
                                    No students found on this campus.
                                </div>
                            )}
                            
                            {students.map((student, index) => {
                                const campusRank = (page - 1) * 20 + index + 1;
                                const isMe = session?.user?.name === student.name; // In production, match by ID or Email
                                const rating = student.contestRating || 1200;
                                
                                const getRatingBadge = (r) => {
                                    if (r < 1200) return { title: "Newbie", color: "bg-slate-200 text-slate-700" };
                                    if (r < 1400) return { title: "Pupil", color: "bg-green-400 text-black" };
                                    if (r < 1600) return { title: "Specialist", color: "bg-cyan-400 text-black" };
                                    if (r < 1900) return { title: "Expert", color: "bg-blue-500 text-white" };
                                    if (r < 2100) return { title: "Candidate Master", color: "bg-purple-500 text-white" };
                                    return { title: "Grandmaster", color: "bg-red-500 text-white" };
                                };
                                const badge = getRatingBadge(rating);

                                return (
                                    <div 
                                        key={student._id}
                                        className={`grid grid-cols-12 gap-4 p-4 border-b-2 border-black last:border-b-0 items-center transition-colors ${
                                            isMe ? "bg-emerald-200 hover:bg-emerald-300" : "hover:bg-slate-50"
                                        }`}
                                    >
                                        <div className="col-span-2 md:col-span-1 text-center font-black text-xl md:text-2xl font-spartan">
                                            #{campusRank}
                                        </div>
                                        <div className="col-span-7 md:col-span-8 flex items-center gap-3 md:gap-4">
                                            <div className="w-10 h-10 md:w-12 md:h-12 bg-black text-white flex items-center justify-center font-black rounded-full shrink-0 border-2 border-black">
                                                {isMe ? <User size={24} /> : student.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-black text-lg md:text-xl uppercase truncate flex items-center gap-2">
                                                    {student.name}
                                                    <span className={`text-[10px] md:text-xs px-2 py-0.5 rounded-none border-2 border-black shadow-[2px_2px_0px_0px_black] ${badge.color}`}>
                                                        {badge.title}
                                                    </span>
                                                </div>
                                                {isMe && (
                                                    <span className="text-[10px] md:text-xs font-black uppercase bg-black text-emerald-400 px-2 py-0.5 rounded-full inline-block mt-1">
                                                        You
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="col-span-3 text-right pr-2 md:pr-4 font-black text-xl md:text-3xl font-spartan">
                                            {rating.toLocaleString()}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

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
                </>
            )}
        </div>
    );
};

export default CampusLeaderboard;
