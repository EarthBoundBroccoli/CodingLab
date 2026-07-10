import { useEffect, useState, useRef } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { Group, Panel, Separator } from "react-resizable-panels";
import axios from "axios";
import { getBackendURL } from "../lib/auth-client";
import { renderMarkdown } from "../lib/markdown";
import { Loader2, AlertCircle, Play, Send, ChevronLeft } from "lucide-react";

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

const ProblemWorkspace = () => {
  const { id } = useParams();
  const location = useLocation();
  const prefillCode = location.state?.prefillCode;
  const prefillLanguage = location.state?.prefillLanguage;

  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [language, setLanguage] = useState(prefillLanguage || "cpp");
  const [codeValue, setCodeValue] = useState(prefillCode || boilerplates[prefillLanguage || "cpp"]);
  const prevLanguage = useRef(prefillLanguage || "cpp");

  // Console execution states
  const [activeTab, setActiveTab] = useState("input");
  const [customInput, setCustomInput] = useState("");
  const [executionResult, setExecutionResult] = useState(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState("NEUTRAL");
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
              withCredentials: true
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

  const handleEditorBeforeMount = (monaco) => {
    monaco.editor.defineTheme("codinglab-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#020617", // Deep dark-indigo backdrop
        "editor.lineHighlightBackground": "#0f172a", // Subtle dark row highlight
        "editorLineNumber.foreground": "#475569", // Muted slate line numbers
        "editorLineNumber.activeForeground": "#10b981", // Active line emerald highlight
      },
    });
  };

  const handleRunCode = async () => {
    setIsRunningSandbox(true);
    setIsCompiling(true);
    setActiveTab("output");
    setExecutionResult(null);

    try {
      console.log("Sending code run request to compilation backend...");
      const response = await axios.post(`${getBackendURL()}/api/submissions/run`, {
        code: codeValue,
        language: language,
        customInput: customInput
      }, {
        headers: {
          "Content-Type": "application/json"
        },
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
      console.error("Compilation / Network Execution error:", err);
      const errMsg = err.response?.data?.message || err.response?.data?.error || err.message || "Unknown compilation error";
      const detailedOutput = err.response?.data?.error?.output || "";
      
      setExecutionResult({
        output: `${errMsg}\n${detailedOutput}`,
        isError: true
      });
    } finally {
      setIsCompiling(false);
      setIsRunningSandbox(false);
    }
  };

  const handleSubmitCode = async () => {
    setIsCompiling(true);
    setIsEvaluating(true);
    setActiveTab("output");
    setExecutionResult(null);

    try {
      console.log("Submitting code to compilation and grading backend...");
      const response = await axios.post(`${getBackendURL()}/api/submissions/submit`, {
        problemId: id,
        code: codeValue,
        language: language
      }, {
        headers: {
          "Content-Type": "application/json"
        },
        withCredentials: true
      });

      if (response.status === 200) {
        const { verdict, timeTaken, memoryUsed, compileOutput, evaluationVerdict } = response.data;
        const displayOutput = verdict === "Accepted"
          ? `Verdict: ACCEPTED (AC)\n\nCongratulations! All test cases passed successfully.`
          : `Verdict: ${verdict.toUpperCase()}\n\n${compileOutput || "One or more test cases failed or resource limits were exceeded."}`;
        
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
      const errMsg = err.response?.data?.message || err.response?.data?.error || err.message || "Unknown submission error";
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
          <div className="w-full h-full overflow-y-auto p-6 bg-white custom-scrollbar space-y-6">
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
              'bg-white'
            }`}>
              <Link to="/problems" className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-black transition-colors">
                <ChevronLeft size={16} /> Back to Problems
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
          </div>
        </Panel>

        {/* Horizontal Drag Handle */}
        <Separator className="w-2 bg-slate-200 hover:bg-black transition-colors border-l border-r border-black cursor-col-resize flex items-center justify-center" />

        {/* RIGHT PANEL: IDE & Console Stack (45%) */}
        <Panel defaultSize={45} minSize={30}>
          <Group orientation="vertical">
            
            {/* Upper Panel: Monaco Editor */}
            <Panel defaultSize={65} minSize={40}>
              <div className="w-full h-full p-4 bg-slate-950 flex flex-col">
                <div className="w-full h-full border-4 border-black neo-brutal overflow-hidden">
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

            {/* Vertical Drag Handle */}
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
                          {/* Raw Output Window */}
                          <div className={executionResult.isError ? "text-rose-500 font-bold" : "text-slate-100"}>
                            {executionResult.output || "Empty output."}
                          </div>

                          {/* Stats Badges */}
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
                          Run code to view compilation outputs...
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
            className="p-2 border-4 border-black bg-white font-black uppercase text-xs outline-none select-none rounded-none focus:bg-emerald-400 focus:text-black cursor-pointer transition-colors text-black"
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
                <Send size={16} /> Submit Code
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProblemWorkspace;
