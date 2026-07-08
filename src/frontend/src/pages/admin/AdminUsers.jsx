import { useEffect, useMemo, useState } from "react";
import { getBackendURL } from "../../lib/auth-client";
import { Loader2, AlertCircle } from "lucide-react";

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState(null);
  const [banTarget, setBanTarget] = useState(null);
  const [banReason, setBanReason] = useState("");
  const [removeTarget, setRemoveTarget] = useState(null);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${getBackendURL()}/api/admin/users`, {
        headers: {
          "x-admin-token": "admin123"
        },
        credentials: "include"
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        setError("Failed to fetch users");
      }
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Failed to connect to backend api");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleBanClick = (user) => {
    setBanTarget(user);
    setBanReason("");
  };

  const handleBanSubmit = (e) => {
    e.preventDefault();
    if (!banTarget) return;

    // Simulate ban status change locally
    setUsers((prev) =>
      prev.map((u) =>
        (u._id || u.id) === (banTarget._id || banTarget.id) ? { ...u, banned: true } : u
      )
    );
    setBanTarget(null);
    setBanReason("");
    showToast("Banned successfully");
  };

  const handleUnban = (user) => {
    // Simulate unban status change locally
    setUsers((prev) =>
      prev.map((u) =>
        (u._id || u.id) === (user._id || user.id) ? { ...u, banned: false } : u
      )
    );
    showToast("Unbanned successfully");
  };

  const handleRemoveClick = (user) => {
    setRemoveTarget(user);
  };

  const confirmRemove = () => {
    if (!removeTarget) return;
    setUsers((prev) => prev.filter((u) => (u._id || u.id) !== (removeTarget._id || removeTarget.id)));
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
            className="w-full p-3 border-4 border-black font-black uppercase outline-none rounded-none focus:bg-emerald-100 text-black"
          />
        </div>

        <div className="overflow-x-auto">
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
            <table className="table table-zebra w-full border-t-4 border-black">
              <thead className="bg-emerald-400">
                <tr>
                  <th className="border-b-4 border-black text-xs font-black uppercase tracking-widest text-black">
                    Name
                  </th>
                  <th className="border-b-4 border-black text-xs font-black uppercase tracking-widest text-black">
                    Email
                  </th>
                  <th className="border-b-4 border-black text-xs font-black uppercase tracking-widest text-black">
                    Role
                  </th>
                  <th className="border-b-4 border-black text-xs font-black uppercase tracking-widest text-black">
                    Institution
                  </th>
                  <th className="border-b-4 border-black text-xs font-black uppercase tracking-widest text-right text-black">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 font-bold uppercase text-sm text-slate-500">
                      No users found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user._id || user.id} className="hover:bg-slate-100">
                      <td className="font-black uppercase text-black">
                        <div className="flex items-center gap-2">
                          <span>{user.name}</span>
                          {user.banned && (
                            <span className="badge badge-sm bg-error text-black border-2 border-black font-black uppercase">
                              Banned
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="font-black text-xs text-slate-700">{user.email}</td>
                      <td>
                        <span className={`badge rounded-none border-2 border-black font-black uppercase text-[10px] text-black ${
                          user.role === 'admin' ? 'bg-sky-300' :
                          user.role === 'problem_setter' ? 'bg-amber-300' : 'bg-emerald-300'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="font-bold text-xs uppercase text-slate-800">
                        {user.institution || "N/A"}
                      </td>
                      <td className="text-right">
                        <details className="dropdown dropdown-end inline-block">
                          <summary className="btn btn-sm bg-white border-2 border-black rounded-none font-black uppercase text-xs hover:bg-emerald-400 text-black cursor-pointer">
                            Actions
                          </summary>
                          <ul className="menu dropdown-content bg-white rounded-none border-4 border-black shadow-[4px_4px_0px_0px_black] z-[1] mt-2 w-52 p-0">
                            <li>
                              <button
                                type="button"
                                onClick={() => handleBanClick(user)}
                                className="font-bold hover:bg-amber-200 text-black cursor-pointer rounded-none"
                              >
                                Ban User
                              </button>
                            </li>
                            <li>
                              <button
                                type="button"
                                onClick={() => handleUnban(user)}
                                className="font-bold hover:bg-emerald-200 text-black cursor-pointer rounded-none"
                              >
                                Unban User
                              </button>
                            </li>
                            <li>
                              <button
                                type="button"
                                onClick={() => handleRemoveClick(user)}
                                className="font-bold hover:bg-error text-black cursor-pointer rounded-none"
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
          )}
        </div>
      </div>

      {banTarget && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white neo-brutal w-full max-w-md">
            <div className="bg-amber-400 p-4 border-b-4 border-black">
              <h2 className="text-xl font-black uppercase font-spartan tracking-tight text-black">
                Ban User
              </h2>
              <p className="text-[11px] font-bold uppercase text-black">
                {banTarget.name}
              </p>
            </div>
            <form onSubmit={handleBanSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-black">
                  Reason for ban
                </label>
                <textarea
                  className="w-full min-h-24 p-3 border-4 border-black font-bold text-sm outline-none rounded-none focus:bg-amber-100 text-black"
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
                  className="px-4 py-2 border-2 border-black bg-white font-black uppercase text-xs hover:bg-slate-100 text-black cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border-2 border-black bg-slate-900 text-white font-black uppercase text-xs hover:bg-amber-400 hover:text-black cursor-pointer"
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
              <h2 className="text-xl font-black uppercase font-spartan tracking-tight text-black">
                Remove Account
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <p className="font-bold text-sm text-black">
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
                  className="px-4 py-2 border-2 border-black bg-white font-black uppercase text-xs hover:bg-slate-100 text-black cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmRemove}
                  className="px-4 py-2 border-2 border-black bg-slate-900 text-white font-black uppercase text-xs hover:bg-error cursor-pointer"
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
