import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatLanguage, formatSubmissionDate } from "../../lib/growth-progress";

const SubmissionHistory = ({ submissions }) => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const dialog = useRef(null);
  const totalPages = Math.max(1, Math.ceil(submissions.length / 10));
  const currentPage = Math.min(page, totalPages);
  const visible = submissions.slice((currentPage - 1) * 10, currentPage * 10);

  useEffect(() => {
    if (selected) dialog.current?.showModal();
  }, [selected]);

  return (
    <section className="growth-panel growth-history">
      <div className="growth-panel-heading">
        <div><h2>Recent submissions</h2><p>Select a problem to review your code. Latest 50 attempts, local time.</p></div>
      </div>
      {!submissions.length ? (
        <div className="growth-history-empty"><h3>No submissions yet</h3><p>Your code and results will appear here after your first submission.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="growth-submission-table">
              <thead><tr>{['Problem', 'Language', 'Submitted', 'Verdict'].map(label => <th key={label}>{label}</th>)}</tr></thead>
              <tbody>
                {visible.map(sub => <tr key={sub._id} className="hover:bg-slate-50">
                  <td className="px-5 py-4 min-w-44"><button type="button" onClick={() => setSelected(sub)} className="font-bold text-left hover:underline focus-visible:outline-2 focus-visible:outline-black" aria-label={`Review code for ${sub.problemId?.title || 'unavailable problem'}`}>{sub.problemId?.title || 'Problem unavailable'}</button></td>
                  <td className="px-5 py-4 whitespace-nowrap text-xs">{formatLanguage(sub.language)}</td>
                  <td className="px-5 py-4 text-xs text-slate-500 whitespace-nowrap"><time dateTime={sub.createdAt}>{formatSubmissionDate(sub.createdAt)}</time></td>
                  <td className={`px-5 py-4 whitespace-nowrap text-xs font-bold ${sub.verdict === 'Accepted' ? 'text-emerald-700' : 'text-red-700'}`}>{sub.verdict || 'Verdict unavailable'}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && <div className="growth-pagination">
            <button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</button>
            <span aria-live="polite">{currentPage} / {totalPages}</span>
            <button type="button" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>Next</button>
          </div>}
        </>
      )}
      {selected && (
        <dialog ref={dialog} onClose={() => setSelected(null)} aria-labelledby="submission-title"
          className="fixed inset-0 m-auto bg-white text-black border-4 border-black p-0 w-[calc(100%-2rem)] max-w-4xl max-h-[85vh] backdrop:bg-black/50">
          <div className="p-5 bg-black text-white flex justify-between gap-4 items-center">
            <div><h3 id="submission-title" className="text-xl font-black">{selected.problemId?.title || 'Problem unavailable'}</h3><p>{selected.verdict}</p></div>
            <button type="button" aria-label="Close code review" onClick={() => dialog.current?.close()} className="btn btn-sm rounded-none">Close</button>
          </div>
          <pre className="bg-slate-900 text-emerald-300 p-6 overflow-auto max-h-[50vh] text-sm"><code>{selected.code || 'No saved code available.'}</code></pre>
          <div className="p-5 flex flex-wrap justify-between items-center gap-3">
            <span>{formatLanguage(selected.language)}</span>
            {selected.problemId?.status === 'approved' ? (
              <button type="button" className="btn bg-emerald-400 rounded-none border-2 border-black" onClick={() => {
                dialog.current?.close();
                navigate(`/problems/${selected.problemId._id}`, { state: { prefillCode: selected.code, prefillLanguage: selected.language } });
              }}>Try again with this code</button>
            ) : <p className="text-sm">This problem is no longer available for practice.</p>}
          </div>
        </dialog>
      )}
    </section>
  );
};
export default SubmissionHistory;
