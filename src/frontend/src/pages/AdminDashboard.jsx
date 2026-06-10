import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const stats = [
  { label: "Total Users", value: 124, headerClass: "bg-sky-400" },
  { label: "Total Problems", value: 48, headerClass: "bg-emerald-400" },
  { label: "Active Today", value: 12, headerClass: "bg-amber-400" },
  { label: "Total Problems Pending", value: 8, headerClass: "bg-rose-300" },
];

const initialPendingRequests = [
  { id: 1, title: "Two Sum", difficulty: "Easy", submittedBy: "John Doe", submittedAt: 5 },
  { id: 2, title: "Valid Parentheses", difficulty: "Easy", submittedBy: "Sarah Khan", submittedAt: 4 },
  { id: 3, title: "Merge Intervals", difficulty: "Medium", submittedBy: "Mike Lee", submittedAt: 3 },
  { id: 4, title: "Word Search II", difficulty: "Hard", submittedBy: "Emily Chen", submittedAt: 2 },
  { id: 5, title: "Coin Change", difficulty: "Medium", submittedBy: "David Park", submittedAt: 1 },
];

const topContributors = [
  { id: 1, name: "David Park", solved: 50 },
  { id: 2, name: "Priya Patel", solved: 42 },
  { id: 3, name: "Sarah Khan", solved: 34 },
  { id: 4, name: "Emily Chen", solved: 27 },
  { id: 5, name: "Nora Ali", solved: 19 },
];

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
  const [pendingRequests, setPendingRequests] = useState(initialPendingRequests);
  const [upcomingContests] = useState(createUpcomingContests);
  const [toast, setToast] = useState(null);

  const sortedPending = useMemo(
    () => [...pendingRequests].sort((a, b) => a.submittedAt - b.submittedAt).slice(0, 5),
    [pendingRequests]
  );

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  };

  const handleApprove = (id) => {
    setPendingRequests((prev) => prev.filter((r) => r.id !== id));
    showToast("Problem approved");
  };

  const handleReject = (id) => {
    setPendingRequests((prev) => prev.filter((r) => r.id !== id));
    showToast("Problem rejected");
  };

  const quickActions = [
    { label: "Create Contest", path: "/admin/contests" },
    { label: "Add Problem", path: "/admin/problem-requests" },
    { label: "View All Requests", path: "/admin/problem-requests" },
    { label: "Manage Users", path: "/admin/users" },
  ];

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 lg:space-y-8">
      {toast && (
        <div className="fixed right-4 bottom-4 z-50 bg-emerald-400 text-black border-4 border-black px-4 py-3 font-black uppercase text-xs shadow-[4px_4px_0px_0px_black]">
          {toast}
        </div>
      )}

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
        <SectionCard title="Recent Problem Requests" headerClass="bg-sky-400">
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr className="border-b-2 border-black">
                  <th className="text-[10px] font-black uppercase">Title</th>
                  <th className="text-[10px] font-black uppercase">Difficulty</th>
                  <th className="text-[10px] font-black uppercase">Submitted By</th>
                  <th className="text-[10px] font-black uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedPending.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-6 font-bold uppercase text-xs text-slate-500">
                      No pending requests
                    </td>
                  </tr>
                ) : (
                  sortedPending.map((req) => (
                    <tr key={req.id} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="font-black uppercase text-xs">{req.title}</td>
                      <td>
                        <span
                          className={`badge rounded-none border-2 border-black font-black uppercase text-[10px] text-black ${badgeForDifficulty(
                            req.difficulty
                          )}`}
                        >
                          {req.difficulty}
                        </span>
                      </td>
                      <td className="font-bold text-xs uppercase">{req.submittedBy}</td>
                      <td>
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleApprove(req.id)}
                            className="btn btn-xs bg-emerald-400 border-2 border-black rounded-none font-black uppercase hover:bg-emerald-300"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReject(req.id)}
                            className="btn btn-xs bg-white border-2 border-black rounded-none font-black uppercase hover:bg-rose-200"
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

        <SectionCard title="Top Contributors" headerClass="bg-emerald-400">
          <ul className="space-y-2">
            {topContributors.map((user, index) => (
              <li
                key={user.id}
                className="flex items-center justify-between border-2 border-black p-3 bg-slate-50 hover:bg-emerald-50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-7 h-7 flex items-center justify-center bg-black text-white font-black text-xs border-2 border-black">
                    {index + 1}
                  </span>
                  <span className="font-black uppercase text-sm truncate">{user.name}</span>
                </div>
                <span className="font-black text-sm bg-white border-2 border-black px-2 py-1 shadow-[2px_2px_0px_0px_black]">
                  {user.solved}
                </span>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Upcoming Contests" headerClass="bg-amber-400">
          <div className="space-y-3">
            {upcomingContests.map((contest) => (
              <div
                key={contest.id}
                className="border-4 border-black p-3 bg-white space-y-2"
              >
                <h3 className="font-black uppercase text-sm">{contest.name}</h3>
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase">
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

        <SectionCard title="Quick Actions" headerClass="bg-rose-300">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 h-full">
            {quickActions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => navigate(action.path)}
                className="p-4 border-4 border-black bg-white font-black uppercase text-xs sm:text-sm shadow-[3px_3px_0px_0px_black] hover:bg-emerald-400 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_black] transition-all min-h-[72px]"
              >
                {action.label}
              </button>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
};

export default AdminDashboard;
