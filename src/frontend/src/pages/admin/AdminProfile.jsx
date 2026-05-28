import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ADMIN_EMAIL, ADMIN_PASSWORD, logoutAdmin } from "../../lib/admin-auth";

const AdminProfile = () => {
  const navigate = useNavigate();
  const joinDate = useMemo(() => new Date().toLocaleDateString(), []);

  const [toast, setToast] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  };

  const handleLogout = () => {
    logoutAdmin();
    navigate("/admin/login", { replace: true });
  };

  const openPasswordModal = () => {
    setShowPasswordModal(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setError("");
  };

  const handleChangePassword = (e) => {
    e.preventDefault();
    setError("");

    if (currentPassword !== ADMIN_PASSWORD) {
      setError("Current password is incorrect");
      return;
    }
    if (newPassword.length < 4) {
      setError("New password is too short");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    closePasswordModal();
    showToast("Password changed successfully");
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      {toast && (
        <div className="fixed right-4 bottom-4 z-50 bg-emerald-400 text-black border-4 border-black px-4 py-3 font-black uppercase text-xs shadow-[4px_4px_0px_0px_black]">
          {toast}
        </div>
      )}

      <div className="bg-white neo-brutal rounded-none overflow-hidden max-w-3xl mx-auto">
        <div className="bg-slate-900 text-white p-5 border-b-4 border-black flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-black uppercase font-spartan tracking-tight">
              Profile
            </h1>
            <p className="text-[11px] font-bold uppercase opacity-70">
              Admin account details
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="btn bg-white text-black border-2 border-black rounded-none font-black uppercase hover:bg-error"
          >
            Logout
          </button>
        </div>

        <div className="p-6 lg:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <div className="w-24 h-24 bg-emerald-400 border-4 border-black shadow-[4px_4px_0px_0px_black] flex items-center justify-center">
              <span className="text-4xl font-black text-black">A</span>
            </div>

            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50 border-4 border-black p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                  Name
                </p>
                <p className="text-lg font-black uppercase">Admin</p>
              </div>

              <div className="bg-slate-50 border-4 border-black p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                  Email
                </p>
                <p className="text-lg font-black lowercase">{ADMIN_EMAIL}</p>
              </div>

              <div className="bg-slate-50 border-4 border-black p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                  Role
                </p>
                <p className="text-lg font-black uppercase">Super Admin</p>
              </div>

              <div className="bg-slate-50 border-4 border-black p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                  Join date
                </p>
                <p className="text-lg font-black uppercase">{joinDate}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <button
              type="button"
              onClick={openPasswordModal}
              className="px-4 py-3 border-4 border-black bg-white font-black uppercase text-sm shadow-[3px_3px_0px_0px_black] hover:bg-amber-200"
            >
              Change Password
            </button>
          </div>
        </div>
      </div>

      {showPasswordModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white neo-brutal w-full max-w-md overflow-hidden">
            <div className="bg-amber-400 p-4 border-b-4 border-black">
              <h2 className="text-xl font-black uppercase font-spartan tracking-tight">
                Change Password
              </h2>
            </div>

            <form onSubmit={handleChangePassword} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest">
                  Current password
                </label>
                <input
                  type="password"
                  className="w-full p-3 border-4 border-black font-black outline-none rounded-none focus:bg-amber-100"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest">
                  New password
                </label>
                <input
                  type="password"
                  className="w-full p-3 border-4 border-black font-black outline-none rounded-none focus:bg-amber-100"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest">
                  Confirm password
                </label>
                <input
                  type="password"
                  className="w-full p-3 border-4 border-black font-black outline-none rounded-none focus:bg-amber-100"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              {error && (
                <div className="bg-error text-black border-2 border-black p-3 font-black text-xs uppercase italic">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closePasswordModal}
                  className="px-4 py-2 border-2 border-black bg-white font-black uppercase text-xs hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border-2 border-black bg-slate-900 text-white font-black uppercase text-xs hover:bg-amber-400 hover:text-black"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProfile;
