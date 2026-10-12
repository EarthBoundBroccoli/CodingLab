import { useEffect, useMemo, useState } from "react";
import { getBackendURL } from "../../lib/auth-client";
import { Loader2, AlertCircle } from "lucide-react";

const getDurationText = (startTime, endTime) => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
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
  if (isNaN(date.getTime())) return "--";
  return date.toLocaleString([], {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const toDatetimeLocal = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";
  // Format as YYYY-MM-DDTHH:MM
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
};

const statusBadgeClass = (status) => {
  if (status === "Upcoming") return "bg-sky-300";
  if (status === "Ongoing") return "bg-emerald-300";
  return "bg-slate-300";
};

const emptyForm = {
  id: null,
  name: "",
  description: "",
  startTime: "",
  endTime: "",
  problemIds: [],
};

const AdminContests = () => {
  const [contests, setContests] = useState([]);
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [isSelectingProblems, setIsSelectingProblems] = useState(false);
  const [deletingContest, setDeletingContest] = useState(null);
  const [endingContest, setEndingContest] = useState(null);
  const [toast, setToast] = useState(null);

  const selectedProblems = useMemo(() => {
    return problems.filter((problem) => form.problemIds.includes(problem._id || problem.id));
  }, [problems, form.problemIds]);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  };

  const fetchContests = async () => {
    try {
      const response = await fetch(`${getBackendURL()}/api/contests`, {
        credentials: "include"
      });
      if (response.ok) {
        const data = await response.json();
        setContests(data);
      } else {
        setError("Failed to fetch contests");
      }
    } catch (err) {
      console.error("Error fetching contests:", err);
      setError("Failed to connect to backend API");
    }
  };

  const fetchProblems = async () => {
    try {
      const response = await fetch(`${getBackendURL()}/api/problems`, {
        credentials: "include"
      });
      if (response.ok) {
        const data = await response.json();
        // Only show approved problems in picker
        const approved = data.filter(p => p.status === 'approved' || p.status === 'Approved');
        setProblems(approved);
      }
    } catch (err) {
      console.error("Error fetching problems:", err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError("");
    await Promise.all([fetchContests(), fetchProblems()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.startTime || !form.endTime || !form.problemIds.length) return;

    try {
      const payload = {
        name: form.name,
        description: form.description,
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
        problems: form.problemIds,
      };

      const url = form.id 
        ? `${getBackendURL()}/api/contests/${form.id}`
        : `${getBackendURL()}/api/contests`;

      const method = form.id ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": "admin123"
        },
        credentials: "include",
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        showToast(form.id ? "Contest updated successfully" : "Contest created successfully");
        resetForm();
        fetchContests();
      } else {
        const errorData = await response.json();
        showToast(errorData.message || "Failed to save contest");
      }
    } catch (err) {
      console.error("Error saving contest:", err);
      showToast("Error connecting to backend API");
    }
  };

  const handleEdit = (contest) => {
    setForm({
      id: contest._id || contest.id,
      name: contest.name,
      description: contest.description || "",
      startTime: toDatetimeLocal(contest.startTime),
      endTime: toDatetimeLocal(contest.endTime),
      problemIds: contest.problems || [],
    });
  };

  const handleDelete = async () => {
    if (!deletingContest) return;
    try {
      const id = deletingContest._id || deletingContest.id;
      const response = await fetch(`${getBackendURL()}/api/contests/${id}`, {
        method: "DELETE",
        headers: {
          "x-admin-token": "admin123"
        },
        credentials: "include"
      });

      if (response.ok) {
        showToast("Contest deleted successfully");
        fetchContests();
      } else {
        showToast("Failed to delete contest");
      }
    } catch (err) {
      console.error("Error deleting contest:", err);
      showToast("Error connecting to backend API");
    } finally {
      setDeletingContest(null);
    }
  };

  const confirmEndContest = async () => {
    if (!endingContest) return;
    try {
      const id = endingContest._id || endingContest.id;
      const response = await fetch(`${getBackendURL()}/api/contests/${id}/end`, {
        method: "PUT",
        headers: {
          "x-admin-token": "admin123"
        },
        credentials: "include"
      });

      if (response.ok) {
        showToast("Contest ended manually");
        fetchContests();
      } else {
        showToast("Failed to end contest");
      }
    } catch (err) {
      console.error("Error ending contest:", err);
      showToast("Error connecting to backend API");
    } finally {
      setEndingContest(null);
    }
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
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full border-t-4 border-black text-black">
              <thead className="bg-emerald-400">
                <tr>
                  <th className="border-b-4 border-black text-xs font-black uppercase tracking-widest text-black">
                    Contest Name
                  </th>
                  <th className="border-b-4 border-black text-xs font-black uppercase tracking-widest text-black">
                    Start Time
                  </th>
                  <th className="border-b-4 border-black text-xs font-black uppercase tracking-widest text-black">
                    Duration
                  </th>
                  <th className="border-b-4 border-black text-xs font-black uppercase tracking-widest text-black">
                    Status
                  </th>
                  <th className="border-b-4 border-black text-xs font-black uppercase tracking-widest text-right text-black">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {contests.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 font-bold uppercase text-sm text-slate-500">
                      No contests found
                    </td>
                  </tr>
                ) : (
                  contests.map((contest) => (
                    <tr key={contest._id || contest.id} className="hover:bg-slate-100">
                      <td className="font-black uppercase text-black">{contest.name}</td>
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
                            className="btn btn-xs bg-white border-2 border-black rounded-none font-black uppercase hover:bg-emerald-300 text-black cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingContest(contest)}
                            className="btn btn-xs bg-white border-2 border-black rounded-none font-black uppercase hover:bg-error text-black cursor-pointer"
                          >
                            Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setEndingContest(contest)}
                            disabled={contest.status !== "Ongoing"}
                            className="btn btn-xs bg-slate-900 text-white border-2 border-black rounded-none font-black uppercase hover:bg-amber-400 hover:text-black disabled:bg-slate-300 disabled:text-slate-600 disabled:cursor-not-allowed cursor-pointer"
                          >
                            End Contest
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white neo-brutal rounded-none overflow-hidden">
        <div className="bg-amber-400 p-4 border-b-4 border-black">
          <h2 className="text-xl lg:text-2xl font-black uppercase font-spartan tracking-tight text-black">
            {form.id ? "Edit Contest" : "Create Contest"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-5 lg:p-6 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-black">
                Contest Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={handleChange("name")}
                required
                className="w-full p-3 border-4 border-black font-black uppercase outline-none rounded-none focus:bg-emerald-100 text-black"
                placeholder="CODINGLAB ROUND #121"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-black">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={handleChange("description")}
                className="w-full min-h-24 p-3 border-4 border-black font-bold text-sm outline-none rounded-none focus:bg-emerald-100 text-black"
                placeholder="Brief contest description..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-black">
                Start Time
              </label>
              <input
                type="datetime-local"
                value={form.startTime}
                onChange={handleChange("startTime")}
                required
                className="w-full p-3 border-4 border-black font-black uppercase outline-none rounded-none focus:bg-emerald-100 text-black"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-black">
                End Time
              </label>
              <input
                type="datetime-local"
                value={form.endTime}
                onChange={handleChange("endTime")}
                required
                className="w-full p-3 border-4 border-black font-black uppercase outline-none rounded-none focus:bg-emerald-100 text-black"
              />
            </div>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setIsSelectingProblems(true)}
              className="px-4 py-3 border-4 border-black bg-white font-black uppercase text-xs shadow-[3px_3px_0px_0px_black] hover:bg-sky-200 text-black cursor-pointer"
            >
              Problem Selection
            </button>

            <div className="bg-slate-50 border-4 border-black p-3 min-h-16">
              {selectedProblems.length ? (
                <div className="flex flex-wrap gap-2">
                  {selectedProblems.map((problem) => (
                    <span
                      key={problem._id || problem.id}
                      className="badge rounded-none border-2 border-black font-black uppercase text-[10px] bg-white text-black"
                    >
                      {problem.title}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="font-bold text-xs uppercase text-rose-600">
                  ⚠️ At least 1 problem must be selected
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-3 border-4 border-black bg-white font-black uppercase text-xs shadow-[3px_3px_0px_0px_black] hover:bg-slate-100 text-black cursor-pointer"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={form.problemIds.length === 0}
              title={form.problemIds.length === 0 ? "Please select at least 1 problem" : ""}
              className={`px-4 py-3 border-4 border-black font-black uppercase text-xs shadow-[3px_3px_0px_0px_black] ${
                form.problemIds.length === 0
                  ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                  : "bg-slate-900 text-white hover:bg-emerald-400 hover:text-black cursor-pointer"
              }`}
            >
              {form.id ? "Update Contest" : "Create Contest"}
            </button>
          </div>
        </form>
      </div>

      {isSelectingProblems && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white neo-brutal w-full max-w-2xl max-h-[85svh] overflow-hidden flex flex-col border-4 border-black">
            <div className="bg-sky-400 p-4 border-b-4 border-black flex items-center justify-between">
              <h3 className="text-lg font-black uppercase font-spartan tracking-tight text-black">
                Select Problems ({form.problemIds.length} Selected)
              </h3>
              <button
                type="button"
                onClick={() => setIsSelectingProblems(false)}
                className="px-3 py-2 border-2 border-black bg-white font-black uppercase text-xs hover:bg-slate-100 text-black cursor-pointer"
              >
                Done
              </button>
            </div>

            <div className="p-4 overflow-auto space-y-2">
              {problems.length === 0 ? (
                <p className="text-center font-bold uppercase text-xs text-slate-500 py-10">No approved problems found</p>
              ) : (
                problems.map((problem) => {
                  const pid = problem._id || problem.id;
                  const selected = form.problemIds.includes(pid);
                  return (
                    <label
                      key={pid}
                      className={`flex items-center justify-between border-2 border-black p-3 cursor-pointer ${
                        selected ? "bg-emerald-100" : "bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          className="checkbox checkbox-sm rounded-none border-2 border-black bg-white"
                          checked={selected}
                          onChange={() => toggleProblem(pid)}
                        />
                        <span className="font-black uppercase text-xs truncate text-black">
                          {problem.title}
                        </span>
                        <span className={`badge rounded-none border-2 border-black font-black uppercase text-[8px] text-black ${
                          problem.difficulty === "Easy" ? "bg-emerald-300" :
                          problem.difficulty === "Medium" ? "bg-amber-300" : "bg-rose-300"
                        }`}>
                          {problem.difficulty}
                        </span>
                      </div>
                      <span className="font-black text-lg text-black">{selected ? "✓" : ""}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {deletingContest && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white neo-brutal w-full max-w-md border-4 border-black">
            <div className="bg-error p-4 border-b-4 border-black">
              <h3 className="text-lg font-black uppercase font-spartan tracking-tight text-black">
                Delete Contest
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="font-bold text-sm text-black">
                Are you sure you want to delete{" "}
                <span className="font-black uppercase">{deletingContest.name}</span>?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeletingContest(null)}
                  className="px-4 py-2 border-2 border-black bg-white font-black uppercase text-xs hover:bg-slate-100 text-black cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-4 py-2 border-2 border-black bg-slate-900 text-white font-black uppercase text-xs hover:bg-error hover:text-black cursor-pointer"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {endingContest && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white neo-brutal w-full max-w-md border-4 border-black">
            <div className="bg-amber-400 p-4 border-b-4 border-black">
              <h3 className="text-lg font-black uppercase font-spartan tracking-tight text-black">
                End Contest
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="font-bold text-sm text-black">
                Are you sure you want to manually end{" "}
                <span className="font-black uppercase">{endingContest.name}</span>?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEndingContest(null)}
                  className="px-4 py-2 border-2 border-black bg-white font-black uppercase text-xs hover:bg-slate-100 text-black cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmEndContest}
                  className="px-4 py-2 border-2 border-black bg-slate-900 text-white font-black uppercase text-xs hover:bg-amber-400 hover:text-black cursor-pointer"
                >
                  Confirm End
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
