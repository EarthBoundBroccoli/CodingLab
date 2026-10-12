import { Link } from "react-router-dom";
import { ArrowRight, Code2 } from "lucide-react";

const DailyChallenge = ({ resource, retry }) => {
  if (resource.loading) return <p role="status" className="bg-white neo-brutal p-6">Loading daily challenge...</p>;
  if (resource.error) return (
    <div className="bg-white neo-brutal p-6 flex flex-wrap items-center justify-between gap-4">
      <p role="status" className="text-sm">{resource.error}</p>
      <button type="button" className="btn btn-sm rounded-none border-2 border-black bg-white" onClick={retry}>Try again</button>
    </div>
  );
  const problem = resource.data;
  if (!problem) return null;
  const difficultyColor = problem.difficulty === "Easy" ? "bg-emerald-400"
    : problem.difficulty === "Medium" ? "bg-amber-300" : "bg-rose-300";
  return (
    <section className="bg-[#f0fdf4] p-6 sm:p-8 lg:p-10 border-4 border-black shadow-[8px_8px_0px_0px_black]">
      <div className="flex flex-wrap justify-between items-center gap-4 border-b-4 border-black pb-5 mb-6">
        <div className="flex items-center gap-4">
          <span className="bg-emerald-400 p-2 sm:p-3 border-2 border-black shadow-[3px_3px_0px_0px_black]" aria-hidden="true"><Code2 size={28} /></span>
          <h2 className="text-2xl sm:text-3xl font-black uppercase font-spartan tracking-tight">Daily Challenge</h2>
        </div>
        <span className={`px-3 py-1.5 border-2 border-black text-xs font-black uppercase ${difficultyColor}`}>{problem.difficulty}</span>
      </div>
      <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
        <div className="space-y-4 min-w-0">
          <h3 className="text-2xl sm:text-3xl font-black break-words">{problem.title}</h3>
          <div className="flex flex-wrap gap-2">{problem.tags?.map(tag => <span key={tag} className="bg-white border-2 border-black px-3 py-1 text-xs font-bold uppercase">{tag}</span>)}</div>
        </div>
        <Link to={`/problems/${problem._id}`} className="flex justify-center items-center gap-3 shrink-0 bg-slate-900 text-white border-2 border-black px-6 py-4 font-black uppercase text-sm shadow-[4px_4px_0px_0px_#34d399] hover:bg-black active:translate-x-1 active:translate-y-1 active:shadow-none transition-all">
          Start solving <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
};
export default DailyChallenge;
