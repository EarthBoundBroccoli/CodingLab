import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarCheck, Check, ChartNoAxesCombined, RotateCcw, Target } from 'lucide-react';
import { getBackendURL } from '../lib/auth-client';
import { buildPracticeProgress, buildPracticeSeries } from '../lib/growth-progress';
import './home-practice.css';

const HomePracticePreview = ({ userId }) => {
  const [resource, setResource] = useState(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    fetch(`${getBackendURL()}/api/submissions/user-stats`, {
      credentials: 'include', signal: controller.signal,
    }).then(async response => {
      if (!response.ok) throw new Error('Could not load your practice progress.');
      return response.json();
    }).then(data => {
      if (!controller.signal.aborted) setResource({ userId, attempt, data });
    }).catch(() => {
      if (!controller.signal.aborted) setResource({ userId, attempt, error: 'Could not load your practice progress.' });
    });
    return () => controller.abort();
  }, [userId, attempt]);

  const current = resource?.userId === userId && resource?.attempt === attempt ? resource : null;
  const series = current?.data ? buildPracticeSeries(current.data, 7) : [];
  const solved = series.reduce((sum, day) => sum + day.solved, 0);
  const activeDays = current?.data ? buildPracticeProgress(current.data, 7).activeDays : 0;
  const difficulty = Object.values(current?.data?.difficultyStats || {});
  const attempted = difficulty.reduce((sum, item) => sum + item.attempted, 0);
  const completed = difficulty.reduce((sum, item) => sum + item.solved, 0);
  const completion = attempted ? Math.round(completed / attempted * 100) : null;
  const activity = new Map((current?.data?.activityHistory || []).map(day => [day.date, day.count]));

  return <section className="bg-white neo-brutal rounded-none overflow-hidden home-practice-preview" aria-labelledby="home-practice-title">
    <header className="home-practice-heading">
      <div><h2 id="home-practice-title">Your growth</h2><p>A quick look at your practice</p></div>
      <ChartNoAxesCombined size={27} strokeWidth={2} aria-hidden="true" />
    </header>
    <div className="p-5">
      {!userId ? <p className="text-sm text-slate-600">Sign in to see your weekly progress and saved submissions.</p>
        : !current ? <p role="status" className="text-sm text-slate-600">Loading practice progress…</p>
          : current.error ? <div role="alert"><p className="text-sm text-slate-600">{current.error}</p><button type="button" className="text-sm font-bold underline mt-3 cursor-pointer" onClick={() => setAttempt(value => value + 1)}>Try again</button></div>
            : <>
              <div className="home-practice-metrics">
                <div className="home-practice-metric">
                  <div className="home-practice-metric-top"><span className="home-practice-icon home-practice-blue"><Target size={18} aria-hidden="true" /></span><span>Past 7 days</span></div>
                  <strong className="home-practice-solves">{solved}</strong><h3>New solves</h3><p>First accepted solutions</p>
                </div>
                <div className="home-practice-metric">
                  <div className="home-practice-metric-top"><span className="home-practice-icon home-practice-green"><CalendarCheck size={18} aria-hidden="true" /></span><span>Past 7 days</span></div>
                  <strong className="home-practice-active">{activeDays}<small> / 7</small></strong><h3>Active days</h3><p>Days with accepted solutions</p>
                </div>
                <div className="home-practice-metric">
                  <div className="home-practice-metric-top"><span className="home-practice-icon home-practice-amber"><ChartNoAxesCombined size={18} aria-hidden="true" /></span><span>All time</span></div>
                  <strong className="home-practice-completion">{completion === null ? '—' : `${completion}%`}</strong><h3>Completion</h3><p>{attempted ? `${completed} of ${attempted} attempted problems` : 'No problems attempted yet'}</p>
                </div>
                <div className="home-practice-metric">
                  <div className="home-practice-metric-top"><span className="home-practice-icon home-practice-purple"><RotateCcw size={18} aria-hidden="true" /></span><span>All time</span></div>
                  <strong className="home-practice-unfinished">{Math.max(0, attempted - completed)}</strong><h3>To revisit</h3><p>Attempted but not solved</p>
                </div>
              </div>
              <div className="home-practice-week">
                <div className="home-practice-week-heading"><h3>This week’s activity</h3><span>Past 7 days · UTC</span></div>
                <div className="home-practice-days" role="list" aria-label="Days with accepted solutions">
                  {series.map((day, index) => {
                    const label = new Date(`${day.date}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
                    const count = activity.get(day.date) || 0;
                    return <div key={day.date} role="listitem" aria-label={`${day.date}: ${count} accepted solutions`} title={`${day.date}: ${count} accepted solutions`}>
                      <span>{label}</span><div className={`home-practice-day ${count > 0 ? 'is-active' : ''}`}>{count > 0 ? <Check size={18} aria-hidden="true" /> : <span aria-hidden="true">–</span>}</div>
                      <small>{index === 6 ? 'Today' : '\u00a0'}</small>
                    </div>;
                  })}
                </div>
              </div>
            </>}
      <Link to={userId ? '/growth' : '/auth'} className="flex items-center justify-between gap-3 bg-slate-900 text-white border-2 border-black p-3 text-sm font-bold mt-5 hover:bg-emerald-400 hover:text-black">
        {userId ? 'View practice progress' : 'Sign in to track progress'}<ArrowRight size={17} />
      </Link>
    </div>
  </section>;
};
export default HomePracticePreview;
