import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import Editor from "@monaco-editor/react";
import axios from "axios";
import { getBackendURL, useSession } from "../lib/auth-client";
import { renderMarkdown } from "../lib/markdown";
import {
  Calendar, Clock, Trophy, Users, AlertCircle, ArrowLeft,
  Loader2, Play, Send, ChevronDown, ChevronUp, Check, X
} from "lucide-react";

// ─── Helpers ────────────────────────────────────────────────────────────────────

const formatDateTime = (value) => {
  if (!value) return "--";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "--";
  return date.toLocaleString([], {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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

const difficultyBadge = (d) =>
  d === "Easy" ? "bg-emerald-300" : d === "Medium" ? "bg-amber-300" : "bg-rose-300";

const boilerplates = {
  cpp: '#include <iostream>\nusing namespace std;\nint main() {\n    // Write your code here\n    return 0;\n}',
  python: '# Write your code here\ndef solve():\n    pass\n\nif __name__ == "__main__":\n    solve()',
  java: 'import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        // Write your code here\n    }\n}'
};

// ─── Component ──────────────────────────────────────────────────────────────────

const ContestDetail = () => {
  const { id } = useParams();
  const { data: session } = useSession();

  // Data state
  const [contest, setContest] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [timeRemaining, setTimeRemaining] = useState("");
  const [registering, setRegistering] = useState(false);
  const [toast, setToast] = useState(null);

  // Editor state
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [language, setLanguage] = useState("cpp");
  const [codeValue, setCodeValue] = useState(boilerplates.cpp);
  const prevLanguage = useRef("cpp");
  const [customInput, setCustomInput] = useState("");
  const [activeConsoleTab, setActiveConsoleTab] = useState("input");
  const [executionResult, setExecutionResult] = useState(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isRunningSandbox, setIsRunningSandbox] = useState(false);

  // Track solved problems in this contest for the current user
  const [solvedProblemIds, setSolvedProblemIds] = useState(new Set());

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  // ─── Data Fetching ──────────────────────────────────────────────────────────

  const fetchContestDetails = useCallback(async () => {
    try {
      const response = await fetch(`${getBackendURL()}/api/contests/${id}`, {
        credentials: "include"
      });
      if (response.ok) {
        const data = await response.json();
        setContest(data);

        // Extract solved problem IDs for current user
        if (session?.user?.id && data.participants) {
          const myEntry = data.participants.find(
            p => p.userId === session.user.id ||
                 p.userId?._id === session.user.id ||
                 p.userId?.toString() === session.user.id
          );
          if (myEntry?.solved) {
            setSolvedProblemIds(new Set(myEntry.solved.map(s => s.toString())));
          }
        }
      } else {
        setError("Failed to fetch contest details");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to connect to server");
    }
  }, [id, session]);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const response = await fetch(`${getBackendURL()}/api/contests/${id}/leaderboard`, {
        credentials: "include"
      });
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data);
      }
    } catch (err) {
      console.error(err);
    }
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    setError("");
    await Promise.all([fetchContestDetails(), fetchLeaderboard()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [id]);

  // Timer logic
  useEffect(() => {
    if (!contest) return;

    const interval = setInterval(() => {
      const now = new Date();
      const start = new Date(contest.startTime);
      const end = new Date(contest.endTime);

      if (now < start) {
        const diff = start - now;
        const hrs = Math.floor(diff / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setTimeRemaining(`Starts in: ${hrs}h ${mins}m ${secs}s`);
      } else if (now >= start && now <= end) {
        const diff = end - now;
        const hrs = Math.floor(diff / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setTimeRemaining(`Ends in: ${hrs}h ${mins}m ${secs}s`);
      } else {
        setTimeRemaining("Contest Ended");
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [contest]);

  // Language toggle → update boilerplate
  useEffect(() => {
    if (prevLanguage.current !== language) {
      if (boilerplates[language]) {
        setCodeValue(boilerplates[language]);
      }
      prevLanguage.current = language;
    }
  }, [language]);

  // ─── Registration ───────────────────────────────────────────────────────────

  const handleRegister = async () => {
    if (registering) return;
    setRegistering(true);
    try {
      const response = await fetch(`${getBackendURL()}/api/contests/${id}/register`, {
        method: "POST",
        credentials: "include"
      });
      if (response.ok) {
        showToast("Registered successfully!");
        await fetchContestDetails();
        await fetchLeaderboard();
      } else {
        const errorData = await response.json();
        showToast(errorData.message || "Failed to register");
      }
    } catch (err) {
      console.error(err);
      showToast("Error connecting to server");
    } finally {
      setRegistering(false);
    }
  };

  // ─── Code Execution ────────────────────────────────────────────────────────

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
    setActiveConsoleTab("output");
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
    if (!selectedProblem) return;
    setIsCompiling(true);
    setIsEvaluating(true);
    setActiveConsoleTab("output");
    setExecutionResult(null);

    try {
      const response = await axios.post(
        `${getBackendURL()}/api/contests/${id}/submit`,
        {
          problemId: selectedProblem._id,
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
        const displayOutput = verdict === "Accepted"
          ? `✅ Verdict: ACCEPTED (AC)\n\nAll test cases passed successfully!`
          : `❌ Verdict: ${verdict.toUpperCase()}\n\n${compileOutput || "One or more test cases failed or resource limits exceeded."}`;

        setExecutionResult({
          output: displayOutput,
          statusCode: verdict === "Accepted" ? 0 : 1,
          memory: memoryUsed,
          cpuTime: (timeTaken / 1000).toFixed(2),
          isError: verdict !== "Accepted",
          verdict: evaluationVerdict
        });

        // If AC, mark this problem as solved locally and refresh data
        if (evaluationVerdict === "AC") {
          setSolvedProblemIds(prev => new Set([...prev, selectedProblem._id.toString()]));
          showToast("🎉 Accepted! +100 points");
          // Refresh leaderboard
          fetchLeaderboard();
          fetchContestDetails();
        } else {
          showToast(`Verdict: ${verdict}`);
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
      showToast(errMsg);
    } finally {
      setIsCompiling(false);
      setIsEvaluating(false);
    }
  };

  // ─── Select a problem to solve ─────────────────────────────────────────────

  const handleSelectProblem = (problem) => {
    if (selectedProblem?._id === problem._id) {
      // Toggle off
      setSelectedProblem(null);
      setExecutionResult(null);
      return;
    }
    setSelectedProblem(problem);
    setExecutionResult(null);
    setActiveConsoleTab("input");
    setCustomInput("");
    // Reset code to boilerplate
    setCodeValue(boilerplates[language]);
  };

  // ─── Loading / Error States ─────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <span className="loading loading-ring loading-lg text-black"></span>
      </div>
    );
  }

  if (error || !contest) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="bg-white border-4 border-black p-8 neo-brutal flex flex-col items-center justify-center text-center gap-4 text-black">
          <AlertCircle size={64} className="text-red-500" />
          <h2 className="text-2xl font-black uppercase font-spartan">Contest Not Found</h2>
          <p className="font-bold text-slate-500">{error || "The requested contest does not exist."}</p>
          <Link to="/contests" className="btn bg-black text-white border-2 border-black rounded-none font-black uppercase hover:bg-emerald-400 hover:text-black">
            Back to Contests
          </Link>
        </div>
      </div>
    );
  }

  const isRegistered = session && contest.participants.some(p => p.userId === session.user.id || p.userId?._id === session.user.id);
  const isEnded = contest.status === "Ended";
  const isOngoing = contest.status === "Ongoing";

  return (
    <div className="max-w-[1400px] mx-auto py-8 px-4 lg:px-8 space-y-6 text-black">
      {toast && (
        <div className="fixed right-4 bottom-4 z-50 bg-emerald-400 text-black border-4 border-black px-4 py-3 font-black uppercase text-xs shadow-[4px_4px_0px_0px_black] animate-pulse">
          {toast}
        </div>
      )}

      {/* Back button */}
      <div>
        <Link to="/contests" className="inline-flex items-center gap-2 font-black uppercase text-xs hover:text-emerald-500 transition-colors">
          <ArrowLeft size={16} /> Back to Contests
        </Link>
      </div>

      {/* ─── Header Card ────────────────────────────────────────────────── */}
      <div className="bg-white border-4 border-black p-6 lg:p-8 neo-brutal flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-4 max-w-3xl">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl lg:text-4xl font-black uppercase font-spartan leading-tight">{contest.name}</h1>
            <span className={`badge rounded-none border-2 border-black font-black uppercase text-[10px] text-black ${
              contest.status === "Upcoming" ? "bg-sky-300" :
              contest.status === "Ongoing" ? "bg-emerald-300" : "bg-slate-300"
            }`}>
              {contest.status}
            </span>
          </div>
          <p className="font-bold text-sm text-slate-600 leading-relaxed">{contest.description || "No description provided."}</p>

          <div className="flex flex-wrap gap-6 pt-2 text-xs font-black uppercase">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-emerald-500" />
              <span>Starts: {formatDateTime(contest.startTime)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-emerald-500" />
              <span>Duration: {getDurationText(contest.startTime, contest.endTime)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users size={18} className="text-emerald-500" />
              <span>{contest.participants.length} Registered</span>
            </div>
          </div>
        </div>

        <div className="w-full md:w-auto flex flex-col gap-3">
          {timeRemaining && (
            <div className="bg-black text-white p-3 border-2 border-black font-black uppercase text-center text-xs tracking-wider shadow-[3px_3px_0px_0px_rgba(16,185,129,1)]">
              {timeRemaining}
            </div>
          )}

          {!isRegistered && !isEnded && (
            <button
              onClick={handleRegister}
              disabled={registering}
              className="btn w-full md:w-48 bg-emerald-400 text-black border-4 border-black rounded-none font-black uppercase hover:bg-emerald-500 shadow-[4px_4px_0px_0px_black] active:translate-x-1 active:translate-y-1 active:shadow-none cursor-pointer"
            >
              {registering ? "Registering..." : "Register Now"}
            </button>
          )}

          {isRegistered && (
            <div className="bg-emerald-100 text-emerald-800 border-2 border-emerald-500 p-3 font-black uppercase text-center text-xs rounded-none">
              ✓ Registered
            </div>
          )}
        </div>
      </div>

      {/* ─── Main Content Grid ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">

        {/* ─── Left: Problems + Editor (60%) ──────────────────────────── */}
        <div className="lg:col-span-6 space-y-6">

          {/* Problems List */}
          <div className="bg-white border-4 border-black neo-brutal overflow-hidden">
            <div className="bg-emerald-400 p-4 border-b-4 border-black">
              <h2 className="text-xl lg:text-2xl font-black uppercase font-spartan text-black">Contest Problems</h2>
            </div>
            <div className="divide-y-2 divide-black">
              {contest.status === "Upcoming" ? (
                <div className="p-8 text-center text-slate-500 font-bold uppercase text-xs flex flex-col items-center justify-center gap-2">
                  <span>🔒 Problems will be revealed when the contest starts.</span>
                </div>
              ) : !isRegistered && !isEnded ? (
                <div className="p-8 text-center text-slate-500 font-bold uppercase text-xs">
                  Register for this contest to view and solve the problems.
                </div>
              ) : contest.problems && contest.problems.length > 0 ? (
                contest.problems.map((problem, index) => {
                  const isSolved = solvedProblemIds.has(problem._id?.toString());
                  const isSelected = selectedProblem?._id === problem._id;
                  return (
                    <div key={problem._id} className={`transition-all ${isSelected ? "bg-emerald-50" : "hover:bg-slate-50"}`}>
                      <div className="p-5 flex justify-between items-center group cursor-pointer" onClick={() => isOngoing ? handleSelectProblem(problem) : null}>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-3">
                            <span className="font-black text-slate-400 text-xl font-spartan">
                              {String.fromCharCode(65 + index)}
                            </span>
                            <h3 className="text-lg font-black uppercase italic group-hover:text-emerald-500 transition-colors">
                              {problem.title}
                            </h3>
                            {isSolved && (
                              <span className="bg-emerald-400 text-black border-2 border-black px-2 py-0.5 font-black uppercase text-[8px] flex items-center gap-1">
                                <Check size={10} /> Solved
                              </span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <span className={`badge rounded-none border-2 border-black font-black uppercase text-[8px] text-black ${difficultyBadge(problem.difficulty)}`}>
                              {problem.difficulty}
                            </span>
                            {problem.timeLimit && (
                              <span className="badge rounded-none border border-slate-300 font-bold text-[8px] text-slate-500 bg-white">
                                {problem.timeLimit}ms
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isOngoing && !isSolved && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleSelectProblem(problem); }}
                              className={`btn btn-sm border-2 border-black rounded-none font-black uppercase cursor-pointer ${
                                isSelected
                                  ? "bg-slate-900 text-white hover:bg-slate-700"
                                  : "bg-black text-white hover:bg-emerald-400 hover:text-black"
                              }`}
                            >
                              {isSelected ? <><ChevronUp size={14} /> Close</> : <><ChevronDown size={14} /> Solve</>}
                            </button>
                          )}
                          {isOngoing && isSolved && (
                            <span className="text-emerald-600 font-black text-xs uppercase">+100 pts</span>
                          )}
                          {!isOngoing && (
                            <Link
                              to={`/problems/${problem._id}`}
                              className="btn btn-sm bg-slate-200 text-black border-2 border-black rounded-none font-black uppercase hover:bg-slate-300 cursor-pointer"
                            >
                              View
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-slate-500 font-bold uppercase text-xs">
                  No problems are linked to this contest.
                </div>
              )}
            </div>
          </div>

          {/* ─── Inline Code Editor (when problem selected + contest Ongoing) ── */}
          {selectedProblem && isOngoing && isRegistered && (
            <div className="bg-white border-4 border-black neo-brutal overflow-hidden">
              {/* Editor Header */}
              <div className="bg-slate-900 p-4 border-b-4 border-black flex flex-wrap justify-between items-center gap-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-black uppercase text-white font-spartan tracking-tight">
                    Solving: {selectedProblem.title}
                  </h3>
                  <span className={`badge rounded-none border-2 border-black font-black uppercase text-[8px] text-black ${difficultyBadge(selectedProblem.difficulty)}`}>
                    {selectedProblem.difficulty}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="p-2 border-2 border-black bg-white font-black uppercase text-xs outline-none rounded-none focus:bg-emerald-400 focus:text-black cursor-pointer transition-colors text-black"
                  >
                    <option value="cpp">C++ (GCC 20)</option>
                    <option value="java">Java (OpenJDK 17)</option>
                    <option value="python">Python (3.10)</option>
                  </select>
                </div>
              </div>

              {/* Problem Statement Collapsible */}
              <ProblemStatementPanel problem={selectedProblem} />

              {/* Monaco Editor */}
              <div className="h-[400px] bg-[#020617]">
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

              {/* Console Panel */}
              <div className="bg-[#020617] border-t-4 border-black">
                {/* Tab Header */}
                <div className="flex bg-slate-900 border-b-2 border-black text-xs font-black uppercase tracking-wider select-none">
                  <button
                    onClick={() => setActiveConsoleTab("input")}
                    className={`px-4 py-2.5 border-r-2 border-black transition-colors cursor-pointer ${
                      activeConsoleTab === "input"
                        ? "bg-emerald-400 text-black"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                    }`}
                  >
                    Custom Input
                  </button>
                  <button
                    onClick={() => setActiveConsoleTab("output")}
                    className={`px-4 py-2.5 border-r-2 border-black transition-colors cursor-pointer ${
                      activeConsoleTab === "output"
                        ? "bg-emerald-400 text-black"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                    }`}
                  >
                    Result Output
                  </button>
                </div>

                {/* Tab Body */}
                <div className="p-4 min-h-[120px] max-h-[200px] overflow-auto custom-scrollbar">
                  {activeConsoleTab === "input" ? (
                    <textarea
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      placeholder="Provide custom standard input (stdin)..."
                      className="w-full h-full min-h-[80px] bg-transparent border-none outline-none resize-none font-mono text-sm text-slate-100 placeholder-slate-600"
                    />
                  ) : (
                    <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap select-text">
                      {isCompiling ? (
                        <div className="flex items-center gap-2 text-slate-400">
                          <Loader2 className="animate-spin text-emerald-400" size={16} />
                          <span className="text-xs uppercase font-black tracking-widest text-emerald-400 animate-pulse">
                            {isEvaluating ? "Evaluating test cases..." : "Compiling..."}
                          </span>
                        </div>
                      ) : executionResult ? (
                        <div className="space-y-3">
                          <div className={executionResult.isError ? "text-rose-400 font-bold" : "text-slate-100"}>
                            {executionResult.output || "Empty output."}
                          </div>
                          {!executionResult.isError && (
                            <div className="flex flex-wrap gap-2 border-t border-slate-800 pt-3">
                              <span className="bg-slate-800 text-slate-300 px-2 py-0.5 text-xs font-bold border border-slate-700">
                                Memory: {executionResult.memory || 0} KB
                              </span>
                              <span className="bg-slate-800 text-slate-300 px-2 py-0.5 text-xs font-bold border border-slate-700">
                                CPU: {executionResult.cpuTime || "0.00"}s
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-slate-500 italic text-xs">
                          Run or submit code to see results...
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Bar */}
              <div className="bg-white border-t-4 border-black p-4 flex flex-wrap justify-between items-center gap-3">
                <button
                  type="button"
                  onClick={() => { setSelectedProblem(null); setExecutionResult(null); }}
                  className="px-3 py-2 border-2 border-black bg-slate-100 font-black uppercase text-xs hover:bg-slate-200 cursor-pointer text-black"
                >
                  ← Close Editor
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRunCode}
                    disabled={isCompiling || isEvaluating || isRunningSandbox}
                    className={`px-4 py-2 border-4 border-black bg-white font-black uppercase text-xs shadow-[3px_3px_0px_0px_black] transition-all flex items-center gap-1 text-black ${
                      isCompiling || isEvaluating || isRunningSandbox
                        ? "opacity-50 cursor-not-allowed shadow-none translate-x-[1px] translate-y-[1px]"
                        : "hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_black] hover:bg-slate-100 cursor-pointer"
                    }`}
                  >
                    {isRunningSandbox ? <><Loader2 className="animate-spin" size={14} /> Compiling...</> : <><Play size={14} /> Run Code</>}
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitCode}
                    disabled={isCompiling || isEvaluating || isRunningSandbox}
                    className={`px-4 py-2 border-4 border-black bg-slate-900 text-white font-black uppercase text-xs shadow-[3px_3px_0px_0px_black] transition-all flex items-center gap-1 ${
                      isCompiling || isEvaluating || isRunningSandbox
                        ? "opacity-50 cursor-not-allowed shadow-none translate-x-[1px] translate-y-[1px]"
                        : "hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_black] hover:bg-emerald-400 hover:text-black cursor-pointer"
                    }`}
                  >
                    {isEvaluating ? <><Loader2 className="animate-spin" size={14} /> Evaluating...</> : <><Send size={14} /> Submit</>}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ─── Right: Leaderboard (40%) ──────────────────────────────── */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border-4 border-black neo-brutal overflow-hidden">
            <div className="bg-slate-900 p-4 border-b-4 border-black flex items-center gap-2">
              <Trophy size={20} className="text-amber-400" />
              <h2 className="text-xl lg:text-2xl font-black uppercase font-spartan text-white">Leaderboard</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="table table-compact w-full text-black">
                <thead className="bg-slate-100 border-b-2 border-black">
                  <tr>
                    <th className="font-black uppercase text-xs text-black">#</th>
                    <th className="font-black uppercase text-xs text-black">User</th>
                    <th className="font-black uppercase text-xs text-black text-center">Score</th>
                    <th className="font-black uppercase text-xs text-black text-center">Solved</th>
                    <th className="font-black uppercase text-xs text-black text-right">Penalty</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 font-bold uppercase text-xs text-slate-500">
                        No submissions yet
                      </td>
                    </tr>
                  ) : (
                    leaderboard.map((participant, index) => {
                      const isMe = session && (
                        participant.userId?._id === session.user.id ||
                        participant.userId === session.user.id
                      );
                      return (
                        <tr key={participant._id || index} className={`border-b border-slate-200 ${isMe ? "bg-emerald-50 font-black" : "hover:bg-slate-50"}`}>
                          <td className="font-black text-sm">
                            {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}
                          </td>
                          <td className="font-bold text-xs uppercase">
                            {participant.userId?.name || "Anonymous"}
                            {isMe && <span className="text-emerald-500 ml-1">(You)</span>}
                          </td>
                          <td className="font-black text-sm text-center text-black">{participant.score || 0}</td>
                          <td className="font-black text-sm text-center text-emerald-600">{participant.solved?.length || 0}</td>
                          <td className="font-black text-xs text-right text-red-500">{participant.penalty || 0}m</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Contest Info Card */}
          <div className="bg-white border-4 border-black neo-brutal overflow-hidden">
            <div className="bg-amber-400 p-3 border-b-4 border-black">
              <h3 className="text-xs font-black uppercase tracking-widest text-black">Contest Info</h3>
            </div>
            <div className="p-4 space-y-3 text-xs">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="font-black uppercase text-slate-500">Problems</span>
                <span className="font-black text-black">{contest.status === "Upcoming" ? "Hidden" : contest.problems?.length || 0}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="font-black uppercase text-slate-500">Scoring</span>
                <span className="font-black text-black">100 pts / problem</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="font-black uppercase text-slate-500">Penalty</span>
                <span className="font-black text-black">+20m / wrong attempt</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-black uppercase text-slate-500">Tiebreak</span>
                <span className="font-black text-black">Lower penalty wins</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Problem Statement Collapsible Sub-Component ────────────────────────────

const ProblemStatementPanel = ({ problem }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b-2 border-black">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex justify-between items-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer border-b border-slate-200"
      >
        <span className="text-xs font-black uppercase tracking-widest text-slate-600">
          Problem Statement & Details
        </span>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {expanded && (
        <div className="p-5 bg-white space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
          {/* Statement */}
          {problem.statement && (
            <div>
              <h4 className="text-[10px] font-black uppercase text-slate-400 mb-2">Statement</h4>
              <div
                className="prose max-w-none text-black leading-relaxed font-medium text-sm"
                dangerouslySetInnerHTML={{ __html: typeof renderMarkdown === 'function' ? renderMarkdown(problem.statement) : problem.statement }}
              />
            </div>
          )}

          {/* Input/Output Format */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {problem.inputFormat && (
              <div className="p-3 border-2 border-black bg-slate-50">
                <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">Input Format</span>
                <p className="text-xs font-bold text-slate-700">{problem.inputFormat}</p>
              </div>
            )}
            {problem.outputFormat && (
              <div className="p-3 border-2 border-black bg-slate-50">
                <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">Output Format</span>
                <p className="text-xs font-bold text-slate-700">{problem.outputFormat}</p>
              </div>
            )}
          </div>

          {/* Limits */}
          <div className="flex gap-4">
            {problem.timeLimit && (
              <div className="flex items-center gap-2 text-xs">
                <span className="font-black uppercase text-slate-400">Time:</span>
                <span className="font-black bg-white border-2 border-black px-2 py-0.5 text-black">{problem.timeLimit}ms</span>
              </div>
            )}
            {problem.memoryLimit && (
              <div className="flex items-center gap-2 text-xs">
                <span className="font-black uppercase text-slate-400">Memory:</span>
                <span className="font-black bg-white border-2 border-black px-2 py-0.5 text-black">{problem.memoryLimit}MB</span>
              </div>
            )}
          </div>

          {/* Sample Cases */}
          {problem.samples && problem.samples.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-[10px] font-black uppercase text-slate-400">Sample Cases</h4>
              {problem.samples.map((sample, idx) => (
                <div key={idx} className="border-2 border-black bg-slate-50 overflow-hidden">
                  <div className="bg-slate-800 text-white px-3 py-1.5 text-[9px] font-black uppercase tracking-wider">
                    Case #{idx + 1}
                  </div>
                  <div className="grid grid-cols-2 divide-x-2 divide-black">
                    <div className="p-3">
                      <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">Input</span>
                      <pre className="font-mono text-xs bg-white border border-slate-300 p-2 text-slate-800 whitespace-pre overflow-x-auto">{sample.input}</pre>
                    </div>
                    <div className="p-3">
                      <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">Output</span>
                      <pre className="font-mono text-xs bg-white border border-slate-300 p-2 text-slate-800 whitespace-pre overflow-x-auto">{sample.output}</pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ContestDetail;
