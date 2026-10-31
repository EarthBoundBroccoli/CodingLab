import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, Check } from 'lucide-react';

const DailyChallenge = ({ resource, retry, solvedIds }) => {
  if (resource.loading) return <section className="growth-panel growth-daily growth-daily-message" role="status">Loading daily challenge...</section>;
  if (resource.error) return <section className="growth-panel growth-daily growth-daily-message" role="alert"><p>{resource.error}</p><button type="button" className="growth-text-link" onClick={retry}>Try again</button><Link className="growth-text-link" to="/problems">Browse problems</Link></section>;
  const problem = resource.data;
  if (!problem) return <section className="growth-panel growth-daily growth-daily-message"><p>No daily challenge available today.</p><Link className="growth-text-link" to="/problems">Find a problem <ArrowRight size={16} /></Link></section>;
  const solved = solvedIds.has(String(problem._id));
  return <section className="growth-panel growth-daily" aria-labelledby="daily-challenge-title">
    <div className="growth-daily-icon" aria-hidden="true"><CalendarDays size={27} strokeWidth={1.7} /></div>
    <div className="growth-daily-content">
      <div className="growth-next-label"><span>Daily challenge</span><span className={`growth-difficulty-tag ${problem.difficulty?.toLowerCase()}`}>{problem.difficulty}</span></div>
      <h2 id="daily-challenge-title">{problem.title}</h2>
      <div className="growth-daily-meta">
        {solved ? <p className="growth-completed"><Check size={14} /> Already solved</p> : <p className="growth-muted">One problem to work on today.</p>}
        {problem.tags?.length > 0 && <p className="growth-problem-tags">{problem.tags.slice(0, 3).join(' \u00b7 ')}</p>}
      </div>
    </div>
    <Link to={`/problems/${problem._id}`} className="growth-button growth-button-primary">{solved ? 'Solve again' : 'Start solving'}<ArrowRight size={16} /></Link>
  </section>;
};
export default DailyChallenge;
