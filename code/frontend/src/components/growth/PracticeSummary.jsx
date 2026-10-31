import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { buildPracticeProgress, buildPracticeSeries } from '../../lib/growth-progress';

const dateLabel = (value, options) => new Date(`${value}T00:00:00Z`).toLocaleDateString('en-US', { ...options, timeZone: 'UTC' });

const PracticeSummary = ({ stats, days, onDaysChange }) => {
  const progress = buildPracticeProgress(stats, days);
  const series = buildPracticeSeries(stats, days);
  const newlySolved = series.reduce((total, day) => total + day.solved, 0);
  return <section className="growth-panel growth-trend">
    <header className="growth-panel-heading">
      <div><h2>Practice progress</h2><p>New problems solved each day</p></div>
      <select value={days} onChange={event => onDaysChange(Number(event.target.value))} aria-label="Practice period" className="growth-select">
        <option value={7}>Past week</option><option value={30}>Past 30 days</option>
      </select>
    </header>
    <div className="growth-trend-summary">
      <div><strong>{newlySolved}</strong><span>new {newlySolved === 1 ? 'solve' : 'solves'}</span></div>
      <p><strong>{progress.activeDays}</strong> / {days} days with accepted solutions</p>
    </div>
    <div className="growth-chart" role="img" aria-label={`${newlySolved} new problems solved over the past ${days} UTC days`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={series} margin={{ top: 12, right: 12, bottom: 4, left: -24 }} barCategoryGap={days === 7 ? '25%' : '18%'}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" axisLine={false} tickLine={false} minTickGap={24} fontSize={11} tickMargin={12} tickFormatter={value => dateLabel(value, days === 7 ? { weekday: 'short' } : { month: 'short', day: 'numeric' })} />
          <YAxis allowDecimals={false} axisLine={false} tickLine={false} fontSize={11} domain={[0, Math.max(1, ...series.map(day => day.solved))]} />
          <Tooltip cursor={{ fill: '#f1f5f9' }} labelFormatter={value => dateLabel(value, { month: 'short', day: 'numeric' })} formatter={value => [value, 'New solves']} contentStyle={{ border: '1px solid #111', fontSize: 12 }} />
          <Bar dataKey="solved" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={36} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
      {newlySolved === 0 && <div className="growth-chart-empty"><strong>No new solves in this period</strong><span>Your first accepted solution to a problem adds a bar here.</span></div>}
    </div>
    <p className="growth-chart-note">First solves only; repeat accepts do not add new solves. Dates use UTC.</p>
  </section>;
};
export default PracticeSummary;
