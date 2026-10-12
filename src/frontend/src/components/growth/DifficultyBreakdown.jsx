const DifficultyBreakdown = ({ stats }) => (
  <section className="bg-white neo-brutal overflow-hidden">
    <div className="bg-white px-5 py-4 border-b-2 border-black"><h2 className="text-xl font-black uppercase font-spartan tracking-tight">Practice by difficulty</h2></div>
  <div className="p-5 space-y-4">
    <p className="text-xs text-slate-500">Lifetime problem totals. Completion = solved / attempted.</p>
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b-2 border-black uppercase text-[10px]"><tr><th className="py-3">Difficulty</th><th>Solved</th><th>Attempted</th><th>Completion</th></tr></thead>
        <tbody>
          {[['easy', 'Easy', 'bg-emerald-400'], ['medium', 'Medium', 'bg-amber-400'], ['hard', 'Hard', 'bg-red-400']].map(([key, label, color]) => {
            const data = stats.difficultyStats?.[key] || { solved: 0, attempted: 0 };
            const rate = data.attempted ? Math.round(data.solved / data.attempted * 100) : null;
            return <tr key={key} className="border-b border-slate-200">
              <th className="py-4">{label}</th><td>{data.solved}</td><td>{data.attempted}</td>
              <td className="py-4 min-w-28">
                <span>{rate === null ? "Not attempted" : `${rate}%`}</span>
                <div className="h-2 bg-slate-100 mt-1" aria-hidden="true"><div className={`h-full ${color}`} style={{ width: `${rate ?? 0}%` }} /></div>
              </td>
            </tr>;
          })}
        </tbody>
      </table>
    </div>
    <p className="text-xs font-bold">{stats.totalSolved ?? 0} problems solved across {stats.totalAttempted ?? 0} attempted.</p>
  </div>
  </section>
);
export default DifficultyBreakdown;
