import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { getBackendURL } from "../lib/auth-client";
import { selectFeaturedContests } from "../lib/featured-contests";
import { formatArchiveDate } from "../lib/contest-archive";

const HomeContests = ({ linkFor }) => {
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const fetchContests = async () => {
      try {
        const response = await fetch(`${getBackendURL()}/api/contests`, {
          credentials: "include", signal: controller.signal,
        });
        if (!response.ok) throw new Error("Unable to load contests.");
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error("Unable to load contests.");
        if (!controller.signal.aborted) setContests(selectFeaturedContests(data));
      } catch (error) {
        if (!controller.signal.aborted) setError(error.message || "Unable to connect to the server.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    fetchContests();
    return () => controller.abort();
  }, [attempt]);

  return (
    <div className="bg-white neo-brutal rounded-none overflow-hidden">
      <div className="bg-emerald-400 p-4 border-b-4 border-black">
        <h2 className="text-2xl font-black uppercase text-black font-spartan tracking-tight">Live Contests</h2>
      </div>
      {loading ? <div role="status" className="flex items-center justify-center gap-2 p-8"><Loader2 size={24} className="animate-spin" /><span className="text-sm font-bold">Loading contests...</span></div>
        : error ? <div role="alert" className="p-6 text-sm space-y-3"><p>{error}</p><button type="button" className="font-bold underline" onClick={() => { setLoading(true); setError(""); setAttempt(value => value + 1); }}>Try again</button></div>
          : !contests.length ? <p className="p-6 text-sm text-slate-500">No upcoming or ongoing contests right now. Completed rounds are available in the archive.</p>
            : <div className="divide-y-2 divide-black">
              {contests.map(contest => (
                <Link key={contest._id} to={linkFor(`/contests/${contest._id}`)} className="p-4 flex flex-wrap justify-between items-start gap-3 hover:bg-emerald-50 transition-colors cursor-pointer">
                  <div className="space-y-1 min-w-0 flex-1">
                    <h3 className="font-black text-md leading-tight uppercase italic text-black break-words">{contest.name}</h3>
                    <p className="text-xs font-black opacity-60 uppercase">By {contest.createdBy?.name || 'Host unavailable'}</p>
                  </div>
                  <div className="text-right space-y-2">
                    <span className="text-[10px] font-black uppercase bg-black text-white px-2 py-1 shadow-[2px_2px_0px_0px_#10b981]">{contest.status}</span>
                    <p className="text-[10px] font-bold text-slate-500">{contest.status === 'Upcoming' ? 'Starts' : 'Ends'}: {formatArchiveDate(contest.status === 'Upcoming' ? contest.startTime : contest.endTime)}</p>
                  </div>
                </Link>
              ))}
            </div>}
      <div className="p-4 text-center border-t-4 border-black bg-slate-900">
        <Link to={linkFor('/contests')} className="font-black uppercase text-white hover:text-emerald-400 transition-colors w-full flex justify-center">See More Contests</Link>
      </div>
    </div>
  );
};
export default HomeContests;
