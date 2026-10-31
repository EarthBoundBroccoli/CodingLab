import { Loader2, Play, Send } from "lucide-react";

export default function WorkspaceActions({ workspace, handleSubmitCode, contest = false }) {
  const { language, handleLanguageChange, handleRunCode, isCompiling, isEvaluating, isRunningSandbox } = workspace;
  return (
      <div className="fixed bottom-0 left-0 right-0 h-[64px] bg-white border-t-4 border-black p-4 flex items-center justify-between z-20 shadow-[0_-4px_0_0_#000]">
        {/* Language Selection */}
        <div className="flex items-center gap-2">
          <label htmlFor="language-select" className="text-[10px] font-black uppercase tracking-widest text-black">Language:</label>
          <select
            id="language-select"
            value={language}
            onChange={handleLanguageChange}
            className={`p-2 border-4 border-black bg-white font-black uppercase text-xs ${contest ? "sm:text-sm" : ""} outline-none select-none rounded-none focus:bg-emerald-400 focus:text-black cursor-pointer transition-colors text-black`}
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
                <Send size={16} /> {contest ? "Submit to Contest" : "Submit Code"}
              </>
            )}
          </button>
        </div>
      </div>
  );
}
