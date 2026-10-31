const DifficultyBreakdown = ({ stats }) => (
  <section className="growth-panel growth-difficulty">
    <header className="growth-panel-heading"><div><h2>Problem completion</h2><p>Solved out of attempted, all time</p></div></header>
    <div className="growth-difficulty-list">
      {[['easy', 'Easy', '#10b981'], ['medium', 'Medium', '#0284c7'], ['hard', 'Hard', '#7c3aed']].map(([key, label, color]) => {
        const data = stats.difficultyStats?.[key] || { solved: 0, attempted: 0 };
        const rate = data.attempted ? Math.round(data.solved / data.attempted * 100) : null;
        return <div key={key} className="growth-difficulty-row">
          <div><span>{label}</span><strong>{data.solved}<span> / {data.attempted}</span></strong></div>
          <div className="growth-progress-track" role="img" aria-label={`${label}: ${data.solved} solved out of ${data.attempted} attempted`}><span style={{ width: `${Math.min(rate ?? 0, 100)}%`, backgroundColor: color }} /></div>
          <p>{rate === null ? 'Not attempted yet' : `${rate}% completed`}</p>
        </div>;
      })}
    </div>
    <p className="growth-panel-footnote">Attempts count distinct problems, including those still unsolved.</p>
  </section>
);
export default DifficultyBreakdown;
