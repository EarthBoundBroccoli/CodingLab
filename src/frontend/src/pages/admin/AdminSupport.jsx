import { useEffect, useState } from "react";
import { getBackendURL } from "../../lib/auth-client";

const AdminSupport = () => {
  const [status, setStatus] = useState("open");
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [resource, setResource] = useState(null);
  const [saving, setSaving] = useState("");
  const [actionError, setActionError] = useState("");
  const key = `${status}:${page}:${attempt}`;
  const loading = resource?.key !== key;
  const data = loading ? null : resource.data;
  const error = loading ? "" : resource.error;

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${getBackendURL()}/api/admin/support-requests?status=${status}&page=${page}`, {
      credentials: "include", signal: controller.signal,
    }).then(async response => {
      if (!response.ok) throw new Error("Could not load support requests. Please retry.");
      const result = await response.json();
      if (!controller.signal.aborted) setResource({ key, data: result, error: "" });
    }).catch(err => {
      if (!controller.signal.aborted) setResource({ key, data: null, error: err.message });
    });
    return () => controller.abort();
  }, [status, page, key]);

  const updateStatus = async request => {
    if (saving) return;
    setSaving(request._id);
    setActionError("");
    try {
      const response = await fetch(`${getBackendURL()}/api/admin/support-requests/${request._id}/status`, {
        method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: request.status === "open" ? "resolved" : "open" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Could not update request.");
      setAttempt(value => value + 1);
    } catch (err) {
      setActionError(err.message || "Could not connect. Please try again.");
    } finally {
      setSaving("");
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto bg-white neo-brutal">
      <div className="bg-slate-900 text-white p-4 border-b-4 border-black flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-black uppercase font-spartan">Support requests</h1>
        <button disabled={!!saving} onClick={() => setAttempt(value => value + 1)} className="btn btn-sm rounded-none bg-white text-black border-2 border-black">Refresh</button>
      </div>
      <div className="p-4 border-b-4 border-black flex items-center gap-3">
        <label htmlFor="support-status" className="font-bold text-sm">Status</label>
        <select id="support-status" value={status} disabled={!!saving} onChange={e => { setStatus(e.target.value); setPage(1); setActionError(""); }} className="p-2 border-2 border-black bg-white">
          <option value="open">Open</option><option value="resolved">Resolved</option><option value="all">All</option>
        </select>
        {data && <span className="text-sm text-slate-600">{data.total} requests</span>}
      </div>
      <div className="p-4 space-y-4">
        {actionError && <p role="alert" className="text-red-700 font-bold">{actionError}</p>}
        {loading ? <p role="status" className="py-12 text-center">Loading support requests…</p>
          : error ? <div role="alert" className="py-8 text-center space-y-3"><p>{error}</p><button onClick={() => setAttempt(value => value + 1)} className="btn rounded-none border-2 border-black bg-white">Retry</button></div>
          : data.requests.length === 0 ? <p className="py-12 text-center text-slate-600">No {status === "all" ? "" : `${status} `}support requests.</p>
          : data.requests.map(request => (
            <article key={request._id} className="border-2 border-black p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-black">{request.name}</h2>
                  <p className="text-sm break-all">{request.email}</p>
                  <p className="text-xs text-slate-500 mt-1">{new Date(request.createdAt).toLocaleString()}</p>
                </div>
                <span className={`border-2 border-black px-2 py-1 text-xs font-bold uppercase ${request.status === "open" ? "bg-white" : "bg-emerald-100"}`}>{request.status}</span>
              </div>
              <p className="whitespace-pre-wrap break-words text-sm">{request.message}</p>
              {request.resolvedAt && <p className="text-xs text-slate-500">Resolved {new Date(request.resolvedAt).toLocaleString()}</p>}
              <button disabled={!!saving} onClick={() => updateStatus(request)} className="btn btn-sm rounded-none border-2 border-black bg-white hover:bg-emerald-400">
                {saving === request._id ? "Saving…" : request.status === "open" ? "Mark resolved" : "Reopen"}
              </button>
            </article>
          ))}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-center gap-4">
            <button disabled={data.page <= 1 || !!saving} onClick={() => setPage(data.page - 1)} className="btn btn-sm rounded-none border-2 border-black bg-white">Previous</button>
            <span className="text-sm">Page {data.page} of {data.totalPages}</span>
            <button disabled={data.page >= data.totalPages || !!saving} onClick={() => setPage(data.page + 1)} className="btn btn-sm rounded-none border-2 border-black bg-white">Next</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSupport;
