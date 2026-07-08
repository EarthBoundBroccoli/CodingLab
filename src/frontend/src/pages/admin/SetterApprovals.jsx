import { useState, useEffect } from "react";
import { getBackendURL } from "../../lib/auth-client";
import { Check, X, AlertCircle, Loader2 } from "lucide-react";

const SetterApprovals = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);

  // Rejection modal state
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [submittingReject, setSubmittingReject] = useState(false);
  const [submittingApproveId, setSubmittingApproveId] = useState(null);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${getBackendURL()}/api/admin/setter-requests`, {
        headers: {
          "x-admin-token": "admin123"
        },
        credentials: "include"
      });
      if (response.ok) {
        const data = await response.json();
        setRequests(data);
      } else {
        setError("Failed to fetch pending requests");
      }
    } catch (err) {
      console.error("Error fetching setter requests:", err);
      setError("Failed to connect to backend server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (id) => {
    setSubmittingApproveId(id);
    try {
      const response = await fetch(`${getBackendURL()}/api/admin/setter-requests/${id}/decide`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": "admin123"
        },
        credentials: "include",
        body: JSON.stringify({ status: "accepted" })
      });

      const data = await response.json();

      if (response.ok) {
        showToast("Application approved successfully!");
        setRequests(prev => prev.filter(r => r._id !== id));
      } else {
        showToast(data.message || "Failed to approve request.");
      }
    } catch (err) {
      console.error("Error approving request:", err);
      showToast("Error connecting to server.");
    } finally {
      setSubmittingApproveId(null);
    }
  };

  const handleRejectClick = (reqItem) => {
    setRejectTarget(reqItem);
    setRejectReason("");
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectTarget) return;

    setSubmittingReject(true);
    try {
      const response = await fetch(`${getBackendURL()}/api/admin/setter-requests/${rejectTarget._id}/decide`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": "admin123"
        },
        credentials: "include",
        body: JSON.stringify({
          status: "rejected",
          reason: rejectReason
        })
      });

      const data = await response.json();

      if (response.ok) {
        showToast("Application rejected.");
        setRequests(prev => prev.filter(r => r._id !== rejectTarget._id));
        setRejectTarget(null);
        setRejectReason("");
      } else {
        showToast(data.message || "Failed to reject request.");
      }
    } catch (err) {
      console.error("Error rejecting request:", err);
      showToast("Error connecting to server.");
    } finally {
      setSubmittingReject(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      {toast && (
        <div className="fixed right-4 bottom-4 z-50 bg-emerald-400 text-black border-4 border-black px-4 py-3 font-black uppercase text-xs shadow-[4px_4px_0px_0px_black]">
          {toast}
        </div>
      )}

      <div className="bg-white border-4 border-black neo-brutal rounded-none overflow-hidden">
        <div className="bg-slate-900 text-white p-4 border-b-4 border-black flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-black uppercase font-spartan tracking-tight">
              Setter Elevation Requests
            </h1>
            <p className="text-[11px] font-bold uppercase opacity-70">
              Review and moderate applications for the Problem Setter role
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-20">
            <Loader2 className="animate-spin text-black" size={40} />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-error font-black uppercase flex flex-col items-center justify-center gap-2">
            <AlertCircle size={40} />
            {error}
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-black uppercase text-sm">
            No pending setter requests at the moment.
          </div>
        ) : (
          <div className="divide-y-4 divide-black">
            {requests.map((reqItem) => (
              <div key={reqItem._id} className="p-6 bg-white hover:bg-slate-50 transition-colors">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Student Info Card */}
                  <div className="lg:col-span-1 space-y-3 bg-sky-100 p-4 border-4 border-black neo-brutal">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Requester</span>
                      <h3 className="font-black text-lg uppercase text-black">
                        {reqItem.userId?.name || "Unknown User"}
                      </h3>
                      <p className="text-xs font-bold text-slate-600 truncate">{reqItem.userId?.email || "No email"}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 border-t-2 border-dashed border-black pt-3">
                      <div>
                        <span className="text-[10px] font-black uppercase text-slate-500 block">CGPA</span>
                        <span className="font-black text-sm text-black">{reqItem.cgpa}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase text-slate-500 block">Semester</span>
                        <span className="font-black text-sm text-black truncate block">{reqItem.currSemester}</span>
                      </div>
                    </div>

                    <div className="border-t-2 border-dashed border-black pt-3 space-y-1">
                      <span className="text-[10px] font-black uppercase text-slate-500 block">Institute</span>
                      <span className="font-black text-xs text-black block uppercase">{reqItem.institute}</span>
                      <span className="text-[10px] font-black uppercase text-slate-500 block mt-2">Program</span>
                      <span className="font-black text-xs text-black block uppercase">{reqItem.deptProgram}</span>
                    </div>

                    {reqItem.profileLinks && (
                      <div className="border-t-2 border-dashed border-black pt-3">
                        <span className="text-[10px] font-black uppercase text-slate-500 block">Profile Links</span>
                        <p className="font-bold text-xs break-all text-slate-700">{reqItem.profileLinks}</p>
                      </div>
                    )}
                  </div>

                  {/* Motivation / Motivation Statement */}
                  <div className="lg:col-span-2 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Motivation Statement</span>
                      <div className="p-4 bg-slate-50 border-4 border-black font-medium text-sm text-slate-800 whitespace-pre-wrap">
                        {reqItem.motivation}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-4 justify-end pt-4 border-t-2 border-dashed border-slate-200">
                      <button
                        onClick={() => handleRejectClick(reqItem)}
                        disabled={submittingApproveId !== null}
                        className="px-6 py-2.5 border-4 border-black bg-rose-400 text-black font-black uppercase text-sm hover:bg-rose-500 active:translate-x-0.5 active:translate-y-0.5 transition-all shadow-[4px_4px_0px_0px_black] active:shadow-none flex items-center gap-2 cursor-pointer"
                      >
                        <X size={16} strokeWidth={3} /> Reject Request
                      </button>
                      <button
                        onClick={() => handleApprove(reqItem._id)}
                        disabled={submittingApproveId !== null}
                        className="px-6 py-2.5 border-4 border-black bg-emerald-400 text-black font-black uppercase text-sm hover:bg-emerald-500 active:translate-x-0.5 active:translate-y-0.5 transition-all shadow-[4px_4px_0px_0px_black] active:shadow-none flex items-center gap-2 cursor-pointer"
                      >
                        {submittingApproveId === reqItem._id ? (
                          <Loader2 className="animate-spin" size={16} />
                        ) : (
                          <Check size={16} strokeWidth={3} />
                        )}
                        Approve Setter
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white border-4 border-black neo-brutal w-full max-w-md">
            <div className="bg-rose-400 p-4 border-b-4 border-black flex justify-between items-center">
              <h2 className="text-xl font-black uppercase font-spartan tracking-tight text-black">
                Reject Setter Request
              </h2>
              <button
                onClick={() => setRejectTarget(null)}
                className="p-1 border-2 border-black bg-white hover:bg-slate-100"
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>
            <form onSubmit={handleRejectSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                  Rejection Reason <span className="text-error">*</span>
                </label>
                <textarea
                  className="w-full min-h-24 p-3 border-4 border-black font-black outline-none rounded-none focus:bg-rose-50"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  required
                  placeholder="Provide constructive feedback (e.g. CGPA too low, profile links incomplete...)"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectTarget(null)}
                  className="px-4 py-2 border-2 border-black bg-white font-black uppercase text-xs hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReject}
                  className="px-4 py-2 border-2 border-black bg-slate-900 text-white font-black uppercase text-xs hover:bg-rose-400 hover:text-black transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {submittingReject ? (
                    <Loader2 className="animate-spin" size={12} />
                  ) : (
                    <X size={12} strokeWidth={3} />
                  )}
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SetterApprovals;
