import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getBackendURL, useSession } from "../lib/auth-client";
import { Trophy, Users, Calendar, Clock, ArrowRight, Loader2, AlertCircle } from "lucide-react";

const getDurationText = (startTime, endTime) => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return "--";
  }
  const diffMs = end - start;
  if (diffMs <= 0) return "--";
  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
};

const formatDateTime = (value) => {
  if (!value) return "--";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "--";
  return date.toLocaleString([], {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const Contests = () => {
  const { data: session } = useSession();
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [toast, setToast] = useState(null);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  };

  const fetchContests = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(`${getBackendURL()}/api/contests`, {
        credentials: "include"
      });
      if (response.ok) {
        const data = await response.json();
        setContests(data);
      } else {
        setError("Failed to fetch contests");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to connect to backend API");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContests();
  }, []);

  const handleRegister = async (contestId) => {
    try {
      const response = await fetch(`${getBackendURL()}/api/contests/${contestId}/register`, {
        method: "POST",
        credentials: "include"
      });
      if (response.ok) {
        showToast("Registered successfully!");
        fetchContests();
      } else {
        const errorData = await response.json();
        showToast(errorData.message || "Failed to register");
      }
    } catch (err) {
      console.error(err);
      showToast("Error connecting to server");
    }
  };

  // Filtered contests
  const filteredContests = useMemo(() => {
    return contests.filter((contest) => {
      const matchesSearch = contest.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "All" || contest.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [contests, searchQuery, statusFilter]);

  // Grouped lists for categorized displays
  const popularContests = useMemo(() => {
    // Sort by participants length descending
    return [...contests]
      .sort((a, b) => b.participants.length - a.participants.length)
      .slice(0, 3);
  }, [contests]);

  const currentlyRunning = useMemo(() => {
    return filteredContests.filter((c) => c.status === "Ongoing");
  }, [filteredContests]);

  const upcomingContests = useMemo(() => {
    return filteredContests.filter((c) => c.status === "Upcoming");
  }, [filteredContests]);

  const previousContests = useMemo(() => {
    return filteredContests.filter((c) => c.status === "Ended");
  }, [filteredContests]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <span className="loading loading-ring loading-lg text-black"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-[1400px] mx-auto py-12 px-4">
        <div className="bg-white border-4 border-black p-8 neo-brutal flex flex-col items-center justify-center text-center gap-4 text-black">
          <AlertCircle size={64} className="text-red-500" />
          <h2 className="text-2xl font-black uppercase font-spartan">Failed to load contests</h2>
          <p className="font-bold text-slate-500">{error}</p>
          <button onClick={fetchContests} className="btn bg-black text-white border-2 border-black rounded-none font-black uppercase hover:bg-emerald-400 hover:text-black">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto py-12 px-4 lg:px-8 space-y-12 text-black">
      {toast && (
        <div className="fixed right-4 bottom-4 z-50 bg-emerald-400 text-black border-4 border-black px-4 py-3 font-black uppercase text-xs shadow-[4px_4px_0px_0px_black]">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black uppercase font-spartan">Contests</h1>
          <p className="font-bold italic text-slate-500 mt-2">Join a battle and prove your skills.</p>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <input
            type="text"
            placeholder="Search contests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 md:w-64 p-3 border-4 border-black font-black uppercase outline-none rounded-none focus:bg-emerald-50 text-black bg-white"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-3 border-4 border-black font-black uppercase outline-none rounded-none focus:bg-emerald-50 text-black bg-white"
          >
            <option value="All">All Statuses</option>
            <option value="Upcoming">Upcoming</option>
            <option value="Ongoing">Ongoing</option>
            <option value="Ended">Ended</option>
          </select>
        </div>
      </div>

      {/* Popular Contests section */}
      {popularContests.length > 0 && statusFilter === "All" && !searchQuery && (
        <div className="space-y-6">
          <h2 className="text-2xl font-black uppercase font-spartan">Popular Contests</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {popularContests.map((contest, idx) => {
              const registered = session && contest.participants.some(p => p.userId === session.user.id || p.userId?._id === session.user.id);
              const isEnded = contest.status === "Ended";
              return (
                <div key={contest._id} className="bg-white neo-brutal border-emerald-400 border-[6px] p-6 space-y-4 hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all cursor-pointer group shadow-[4px_4px_0px_0px_#10b981] flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <span className="bg-black text-white text-[10px] font-black px-2 py-1 uppercase w-fit">Popular #{idx + 1}</span>
                      <Trophy className="text-emerald-500 group-hover:scale-125 transition-transform" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-2xl font-black uppercase italic leading-tight group-hover:text-emerald-600 truncate">{contest.name}</h3>
                      <p className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">By {contest.createdBy?.name || "Admin"}</p>
                    </div>
                    <div className="pt-4 border-t-2 border-slate-100 flex justify-between items-center font-black uppercase text-[10px] gap-2">
                      <div className="flex items-center gap-1">
                        <Users size={16} className="text-emerald-500" />
                        <span className="text-red-600">{contest.participants.length} Joined</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={16} className="text-emerald-500" />
                        <span>{getDurationText(contest.startTime, contest.endTime)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 flex gap-2">
                    {!registered && !isEnded ? (
                      <button
                        onClick={(e) => { e.preventDefault(); handleRegister(contest._id); }}
                        className="btn btn-sm flex-1 bg-emerald-400 text-black border-2 border-black rounded-none font-black uppercase hover:bg-emerald-500"
                      >
                        Register
                      </button>
                    ) : null}
                    <Link
                      to={`/contests/${contest._id}`}
                      className="btn btn-sm flex-1 bg-black text-white border-2 border-black rounded-none font-black uppercase hover:bg-emerald-400 hover:text-black"
                    >
                      {registered || isEnded ? "View Contest" : "Details"}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main categories */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
        {/* Currently Running & Upcoming (60%) */}
        <div className="lg:col-span-6 space-y-8">
          {/* Currently Running */}
          <div className="bg-white neo-brutal border-black border-4 overflow-hidden min-h-[200px]">
            <div className="bg-emerald-400 p-4 border-b-4 border-black">
              <h2 className="text-2xl font-black uppercase text-black font-spartan">Currently Running</h2>
            </div>
            <div className="divide-y-4 divide-black">
              {currentlyRunning.length > 0 ? (
                currentlyRunning.map((contest) => {
                  const registered = session && contest.participants.some(p => p.userId === session.user.id || p.userId?._id === session.user.id);
                  return (
                    <div key={contest._id} className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center hover:bg-emerald-50 transition-colors gap-4">
                      <div className="space-y-2 flex-1">
                        <h3 className="text-xl font-black uppercase italic">{contest.name}</h3>
                        <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-500 uppercase">
                          <span>Host: {contest.createdBy?.name || "Admin"}</span>
                          <span className="flex items-center gap-1 text-red-600 font-black">
                            <Users size={16} className="text-emerald-500" />
                            {contest.participants.length} Joined
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 w-full md:w-auto">
                        {!registered && (
                          <button
                            onClick={() => handleRegister(contest._id)}
                            className="btn btn-sm bg-emerald-400 text-black border-2 border-black rounded-none font-black uppercase hover:bg-emerald-500"
                          >
                            Register
                          </button>
                        )}
                        <Link
                          to={`/contests/${contest._id}`}
                          className="btn btn-sm bg-black text-white border-2 border-black rounded-none font-black uppercase hover:bg-emerald-400 hover:text-black flex-1 md:flex-none text-center"
                        >
                          {registered ? "View" : "Details"}
                        </Link>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-12 text-center font-bold uppercase text-xs text-slate-400">
                  No contests are currently active
                </div>
              )}
            </div>
          </div>

          {/* Upcoming Contests */}
          <div className="bg-white neo-brutal border-black border-4 overflow-hidden min-h-[200px]">
            <div className="bg-sky-400 p-4 border-b-4 border-black">
              <h2 className="text-2xl font-black uppercase text-black font-spartan">Upcoming Contests</h2>
            </div>
            <div className="divide-y-4 divide-black">
              {upcomingContests.length > 0 ? (
                upcomingContests.map((contest) => {
                  const registered = session && contest.participants.some(p => p.userId === session.user.id || p.userId?._id === session.user.id);
                  return (
                    <div key={contest._id} className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center hover:bg-sky-50 transition-colors gap-4">
                      <div className="space-y-2 flex-1">
                        <h3 className="text-xl font-black uppercase italic">{contest.name}</h3>
                        <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-500 uppercase">
                          <span>Starts: {formatDateTime(contest.startTime)}</span>
                          <span>Duration: {getDurationText(contest.startTime, contest.endTime)}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 w-full md:w-auto">
                        {!registered && (
                          <button
                            onClick={() => handleRegister(contest._id)}
                            className="btn btn-sm bg-emerald-400 text-black border-2 border-black rounded-none font-black uppercase hover:bg-emerald-500"
                          >
                            Register
                          </button>
                        )}
                        <Link
                          to={`/contests/${contest._id}`}
                          className="btn btn-sm bg-black text-white border-2 border-black rounded-none font-black uppercase hover:bg-emerald-400 hover:text-black flex-1 md:flex-none text-center"
                        >
                          {registered ? "View" : "Details"}
                        </Link>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-12 text-center font-bold uppercase text-xs text-slate-400">
                  No upcoming contests scheduled
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Previous Contests (40%) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white neo-brutal border-black border-4 overflow-hidden">
            <div className="bg-slate-900 p-4 border-b-4 border-black">
              <h2 className="text-2xl font-black uppercase text-white font-spartan">Previous Contests</h2>
            </div>
            <div className="p-6 space-y-6 bg-slate-50">
              {previousContests.length > 0 ? (
                <div className="space-y-4">
                  {previousContests.map((contest) => (
                    <div key={contest._id} className="bg-white border-2 border-black p-4 flex justify-between items-center hover:bg-emerald-400 transition-all cursor-pointer group shadow-[4px_4px_0px_0px_black] active:translate-x-1 active:translate-y-1 active:shadow-none">
                      <div className="space-y-1 min-w-0">
                        <h4 className="font-black uppercase text-sm group-hover:text-black truncate">{contest.name}</h4>
                        <p className="text-[10px] font-black uppercase opacity-60">PARTICIPANTS: {contest.participants.length}</p>
                      </div>
                      <Link to={`/contests/${contest._id}`} className="p-1">
                        <ArrowRight size={18} />
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center font-bold uppercase text-xs text-slate-400 py-10">
                  No completed contests found
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contests;
