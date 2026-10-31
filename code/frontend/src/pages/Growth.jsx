import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowRight, RotateCcw } from 'lucide-react';
import { useGrowthData } from '../hooks/useGrowthData';
import { findRetrySubmission } from '../lib/growth-progress';
import PracticeSummary from '../components/growth/PracticeSummary';
import DifficultyBreakdown from '../components/growth/DifficultyBreakdown';
import DailyChallenge from '../components/growth/DailyChallenge';
import SubmissionHistory from '../components/growth/SubmissionHistory';
import './growth.css';

const ResourceMessage = ({ resource, label, retry }) => <div className="growth-panel growth-resource" role={resource.error ? 'alert' : 'status'}>
  <p>{resource.error || label}</p>
  {resource.error && <button className="growth-text-link" onClick={retry}>Try again</button>}
</div>;

const Growth = () => {
  const [days, setDays] = useState(7);
  const { stats, recent, daily, retry } = useGrowthData();
  const retrySubmission = stats.data && recent.data
    ? findRetrySubmission(recent.data, stats.data.firstSolveHistory || []) : null;
  const solvedIds = new Set((stats.data?.firstSolveHistory || []).map(solve => String(solve.problemId)));

  return <div className="growth-page">
    <header className="growth-page-heading">
      <div><h1>Growth</h1><p>See your progress. Choose your next problem.</p></div>
      <Link to="/profile" className="growth-text-link">Contest profile <ArrowUpRight size={16} /></Link>
    </header>
    <DailyChallenge resource={daily} retry={retry} solvedIds={solvedIds} />
    <div className={`growth-overview-grid ${stats.data ? '' : 'growth-overview-single'}`}>
      {stats.loading || stats.error ? <ResourceMessage resource={stats} label="Loading practice progress..." retry={retry} />
        : <PracticeSummary stats={stats.data} days={days} onDaysChange={setDays} />}
      {stats.data && <DifficultyBreakdown stats={stats.data} />}
    </div>
    <div className="growth-submissions-heading">
      {retrySubmission && retrySubmission.problemId._id !== daily.data?._id && <div className="growth-retry">
        <RotateCcw size={16} aria-hidden="true" />
        <div><span className="growth-muted">Continue an attempt</span><h3>{retrySubmission.problemId.title}</h3></div>
        <span className="growth-muted growth-retry-verdict">{retrySubmission.verdict}</span>
        <Link className="growth-text-link" to={`/problems/${retrySubmission.problemId._id}`} state={{ prefillCode: retrySubmission.code, prefillLanguage: retrySubmission.language }}>Resume saved code <ArrowRight size={15} /></Link>
      </div>}
      <Link to="/problems" className="growth-text-link growth-browse">Browse all problems <ArrowUpRight size={15} /></Link>
    </div>
    {recent.loading || recent.error ? <ResourceMessage resource={recent} label="Loading submissions..." retry={retry} />
      : <SubmissionHistory submissions={recent.data || []} />}
  </div>;
};
export default Growth;
