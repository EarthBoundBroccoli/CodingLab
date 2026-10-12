import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { Group, Panel, Separator } from "react-resizable-panels";
import axios from "axios";
import { getBackendURL, useSession } from "../lib/auth-client";
import { renderMarkdown } from "../lib/markdown";
import { Loader2, AlertCircle, Play, Send, ChevronLeft, Trophy, Clock } from "lucide-react";

const badgeForDifficulty = (difficulty) => {
  if (difficulty === "Easy") return "bg-emerald-300";
  if (difficulty === "Medium") return "bg-amber-300";
  return "bg-rose-300";
};

const boilerplates = {
  cpp: '#include <iostream>\nusing namespace std;\nint main() {\n    // Write your code here\n    return 0;\n}',
  python: '# Write your code here\ndef solve():\n    pass\n\nif __name__ == "__main__":\n    solve()',
  java: 'import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        // Write your code here\n    }\n}'
};

const getDurationText = (startTime, endTime) => {
  if (!startTime || !endTime) return "--";
  const diffMs = new Date(endTime).getTime() - new Date(startTime).getTime();
  if (diffMs <= 0) return "--";
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs / (1000 * 60)) % 60);
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
};

const ContestProblem = () => {
  const { contestId, problemId } = useParams();
  const { data: session } = useSession();

  const [contest, setContest] = useState(null);
  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [timeRemaining, setTimeRemaining] = useState("");
  const [submissionStatus, setSubmissionStatus] = useState("NEUTRAL");

  const [language, setLanguage] = useState("cpp");
  const [codeValue, setCodeValue] = useState(boilerplates.cpp);
  const prevLanguage = useRef("cpp");

  // Console execution states
  const [activeTab, setActiveTab] = useState("input");
  const [customInput, setCustomInput] = useState("");
  const [executionResult, setExecutionResult] = useState(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isRunningSandbox, setIsRunningSandbox] = useState(false);

  // Sync boilerplate when language is toggled
  useEffect(() => {
    if (prevLanguage.current !== language) {
      if (boilerplates[language]) {
        setCodeValue(boilerplates[language]);
      }
      prevLanguage.current = language;
    }
  }, [language]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [problemRes, contestRes] = await Promise.all([
          fetch(`${getBackendURL()}/api/problem/${problemId}`, { credentials: "include" }),
          fetch(`${getBackendURL()}/api/contests/${contestId}`, { credentials: "include" })
        ]);

        if (problemRes.ok && contestRes.ok) {
          const problemData = await problemRes.json();
          const contestData = await contestRes.json();
          setProblem(problemData);
          setContest(contestData);

          // Check if current user solved or attempted this problem in this contest
          if (session && contestData?.participants) {
            const currentUserId = session.user.id;
            const participant = contestData.participants.find(
              p => p.userId === currentUserId || p.userId?._id === currentUserId
            );
            if (participant) {
              const solved = participant.solved?.some(id => id.toString() === problemId.toString());
              if (solved) {
                setSubmissionStatus("AC");
              } else if (participant.penalty > 0 || participant.score > 0) {
                setSubmissionStatus("NEUTRAL");
              }
            }
          }
        } else {
          setError("Failed to load contest or problem details.");
        }
      } catch (err) {
        console.error("Error loading contest problem:", err);
        setError("Failed to connect to backend server.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [contestId, problemId, session]);

  // Timer logic
  useEffect(() => {
    if (!contest) return;

    const interval = setInterval(() => {
      const now = new Date();
      const start = new Date(contest.startTime);
      const end = new Date(contest.endTime);

      if (now < start) {
        setTimeRemaining(`Starts in: ${getDurationText(now, start)}`);
      } else if (now >= start && now <= end) {
        setTimeRemaining(`Ending in: ${getDurationText(now, end)}`);
      } else {
        setTimeRemaining("Contest Ended");
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [contest]);

  const handleEditorBeforeMount = (monaco) => {
    monaco.editor.defineTheme("codinglab-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#020617",
        "editor.lineHighlightBackground": "#0f172a",
        "editorLineNumber.foreground": "#475569",
        "editorLineNumber.activeForeground": "#10b981",
      },
    });
  };

  const handleRunCode = async () => {
    setIsRunningSandbox(true);
    setIsCompiling(true);
    setActiveTab("output");
    setExecutionResult(null);

    try {
      const response = await axios.post(`${getBackendURL()}/api/submissions/run`, {
        code: codeValue,
        language: language,
        customInput: customInput
      }, {
        headers: { "Content-Type": "application/json" },
        withCredentials: true
      });

      if (response.status === 200) {
        setExecutionResult({
          output: response.data.output,
          statusCode: response.data.statusCode,
          memory: response.data.memory,
          cpuTime: response.data.cpuTime,
          isError: false
        });
      } else {
        setExecutionResult({
          output: `Execution failed with status code ${response.status}`,
          isError: true
        });
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || "Unknown error";
      setExecutionResult({ output: errMsg, isError: true });
    } finally {
      setIsCompiling(false);
      setIsRunningSandbox(false);
    }
  };

  const handleSubmitCode = async () => {
    if (!problem) return;
    setIsCompiling(true);
    setIsEvaluating(true);
    setActiveTab("output");
    setExecutionResult(null);

    try {
      const response = await axios.post(
        `${getBackendURL()}/api/contests/${contestId}/submit`,
        {
          problemId: problem._id,
          code: codeValue,
          language: language
        },
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: true
        }
      );

      if (response.status === 200) {
        const { verdict, timeTaken, memoryUsed, compileOutput, evaluationVerdict } = response.data;
        const displayOutput = verdict === "Accepted" || evaluationVerdict === "AC"
          ? `✅ Verdict: ACCEPTED (AC)\n\nAll test cases passed successfully!`
          : `❌ Verdict: ${verdict ? verdict.toUpperCase() : "WRONG ANSWER"}\n\n${compileOutput || "One or more test cases failed or resource limits exceeded."}`;

        setExecutionResult({
          output: displayOutput,
          statusCode: verdict === "Accepted" || evaluationVerdict === "AC" ? 0 : 1,
          memory: memoryUsed,
          cpuTime: (timeTaken / 1000 || 0).toFixed(2),
          isError: verdict !== "Accepted" && evaluationVerdict !== "AC",
          verdict: evaluationVerdict
        });

        if (evaluationVerdict === "AC" || verdict === "Accepted") {
          setSubmissionStatus("AC");
        } else {
          setSubmissionStatus("WA");
        }
      } else {
        setExecutionResult({
          output: `Submission failed with status code ${response.status}`,
          isError: true
        });
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || "Unknown error";
      const compileOutput = err.response?.data?.compileOutput || "";
      setExecutionResult({
        output: `${errMsg}\n${compileOutput}`,
        isError: true
      });
      setSubmissionStatus("WA");
    } finally {
      setIsCompiling(false);
      setIsEvaluating(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-[calc(100vh-64px)] flex flex-col items-center justify-center bg-base-200 gap-4">
        <Loader2 className="animate-spin text-black" size={48} />
        <span className="font-spartan font-black text-xl tracking-wider text-black uppercase">Loading Contest Workspace...</span>
      </div>
    );
  }

  if (error || !problem) {
    return (
      <div className="w-full h-[calc(100vh-64px)] flex flex-col items-center justify-center bg-base-200 p-6">
        <div className="bg-white p-8 border-4 border-black neo-brutal max-w-md w-full space-y-4 text-center">
          <AlertCircle className="mx-auto text-rose-500" size={48} />
          <h2 className="text-2xl font-black uppercase text-black">Error</h2>
          <p className="font-bold text-slate-700">{error || "Problem not found."}</p>
          <Link to={`/contests/${contestId}`} className="btn bg-black text-white border-2 border-black rounded-none font-black uppercase w-full block py-3">
            Back to Contest
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[calc(100vh-64px)] overflow-hidden bg-base-200 border-t-4 border-black font-sans text-black">
      <Group orientation="horizontal">
        
        {/* LEFT PANEL: Description (55%) */}
        <Panel defaultSize={55} minSize={30}>
          <div className="w-full h-full overflow-y-auto p-6 bg-white custom-scrollbar space-y-6">
            {isEvaluating && (
              <div className="flex items-center gap-3 p-4 border-3 border-black bg-amber-300 text-black font-black uppercase text-xs tracking-wider animate-pulse shadow-[4px_4px_0px_0px_black] mb-4">
                <Loader2 className="animate-spin text-black" size={20} />
                <span>⏳ EVALUATING CONTEST SUBMISSION... CHECKING TEST CASES</span>
              </div>
            )}
            <div className={`space-y-3 transition-all duration-300 ${
              submissionStatus === 'AC' ? 'bg-emerald-400 p-4 border-4 border-black shadow-[4px_4px_0px_0px_black] mb-4' :
              submissionStatus === 'WA' ? 'bg-rose-400 p-4 border-4 border-black shadow-[4px_4px_0px_0px_black] mb-4' :
              'bg-white'
            }`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link to={`/contests/${contestId}`} className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-widest text-slate-600 hover:text-black transition-colors">
                  <ChevronLeft size={16} /> Back to {contest?.name || "Contest"}
                </Link>
                {timeRemaining && (
                  <div className="bg-black text-white px-3 py-1.5 border-2 border-black font-black uppercase text-xs tracking-wider shadow-[2px_2px_0px_0px_rgba(16,185,129,1)] flex items-center gap-1.5">
                    <Clock size={14} className="text-emerald-400" />
                    <span>{timeRemaining}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <h1 className="text-3xl lg:text-4xl font-black uppercase italic tracking-tight font-spartan text-black">
                  {problem.title}
                </h1>
                
                {submissionStatus === 'AC' && (
                  <span className="badge rounded-none border-2 border-black bg-white text-black font-black uppercase text-xs px-2.5 py-1.5 shadow-[2px_2px_0px_0px_black]">
                    ✅ SOLVED (+100 PTS)
                  </span>
                )}
                {submissionStatus === 'WA' && (
                  <span className="badge rounded-none border-2 border-black bg-white text-black font-black uppercase text-xs px-2.5 py-1.5 shadow-[2px_2px_0px_0px_black]">
                    ❌ ATTEMPTED (+20M PENALTY)
                  </span>
                )}
                {submissionStatus === 'NEUTRAL' && (
                  <span className="badge rounded-none border-2 border-black bg-slate-200 text-black font-black uppercase text-xs px-2.5 py-1.5 shadow-[2px_2px_0px_0px_black]">
                    UNSOLVED
                  </span>
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
                dangerouslySetInnerHTML={{ __html: typeof renderMarkdown === 'function' ? renderMarkdown(problem.statement) : problem.statement }}
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

        {/* Vertical Drag Handle */}
        <Separator className="w-2 bg-slate-200 hover:bg-black transition-colors border-l border-r border-black cursor-col-resize flex items-center justify-center" />

        {/* RIGHT PANEL: Editor + Console Strip (45%) */}
        <Panel defaultSize={45} minSize={25}>
          <Group orientation="vertical">
            
            {/* Top Panel: Monaco Editor */}
            <Panel defaultSize={65} minSize={30}>
              <div className="w-full h-full flex flex-col bg-[#020617] overflow-hidden">
                <div className="flex-1 min-h-0 relative">
                  <Editor
                    height="100%"
                    theme="codinglab-dark"
                    language={language}
                    value={codeValue}
                    onChange={(value) => setCodeValue(value || "")}
                    beforeMount={handleEditorBeforeMount}
                    loading={
                      <div className="flex flex-col items-center justify-center h-full bg-[#020617] text-slate-400 space-y-3 font-mono">
                        <Loader2 className="animate-spin text-emerald-400" size={32} />
                        <span className="text-xs uppercase font-black tracking-widest">Loading Editor...</span>
                      </div>
                    }
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      fontFamily: "Fira Code, Courier New, monospace",
                      automaticLayout: true,
                      padding: { top: 12, bottom: 12 },
                    }}
                  />
                </div>
              </div>
            </Panel>

            {/* Horizontal Drag Handle */}
            <Separator className="h-2 bg-slate-200 hover:bg-black transition-colors border-t border-b border-black cursor-row-resize flex items-center justify-center" />

            {/* Bottom Panel: Console Terminal */}
            <Panel defaultSize={35} minSize={20}>
              <div className="w-full h-full bg-[#020617] border-t-4 border-black flex flex-col text-slate-200 overflow-hidden">
                {/* Tab Header Strip */}
                <div className="flex bg-slate-900 border-b-2 border-black text-xs font-black uppercase tracking-wider select-none">
                  <button
                    onClick={() => setActiveTab("input")}
                    className={`px-4 py-2.5 border-r-2 border-black transition-colors cursor-pointer ${
                      activeTab === "input"
                        ? "bg-emerald-400 text-black font-black"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                    }`}
                  >
                    Custom Input
                  </button>
                  <button
                    onClick={() => setActiveTab("output")}
                    className={`px-4 py-2.5 border-r-2 border-black transition-colors cursor-pointer ${
                      activeTab === "output"
                        ? "bg-emerald-400 text-black font-black"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                    }`}
                  >
                    Result Output
                  </button>
                </div>

                {/* Tab Content Box */}
                <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                  {activeTab === "input" ? (
                    <textarea
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      placeholder="Provide custom standard input (stdin) parameters here..."
                      className="w-full h-full min-h-[60px] bg-transparent border-none outline-none resize-none font-mono text-sm text-slate-100 placeholder-slate-600 custom-scrollbar"
                    />
                  ) : (
                    <div className="w-full h-full font-mono text-sm leading-relaxed whitespace-pre-wrap select-text">
                      {isCompiling ? (
                        <div className="flex items-center gap-2 text-slate-400">
                          <Loader2 className="animate-spin text-emerald-400" size={16} />
                          <span className="text-xs uppercase font-black tracking-widest text-emerald-400 animate-pulse">Compiling script...</span>
                        </div>
                      ) : executionResult ? (
                        <div className="space-y-4">
                          <div className={executionResult.isError ? "text-rose-500 font-bold" : "text-slate-100"}>
                            {executionResult.output || "Empty output."}
                          </div>

                          {!executionResult.isError && (
                            <div className="flex flex-wrap gap-2 border-t border-slate-800 pt-3">
                              <span className="bg-slate-800 text-slate-300 px-2 py-0.5 text-xs font-bold border border-slate-700">
                                Memory: {executionResult.memory || 0} KB
                              </span>
                              <span className="bg-slate-800 text-slate-300 px-2 py-0.5 text-xs font-bold border border-slate-700">
                                CPU Time: {executionResult.cpuTime || "0.00"}s
                              </span>
                              <span className={`px-2 py-0.5 text-xs font-bold border ${
                                executionResult.statusCode === 0 ? "bg-emerald-950 text-emerald-400 border-emerald-800" : "bg-rose-950 text-rose-400 border-rose-800"
                              }`}>
                                Exit Code: {executionResult.statusCode}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-slate-500 italic text-xs">
                          Run code or submit solution to view outputs...
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Panel>

          </Group>
        </Panel>

      </Group>

      {/* Action Command Bar / Sticky Lower Footer */}
      <div className="fixed bottom-0 left-0 right-0 h-[64px] bg-white border-t-4 border-black p-4 flex items-center justify-between z-20 shadow-[0_-4px_0_0_#000]">
        {/* Language Selection */}
        <div className="flex items-center gap-2">
          <label htmlFor="language-select" className="text-[10px] font-black uppercase tracking-widest text-black">Language:</label>
          <select
            id="language-select"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="p-2 border-4 border-black bg-white font-black uppercase text-xs sm:text-sm outline-none select-none rounded-none focus:bg-emerald-400 focus:text-black cursor-pointer transition-colors text-black"
          >
            <option value="cpp">C++ (GCC 20)</option>
            <option value="java">Java (OpenJDK 17)</option>
            <option value="python">Python (CPython 3.10)</option>
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRunCode}
            disabled={isCompiling || isEvaluating || isRunningSandbox}
            className={`px-4 py-2 border-4 border-black bg-white font-black uppercase text-xs sm:text-sm shadow-[3px_3px_0px_0px_black] transition-all flex items-center gap-1 text-black ${
              isCompiling || isEvaluating || isRunningSandbox
                ? "opacity-50 cursor-not-allowed shadow-none translate-x-[1px] translate-y-[1px]"
                : "hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_black] hover:bg-slate-100 cursor-pointer"
            }`}
          >
            {isRunningSandbox ? (
              <>
                <Loader2 className="animate-spin" size={16} /> Compiling...
              </>
            ) : (
              <>
                <Play size={16} /> Run Code
              </>
            )}
          </button>
          <button
            type="button"
            disabled={isCompiling || isEvaluating || isRunningSandbox}
            onClick={handleSubmitCode}
            className={`px-4 py-2 border-4 border-black bg-slate-900 text-white font-black uppercase text-xs sm:text-sm shadow-[3px_3px_0px_0px_black] transition-all flex items-center gap-1 ${
              isCompiling || isEvaluating || isRunningSandbox
                ? "opacity-50 cursor-not-allowed shadow-none translate-x-[1px] translate-y-[1px]"
                : "hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_black] hover:bg-emerald-400 hover:text-black cursor-pointer"
            }`}
          >
            {isEvaluating ? (
              <>
                <Loader2 className="animate-spin" size={16} /> Evaluating...
              </>
            ) : (
              <>
                <Send size={16} /> Submit to Contest
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContestProblem;
