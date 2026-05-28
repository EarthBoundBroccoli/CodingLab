import { useMemo, useState } from "react";

const initialRequests = [
  {
    id: 1,
    title: "Two Sum",
    difficulty: "Easy",
    status: "Pending",
    description:
      "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
    examples: [
      "Input: nums = [2,7,11,15], target = 9 → Output: [0,1]",
      "Input: nums = [3,2,4], target = 6 → Output: [1,2]",
    ],
    constraints: [
      "2 ≤ nums.length ≤ 10^4",
      "-10^9 ≤ nums[i] ≤ 10^9",
      "-10^9 ≤ target ≤ 10^9",
      "Exactly one valid answer exists",
    ],
  },
  {
    id: 2,
    title: "Valid Parentheses",
    difficulty: "Easy",
    status: "Approved",
    description:
      "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.",
    examples: ["Input: s = \"()[]{}\" → Output: true", "Input: s = \"(]\" → Output: false"],
    constraints: ["1 ≤ s.length ≤ 10^4", "s consists of parentheses only"],
  },
  {
    id: 3,
    title: "Longest Substring Without Repeating Characters",
    difficulty: "Medium",
    status: "Pending",
    description:
      "Given a string s, find the length of the longest substring without repeating characters.",
    examples: [
      "Input: s = \"abcabcbb\" → Output: 3",
      "Input: s = \"bbbbb\" → Output: 1",
    ],
    constraints: ["0 ≤ s.length ≤ 5 * 10^4", "s consists of English letters, digits, symbols, and spaces"],
  },
  {
    id: 4,
    title: "Binary Tree Level Order Traversal",
    difficulty: "Medium",
    status: "Rejected",
    description:
      "Given the root of a binary tree, return the level order traversal of its nodes' values. (i.e., from left to right, level by level).",
    examples: ["Input: root = [3,9,20,null,null,15,7] → Output: [[3],[9,20],[15,7]]"],
    constraints: ["The number of nodes is in the range [0, 2000]", "-1000 ≤ Node.val ≤ 1000"],
  },
  {
    id: 5,
    title: "Merge Intervals",
    difficulty: "Medium",
    status: "Approved",
    description:
      "Given an array of intervals where intervals[i] = [starti, endi], merge all overlapping intervals.",
    examples: ["Input: intervals = [[1,3],[2,6],[8,10],[15,18]] → Output: [[1,6],[8,10],[15,18]]"],
    constraints: ["1 ≤ intervals.length ≤ 10^4", "intervals[i].length == 2", "0 ≤ starti ≤ endi ≤ 10^4"],
  },
  {
    id: 6,
    title: "Kth Largest Element in an Array",
    difficulty: "Medium",
    status: "Pending",
    description:
      "Given an integer array nums and an integer k, return the kth largest element in the array.",
    examples: ["Input: nums = [3,2,1,5,6,4], k = 2 → Output: 5"],
    constraints: ["1 ≤ k ≤ nums.length ≤ 10^5", "-10^4 ≤ nums[i] ≤ 10^4"],
  },
  {
    id: 7,
    title: "Regular Expression Matching",
    difficulty: "Hard",
    status: "Pending",
    description:
      "Implement regular expression matching with support for '.' and '*'. '.' matches any single character. '*' matches zero or more of the preceding element.",
    examples: ["Input: s = \"aa\", p = \"a*\" → Output: true", "Input: s = \"ab\", p = \".*\" → Output: true"],
    constraints: ["1 ≤ s.length ≤ 20", "1 ≤ p.length ≤ 20", "s contains only lowercase English letters", "p contains only lowercase letters, '.', and '*'"],
  },
  {
    id: 8,
    title: "Median of Two Sorted Arrays",
    difficulty: "Hard",
    status: "Rejected",
    description:
      "Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median of the two sorted arrays.",
    examples: ["Input: nums1 = [1,3], nums2 = [2] → Output: 2.0"],
    constraints: ["0 ≤ m ≤ 1000", "0 ≤ n ≤ 1000", "1 ≤ m + n ≤ 2000", "-10^6 ≤ nums[i] ≤ 10^6"],
  },
];

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

const AdminProblemRequests = () => {
  const [requests, setRequests] = useState(initialRequests);
  const [selectedId, setSelectedId] = useState(null);
  const [toast, setToast] = useState(null);
  const [rejecting, setRejecting] = useState(false);
  const [feedback, setFeedback] = useState("");

  const selected = useMemo(
    () => requests.find((r) => r.id === selectedId) || null,
    [requests, selectedId]
  );

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
            Review and approve submitted problems
          </p>
        </div>

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
              {requests.map((r) => (
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
                      onClick={() => openModal(r.id)}
                      className="btn btn-sm bg-white border-2 border-black rounded-none font-black uppercase text-xs hover:bg-emerald-400"
                    >
                      View Problem
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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

              {!rejecting ? (
                <div className="flex flex-col sm:flex-row gap-3 justify-end">
                  <button
                    type="button"
                    onClick={handleRejectStart}
                    className="px-4 py-3 border-4 border-black bg-white font-black uppercase text-sm shadow-[3px_3px_0px_0px_black] hover:bg-rose-200"
                  >
                    Reject
                  </button>
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProblemRequests;
