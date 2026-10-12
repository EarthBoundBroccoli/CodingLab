import { buildPracticeProgress } from "../../lib/growth-progress";

const PracticeSummary = ({ stats, days }) => {
  const progress = buildPracticeProgress(stats, days);
  const cards = [
    ["New problems solved", progress.newlySolved, `First solves in ${days} days`],
    ["Active days", `${progress.activeDays} / ${days}`, "Days with accepted solutions"],
    ["Accepted submissions", progress.acceptedSubmissions, "Repeat solutions included"],
    ["Current streak", `${stats.currentStreak ?? 0} days`, "Consecutive solving days"],
  ];
  return (
    <div className="bg-white neo-brutal grid grid-cols-2 lg:grid-cols-4">
      {cards.map(([label, value, detail], index) => (
        <div key={label} className={`p-4 sm:p-5 space-y-2 border-black ${index % 2 ? 'border-l-2' : ''} ${index < 2 ? 'border-b-2 lg:border-b-0' : ''} ${index === 2 ? 'lg:border-l-2' : ''}`}>
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</p>
          <p className="text-3xl font-black tabular-nums">{value}</p>
          <p className="text-xs text-slate-500">{detail}</p>
        </div>
      ))}
    </div>
  );
};
export default PracticeSummary;
