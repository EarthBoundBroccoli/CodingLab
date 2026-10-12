import { useState } from "react";
import { Link } from "react-router-dom";
import { useGrowthData } from "../hooks/useGrowthData";
import { findRetrySubmission } from "../lib/growth-progress";
import PracticeSummary from "../components/growth/PracticeSummary";
import DifficultyBreakdown from "../components/growth/DifficultyBreakdown";
import DailyChallenge from "../components/growth/DailyChallenge";
import SubmissionHistory from "../components/growth/SubmissionHistory";

const Growth = () => {
  const [days, setDays] = useState(7);
  const { stats, recent, daily, retry } = useGrowthData();
  const retrySubmission = stats.data && recent.data
    ? findRetrySubmission(recent.data, stats.data.firstSolveHistory || []) : null;

  return (
    <div className="max-w-[1400px] mx-auto py-8 px-4 lg:px-8 space-y-6 text-black">
      <header className="flex flex-wrap justify-between items-center gap-5">
        <div><h1 className="text-3xl font-black uppercase font-spartan tracking-tight">Growth</h1>
          <p className="mt-1 text-sm text-slate-500">Practice overview</p>
        </div>
        <Link to="/profile" className="text-sm font-bold underline underline-offset-4">View profile</Link>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <label className="flex items-center gap-3 text-sm font-bold">
          Practice summary
          <select value={days} onChange={event => setDays(Number(event.target.value))}
            aria-label="Practice summary period"
            className="bg-white border-2 border-black rounded-none px-3 py-2 text-xs font-bold focus:outline-2 focus:outline-emerald-500">
            <option value={7}>Past week</option>
            <option value={30}>Past 30 days</option>
          </select>
        </label>
        <p className="text-xs text-slate-600">UTC calendar days, including today</p>
      </div>
      {stats.loading ? <p role="status" className="bg-white neo-brutal p-6">Loading practice progress...</p>
        : stats.error ? <div role="alert" className="bg-white neo-brutal p-6 space-y-3"><p>{stats.error}</p><button className="btn rounded-none" onClick={retry}>Retry loading</button></div>
        : <PracticeSummary stats={stats.data} days={days} />}

      <DailyChallenge resource={daily} retry={retry} />

      <div className={`grid grid-cols-1 gap-8 ${stats.data && retrySubmission ? 'lg:grid-cols-5' : ''}`}>
        {stats.data && <div className={retrySubmission ? 'lg:col-span-3' : ''}><DifficultyBreakdown stats={stats.data} /></div>}
        {retrySubmission && <section className={`bg-white neo-brutal overflow-hidden ${stats.data ? 'lg:col-span-2' : ''}`}>
          <div className="px-5 py-4 border-b-2 border-black"><h2 className="text-xl font-black uppercase font-spartan tracking-tight">Continue practice</h2></div>
          <div className="p-5 space-y-4">
            <div>
              <p className="text-xs text-slate-500 mb-2">From your recent unsolved attempts</p>
              <h3 className="text-lg font-bold">{retrySubmission.problemId.title}</h3>
              <p className="text-xs mt-2 text-slate-600">Last verdict: <span className="font-bold text-red-700">{retrySubmission.verdict}</span></p>
            </div>
            <Link className="btn btn-sm rounded-none bg-white hover:bg-emerald-400 border-2 border-black font-black uppercase" to={`/problems/${retrySubmission.problemId._id}`}
              state={{ prefillCode: retrySubmission.code, prefillLanguage: retrySubmission.language }}>Retry with saved code</Link>
          </div>
        </section>}
      </div>

      {recent.loading ? <p role="status" className="bg-white neo-brutal p-6">Loading submissions...</p>
        : recent.error ? <div role="alert" className="bg-white neo-brutal p-6 space-y-3"><p>{recent.error}</p><button className="btn rounded-none" onClick={retry}>Retry loading</button></div>
        : <SubmissionHistory submissions={recent.data || []} />}
    </div>
  );
};
export default Growth;
