import { useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 20;

const baseTitles = [
  "Two Sum",
  "Valid Parentheses",
  "Longest Substring Without Repeating Characters",
  "Binary Tree Level Order Traversal",
  "Merge Intervals",
  "Kth Largest Element in an Array",
  "Regular Expression Matching",
  "Median of Two Sorted Arrays",
  "Container With Most Water",
  "3Sum",
  "Letter Combinations of a Phone Number",
  "Generate Parentheses",
  "Combination Sum",
  "Permutations",
  "Jump Game",
  "Rotate Image",
  "Group Anagrams",
  "Maximum Subarray",
  "Spiral Matrix",
  "Set Matrix Zeroes",
  "Word Search",
  "Longest Palindromic Substring",
  "Unique Paths",
  "Minimum Path Sum",
  "Climbing Stairs",
  "Edit Distance",
  "Decode Ways",
  "Word Break",
  "House Robber",
  "Coin Change",
  "Longest Increasing Subsequence",
  "Number of Islands",
  "Course Schedule",
  "Clone Graph",
  "Pacific Atlantic Water Flow",
  "Redundant Connection",
  "Network Delay Time",
  "Cheapest Flights Within K Stops",
  "Alien Dictionary",
  "Serialize and Deserialize Binary Tree",
  "Lowest Common Ancestor",
  "Binary Tree Maximum Path Sum",
  "Validate Binary Search Tree",
  "Kth Smallest Element in BST",
  "Construct Binary Tree from Preorder and Inorder",
  "Subsets",
  "Word Search II",
  "Palindrome Partitioning",
  "N-Queens",
  "Sudoku Solver",
];

const difficulties = ["Easy", "Medium", "Hard"];
const statuses = ["Approved", "Pending", "Rejected"];

const generateInitialRequests = () => {
  const problems = [];

  for (let i = 0; i < 120; i++) {
    const baseTitle = baseTitles[i % baseTitles.length];
    const suffix = i >= baseTitles.length ? ` #${Math.floor(i / baseTitles.length) + 1}` : "";
    const difficulty = difficulties[i % difficulties.length];
    const status = statuses[i % 3];

    problems.push({
      id: i + 1,
      title: `${baseTitle}${suffix}`,
      difficulty,
      status,
      description: `Given input for "${baseTitle}", solve the problem efficiently within the provided constraints.`,
      examples: [
        `Input: sample input for ${baseTitle} → Output: expected result`,
        `Input: edge case for ${baseTitle} → Output: expected edge output`,
      ],
      constraints: [
        "1 ≤ n ≤ 10^5",
        "Values fit within standard integer limits",
        "Time complexity should be optimal for the difficulty level",
      ],
    });
  }

  return problems;
};

const initialRequests = generateInitialRequests();

const badgeForDifficulty = (difficulty) => {
  if (difficulty === "Easy") return "bg-emerald-300";
  if (difficulty === "Medium") return "bg-amber-300";
  return "bg-rose-300";
};

const badgeForStatus = (status) => {
  if (status === "Approved") return "bg-emerald-400";
  if (status === "Rejected") return "bg-error";
  return "bg-sky-300";
};

const ProblemTable = ({ rows, onView }) => (
  <div className="overflow-x-auto">
    <table className="table table-zebra w-full border-t-4 border-black">
      <thead className="bg-emerald-400">
        <tr>
          <th className="border-b-4 border-black text-xs font-black uppercase tracking-widest">
            Title
          </th>
          <th className="border-b-4 border-black text-xs font-black uppercase tracking-widest">
            Difficulty
          </th>
          <th className="border-b-4 border-black text-xs font-black uppercase tracking-widest">
            Status
          </th>
          <th className="border-b-4 border-black text-xs font-black uppercase tracking-widest text-right">
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
            <tr key={r.id} className="hover:bg-slate-100">
              <td className="font-black uppercase">{r.title}</td>
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
                  onClick={() => onView(r.id)}
                  className="btn btn-sm bg-white border-2 border-black rounded-none font-black uppercase text-xs hover:bg-emerald-400"
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
      <span className="text-xs font-black uppercase tracking-wider">
        Page {totalPages === 0 ? 0 : currentPage} of {totalPages}
      </span>
      <button
        type="button"
        onClick={onPrevious}
        disabled={currentPage <= 1}
        className="btn btn-sm bg-white border-2 border-black rounded-none font-black uppercase hover:bg-emerald-300 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed"
      >
        Previous
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={currentPage >= totalPages || totalPages === 0}
        className="btn btn-sm bg-white border-2 border-black rounded-none font-black uppercase hover:bg-emerald-300 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed"
      >
        Next
      </button>
    </div>
  </div>
);

const AdminProblemRequests = () => {
  const [requests, setRequests] = useState(initialRequests);
  const [activeTab, setActiveTab] = useState("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [toast, setToast] = useState(null);
  const [rejecting, setRejecting] = useState(false);
  const [feedback, setFeedback] = useState("");

  const approvedProblems = useMemo(
    () => requests.filter((r) => r.status === "Approved"),
    [requests]
  );

  const pendingRejectedProblems = useMemo(
    () => requests.filter((r) => r.status === "Pending" || r.status === "Rejected"),
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
    () => requests.find((r) => r.id === selectedId) || null,
    [requests, selectedId]
  );

  const showReviewActions = activeTab === "pending" && selected;

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
    setRejecting(false);
    setFeedback("");
  };

  const closeModal = () => {
    setSelectedId(null);
    setRejecting(false);
    setFeedback("");
  };

  const setStatus = (id, status) => {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  };

  const handleApprove = () => {
    if (!selected) return;
    setStatus(selected.id, "Approved");
    showToast("Problem approved");
    closeModal();
  };

  const handleRejectStart = () => {
    setRejecting(true);
    setFeedback("");
  };

  const handleRejectSubmit = (e) => {
    e.preventDefault();
    if (!selected) return;
    setStatus(selected.id, "Rejected");
    showToast("Feedback sent successfully");
    closeModal();
  };

  const tabClass = (tab) =>
    `flex-1 py-3 px-4 font-black uppercase text-xs sm:text-sm border-4 border-black transition-colors ${
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
            className="w-full p-3 border-4 border-black font-black uppercase outline-none rounded-none focus:bg-emerald-100"
          />
        </div>

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
      </div>

      {selected && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white neo-brutal w-full max-w-3xl max-h-[85svh] overflow-hidden flex flex-col">
            <div className="bg-sky-400 p-4 border-b-4 border-black flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-xl lg:text-2xl font-black uppercase font-spartan tracking-tight text-black truncate">
                  {selected.title}
                </h2>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span
                    className={`badge rounded-none border-2 border-black font-black uppercase text-[10px] text-black ${badgeForDifficulty(
                      selected.difficulty
                    )}`}
                  >
                    {selected.difficulty}
                  </span>
                  <span
                    className={`badge rounded-none border-2 border-black font-black uppercase text-[10px] text-black ${badgeForStatus(
                      selected.status
                    )}`}
                  >
                    {selected.status}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="px-3 py-2 border-2 border-black bg-white font-black uppercase text-xs hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            <div className="p-6 overflow-auto space-y-6">
              <section className="space-y-2">
                <h3 className="text-xs font-black uppercase tracking-widest">
                  Description
                </h3>
                <div className="bg-white border-4 border-black p-4 font-bold text-sm leading-relaxed">
                  {selected.description}
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-black uppercase tracking-widest">
                  Examples
                </h3>
                <div className="bg-slate-50 border-4 border-black p-4 space-y-2">
                  {selected.examples.map((ex, idx) => (
                    <div
                      key={idx}
                      className="font-mono text-xs bg-white border-2 border-black p-3"
                    >
                      {ex}
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-black uppercase tracking-widest">
                  Constraints
                </h3>
                <div className="bg-white border-4 border-black p-4">
                  <ul className="list-disc pl-5 space-y-1">
                    {selected.constraints.map((c, idx) => (
                      <li key={idx} className="font-bold text-sm">
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              {showReviewActions && (
                <>
                  {!rejecting ? (
                    <div className="flex flex-col sm:flex-row gap-3 justify-end">
                      {selected.status === "Pending" && (
                        <button
                          type="button"
                          onClick={handleRejectStart}
                          className="px-4 py-3 border-4 border-black bg-white font-black uppercase text-sm shadow-[3px_3px_0px_0px_black] hover:bg-rose-200"
                        >
                          Reject
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleApprove}
                        className="px-4 py-3 border-4 border-black bg-slate-900 text-white font-black uppercase text-sm shadow-[3px_3px_0px_0px_black] hover:bg-emerald-400 hover:text-black"
                      >
                        Approve
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleRejectSubmit} className="space-y-3">
                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest">
                          Feedback message
                        </label>
                        <textarea
                          className="w-full min-h-28 p-3 border-4 border-black font-bold text-sm outline-none rounded-none focus:bg-rose-100"
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          required
                          placeholder="Explain why this request is rejected..."
                        />
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3 justify-end">
                        <button
                          type="button"
                          onClick={() => setRejecting(false)}
                          className="px-4 py-3 border-4 border-black bg-white font-black uppercase text-sm shadow-[3px_3px_0px_0px_black] hover:bg-slate-100"
                        >
                          Back
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-3 border-4 border-black bg-slate-900 text-white font-black uppercase text-sm shadow-[3px_3px_0px_0px_black] hover:bg-error hover:text-black"
                        >
                          Send Feedback
                        </button>
                      </div>
                    </form>
                  )}
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
