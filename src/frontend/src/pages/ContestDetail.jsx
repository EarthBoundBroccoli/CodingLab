import { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getBackendURL, useSession } from "../lib/auth-client";
import {
  Calendar, Clock, Trophy, Users, AlertCircle, ArrowLeft,
  Play, Check
} from "lucide-react";

// ─── Helpers ────────────────────────────────────────────────────────────────────

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

const getDurationText = (startTime, endTime) => {
  if (!startTime || !endTime) return "--";
  const diffMs = new Date(endTime).getTime() - new Date(startTime).getTime();
  if (diffMs <= 0) return "--";
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs / (1000 * 60)) % 60);
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
};

const difficultyBadge = (d) =>
  d === "Easy" ? "bg-emerald-300" : d === "Medium" ? "bg-amber-300" : "bg-rose-300";



// ─── Component ──────────────────────────────────────────────────────────────────

const ContestDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: session } = useSession();

  // Data state
  const [contest, setContest] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [timeRemaining, setTimeRemaining] = useState("");
  const [registering, setRegistering] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [toast, setToast] = useState(null);

  // Track solved problems in this contest for the current user
  const [solvedProblemIds, setSolvedProblemIds] = useState(new Set());

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  // ─── Data Fetching ──────────────────────────────────────────────────────────

  const fetchContestDetails = useCallback(async () => {
    try {
      const response = await fetch(`${getBackendURL()}/api/contests/${id}`, {
        credentials: "include"
      });
      if (response.ok) {
        const data = await response.json();
        setContest(data);

        // Extract solved problem IDs for current user
        if (session?.user?.id && data.participants) {
          const myEntry = data.participants.find(
            p => p.userId === session.user.id ||
                 p.userId?._id === session.user.id ||
                 p.userId?.toString() === session.user.id
          );
          if (myEntry?.solved) {
            setSolvedProblemIds(new Set(myEntry.solved.map(s => s.toString())));
          }
        }
      } else {
        setError("Failed to fetch contest details");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to connect to server");
    }
  }, [id, session]);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const response = await fetch(`${getBackendURL()}/api/contests/${id}/leaderboard`, {
        credentials: "include"
      });
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data);
      }
    } catch (err) {
      console.error(err);
    }
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    setError("");
    await Promise.all([fetchContestDetails(), fetchLeaderboard()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      if (contest && contest.status === "Ongoing") {
        fetchLeaderboard();
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [id, contest?.status]);

  // Timer logic
  useEffect(() => {
    if (!contest) return;

    const interval = setInterval(() => {
      const now = new Date();
      const start = new Date(contest.startTime);
      const end = new Date(contest.endTime);

      if (now < start) {
        const diff = start - now;
        const hrs = Math.floor(diff / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setTimeRemaining(`Starts in: ${hrs}h ${mins}m ${secs}s`);
      } else if (now >= start && now <= end) {
        const diff = end - now;
        const hrs = Math.floor(diff / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setTimeRemaining(`Ends in: ${hrs}h ${mins}m ${secs}s`);
      } else {
        setTimeRemaining("Contest Ended");
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [contest]);



  // ─── Registration ───────────────────────────────────────────────────────────

  const handleRegister = async () => {
    if (registering) return;
    setRegistering(true);
    try {
      const response = await fetch(`${getBackendURL()}/api/contests/${id}/register`, {
        method: "POST",
        credentials: "include"
      });
      if (response.ok) {
        showToast("Registered successfully!");
        setShowConfirmModal(false);
        await fetchContestDetails();
        await fetchLeaderboard();
      } else {
        const errorData = await response.json();
        showToast(errorData.message || "Failed to register");
      }
    } catch (err) {
      console.error(err);
      showToast("Error connecting to server");
    } finally {
      setRegistering(false);
    }
  };

  const handleSolveProblem = (problem) => {
    const isReg = session && contest.participants.some(p => p.userId === session.user.id || p.userId?._id === session.user.id);
    if (!isReg && contest.status === "Ongoing") {
      showToast("Please register for this contest to solve problems");
      return;
    }
    navigate(`/contest/${id}/problem/${problem._id}`);
  };

  // ─── Loading / Error States ─────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <span className="loading loading-ring loading-lg text-black"></span>
      </div>
    );
  }

  if (error || !contest) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="bg-white border-4 border-black p-8 neo-brutal flex flex-col items-center justify-center text-center gap-4 text-black">
          <AlertCircle size={64} className="text-red-500" />
          <h2 className="text-2xl font-black uppercase font-spartan">Contest Not Found</h2>
          <p className="font-bold text-slate-500">{error || "The requested contest does not exist."}</p>
          <Link to="/contests" className="btn bg-black text-white border-2 border-black rounded-none font-black uppercase hover:bg-emerald-400 hover:text-black">
            Back to Contests
          </Link>
        </div>
      </div>
    );
  }

  const isRegistered = session && contest.participants.some(p => p.userId === session.user.id || p.userId?._id === session.user.id);
  const isEnded = contest.status === "Ended";
  const isOngoing = contest.status === "Ongoing";

  return (
    <div className="max-w-[1400px] mx-auto py-8 px-4 lg:px-8 space-y-6 text-black">
      {toast && (
        <div className="fixed right-4 bottom-4 z-50 bg-emerald-400 text-black border-4 border-black px-4 py-3 font-black uppercase text-xs shadow-[4px_4px_0px_0px_black] animate-pulse">
          {toast}
        </div>
      )}

      {/* Back button */}
      <div>
        <Link to="/contests" className="inline-flex items-center gap-2 font-black uppercase text-xs hover:text-emerald-500 transition-colors">
          <ArrowLeft size={16} /> Back to Contests
        </Link>
      </div>

      {/* ─── Header Card ────────────────────────────────────────────────── */}
      <div className="bg-white border-4 border-black p-6 lg:p-8 neo-brutal flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-4 max-w-3xl">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl lg:text-4xl font-black uppercase font-spartan leading-tight">{contest.name}</h1>
            <span className={`badge rounded-none border-2 border-black font-black uppercase text-[10px] text-black ${
              contest.status === "Upcoming" ? "bg-sky-300" :
              contest.status === "Ongoing" ? "bg-emerald-300" : "bg-slate-300"
            }`}>
              {contest.status}
            </span>
          </div>
          <p className="font-bold text-sm text-slate-600 leading-relaxed">{contest.description || "No description provided."}</p>

          <div className="flex flex-wrap gap-6 pt-2 text-xs font-black uppercase">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-emerald-500" />
              <span>Starts: {formatDateTime(contest.startTime)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-emerald-500" />
              <span>Duration: {getDurationText(contest.startTime, contest.endTime)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users size={18} className="text-emerald-500" />
              <span>{contest.participants.length} Registered</span>
            </div>
          </div>
        </div>

        <div className="w-full md:w-auto flex flex-col gap-3">
          {timeRemaining && (
            <div className="bg-black text-white p-3 border-2 border-black font-black uppercase text-center text-xs tracking-wider shadow-[3px_3px_0px_0px_rgba(16,185,129,1)]">
              {timeRemaining}
            </div>
          )}

          {!isRegistered && !isEnded && (
            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={registering}
              className="btn w-full md:w-48 bg-emerald-400 text-black border-4 border-black rounded-none font-black uppercase hover:bg-emerald-500 shadow-[4px_4px_0px_0px_black] active:translate-x-1 active:translate-y-1 active:shadow-none cursor-pointer"
            >
              {registering ? "Registering..." : "Register Now"}
            </button>
          )}

          {isRegistered && (
            <div className="bg-emerald-100 text-emerald-800 border-2 border-emerald-500 p-3 font-black uppercase text-center text-xs rounded-none">
              ✓ Registered
            </div>
          )}
        </div>
      </div>

      {/* ─── Main Content Grid ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">

        {/* ─── Left: Problems + Editor (60%) ──────────────────────────── */}
        <div className="lg:col-span-6 space-y-6">

          {/* Problems List */}
          <div className="bg-white border-4 border-black neo-brutal overflow-hidden">
            <div className="bg-emerald-400 p-4 border-b-4 border-black">
              <h2 className="text-xl lg:text-2xl font-black uppercase font-spartan text-black">Contest Problems</h2>
            </div>
            <div className="divide-y-2 divide-black">
              {contest.status === "Upcoming" ? (
                <div className="p-8 text-center text-slate-500 font-bold uppercase text-xs flex flex-col items-center justify-center gap-2">
                  <span>🔒 Problems will be revealed when the contest starts.</span>
                </div>
              ) : !isRegistered && !isEnded ? (
                <div className="p-8 text-center text-slate-500 font-bold uppercase text-xs">
                  Register for this contest to view and solve the problems.
                </div>
              ) : contest.problems && contest.problems.length > 0 ? (
                contest.problems.map((problem, index) => {
                  const isSolved = solvedProblemIds.has(problem._id?.toString());
                  return (
                    <div key={problem._id} className="transition-all hover:bg-slate-50">
                      <div className="p-5 flex justify-between items-center group cursor-pointer" onClick={() => isOngoing ? handleSolveProblem(problem) : null}>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-3">
                            <span className="font-black text-slate-400 text-xl font-spartan">
                              {String.fromCharCode(65 + index)}
                            </span>
                            <h3 className="text-lg font-black uppercase italic group-hover:text-emerald-500 transition-colors">
                              {problem.title}
                            </h3>
                            {isSolved && (
                              <span className="bg-emerald-400 text-black border-2 border-black px-2 py-0.5 font-black uppercase text-[8px] flex items-center gap-1">
                                <Check size={10} /> Solved
                              </span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <span className={`badge rounded-none border-2 border-black font-black uppercase text-[8px] text-black ${difficultyBadge(problem.difficulty)}`}>
                              {problem.difficulty}
                            </span>
                            {problem.timeLimit && (
                              <span className="badge rounded-none border border-slate-300 font-bold text-[8px] text-slate-500 bg-white">
                                {problem.timeLimit}ms
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isOngoing && !isSolved && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleSolveProblem(problem); }}
                              className="btn btn-sm bg-black text-white border-2 border-black rounded-none font-black uppercase hover:bg-emerald-400 hover:text-black cursor-pointer"
                            >
                              <Play size={14} /> Solve
                            </button>
                          )}
                          {isOngoing && isSolved && (
                            <div className="flex items-center gap-2">
                              <span className="text-emerald-600 font-black text-xs uppercase">+100 pts</span>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleSolveProblem(problem); }}
                                className="btn btn-sm bg-slate-200 text-black border-2 border-black rounded-none font-black uppercase hover:bg-slate-300 cursor-pointer"
                              >
                                View
                              </button>
                            </div>
                          )}
                          {!isOngoing && (
                            <Link
                              to={`/problems/${problem._id}`}
                              className="btn btn-sm bg-slate-200 text-black border-2 border-black rounded-none font-black uppercase hover:bg-slate-300 cursor-pointer"
                            >
                              View
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-slate-500 font-bold uppercase text-xs">
                  No problems are linked to this contest.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── Right: Leaderboard (40%) ──────────────────────────────── */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border-4 border-black neo-brutal overflow-hidden">
            <div className="bg-slate-900 p-4 border-b-4 border-black flex items-center gap-2">
              <Trophy size={20} className="text-amber-400" />
              <h2 className="text-xl lg:text-2xl font-black uppercase font-spartan text-white">Leaderboard</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="table table-compact w-full text-black">
                <thead className="bg-slate-100 border-b-2 border-black">
                  <tr>
                    <th className="font-black uppercase text-xs text-black">#</th>
                    <th className="font-black uppercase text-xs text-black">User</th>
                    <th className="font-black uppercase text-xs text-black text-center">Score</th>
                    <th className="font-black uppercase text-xs text-black text-center">Solved</th>
                    <th className="font-black uppercase text-xs text-black text-right">Penalty</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 font-bold uppercase text-xs text-slate-500">
                        No submissions yet
                      </td>
                    </tr>
                  ) : (
                    leaderboard.map((participant, index) => {
                      const isMe = session && (
                        participant.userId?._id === session.user.id ||
                        participant.userId === session.user.id
                      );
                      return (
                        <tr key={participant._id || index} className={`border-b border-slate-200 ${isMe ? "bg-emerald-50 font-black" : "hover:bg-slate-50"}`}>
                          <td className="font-black text-sm">
                            {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}
                          </td>
                          <td className="font-bold text-xs uppercase">
                            {participant.userId?.name || "Anonymous"}
                            {isMe && <span className="text-emerald-500 ml-1">(You)</span>}
                          </td>
                          <td className="font-black text-sm text-center text-black">{participant.score || 0}</td>
                          <td className="font-black text-sm text-center text-emerald-600">{participant.solved?.length || 0}</td>
                          <td className="font-black text-xs text-right text-red-500">{participant.penalty || 0}m</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Contest Info Card */}
          <div className="bg-white border-4 border-black neo-brutal overflow-hidden">
            <div className="bg-amber-400 p-3 border-b-4 border-black">
              <h3 className="text-xs font-black uppercase tracking-widest text-black">Contest Info</h3>
            </div>
            <div className="p-4 space-y-3 text-xs">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="font-black uppercase text-slate-500">Problems</span>
                <span className="font-black text-black">{contest.status === "Upcoming" ? "Hidden" : contest.problems?.length || 0}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="font-black uppercase text-slate-500">Scoring</span>
                <span className="font-black text-black">100 pts / problem</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="font-black uppercase text-slate-500">Penalty</span>
                <span className="font-black text-black">+20m / wrong attempt</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-black uppercase text-slate-500">Tiebreak</span>
                <span className="font-black text-black">Lower penalty wins</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Registration Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white border-4 border-black p-6 neo-brutal max-w-md w-full shadow-[6px_6px_0px_0px_black] space-y-4">
            <h3 className="text-xl font-black uppercase font-spartan text-black">
              Confirm Registration
            </h3>
            <p className="font-bold text-slate-700 text-sm">
              Do you want to participate in <span className="text-black font-black">{contest.name}</span>?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={registering}
                className="px-4 py-2 bg-slate-200 text-black border-2 border-black font-black uppercase text-xs hover:bg-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRegister}
                disabled={registering}
                className="px-4 py-2 bg-emerald-400 text-black border-2 border-black font-black uppercase text-xs hover:bg-emerald-500 shadow-[2px_2px_0px_0px_black] cursor-pointer flex items-center gap-1"
              >
                {registering ? "Registering..." : "Yes, Register"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContestDetail;
