import { useMemo, useState } from "react";

const dummyProblems = [
  { id: 1, title: "Two Sum" },
  { id: 2, title: "Valid Parentheses" },
  { id: 3, title: "Merge Intervals" },
  { id: 4, title: "Longest Substring Without Repeating Characters" },
  { id: 5, title: "Top K Frequent Elements" },
  { id: 6, title: "Binary Tree Level Order Traversal" },
  { id: 7, title: "Coin Change" },
  { id: 8, title: "Dijkstra Shortest Path" },
  { id: 9, title: "Regular Expression Matching" },
  { id: 10, title: "Median of Two Sorted Arrays" },
];

const initialContests = [
  {
    id: 1,
    name: "CodingLab Round #120",
    description: "Weekly algorithm contest for all levels.",
    startTime: "2026-05-30T10:00",
    endTime: "2026-05-30T12:00",
    status: "Upcoming",
    problemIds: [1, 2, 4],
  },
  {
    id: 2,
    name: "Beginner Blitz",
    description: "Friendly beginner set with guided progression.",
    startTime: "2026-05-27T16:00",
    endTime: "2026-05-27T18:00",
    status: "Ongoing",
    problemIds: [1, 2, 3],
  },
  {
    id: 3,
    name: "Data Structures Cup",
    description: "Focus on stacks, queues, trees, and heaps.",
    startTime: "2026-05-22T14:00",
    endTime: "2026-05-22T17:00",
    status: "Ended",
    problemIds: [3, 6, 7, 8],
  },
  {
    id: 4,
    name: "Graph Masters",
    description: "Graph-heavy challenge for advanced participants.",
    startTime: "2026-06-01T19:00",
    endTime: "2026-06-01T21:30",
    status: "Upcoming",
    problemIds: [8, 9, 10],
  },
  {
    id: 5,
    name: "DP Marathon",
    description: "Dynamic programming marathon set.",
    startTime: "2026-05-24T09:00",
    endTime: "2026-05-24T12:00",
    status: "Ended",
    problemIds: [4, 7, 9],
  },
];

const emptyForm = {
  id: null,
  name: "",
  description: "",
  startTime: "",
  endTime: "",
  problemIds: [],
};

const getDurationText = (startTime, endTime) => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "--";
  }
  const diffMs = end - start;
  if (diffMs <= 0) return "--";
  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
};

const formatDateTime = (value) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString([], {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const statusBadgeClass = (status) => {
  if (status === "Upcoming") return "bg-sky-300";
  if (status === "Ongoing") return "bg-amber-300";
  return "bg-slate-300";
};

const AdminContests = () => {
  const [contests, setContests] = useState(initialContests);
  const [form, setForm] = useState(emptyForm);
  const [isSelectingProblems, setIsSelectingProblems] = useState(false);
  const [deletingContest, setDeletingContest] = useState(null);
  const [toast, setToast] = useState(null);

  const selectedProblems = useMemo(
    () => dummyProblems.filter((problem) => form.problemIds.includes(problem.id)),
    [form.problemIds]
  );

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  };

  const resetForm = () => {
    setForm(emptyForm);
  };

  const toggleProblem = (problemId) => {
    setForm((prev) => {
      const exists = prev.problemIds.includes(problemId);
      return {
        ...prev,
        problemIds: exists
          ? prev.problemIds.filter((id) => id !== problemId)
          : [...prev.problemIds, problemId],
      };
    });
  };

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.startTime || !form.endTime) return;

    if (form.id) {
      setContests((prev) =>
        prev.map((contest) =>
          contest.id === form.id
            ? {
                ...contest,
                name: form.name,
                description: form.description,
                startTime: form.startTime,
                endTime: form.endTime,
                problemIds: form.problemIds,
              }
            : contest
        )
      );
      showToast("Contest updated");
    } else {
      const nextId = contests.length
        ? Math.max(...contests.map((contest) => contest.id)) + 1
        : 1;
      setContests((prev) => [
        ...prev,
        {
          id: nextId,
          name: form.name,
          description: form.description,
          startTime: form.startTime,
          endTime: form.endTime,
          problemIds: form.problemIds,
          status: "Upcoming",
        },
      ]);
      showToast("Contest created");
    }

    resetForm();
  };

  const handleEdit = (contest) => {
    setForm({
      id: contest.id,
      name: contest.name,
      description: contest.description,
      startTime: contest.startTime,
      endTime: contest.endTime,
      problemIds: contest.problemIds,
    });
  };

  const handleDelete = () => {
    if (!deletingContest) return;
    setContests((prev) => prev.filter((contest) => contest.id !== deletingContest.id));
    setDeletingContest(null);
    showToast("Contest deleted");
  };

  const handleEndContest = (contest) => {
    if (contest.status !== "Ongoing") return;
    setContests((prev) =>
      prev.map((item) =>
        item.id === contest.id ? { ...item, status: "Ended" } : item
      )
    );
    showToast("Contest ended manually");
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
            Contests
          </h1>
          <p className="text-[11px] font-bold uppercase opacity-70">
            Manage active and upcoming contests
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="table table-zebra w-full border-t-4 border-black">
            <thead className="bg-emerald-400">
              <tr>
                <th className="border-b-4 border-black text-xs font-black uppercase tracking-widest">
                  Contest Name
                </th>
                <th className="border-b-4 border-black text-xs font-black uppercase tracking-widest">
                  Start Time
                </th>
                <th className="border-b-4 border-black text-xs font-black uppercase tracking-widest">
                  Duration
                </th>
                <th className="border-b-4 border-black text-xs font-black uppercase tracking-widest">
                  Status
                </th>
                <th className="border-b-4 border-black text-xs font-black uppercase tracking-widest text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {contests.map((contest) => (
                <tr key={contest.id} className="hover:bg-slate-100">
                  <td className="font-black uppercase">{contest.name}</td>
                  <td className="font-bold text-xs">{formatDateTime(contest.startTime)}</td>
                  <td className="font-black text-xs">
                    {getDurationText(contest.startTime, contest.endTime)}
                  </td>
                  <td>
                    <span
                      className={`badge rounded-none border-2 border-black font-black uppercase text-[10px] text-black ${statusBadgeClass(
                        contest.status
                      )}`}
                    >
                      {contest.status}
                    </span>
                  </td>
                  <td>
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(contest)}
                        className="btn btn-xs bg-white border-2 border-black rounded-none font-black uppercase hover:bg-emerald-300"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingContest(contest)}
                        className="btn btn-xs bg-white border-2 border-black rounded-none font-black uppercase hover:bg-error"
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEndContest(contest)}
                        disabled={contest.status !== "Ongoing"}
                        className="btn btn-xs bg-slate-900 text-white border-2 border-black rounded-none font-black uppercase hover:bg-amber-400 hover:text-black disabled:bg-slate-300 disabled:text-slate-600 disabled:cursor-not-allowed"
                      >
                        End Contest
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white neo-brutal rounded-none overflow-hidden">
        <div className="bg-amber-400 p-4 border-b-4 border-black">
          <h2 className="text-xl lg:text-2xl font-black uppercase font-spartan tracking-tight">
            {form.id ? "Edit Contest" : "Create Contest"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-5 lg:p-6 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest">
                Contest Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={handleChange("name")}
                required
                className="w-full p-3 border-4 border-black font-black uppercase outline-none rounded-none focus:bg-emerald-100"
                placeholder="CODINGLAB ROUND #121"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={handleChange("description")}
                className="w-full min-h-24 p-3 border-4 border-black font-bold text-sm outline-none rounded-none focus:bg-emerald-100"
                placeholder="Brief contest description..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest">
                Start Time
              </label>
              <input
                type="datetime-local"
                value={form.startTime}
                onChange={handleChange("startTime")}
                required
                className="w-full p-3 border-4 border-black font-black uppercase outline-none rounded-none focus:bg-emerald-100"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest">
                End Time
              </label>
              <input
                type="datetime-local"
                value={form.endTime}
                onChange={handleChange("endTime")}
                required
                className="w-full p-3 border-4 border-black font-black uppercase outline-none rounded-none focus:bg-emerald-100"
              />
            </div>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setIsSelectingProblems(true)}
              className="px-4 py-3 border-4 border-black bg-white font-black uppercase text-xs shadow-[3px_3px_0px_0px_black] hover:bg-sky-200"
            >
              Problem Selection
            </button>

            <div className="bg-slate-50 border-4 border-black p-3 min-h-16">
              {selectedProblems.length ? (
                <div className="flex flex-wrap gap-2">
                  {selectedProblems.map((problem) => (
                    <span
                      key={problem.id}
                      className="badge rounded-none border-2 border-black font-black uppercase text-[10px] bg-white text-black"
                    >
                      {problem.title}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="font-bold text-xs uppercase text-slate-500">
                  No problems selected
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-3 border-4 border-black bg-white font-black uppercase text-xs shadow-[3px_3px_0px_0px_black] hover:bg-slate-100"
            >
              Reset
            </button>
            <button
              type="submit"
              className="px-4 py-3 border-4 border-black bg-slate-900 text-white font-black uppercase text-xs shadow-[3px_3px_0px_0px_black] hover:bg-emerald-400 hover:text-black"
            >
              {form.id ? "Update Contest" : "Create Contest"}
            </button>
          </div>
        </form>
      </div>

      {isSelectingProblems && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white neo-brutal w-full max-w-2xl max-h-[85svh] overflow-hidden flex flex-col">
            <div className="bg-sky-400 p-4 border-b-4 border-black flex items-center justify-between">
              <h3 className="text-lg font-black uppercase font-spartan tracking-tight">
                Select Problems
              </h3>
              <button
                type="button"
                onClick={() => setIsSelectingProblems(false)}
                className="px-3 py-2 border-2 border-black bg-white font-black uppercase text-xs hover:bg-slate-100"
              >
                Done
              </button>
            </div>

            <div className="p-4 overflow-auto space-y-2">
              {dummyProblems.map((problem) => {
                const selected = form.problemIds.includes(problem.id);
                return (
                  <label
                    key={problem.id}
                    className={`flex items-center justify-between border-2 border-black p-3 cursor-pointer ${
                      selected ? "bg-emerald-100" : "bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm rounded-none border-2 border-black"
                        checked={selected}
                        onChange={() => toggleProblem(problem.id)}
                      />
                      <span className="font-black uppercase text-xs truncate">
                        {problem.title}
                      </span>
                    </div>
                    <span className="font-black text-lg">{selected ? "✓" : "✗"}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {deletingContest && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white neo-brutal w-full max-w-md">
            <div className="bg-error p-4 border-b-4 border-black">
              <h3 className="text-lg font-black uppercase font-spartan tracking-tight">
                Delete Contest
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="font-bold text-sm">
                Are you sure you want to delete{" "}
                <span className="font-black uppercase">{deletingContest.name}</span>?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeletingContest(null)}
                  className="px-4 py-2 border-2 border-black bg-white font-black uppercase text-xs hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-4 py-2 border-2 border-black bg-slate-900 text-white font-black uppercase text-xs hover:bg-error hover:text-black"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminContests;
