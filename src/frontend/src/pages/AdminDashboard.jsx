import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getBackendURL } from "../lib/auth-client";
import { AlertCircle, Loader2 } from "lucide-react";

const createUpcomingContests = () => [
  {
    id: 1,
    name: "CodingLab Round #121",
    startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000),
    duration: "2h",
  },
  {
    id: 2,
    name: "Beginner Blitz",
    startTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
    duration: "1h 30m",
  },
  {
    id: 3,
    name: "Graph Masters",
    startTime: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000),
    duration: "3h",
  },
];

const badgeForDifficulty = (difficulty) => {
  if (difficulty === "Easy") return "bg-emerald-300";
  if (difficulty === "Medium") return "bg-amber-300";
  return "bg-rose-300";
};

const formatCountdown = (targetDate, now) => {
  const diff = targetDate.getTime() - now;
  if (diff <= 0) return "Started";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
};

const CountdownTimer = ({ targetDate }) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="font-black uppercase text-xs bg-black text-white px-2 py-1 border-2 border-black">
      {formatCountdown(targetDate, now)}
    </span>
  );
};

const SectionCard = ({ title, headerClass, children }) => (
  <div className="bg-white neo-brutal rounded-none overflow-hidden h-full flex flex-col">
    <div className={`${headerClass} p-3 border-b-4 border-black`}>
      <h2 className="text-xs font-black uppercase tracking-widest text-black">
        {title}
      </h2>
    </div>
    <div className="p-4 flex-1">{children}</div>
  </div>
);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [upcomingContests] = useState(createUpcomingContests);
  const [toast, setToast] = useState(null);
  
  // Dynamic DB state
  const [dashboardData, setDashboardData] = useState({
    totalUsers: 0,
    totalProblems: 0,
    pendingProblems: 0,
    recentProblemRequests: [],
    topContributors: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedProblem, setSelectedProblem] = useState(null);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${getBackendURL()}/api/admin/dashboard-summary`, {
        headers: {
          "x-admin-token": "admin123"
        },
        credentials: "include"
      });

      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      } else {
        setError("Failed to fetch dashboard data");
      }
    } catch (err) {
      console.error("Error loading dashboard data:", err);
      setError("Error connecting to backend API");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleApprove = async (id) => {
    try {
      const response = await fetch(`${getBackendURL()}/api/admin/problems/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": "admin123"
        },
        credentials: "include",
        body: JSON.stringify({ status: "approved" })
      });

      if (response.ok) {
        showToast("Problem approved");
        setDashboardData(prev => ({
          ...prev,
          pendingProblems: Math.max(0, prev.pendingProblems - 1),
          totalProblems: prev.totalProblems + 1,
          recentProblemRequests: prev.recentProblemRequests.filter(r => r._id !== id)
        }));
      } else {
        showToast("Failed to approve problem");
      }
    } catch (err) {
      console.error("Error approving problem:", err);
      showToast("Error connecting to server");
    }
  };

  const handleReject = async (id) => {
    try {
      const response = await fetch(`${getBackendURL()}/api/admin/problems/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": "admin123"
        },
        credentials: "include",
        body: JSON.stringify({ status: "rejected" })
      });

      if (response.ok) {
        showToast("Problem rejected");
        setDashboardData(prev => ({
          ...prev,
          pendingProblems: Math.max(0, prev.pendingProblems - 1),
          recentProblemRequests: prev.recentProblemRequests.filter(r => r._id !== id)
        }));
      } else {
        showToast("Failed to reject problem");
      }
    } catch (err) {
      console.error("Error rejecting problem:", err);
      showToast("Error connecting to server");
    }
  };

  const quickActions = [
    { label: "Create Contest", path: "/admin/contests" },
    { label: "Setter Approvals", path: "/admin/setter-approvals" },
    { label: "View All Requests", path: "/admin/problem-requests" },
    { label: "Manage Users", path: "/admin/users" },
  ];

  const stats = [
    { label: "Total Users", value: dashboardData.totalUsers, headerClass: "bg-sky-400" },
    { label: "Total Problems", value: dashboardData.totalProblems, headerClass: "bg-emerald-400" },
    { label: "Active Today", value: 12, headerClass: "bg-amber-400" },
    { label: "Total Problems Pending", value: dashboardData.pendingProblems, headerClass: "bg-rose-300" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20 min-h-[60vh]">
        <Loader2 className="animate-spin text-black" size={48} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-[1400px] mx-auto p-8 text-center text-error font-black uppercase flex flex-col items-center justify-center gap-2">
        <AlertCircle size={48} />
        {error}
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 lg:space-y-8">
      {toast && (
        <div className="fixed right-4 bottom-4 z-50 bg-emerald-400 text-black border-4 border-black px-4 py-3 font-black uppercase text-xs shadow-[4px_4px_0px_0px_black]">
          {toast}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white neo-brutal rounded-none overflow-hidden"
          >
            <div className={`${stat.headerClass} p-3 border-b-4 border-black`}>
              <h2 className="text-xs font-black uppercase tracking-widest text-black">
                {stat.label}
              </h2>
            </div>
            <div className="p-6 flex items-center justify-center">
              <span className="text-5xl font-black bg-white border-4 border-black px-4 py-2 shadow-[4px_4px_0px_0px_black]">
                {stat.value}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Recent Problem Requests */}
        <SectionCard title="Recent Problem Requests" headerClass="bg-sky-400">
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr className="border-b-2 border-black">
                  <th className="text-[10px] font-black uppercase text-black">Title</th>
                  <th className="text-[10px] font-black uppercase text-black">Difficulty</th>
                  <th className="text-[10px] font-black uppercase text-black">Submitted By</th>
                  <th className="text-[10px] font-black uppercase text-black text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData.recentProblemRequests.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-6 font-bold uppercase text-xs text-slate-500">
                      No pending requests
                    </td>
                  </tr>
                ) : (
                  dashboardData.recentProblemRequests.map((req) => (
                    <tr key={req._id} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="font-black uppercase text-xs text-black">{req.title}</td>
                      <td>
                        <span
                          className={`badge rounded-none border-2 border-black font-black uppercase text-[10px] text-black ${badgeForDifficulty(
                            req.difficulty
                          )}`}
                        >
                          {req.difficulty}
                        </span>
                      </td>
                      <td className="font-bold text-xs uppercase text-slate-700">
                        {req.setterId?.name || "Unknown Setter"}
                      </td>
                      <td>
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedProblem(req)}
                            className="btn btn-xs bg-sky-300 border-2 border-black rounded-none font-black uppercase hover:bg-sky-200 cursor-pointer"
                          >
                            Review
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApprove(req._id)}
                            className="btn btn-xs bg-emerald-400 border-2 border-black rounded-none font-black uppercase hover:bg-emerald-300 cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReject(req._id)}
                            className="btn btn-xs bg-white border-2 border-black rounded-none font-black uppercase hover:bg-rose-200 cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>

        {/* Top Contributors */}
        <SectionCard title="Top Contributors" headerClass="bg-emerald-400">
          <ul className="space-y-2">
            {dashboardData.topContributors.length === 0 ? (
              <li className="text-center py-6 font-bold uppercase text-xs text-slate-500">
                No contributors yet
              </li>
            ) : (
              dashboardData.topContributors.map((user, index) => (
                <li
                  key={user.id}
                  className="flex items-center justify-between border-2 border-black p-3 bg-slate-50 hover:bg-emerald-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-7 h-7 flex items-center justify-center bg-black text-white font-black text-xs border-2 border-black">
                      {index + 1}
                    </span>
                    <span className="font-black uppercase text-sm truncate text-black">{user.name}</span>
                  </div>
                  <span className="font-black text-sm bg-white border-2 border-black px-2 py-1 shadow-[2px_2px_0px_0px_black] text-black">
                    {user.solved} Approved
                  </span>
                </li>
              ))
            )}
          </ul>
        </SectionCard>

        {/* Upcoming Contests */}
        <SectionCard title="Upcoming Contests" headerClass="bg-amber-400">
          <div className="space-y-3">
            {upcomingContests.map((contest) => (
              <div
                key={contest.id}
                className="border-4 border-black p-3 bg-white space-y-2"
              >
                <h3 className="font-black uppercase text-sm text-black">{contest.name}</h3>
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase text-black">
                  <span className="bg-slate-100 border-2 border-black px-2 py-1">
                    {contest.startTime.toLocaleString([], {
                      month: "short",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="bg-slate-100 border-2 border-black px-2 py-1">
                    {contest.duration}
                  </span>
                  <CountdownTimer targetDate={contest.startTime} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Quick Actions */}
        <SectionCard title="Quick Actions" headerClass="bg-rose-300">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 h-full">
            {quickActions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => navigate(action.path)}
                className="p-4 border-4 border-black bg-white font-black uppercase text-xs sm:text-sm shadow-[3px_3px_0px_0px_black] hover:bg-emerald-400 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_black] transition-all min-h-[72px] cursor-pointer"
              >
                {action.label}
              </button>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Review Modal */}
      {selectedProblem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white border-4 border-black neo-brutal w-full max-w-2xl max-h-[85vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4 border-b-4 border-black flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black uppercase font-spartan tracking-tight">
                  Review: {selectedProblem.title}
                </h3>
                <span className={`badge rounded-none border-2 border-black font-black uppercase text-[10px] text-black mt-1 ${badgeForDifficulty(selectedProblem.difficulty)}`}>
                  {selectedProblem.difficulty}
                </span>
              </div>
              <button
                onClick={() => setSelectedProblem(null)}
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
                  {selectedProblem.statement}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-[10px] font-black uppercase text-slate-400 mb-1">Input Format</h4>
                  <p className="text-xs font-bold text-slate-700">{selectedProblem.inputFormat}</p>
                </div>
                <div>
                  <h4 className="text-[10px] font-black uppercase text-slate-400 mb-1">Output Format</h4>
                  <p className="text-xs font-bold text-slate-700">{selectedProblem.outputFormat}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-[10px] font-black uppercase text-slate-400 mb-1">Time Limit</h4>
                  <p className="text-xs font-black text-black">{selectedProblem.timeLimit} ms</p>
                </div>
                <div>
                  <h4 className="text-[10px] font-black uppercase text-slate-400 mb-1">Memory Limit</h4>
                  <p className="text-xs font-black text-black">{selectedProblem.memoryLimit} MB</p>
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-black uppercase text-slate-400 mb-1">Sample Cases</h4>
                <div className="space-y-2">
                  {selectedProblem.samples?.map((sample, idx) => (
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
                      {selectedProblem.hiddenInput}
                    </p>
                  </div>
                  <div className="p-3 bg-rose-50 border-2 border-black">
                    <span className="text-[9px] font-black uppercase text-rose-700 block">Hidden Output Asset</span>
                    <p className="font-mono text-[10px] font-bold text-slate-800 break-all mt-1 bg-white p-1.5 border border-rose-300">
                      {selectedProblem.hiddenOutput}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t-4 border-black flex justify-end gap-2">
              <button
                onClick={() => setSelectedProblem(null)}
                className="px-4 py-2 border-2 border-black bg-white font-black uppercase text-xs hover:bg-slate-100 cursor-pointer text-black"
              >
                Close Audit
              </button>
              <button
                onClick={() => {
                  handleApprove(selectedProblem._id);
                  setSelectedProblem(null);
                }}
                className="px-4 py-2 border-2 border-black bg-emerald-400 font-black uppercase text-xs hover:bg-emerald-300 cursor-pointer text-black"
              >
                Approve Problem
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
