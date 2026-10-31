import Editor from "@monaco-editor/react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { Loader2 } from "lucide-react";
import { registerEditorThemes } from "../../lib/editor-preferences";

export default function WorkspaceEditor({ workspace, problem, contest = false }) {
  const { editorPreferences, language, codeValue, setCodeValue, activeTab, setActiveTab, customInput, setCustomInput, executionResult, isCompiling } = workspace;
  return (
        <Panel defaultSize={45} minSize={contest ? 25 : 30}>
          <Group orientation="vertical">

            {/* Upper Panel: Monaco Editor */}
            <Panel defaultSize={65} minSize={contest ? 30 : 40}>
              <div className={contest ? "w-full h-full flex flex-col bg-[#020617] overflow-hidden" : "w-full h-full p-4 bg-slate-950 flex flex-col"}>
                <div className={contest ? "flex-1 min-h-0 relative" : "w-full h-full border-4 border-black neo-brutal overflow-hidden"}>
                  <Editor
                    height="100%"
                    theme={editorPreferences.theme}
                    language={language}
                    value={codeValue}
                    onChange={(value) => setCodeValue(value || "")}
                    beforeMount={registerEditorThemes}
                    loading={
                      <div className="flex flex-col items-center justify-center h-full bg-[#020617] text-slate-400 space-y-3 font-mono">
                        <Loader2 className="animate-spin text-emerald-400" size={32} />
                        <span className="text-xs uppercase font-black tracking-widest">Loading Editor...</span>
                      </div>
                    }
                    options={{
                      tabSize: editorPreferences.tabSize,
                      insertSpaces: true,
                      detectIndentation: false,
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
                  {problem.samples?.[0]?.input && (
                    <button
                      onClick={() => { setCustomInput(problem.samples[0].input); setActiveTab("input"); }}
                      disabled={isCompiling}
                      className="ml-auto px-3 py-2 text-emerald-300 hover:bg-slate-800 cursor-pointer disabled:opacity-50"
                    >
                      Use sample input
                    </button>
                  )}
                </div>

                {/* Tab Content Box */}
                <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                  {activeTab === "input" ? (
                    <textarea
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      placeholder="Run reads this input. Paste a test case here or click Use sample input."
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
                          {contest ? "Run code or submit solution to view outputs..." : "Run code to view compilation outputs..."}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Panel>

          </Group>
        </Panel>

  );
}
