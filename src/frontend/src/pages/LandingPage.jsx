import { Link } from "react-router-dom";
import { useSession } from "../lib/auth-client";
import { Target, Code2, Award, Zap } from "lucide-react";

const LandingPage = () => {
  const { data: session, isPending } = useSession();

  // Placeholder data for problems
  const problems = [
    { id: 1, title: "Two Sum", tags: ["Array", "Hash Table"], difficulty: "easy" },
    { id: 2, title: "Longest Substring Without Repeating Characters", tags: ["String", "Sliding Window"], difficulty: "normal" },
    { id: 3, title: "Median of Two Sorted Arrays", tags: ["Array", "Binary Search"], difficulty: "hard" },
    { id: 4, title: "Longest Palindromic Substring", tags: ["String", "DP"], difficulty: "normal" },
    { id: 5, title: "Reverse Integer", tags: ["Math"], difficulty: "easy" },
    { id: 6, title: "String to Integer (atoi)", tags: ["String"], difficulty: "normal" },
    { id: 7, title: "Palindrome Number", tags: ["Math"], difficulty: "easy" },
    { id: 8, title: "Regular Expression Matching", tags: ["String", "DP", "Recursion"], difficulty: "hard" },
    { id: 9, title: "Container With Most Water", tags: ["Array", "Two Pointers"], difficulty: "normal" },
    { id: 10, title: "Integer to Roman", tags: ["Math", "String"], difficulty: "easy" },
  ];

  // Placeholder data for contests
  const contests = [
    { id: 1, title: "CodingLab Round #102 (Div. 2)", host: "Admin", endsAt: "May 25, 2026" },
    { id: 2, title: "Educational Round #15", host: "ProblemSetter_X", endsAt: "June 02, 2026" },
    { id: 3, title: "Algorithm Masters 2026", host: "CodingClub", endsAt: "June 10, 2026" },
  ];

  // Dummy stats to match the Growth page
  const dummyStats = {
    solved: 142,
    successRate: "72.4%",
    rank: "#1,240",
    points: 4250
  };

  if (isPending) return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <span className="loading loading-ring loading-lg text-black"></span>
    </div>
  );

  // Helper to determine redirect path
  const getRedirectPath = (targetPath) => {
    if (!session) return "/auth";
    return targetPath || "/";
  };

  return (
    <div className="max-w-[1400px] mx-auto py-8 px-4 lg:px-8">
      {/* Hero Section */}
      <div className="text-center space-y-4 mb-12">
        <h1 className="text-5xl lg:text-7xl font-black tracking-tight font-spartan text-black uppercase">
          Welcome to <span className="bg-emerald-400 px-2 border-2 border-black shadow-[4px_4px_0px_0px_black] normal-case">CodingLab</span>
        </h1>
        <p className="text-lg lg:text-xl font-bold max-w-2xl mx-auto italic text-slate-700">
          Empowering university students to conquer the world of algorithms and data structures.
        </p>
        {!session && (
          <div className="pt-4">
            <Link to="/auth" className="btn bg-slate-900 text-white rounded-none btn-lg px-10 font-black uppercase neo-brutal neo-brutal-hover border-none">
              Get Started Now
            </Link>
          </div>
        )}
      </div>

      {/* Main Layout: 60/40 Split */}
      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Left Side: Problems (60%) */}
        <div className="lg:w-[60%] space-y-6">
          <div className="bg-white neo-brutal rounded-none overflow-hidden">
            <div className="bg-sky-400 p-4 border-b-4 border-black">
              <h2 className="text-2xl font-black uppercase text-black font-spartan tracking-tight">Featured Problems</h2>
            </div>
            <div className="divide-y-2 divide-black">
              {problems.map((prob) => (
                <Link key={prob.id} to={getRedirectPath("#")} className="p-4 flex justify-between items-center hover:bg-sky-100 transition-colors cursor-pointer group">
                  <div className="space-y-1">
                    <h3 className="font-black text-lg group-hover:text-black transition-colors uppercase italic">{prob.title}</h3>
                    <div className="flex flex-wrap gap-2">
                      {prob.tags.map(tag => (
                        <span key={tag} className="badge rounded-none border-2 border-black font-black text-[10px] uppercase bg-white text-black">{tag}</span>
                      ))}
                    </div>
                  </div>
                    <div className="text-right">
                      <span className={`font-black text-xl bg-white border-2 border-black px-2 shadow-[2px_2px_0px_0px_black] uppercase italic ${
                        prob.difficulty === 'easy' ? 'text-emerald-500' : 
                        prob.difficulty === 'normal' ? 'text-amber-500' : 'text-red-500'
                      }`}>
                        {prob.difficulty}
                      </span>
                    </div>
                </Link>
              ))}
            </div>
            <div className="p-4 text-center border-t-4 border-black bg-slate-50">
              <Link 
                to={getRedirectPath("/problems")} 
                className="font-black uppercase text-black hover:text-sky-600 transition-colors flex items-center justify-center w-full gap-2 group"
              >
                See More Problems <span className="text-xl group-hover:translate-x-1 transition-transform">→</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Right Side: Contests & Stats (40%) */}
        <div className="lg:w-[40%] space-y-8">
          
          {/* Live Contests Card */}
          <div className="bg-white neo-brutal rounded-none overflow-hidden">
            <div className="bg-emerald-400 p-4 border-b-4 border-black">
              <h2 className="text-2xl font-black uppercase text-black font-spartan tracking-tight">Live Contests</h2>
            </div>
            <div className="divide-y-2 divide-black">
              {contests.map((contest) => (
                <Link key={contest.id} to={getRedirectPath("#")} className="p-4 flex justify-between items-start hover:bg-emerald-50 transition-colors cursor-pointer">
                  <div className="space-y-1">
                    <h3 className="font-black text-md leading-tight uppercase italic">{contest.title}</h3>
                    <p className="text-xs font-black opacity-60 uppercase">By {contest.host}</p>
                  </div>
                  <div className="text-right min-w-[100px]">
                    <span className="text-[10px] font-black uppercase bg-black text-white px-2 py-1 shadow-[2px_2px_0px_0px_#10b981]">Ends: {contest.endsAt}</span>
                  </div>
                </Link>
              ))}
            </div>
            <div className="p-4 text-center border-t-4 border-black bg-slate-900">
              <Link to={getRedirectPath("/contests")} className="font-black uppercase text-white hover:text-emerald-400 transition-colors w-full flex justify-center">See More Contests</Link>
            </div>
          </div>

          {/* Growth Stats Card - Refined to match current structure */}
          <div className="bg-white neo-brutal rounded-none overflow-hidden">
            <div className="bg-amber-400 p-4 border-b-4 border-black">
              <h2 className="text-2xl font-black uppercase text-black font-spartan tracking-tight text-center">Growth Stats</h2>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col items-center p-3 bg-slate-50 border-2 border-black">
                      <Code2 size={16} className="text-sky-500 mb-1" />
                      <span className="text-xl font-black">{session ? dummyStats.solved : 0}</span>
                      <span className="text-[8px] font-black uppercase opacity-50">Solved</span>
                  </div>
                  <div className="flex flex-col items-center p-3 bg-slate-50 border-2 border-black">
                      <Target size={16} className="text-emerald-500 mb-1" />
                      <span className="text-xl font-black">{session ? dummyStats.successRate : "0%"}</span>
                      <span className="text-[8px] font-black uppercase opacity-50">Success</span>
                  </div>
                  <div className="flex flex-col items-center p-3 bg-slate-50 border-2 border-black">
                      <Award size={16} className="text-amber-500 mb-1" />
                      <span className="text-xl font-black">{session ? dummyStats.rank : "#--"}</span>
                      <span className="text-[8px] font-black uppercase opacity-50">Rank</span>
                  </div>
                  <div className="flex flex-col items-center p-3 bg-slate-50 border-2 border-black">
                      <Zap size={16} className="text-black mb-1" />
                      <span className="text-xl font-black">{session ? dummyStats.points : 0}</span>
                      <span className="text-[8px] font-black uppercase opacity-50">Points</span>
                  </div>
              </div>
              <div className="w-full bg-slate-200 h-4 border-2 border-black relative overflow-hidden">
                <div className={`bg-emerald-400 h-full transition-all duration-500`} style={{ width: session ? '72.4%' : '0%' }}></div>
              </div>
              <Link to={getRedirectPath("/growth")} className="btn bg-slate-900 text-white border-2 border-black rounded-none font-black uppercase w-full mt-2 hover:bg-amber-400 hover:text-black">View Full Dashboard</Link>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default LandingPage;
