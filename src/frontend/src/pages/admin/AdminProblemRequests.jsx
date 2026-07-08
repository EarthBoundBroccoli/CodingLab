import { useEffect, useMemo, useState } from "react";
import { getBackendURL } from "../../lib/auth-client";
import { Loader2, AlertCircle } from "lucide-react";

const PAGE_SIZE = 20;

const badgeForDifficulty = (difficulty) => {
  if (difficulty === "Easy") return "bg-emerald-300";
  if (difficulty === "Medium") return "bg-amber-300";
  return "bg-rose-300";
};

const badgeForStatus = (status) => {
  if (status.toLowerCase() === "approved") return "bg-emerald-400";
  if (status.toLowerCase() === "rejected") return "bg-error";
  return "bg-sky-300";
};

const ProblemTable = ({ rows, onView }) => (
  <div className="overflow-x-auto">
    <table className="table table-zebra w-full border-t-4 border-black">
      <thead className="bg-emerald-400">
        <tr>
          <th className="border-b-4 border-black text-xs font-black uppercase tracking-widest text-black">
            Title
          </th>
          <th className="border-b-4 border-black text-xs font-black uppercase tracking-widest text-black">
            Difficulty
          </th>
          <th className="border-b-4 border-black text-xs font-black uppercase tracking-widest text-black">
            Status
          </th>
          <th className="border-b-4 border-black text-xs font-black uppercase tracking-widest text-right text-black">
            Action
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={4} className="text-center py-8 font-bold uppercase text-sm text-slate-500">
              No problems found
            </td>
          </tr>
        ) : (
          rows.map((r) => (
            <tr key={r._id} className="hover:bg-slate-100">
              <td className="font-black uppercase text-black">{r.title}</td>
              <td>
                <span
                  className={`badge rounded-none border-2 border-black font-black uppercase text-[10px] text-black ${badgeForDifficulty(
                    r.difficulty
                  )}`}
                >
                  {r.difficulty}
                </span>
              </td>
              <td>
                <span
                  className={`badge rounded-none border-2 border-black font-black uppercase text-[10px] text-black ${badgeForStatus(
                    r.status
                  )}`}
                >
                  {r.status}
                </span>
              </td>
              <td className="text-right">
                <button
                  type="button"
                  onClick={() => onView(r._id)}
                  className="btn btn-sm bg-white border-2 border-black rounded-none font-black uppercase text-xs hover:bg-emerald-400 text-black cursor-pointer"
                >
                  View Problem
                </button>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

const PaginationControls = ({
  currentPage,
  totalPages,
  totalItems,
  startIndex,
  endIndex,
  onPrevious,
  onNext,
}) => (
  <div className="p-4 border-t-4 border-black bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
    <p className="text-xs font-black uppercase tracking-wider text-slate-700">
      {totalItems === 0
        ? "Showing 0 of 0 problems"
        : `Showing ${startIndex}-${endIndex} of ${totalItems} problems`}
    </p>
    <div className="flex items-center gap-3">
      <span className="text-xs font-black uppercase tracking-wider text-black">
        Page {totalPages === 0 ? 0 : currentPage} of {totalPages}
      </span>
      <button
        type="button"
        onClick={onPrevious}
        disabled={currentPage <= 1}
        className="btn btn-sm bg-white border-2 border-black rounded-none font-black uppercase hover:bg-emerald-300 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed text-black cursor-pointer"
      >
        Previous
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={currentPage >= totalPages || totalPages === 0}
        className="btn btn-sm bg-white border-2 border-black rounded-none font-black uppercase hover:bg-emerald-300 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed text-black cursor-pointer"
      >
        Next
      </button>
    </div>
  </div>
);

const AdminProblemRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchProblems = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${getBackendURL()}/api/problem`, {
        credentials: "include"
      });
      if (response.ok) {
        const data = await response.json();
        setRequests(data);
      } else {
        setError("Failed to fetch problem requests");
      }
    } catch (err) {
      console.error("Error fetching problem requests:", err);
      setError("Error connecting to backend API");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProblems();
  }, []);

  const approvedProblems = useMemo(
    () => requests.filter((r) => r.status.toLowerCase() === "approved"),
    [requests]
  );

  const pendingRejectedProblems = useMemo(
    () => requests.filter((r) => r.status.toLowerCase() === "pending" || r.status.toLowerCase() === "rejected"),
    [requests]
  );

  const tabProblems = activeTab === "all" ? approvedProblems : pendingRejectedProblems;

  const filteredProblems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return tabProblems;
    return tabProblems.filter((r) => r.title.toLowerCase().includes(query));
  }, [tabProblems, searchQuery]);

  const totalPages = Math.ceil(filteredProblems.length / PAGE_SIZE) || 0;
  const safePage = totalPages === 0 ? 1 : Math.min(currentPage, totalPages);

  const paginatedProblems = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredProblems.slice(start, start + PAGE_SIZE);
  }, [filteredProblems, safePage]);

  const startIndex = filteredProblems.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const endIndex = Math.min(safePage * PAGE_SIZE, filteredProblems.length);

  const selected = useMemo(
    () => requests.find((r) => r._id === selectedId) || null,
    [requests, selectedId]
  );

  const showReviewActions = selected && selected.status.toLowerCase() === "pending";

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  };

  const openModal = (id) => {
    setSelectedId(id);
  };

  const closeModal = () => {
    setSelectedId(null);
  };

  const updateStatusOnBackend = async (id, newStatus) => {
    try {
      const response = await fetch(`${getBackendURL()}/api/admin/problems/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": "admin123"
        },
        credentials: "include",
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        showToast(`Problem ${newStatus} successfully`);
        // Update local state
        setRequests(prev => prev.map(r => r._id === id ? { ...r, status: newStatus } : r));
        closeModal();
      } else {
        showToast(`Failed to update problem status to ${newStatus}`);
      }
    } catch (err) {
      console.error(`Error updating problem status:`, err);
      showToast("Error connecting to server");
    }
  };

  const handleApprove = () => {
    if (!selected) return;
    updateStatusOnBackend(selected._id, "approved");
  };

  const handleRejectSubmit = () => {
    if (!selected) return;
    updateStatusOnBackend(selected._id, "rejected");
  };

  const tabClass = (tab) =>
    `flex-1 py-3 px-4 font-black uppercase text-xs sm:text-sm border-4 border-black transition-colors cursor-pointer ${
      activeTab === tab
        ? "bg-emerald-400 text-black shadow-[3px_3px_0px_0px_black]"
        : "bg-white text-black hover:bg-slate-100"
    }`;

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      {toast && (
        <div className="fixed right-4 bottom-4 z-50 bg-emerald-400 text-black border-4 border-black px-4 py-3 font-black uppercase text-xs shadow-[4px_4px_0px_0px_black]">
          {toast}
        </div>
      )}

      <div className="bg-white neo-brutal rounded-none overflow-hidden">
        <div className="bg-slate-900 text-white p-4 border-b-4 border-black">
          <h1 className="text-2xl lg:text-3xl font-black uppercase font-spartan tracking-tight">
            Problem Requests
          </h1>
          <p className="text-[11px] font-bold uppercase opacity-70">
            Review and manage submitted problems
          </p>
        </div>

        <div className="p-4 border-b-4 border-black bg-slate-50 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={tabClass("all")}
            >
              All Problems ({approvedProblems.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("pending")}
              className={tabClass("pending")}
            >
              Pending/Rejected ({pendingRejectedProblems.length})
            </button>
          </div>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title..."
            className="w-full p-3 border-4 border-black font-black uppercase outline-none rounded-none focus:bg-emerald-100 text-black"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-20">
            <Loader2 className="animate-spin text-black" size={48} />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-error font-black uppercase flex flex-col items-center justify-center gap-2">
            <AlertCircle size={48} />
            {error}
          </div>
        ) : (
          <>
            <ProblemTable rows={paginatedProblems} onView={openModal} />

            <PaginationControls
              currentPage={safePage}
              totalPages={totalPages}
              totalItems={filteredProblems.length}
              startIndex={startIndex}
              endIndex={endIndex}
              onPrevious={() => setCurrentPage((p) => Math.max(1, p - 1))}
              onNext={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            />
          </>
        )}
      </div>

      {/* Review / Audit Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white border-4 border-black neo-brutal w-full max-w-2xl max-h-[85vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4 border-b-4 border-black flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black uppercase font-spartan tracking-tight">
                  Review: {selected.title}
                </h3>
                <div className="flex gap-2 mt-1">
                  <span className={`badge rounded-none border-2 border-black font-black uppercase text-[10px] text-black ${badgeForDifficulty(selected.difficulty)}`}>
                    {selected.difficulty}
                  </span>
                  <span className={`badge rounded-none border-2 border-black font-black uppercase text-[10px] text-black ${badgeForStatus(selected.status)}`}>
                    {selected.status}
                  </span>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="p-1 border-2 border-black bg-white text-black hover:bg-rose-300 transition-colors cursor-pointer"
              >
                <span className="font-bold text-xs uppercase px-1">Close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              <div>
                <h4 className="text-[10px] font-black uppercase text-slate-400 mb-1">Problem Statement</h4>
                <div className="p-3 bg-slate-50 border-2 border-black text-sm whitespace-pre-wrap font-medium text-slate-800">
                  {selected.statement}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-[10px] font-black uppercase text-slate-400 mb-1">Input Format</h4>
                  <p className="text-xs font-bold text-slate-700">{selected.inputFormat}</p>
                </div>
                <div>
                  <h4 className="text-[10px] font-black uppercase text-slate-400 mb-1">Output Format</h4>
                  <p className="text-xs font-bold text-slate-700">{selected.outputFormat}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-[10px] font-black uppercase text-slate-400 mb-1">Time Limit</h4>
                  <p className="text-xs font-black text-black">{selected.timeLimit} ms</p>
                </div>
                <div>
                  <h4 className="text-[10px] font-black uppercase text-slate-400 mb-1">Memory Limit</h4>
                  <p className="text-xs font-black text-black">{selected.memoryLimit} MB</p>
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-black uppercase text-slate-400 mb-1">Sample Cases</h4>
                <div className="space-y-2">
                  {selected.samples?.map((sample, idx) => (
                    <div key={idx} className="border-2 border-black p-3 bg-slate-50 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="font-black block uppercase text-[8px] text-slate-400">Sample Input</span>
                        <pre className="font-mono bg-white p-1.5 border border-slate-300 mt-1 text-slate-800">{sample.input}</pre>
                      </div>
                      <div>
                        <span className="font-black block uppercase text-[8px] text-slate-400">Sample Output</span>
                        <pre className="font-mono bg-white p-1.5 border border-slate-300 mt-1 text-slate-800">{sample.output}</pre>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hidden Data Audit */}
              <div className="border-t-4 border-dashed border-black pt-4 space-y-3">
                <h4 className="text-[11px] font-black uppercase text-rose-500 tracking-wider">
                  ⚠️ Audit Hidden Test Cases (Cloudinary Assets / Files)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 bg-rose-50 border-2 border-black">
                    <span className="text-[9px] font-black uppercase text-rose-700 block">Hidden Input Asset</span>
                    <p className="font-mono text-[10px] font-bold text-slate-800 break-all mt-1 bg-white p-1.5 border border-rose-300">
                      {selected.hiddenInput}
                    </p>
                  </div>
                  <div className="p-3 bg-rose-50 border-2 border-black">
                    <span className="text-[9px] font-black uppercase text-rose-700 block">Hidden Output Asset</span>
                    <p className="font-mono text-[10px] font-bold text-slate-800 break-all mt-1 bg-white p-1.5 border border-rose-300">
                      {selected.hiddenOutput}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer / Review Actions */}
            <div className="p-4 bg-slate-50 border-t-4 border-black flex justify-end gap-2">
              <button
                onClick={closeModal}
                className="px-4 py-2 border-2 border-black bg-white font-black uppercase text-xs hover:bg-slate-100 cursor-pointer text-black"
              >
                Close Audit
              </button>
              {showReviewActions && (
                <>
                  <button
                    onClick={handleRejectSubmit}
                    className="px-4 py-2 border-2 border-black bg-rose-300 font-black uppercase text-xs hover:bg-rose-200 cursor-pointer text-black"
                  >
                    Reject
                  </button>
                  <button
                    onClick={handleApprove}
                    className="px-4 py-2 border-2 border-black bg-emerald-400 font-black uppercase text-xs hover:bg-emerald-300 cursor-pointer text-black"
                  >
                    Approve
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProblemRequests;
