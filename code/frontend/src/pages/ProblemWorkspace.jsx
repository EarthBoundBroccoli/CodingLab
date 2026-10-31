import { useProblemEditor } from "../hooks/useProblemEditor";
import WorkspaceEditor from "../components/workspace/WorkspaceEditor";
import WorkspaceActions from "../components/workspace/WorkspaceActions";
import { useEffect, useState } from "react";
import { useParams, Link, useLocation, useSearchParams } from "react-router-dom";
import { Group, Panel, Separator } from "react-resizable-panels";
import axios from "axios";
import { getBackendURL } from "../lib/auth-client";
import { renderMarkdown } from "../lib/markdown";
import { Loader2, AlertCircle, ChevronLeft } from "lucide-react";

const badgeForDifficulty = (difficulty) => {
  if (difficulty === "Easy") return "bg-emerald-300";
  if (difficulty === "Medium") return "bg-amber-300";
  return "bg-rose-300";
};


const ProblemWorkspace = () => {
  const { id } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const contestId = searchParams.get("contestId");
  const prefillCode = location.state?.prefillCode;
  const prefillLanguage = location.state?.prefillLanguage;

  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submissionStatus, setSubmissionStatus] = useState("NEUTRAL");
  const workspace = useProblemEditor({ problem, prefillCode, prefillLanguage, contest: false });
  const { language, codeValue, setIsCompiling, setIsEvaluating,
    setActiveTab, setExecutionResult, isEvaluating } = workspace;

  useEffect(() => {
    const fetchProblemDetails = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${getBackendURL()}/api/problem/${id}`, {
          credentials: "include"
        });
        if (response.ok) {
          const data = await response.json();
          setProblem(data);
          
          try {
            const statsResponse = await axios.get(`${getBackendURL()}/api/submissions/profile-stats`, {
              withCredentials: true, timeout: 90000
            });
            const statsData = statsResponse.data;
            if (statsData) {
              const solvedList = statsData.solvedProblems || [];
              const attemptedList = statsData.attemptedProblems || [];
              
              if (solvedList.some(pId => pId.toString() === id.toString())) {
                setSubmissionStatus('AC');
              } else if (attemptedList.some(pId => pId.toString() === id.toString())) {
                setSubmissionStatus('WA');
              } else {
                setSubmissionStatus('NEUTRAL');
              }
            }
          } catch (statsErr) {
            console.error("Failed to load student statistics:", statsErr);
          }
        } else {
          setError("Problem not found in the database.");
        }
      } catch (err) {
        console.error("Error loading problem details:", err);
        setError("Failed to connect to backend server.");
      } finally {
        setLoading(false);
      }
    };
    fetchProblemDetails();
  }, [id]);

  const handleSubmitCode = async () => {
    setIsCompiling(true);
    setIsEvaluating(true);
    setActiveTab("output");
    setExecutionResult(null);

    try {
      // Route to contest submission endpoint if in contest mode
      const submitUrl = contestId
        ? `${getBackendURL()}/api/contests/${contestId}/submit`
        : `${getBackendURL()}/api/submissions/submit`;
      const submitBody = contestId
        ? { problemId: id, code: codeValue, language: language }
        : { problemId: id, code: codeValue, language: language };

      console.log(`Submitting code to ${contestId ? 'contest' : 'standard'} grading backend...`);
      const response = await axios.post(submitUrl, submitBody, {
        headers: {
          "Content-Type": "application/json"
        },
        withCredentials: true, timeout: 90000
      });

      if (response.status === 200) {
        const { verdict, timeTaken, memoryUsed, compileOutput, evaluationVerdict } = response.data;
        const displayOutput = verdict === "Accepted"
          ? `Verdict: ACCEPTED (AC)\n\nCongratulations! All test cases passed successfully.`
          : `Verdict: ${(verdict || evaluationVerdict || "FAILED").toUpperCase()}\n\n${compileOutput || "One or more test cases failed or resource limits were exceeded."}`;
        
        if (evaluationVerdict) {
          setSubmissionStatus(evaluationVerdict);
        }

        setExecutionResult({
          output: displayOutput,
          statusCode: verdict === "Accepted" ? 0 : 1,
          memory: memoryUsed,
          cpuTime: (timeTaken / 1000).toFixed(2),
          isError: verdict !== "Accepted"
        });
      } else {
        setExecutionResult({
          output: `Submission failed with status code ${response.status}`,
          isError: true
        });
      }
    } catch (err) {
      console.error("Submission error:", err);
      const errMsg = err.code === "ECONNABORTED" ? "The server did not respond within 90 seconds. For submissions, check your submission history before retrying; the result may still be processing." : err.response?.data?.message || err.response?.data?.error || err.message || "Unknown submission error";
      const detailedOutput = err.response?.data?.compileOutput || "";
      
      setExecutionResult({
        output: `${errMsg}\n${detailedOutput}`,
        isError: true
      });
    } finally {
      setIsCompiling(false);
      setIsEvaluating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] bg-base-200">
        <Loader2 className="animate-spin text-black" size={48} />
        <span className="mt-4 font-black uppercase tracking-wider text-xs">Loading Workspace...</span>
      </div>
    );
  }

  if (error || !problem) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] bg-base-200 p-6 text-center">
        <AlertCircle className="text-rose-500 mb-4" size={56} />
        <h2 className="text-2xl font-black uppercase mb-2">{error || "Problem Unavailable"}</h2>
        <Link to="/problems" className="mt-4 px-6 py-3 border-4 border-black bg-white font-black uppercase text-sm shadow-[4px_4px_0px_0px_black] hover:bg-emerald-400 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_black] transition-all">
          Back to Problems
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full h-[calc(100vh-64px)] overflow-hidden bg-base-200 border-t-4 border-black font-sans text-black">
      <Group orientation="horizontal">
        
        {/* LEFT PANEL: Description (55%) */}
        <Panel defaultSize={55} minSize={30}>
          <div className="w-full h-full overflow-y-auto p-6 pb-24 bg-white custom-scrollbar space-y-6">
            {isEvaluating && (
              <div className="flex items-center gap-3 p-4 border-3 border-black bg-amber-300 text-black font-black uppercase text-xs tracking-wider animate-pulse shadow-[4px_4px_0px_0px_black] mb-4">
                <Loader2 className="animate-spin text-black" size={20} />
                <span>⏳ EVALUATING TEST CASES... CURRENTLY JUDGING SOLUTION MATRIX</span>
              </div>
            )}
            <div className={`space-y-3 transition-all duration-300 ${
              submissionStatus === 'AC' ? 'bg-emerald-400 p-4 border-4 border-black shadow-[4px_4px_0px_0px_black] mb-4' :
              submissionStatus === 'WA' ? 'bg-rose-400 p-4 border-4 border-black shadow-[4px_4px_0px_0px_black] mb-4' :
              submissionStatus === 'TLE' ? 'bg-amber-400 p-4 border-4 border-black shadow-[4px_4px_0px_0px_black] mb-4' :
              submissionStatus === 'MLE' ? 'bg-rose-400 p-4 border-4 border-black shadow-[4px_4px_0px_0px_black] mb-4' :
              submissionStatus === 'RE' ? 'bg-rose-400 p-4 border-4 border-black shadow-[4px_4px_0px_0px_black] mb-4' :
              'bg-white'
            }`}>
              <Link to={contestId ? `/contests/${contestId}` : "/problems"} className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-black transition-colors">
                <ChevronLeft size={16} /> {contestId ? "Back to Contest" : "Back to Problems"}
              </Link>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl lg:text-4xl font-black uppercase italic tracking-tight font-spartan text-black">
                  {problem.title}
                </h1>
                
                {/* Dynamic Status Badges */}
                {submissionStatus === 'AC' && (
                  <span className="badge rounded-none border-2 border-black bg-white text-black font-black uppercase text-xs px-2.5 py-1.5 shadow-[2px_2px_0px_0px_black]">
                    SOLVED 🎉
                  </span>
                )}
                {submissionStatus === 'WA' && (
                  <span className="badge rounded-none border-2 border-black bg-white text-black font-black uppercase text-xs px-2.5 py-1.5 shadow-[2px_2px_0px_0px_black]">
                    ATTEMPTED ❌
                  </span>
                )}
                {submissionStatus === 'TLE' && (
                  <span className="badge rounded-none border-2 border-black bg-white text-black font-black uppercase text-xs px-2.5 py-1.5 shadow-[2px_2px_0px_0px_black]">
                    OUT OF TIME ⏳
                  </span>
                )}

                {submissionStatus === 'MLE' && (
                  <span className="badge rounded-none border-2 border-black bg-white text-black font-black uppercase text-xs px-2.5 py-1.5 shadow-[2px_2px_0px_0px_black]">Memory Limit Exceeded</span>
                )}
                {submissionStatus === 'RE' && (
                  <span className="badge rounded-none border-2 border-black bg-white text-black font-black uppercase text-xs px-2.5 py-1.5 shadow-[2px_2px_0px_0px_black]">Runtime Error</span>
                )}
                <span className={`badge rounded-none border-2 border-black font-black uppercase text-xs text-black px-2 py-1 ${badgeForDifficulty(problem.difficulty)}`}>
                  {problem.difficulty}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {problem.tags?.map((tag) => (
                  <span key={tag} className="px-3 py-1 border-2 border-black font-black text-xs uppercase bg-slate-100 text-black shadow-[2px_2px_0px_0px_black]">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Problem Statement */}
            <div className="border-t-4 border-black pt-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Problem Statement</h2>
              <div 
                className="prose max-w-none text-black leading-relaxed font-medium"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(problem.statement) }}
              />
            </div>

            {/* Formats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t-4 border-black pt-6">
              <div className="p-4 border-4 border-black bg-slate-50 relative">
                <span className="absolute -top-3.5 left-4 bg-emerald-400 border-2 border-black px-2 font-black uppercase text-[10px] text-black">Input Format</span>
                <p className="text-sm font-bold text-slate-800 leading-relaxed mt-1">
                  {problem.inputFormat}
                </p>
              </div>
              <div className="p-4 border-4 border-black bg-slate-50 relative">
                <span className="absolute -top-3.5 left-4 bg-emerald-400 border-2 border-black px-2 font-black uppercase text-[10px] text-black">Output Format</span>
                <p className="text-sm font-bold text-slate-800 leading-relaxed mt-1">
                  {problem.outputFormat}
                </p>
              </div>
            </div>

            {/* Time and Memory Limits */}
            <div className="grid grid-cols-2 gap-4 border-t-4 border-black pt-6">
              <div className="flex justify-between items-center p-3 border-2 border-black bg-slate-50">
                <span className="text-[10px] font-black uppercase text-slate-400">Time Limit</span>
                <span className="font-black text-sm bg-white border-2 border-black px-2 py-0.5 shadow-[2px_2px_0px_0px_black] text-black">{problem.timeLimit} ms</span>
              </div>
              <div className="flex justify-between items-center p-3 border-2 border-black bg-slate-50">
                <span className="text-[10px] font-black uppercase text-slate-400">Memory Limit</span>
                <span className="font-black text-sm bg-white border-2 border-black px-2 py-0.5 shadow-[2px_2px_0px_0px_black] text-black">{problem.memoryLimit} MB</span>
              </div>
            </div>

            {/* Public Samples */}
            {problem.samples && problem.samples.length > 0 && (
              <div className="border-t-4 border-black pt-6 space-y-4">
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Sample Test Cases</h2>
                <div className="space-y-4">
                  {problem.samples.map((sample, idx) => (
                    <div key={idx} className="border-4 border-black rounded-none bg-slate-50 overflow-hidden shadow-[4px_4px_0px_0px_black]">
                      <div className="bg-slate-900 text-white px-4 py-2 border-b-2 border-black font-black uppercase text-[10px] tracking-wider flex justify-between">
                        <span>Sample Case #{idx + 1}</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 divide-y-2 md:divide-y-0 md:divide-x-2 divide-black">
                        <div className="p-4">
                          <span className="block font-black uppercase text-[8px] tracking-widest text-slate-400 mb-2">Input</span>
                          <pre className="font-mono text-xs bg-white border-2 border-black p-3 text-slate-800 overflow-x-auto whitespace-pre">{sample.input}</pre>
                        </div>
                        <div className="p-4">
                          <span className="block font-black uppercase text-[8px] tracking-widest text-slate-400 mb-2">Output</span>
                          <pre className="font-mono text-xs bg-white border-2 border-black p-3 text-slate-800 overflow-x-auto whitespace-pre">{sample.output}</pre>
                        </div>
                      </div>
                      {sample.explanation && (
                        <div className="p-4 bg-amber-50 border-t-2 border-black text-xs font-bold text-slate-700">
                          <span className="block font-black uppercase text-[8px] tracking-widest text-slate-400 mb-1">Explanation</span>
                          {sample.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Bottom Padding */}
            <div className="h-16" />
          </div>
        </Panel>

        {/* Horizontal Drag Handle */}
        <Separator className="w-2 bg-slate-200 hover:bg-black transition-colors border-l border-r border-black cursor-col-resize flex items-center justify-center" />

        {/* RIGHT PANEL: IDE & Console Stack (45%) */}
        <WorkspaceEditor workspace={workspace} problem={problem} />

      </Group>

      {/* Action Command Bar / Sticky Lower Footer */}
      <WorkspaceActions workspace={workspace} handleSubmitCode={handleSubmitCode} />
    </div>
  );
};

export default ProblemWorkspace;
