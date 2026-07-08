import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Editor from "@monaco-editor/react";
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
  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [language, setLanguage] = useState("cpp");
  const [codeValue, setCodeValue] = useState("");

  // Sync boilerplate when language is toggled
  useEffect(() => {
    if (boilerplates[language]) {
      setCodeValue(boilerplates[language]);
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
    // Custom codinglab-dark editor theme mapping to deep dark-indigo visual palette
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
    <div className="flex flex-col lg:flex-row w-full h-[calc(100vh-64px)] overflow-hidden bg-base-200 border-t-4 border-black animate-in fade-in duration-350">
      {/* LEFT PANEL: Description (60%) */}
      <div className="w-full lg:w-[60%] h-full overflow-y-auto p-6 border-b-4 lg:border-b-0 lg:border-r-4 border-black space-y-6 custom-scrollbar bg-white">
        <div className="space-y-3">
          <Link to="/problems" className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-black transition-colors">
            <ChevronLeft size={16} /> Back to Problems
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl lg:text-4xl font-black uppercase italic tracking-tight font-spartan text-black">
              {problem.title}
            </h1>
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

      {/* RIGHT PANEL: Monaco Editor & Control Strip (40%) */}
      <div className="w-full lg:w-[40%] h-full flex flex-col bg-slate-900">
        {/* Monaco Editor Container with Neo-Brutalist Border */}
        <div className="flex-1 p-4 bg-slate-950 border-b-4 border-black">
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

        {/* Lower Control Bar */}
        <div className="p-4 bg-white border-t-4 border-black flex flex-wrap gap-4 items-center justify-between shadow-[0_-4px_0_0_#000]">
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
              className="px-4 py-2 border-4 border-black bg-white font-black uppercase text-xs sm:text-sm shadow-[3px_3px_0px_0px_black] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_black] hover:bg-slate-100 transition-all flex items-center gap-1 text-black cursor-pointer"
            >
              <Play size={16} /> Run Code
            </button>
            <button
              type="button"
              className="px-4 py-2 border-4 border-black bg-slate-900 text-white font-black uppercase text-xs sm:text-sm shadow-[3px_3px_0px_0px_black] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_black] hover:bg-emerald-400 hover:text-black transition-all flex items-center gap-1 cursor-pointer"
            >
              <Send size={16} /> Submit Code
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProblemWorkspace;
