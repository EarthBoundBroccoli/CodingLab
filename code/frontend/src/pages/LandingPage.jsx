import HomeContests from "../components/HomeContests";
import HomePracticePreview from "../components/HomePracticePreview";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSession, getBackendURL } from "../lib/auth-client";
import { Loader2 } from "lucide-react";

const LandingPage = () => {
  const { data: session, isPending } = useSession();

  // State for live problems
  const [problems, setProblems] = useState([]);
  const [loadingProblems, setLoadingProblems] = useState(true);
  const [studentStats, setStudentStats] = useState(null);

  // Fetch stats if session exists
  useEffect(() => {
    const fetchAllStats = async () => {
      if (!session) return;
      try {
        const profileRes = await fetch(`${getBackendURL()}/api/submissions/profile-stats`, { credentials: "include" });
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setStudentStats(profileData);
        }
      } catch (err) {
        console.error("Error loading stats on landing page:", err);
      }
    };
    fetchAllStats();
  }, [session]);

  // Fetch live approved problems
  useEffect(() => {
    const fetchProblems = async () => {
      try {
        setLoadingProblems(true);
        const response = await fetch(`${getBackendURL()}/api/problem`, {
          credentials: "include"
        });
        if (response.ok) {
          const data = await response.json();
          // Filter to only render status: 'approved' and slice the top 4 most recently approved
          const approved = data
            .filter(p => p.status === "approved")
            .slice(0, 10);
          setProblems(approved);
        }
      } catch (err) {
        console.error("Error loading landing page problems:", err);
      } finally {
        setLoadingProblems(false);
      }
    };
    fetchProblems();
  }, []);

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

  const renderStatusBadge = (prob) => {
    if (!studentStats || !session) return null;

    const solvedList = studentStats.solvedProblems || [];
    const attemptedList = studentStats.attemptedProblems || [];
    const latestVerdicts = studentStats.latestVerdicts || {};

    const isSolved = solvedList.some(pId => pId.toString() === prob._id.toString());
    const isAttempted = attemptedList.some(pId => pId.toString() === prob._id.toString());

    if (isSolved) {
      return (
        <span className="bg-emerald-400 text-[12px] tracking-wider uppercase font-black px-2 py-0.5 border-2 border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] ml-3 align-middle inline-block text-black normal-case not-italic">
          SOLVED
        </span>
      );
    } else if (isAttempted) {
      const lastVerdict = latestVerdicts[prob._id.toString()];
      if (lastVerdict === "Time Limit Exceeded") {
        return (
          <span className="bg-amber-400 text-[12px] tracking-wider uppercase font-black px-2 py-0.5 border-2 border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] ml-3 align-middle inline-block text-black normal-case not-italic">
            TLE ⏳
          </span>
        );
      } else {
        return (
          <span className="bg-rose-400 text-[12px] tracking-wider uppercase font-black px-2 py-0.5 border-2 border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] ml-3 align-middle inline-block text-black normal-case not-italic">
            ATTEMPTED ❌
          </span>
        );
      }
    }

    return null;
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
            <Link to="/auth" className="btn bg-slate-900 text-white rounded-none btn-lg px-10 font-black uppercase neo-brutal neo-brutal-hover border-none cursor-pointer">
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
            
            {loadingProblems ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="animate-spin text-black" size={32} />
              </div>
            ) : problems.length === 0 ? (
              <div className="p-8 text-center text-slate-500 font-black uppercase text-sm">
                No featured problems found
              </div>
            ) : (
              <div className="divide-y-2 divide-black">
                {problems.map((prob) => (
                  <Link key={prob._id} to={getRedirectPath(`/problems/${prob._id}`)} className="p-4 flex justify-between items-center hover:bg-sky-100 transition-colors cursor-pointer group">
                    <div className="space-y-1">
                      <h3 className="font-black text-lg group-hover:text-black transition-colors uppercase italic text-black">
                        {prob.title}
                        {renderStatusBadge(prob)}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {prob.tags?.map(tag => (
                          <span key={tag} className="badge rounded-none border-2 border-black font-black text-[10px] uppercase bg-white text-black">{tag}</span>
                        ))}
                      </div>
                    </div>
                      <div className="text-right">
                        <span className={`font-black text-xl bg-white border-2 border-black px-2 shadow-[2px_2px_0px_0px_black] uppercase italic ${
                          prob.difficulty.toLowerCase() === 'easy' ? 'text-emerald-500' : 
                          prob.difficulty.toLowerCase() === 'medium' || prob.difficulty.toLowerCase() === 'normal' ? 'text-amber-500' : 'text-red-500'
                        }`}>
                          {prob.difficulty}
                        </span>
                      </div>
                  </Link>
                ))}
              </div>
            )}
            
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
          
          <HomeContests linkFor={getRedirectPath} />

          <HomePracticePreview userId={session?.user?.id} />

        </div>

      </div>
    </div>
  );
};

export default LandingPage;
