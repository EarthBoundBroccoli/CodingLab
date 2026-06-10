import { useMemo, useState } from "react";

const initialUsers = [
  { id: 1, name: "John Doe", solved: 12, level: "Beginner", banned: false },
  { id: 2, name: "Sarah Khan", solved: 34, level: "Advanced", banned: false },
  { id: 3, name: "Mike Lee", solved: 8, level: "Beginner", banned: true },
  { id: 4, name: "Emily Chen", solved: 27, level: "Intermediate", banned: false },
  { id: 5, name: "David Park", solved: 50, level: "Advanced", banned: false },
  { id: 6, name: "Nora Ali", solved: 19, level: "Intermediate", banned: false },
  { id: 7, name: "Alex Smith", solved: 5, level: "Beginner", banned: false },
  { id: 8, name: "Priya Patel", solved: 42, level: "Advanced", banned: true },
];

const AdminUsers = () => {
  const [users, setUsers] = useState(initialUsers);
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState(null);
  const [banTarget, setBanTarget] = useState(null);
  const [banReason, setBanReason] = useState("");
  const [removeTarget, setRemoveTarget] = useState(null);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  };

  const handleBanClick = (user) => {
    setBanTarget(user);
    setBanReason("");
  };

  const handleBanSubmit = (e) => {
    e.preventDefault();
    if (!banTarget) return;

    setUsers((prev) =>
      prev.map((u) =>
        u.id === banTarget.id ? { ...u, banned: true } : u
      )
    );
    setBanTarget(null);
    setBanReason("");
    showToast("Banned successfully");
  };

  const handleUnban = (user) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === user.id ? { ...u, banned: false } : u
      )
    );
    showToast("Unbanned successfully");
  };

  const handleRemoveClick = (user) => {
    setRemoveTarget(user);
  };

  const confirmRemove = () => {
    if (!removeTarget) return;
    setUsers((prev) => prev.filter((u) => u.id !== removeTarget.id));
    setRemoveTarget(null);
    showToast("Account removed successfully");
  };

  const cancelRemove = () => setRemoveTarget(null);

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) => user.name.toLowerCase().includes(query));
  }, [users, searchQuery]);

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      {toast && (
        <div className="fixed right-4 bottom-4 z-50 bg-emerald-400 text-black border-4 border-black px-4 py-3 font-black uppercase text-xs shadow-[4px_4px_0px_0px_black]">
          {toast}
        </div>
      )}

      <div className="bg-white neo-brutal rounded-none overflow-hidden">
        <div className="bg-slate-900 text-white p-4 border-b-4 border-black flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-black uppercase font-spartan tracking-tight">
              Users
            </h1>
            <p className="text-[11px] font-bold uppercase opacity-70">
              Manage platform users
            </p>
          </div>
        </div>

        <div className="p-4 border-b-4 border-black bg-slate-50">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name..."
            className="w-full p-3 border-4 border-black font-black uppercase outline-none rounded-none focus:bg-emerald-100"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="table table-zebra w-full border-t-4 border-black">
            <thead className="bg-emerald-400">
              <tr>
                <th className="border-b-4 border-black text-xs font-black uppercase tracking-widest">
                  Username
                </th>
                <th className="border-b-4 border-black text-xs font-black uppercase tracking-widest">
                  Solved Count
                </th>
                <th className="border-b-4 border-black text-xs font-black uppercase tracking-widest">
                  Level
                </th>
                <th className="border-b-4 border-black text-xs font-black uppercase tracking-widest text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 font-bold uppercase text-sm text-slate-500">
                    No users found
                  </td>
                </tr>
              ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-100">
                  <td className="font-black uppercase">
                    <div className="flex items-center gap-2">
                      <span>{user.name}</span>
                      {user.banned && (
                        <span className="badge badge-sm bg-error text-black border-2 border-black font-black uppercase">
                          Banned
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="font-black">{user.solved}</td>
                  <td className="font-black uppercase text-xs">
                    {user.level}
                  </td>
                  <td className="text-right">
                    <details className="dropdown dropdown-end inline-block">
                      <summary className="btn btn-sm bg-white border-2 border-black rounded-none font-black uppercase text-xs hover:bg-emerald-400">
                        Actions
                      </summary>
                      <ul className="menu dropdown-content bg-white rounded-none border-4 border-black shadow-[4px_4px_0px_0px_black] z-[1] mt-2 w-52">
                        <li>
                          <button
                            type="button"
                            onClick={() => handleBanClick(user)}
                            className="font-bold hover:bg-amber-200"
                          >
                            Ban User
                          </button>
                        </li>
                        <li>
                          <button
                            type="button"
                            onClick={() => handleUnban(user)}
                            className="font-bold hover:bg-emerald-200"
                          >
                            Unban User
                          </button>
                        </li>
                        <li>
                          <button
                            type="button"
                            onClick={() => handleRemoveClick(user)}
                            className="font-bold hover:bg-error"
                          >
                            Remove Account
                          </button>
                        </li>
                      </ul>
                    </details>
                  </td>
                </tr>
              ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {banTarget && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white neo-brutal w-full max-w-md">
            <div className="bg-amber-400 p-4 border-b-4 border-black">
              <h2 className="text-xl font-black uppercase font-spartan tracking-tight">
                Ban User
              </h2>
              <p className="text-[11px] font-bold uppercase">
                {banTarget.name}
              </p>
            </div>
            <form onSubmit={handleBanSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest">
                  Reason for ban
                </label>
                <textarea
                  className="w-full min-h-24 p-3 border-4 border-black font-bold text-sm outline-none rounded-none focus:bg-amber-100"
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  required
                  placeholder="Spamming, cheating, inappropriate behavior..."
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setBanTarget(null)}
                  className="px-4 py-2 border-2 border-black bg-white font-black uppercase text-xs hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border-2 border-black bg-slate-900 text-white font-black uppercase text-xs hover:bg-amber-400 hover:text-black"
                >
                  Confirm Ban
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {removeTarget && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white neo-brutal w-full max-w-md">
            <div className="bg-error p-4 border-b-4 border-black">
              <h2 className="text-xl font-black uppercase font-spartan tracking-tight">
                Remove Account
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <p className="font-bold text-sm">
                Are you sure you want to remove{" "}
                <span className="font-black uppercase">
                  {removeTarget.name}
                </span>
                ? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={cancelRemove}
                  className="px-4 py-2 border-2 border-black bg-white font-black uppercase text-xs hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmRemove}
                  className="px-4 py-2 border-2 border-black bg-slate-900 text-white font-black uppercase text-xs hover:bg-error"
                >
                  Yes, Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
