import { useEffect, useState, useCallback } from "react";
import { getBackendURL } from "../../lib/auth-client";
import { 
  MessageSquare, 
  Send, 
  CheckCircle2, 
  Clock, 
  RefreshCw, 
  AlertCircle, 
  Loader2, 
  Mail, 
  User, 
  ShieldCheck 
} from "lucide-react";

const AdminSupport = () => {
  const [status, setStatus] = useState("all");
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // Track draft replies by ticket ID: { [ticketId]: string }
  const [replyDrafts, setReplyDrafts] = useState({});
  // Track which ticket ID is currently being replied to
  const [submittingReplyId, setSubmittingReplyId] = useState("");

  const fetchTickets = useCallback((signal) => {
    return fetch(`${getBackendURL()}/api/support/all?status=${status}`, { credentials: "include", signal })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Could not load support tickets.");
        return data;
      })
      .then(data => { if (!signal?.aborted) setTickets(Array.isArray(data) ? data : []); })
      .catch(error => { if (!signal?.aborted) setFetchError(error.message || "Could not load support tickets."); })
      .finally(() => { if (!signal?.aborted) setLoading(false); });
  }, [status]);

  useEffect(() => {
    const controller = new AbortController();
    fetchTickets(controller.signal);
    return () => controller.abort();
  }, [fetchTickets]);

  const reloadTickets = () => {
    setLoading(true);
    setFetchError("" );
    fetchTickets();
  };

  const handleReplyChange = (ticketId, value) => {
    setReplyDrafts((prev) => ({
      ...prev,
      [ticketId]: value,
    }));
  };

  const handleSendReply = async (ticketId) => {
    const draftText = replyDrafts[ticketId]?.trim();
    if (!draftText) {
      setActionError("Please enter a reply message before submitting.");
      return;
    }

    setSubmittingReplyId(ticketId);
    setActionError("");
    setActionSuccess("");

    try {
      const response = await fetch(`${getBackendURL()}/api/support/${ticketId}/reply`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({ adminReply: draftText }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.message || "Could not submit reply.");
      }

      setActionSuccess(`Replied to ticket successfully!`);
      // Clear this ticket's draft
      setReplyDrafts((prev) => {
        const updated = { ...prev };
        delete updated[ticketId];
        return updated;
      });

      // Update the ticket in state
      setTickets((prev) =>
        prev.map((t) => {
          if (t._id === ticketId) {
            return {
              ...t,
              status: "Resolved",
              adminReply: draftText,
              updatedAt: new Date().toISOString(),
            };
          }
          return t;
        })
      );
    } catch (err) {
      console.error("Error submitting admin reply:", err);
      setActionError(err.message || "Failed to submit reply. Please try again.");
    } finally {
      setSubmittingReplyId("");
    }
  };

  // Filter tickets client-side as well for instant responsiveness
  const filteredTickets = tickets.filter((ticket) => {
    if (status === "all") return true;
    const ticketStatus = (ticket.status || "").toLowerCase();
    if (status === "open") return ticketStatus === "open" || ticketStatus === "pending";
    if (status === "resolved") return ticketStatus === "resolved";
    return true;
  });

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="max-w-[1400px] mx-auto bg-white neo-brutal">
      {/* Admin Support Header */}
      <div className="bg-slate-900 text-white p-6 border-b-4 border-black flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase font-spartan tracking-tight">
            Support Tickets
          </h1>
          <p className="text-xs sm:text-sm font-bold text-slate-300 uppercase tracking-wider mt-1">
            Review user inquiries and dispatch official admin replies
          </p>
        </div>
        <button
          onClick={reloadTickets}
          disabled={loading}
          className="btn btn-sm rounded-none bg-emerald-400 text-black border-2 border-black font-black uppercase text-xs shadow-[2px_2px_0px_0px_black] hover:bg-white active:translate-x-0.5 active:translate-y-0.5 cursor-pointer flex items-center gap-1.5"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 sm:p-6 border-b-4 border-black flex flex-wrap items-center justify-between gap-4 bg-slate-50">
        <div className="flex items-center gap-3">
          <label htmlFor="support-status" className="font-black text-xs uppercase tracking-wider text-black">
            Filter Status:
          </label>
          <select
            id="support-status"
            value={status}
            onChange={(e) => { setLoading(true); setFetchError(""); setStatus(e.target.value); }}
            className="p-2 border-2 border-black bg-white font-bold text-sm outline-none shadow-[2px_2px_0px_0px_black] cursor-pointer"
          >
            <option value="all">All Tickets</option>
            <option value="open">Open / Pending</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="bg-black text-white px-3 py-1 text-xs font-black font-mono border-2 border-black shadow-[2px_2px_0px_0px_black]">
            {filteredTickets.length} {filteredTickets.length === 1 ? "Ticket" : "Tickets"}
          </span>
        </div>
      </div>

      {/* Alerts */}
      <div className="p-6 space-y-6">
        {actionError && (
          <div role="alert" className="p-4 bg-red-100 border-4 border-black shadow-[4px_4px_0px_0px_black] flex items-center gap-3">
            <AlertCircle className="text-red-600 shrink-0" size={24} strokeWidth={2.5} />
            <p className="font-black text-red-900 text-sm">{actionError}</p>
          </div>
        )}

        {actionSuccess && (
          <div role="status" className="p-4 bg-emerald-100 border-4 border-black shadow-[4px_4px_0px_0px_black] flex items-center gap-3">
            <CheckCircle2 className="text-emerald-700 shrink-0" size={24} strokeWidth={2.5} />
            <p className="font-black text-emerald-900 text-sm">{actionSuccess}</p>
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
            <Loader2 size={36} className="animate-spin text-black" />
            <p className="font-black uppercase tracking-wider text-sm text-black">
              Loading support tickets…
            </p>
          </div>
        ) : fetchError ? (
          <div role="alert" className="py-12 text-center space-y-4">
            <AlertCircle size={40} className="mx-auto text-red-600" />
            <p className="font-black uppercase text-red-700">{fetchError}</p>
            <button
              onClick={reloadTickets}
              className="px-6 py-2 bg-white border-2 border-black font-black uppercase text-xs shadow-[2px_2px_0px_0px_black] hover:bg-emerald-400 cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="py-16 text-center space-y-3 bg-slate-50 border-2 border-black border-dashed">
            <MessageSquare size={36} className="mx-auto text-slate-400" />
            <p className="font-black uppercase text-sm tracking-wider text-slate-600">
              No {status === "all" ? "" : `${status} `}support tickets found.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredTickets.map((ticket) => {
              const isResolved = (ticket.status || "").toLowerCase() === "resolved";
              const isReplying = submittingReplyId === ticket._id;
              const currentDraft = replyDrafts[ticket._id] ?? "";
              const userName = ticket.userId?.name || "Student User";
              const userEmail = ticket.userId?.email || "";

              return (
                <article
                  key={ticket._id}
                  className="border-4 border-black p-6 space-y-5 bg-white neo-brutal shadow-[6px_6px_0px_0px_black]"
                >
                  {/* Card Header: User and Status */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-black pb-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="inline-flex items-center gap-1.5 font-black text-black text-base">
                          <User size={16} strokeWidth={2.5} />
                          {userName}
                        </span>
                        {userEmail && (
                          <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 border border-black">
                            <Mail size={12} />
                            {userEmail}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-mono font-bold text-slate-500">
                        Submitted: {formatDate(ticket.createdAt)}
                        {ticket.updatedAt && ticket.updatedAt !== ticket.createdAt && (
                          <span className="ml-2">• Updated: {formatDate(ticket.updatedAt)}</span>
                        )}
                      </p>
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0 self-start">
                      {isResolved ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-400 text-black border-2 border-black font-black uppercase text-xs shadow-[2px_2px_0px_0px_black]">
                          <CheckCircle2 size={14} strokeWidth={3} />
                          Resolved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-300 text-black border-2 border-black font-black uppercase text-xs shadow-[2px_2px_0px_0px_black]">
                          <Clock size={14} strokeWidth={3} />
                          {ticket.status || "Open"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Subject & User Message */}
                  <div className="space-y-2">
                    <h2 className="text-xl font-black uppercase font-spartan text-black tracking-tight">
                      {ticket.subject}
                    </h2>
                    <div className="p-4 bg-slate-50 border-2 border-black font-medium text-black text-sm whitespace-pre-wrap leading-relaxed">
                      {ticket.message}
                    </div>
                  </div>

                  {/* Current Admin Reply (if present) */}
                  {ticket.adminReply && (
                    <div className="bg-emerald-50 border-3 border-black p-4 space-y-2 shadow-[3px_3px_0px_0px_black]">
                      <div className="flex items-center justify-between border-b-2 border-emerald-300 pb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="p-0.5 bg-black text-emerald-400 border border-black inline-flex">
                            <ShieldCheck size={14} strokeWidth={2.5} />
                          </span>
                          <span className="text-xs font-black uppercase tracking-wider text-black">
                            Current Admin Reply
                          </span>
                        </div>
                        <span className="text-[10px] font-black uppercase font-mono text-emerald-800">
                          Status: Resolved
                        </span>
                      </div>
                      <div className="font-bold text-black text-sm whitespace-pre-wrap leading-relaxed">
                        {ticket.adminReply}
                      </div>
                    </div>
                  )}

                  {/* Reply Input Form */}
                  <div className="space-y-3 pt-2">
                    <label
                      htmlFor={`reply-input-${ticket._id}`}
                      className="block text-xs font-black uppercase tracking-wider text-black"
                    >
                      {ticket.adminReply ? "Send a New / Updated Reply:" : "Admin Reply:"}
                    </label>
                    <textarea
                      id={`reply-input-${ticket._id}`}
                      value={currentDraft}
                      onChange={(e) => handleReplyChange(ticket._id, e.target.value)}
                      placeholder="Type your response to the user here. Clicking 'Reply' will send this reply and mark the ticket Resolved..."
                      rows={3}
                      disabled={isReplying}
                      className="w-full p-3 border-2 border-black font-bold text-black placeholder:text-slate-400 bg-white outline-none focus:bg-emerald-50 transition-colors text-sm resize-y"
                    />

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleSendReply(ticket._id)}
                        disabled={isReplying || !currentDraft.trim()}
                        className="px-6 py-2.5 bg-slate-900 text-white font-black uppercase text-sm border-2 border-black shadow-[3px_3px_0px_0px_black] hover:bg-emerald-400 hover:text-black active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isReplying ? (
                          <>
                            <Loader2 className="animate-spin" size={16} />
                            <span>Sending Reply…</span>
                          </>
                        ) : (
                          <>
                            <Send size={16} strokeWidth={2.5} />
                            <span>Reply</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSupport;
