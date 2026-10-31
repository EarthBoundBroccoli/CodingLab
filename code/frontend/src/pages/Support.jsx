import { useState, useEffect, useCallback } from "react";
import { getBackendURL } from "../lib/auth-client";
import { 
  LifeBuoy, 
  Send, 
  CheckCircle2, 
  Clock, 
  MessageSquare, 
  AlertCircle, 
  Loader2, 
  RefreshCw,
  ShieldCheck
} from "lucide-react";

const Support = () => {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [ticketsError, setTicketsError] = useState("");

  const fetchTickets = useCallback((signal) => {
    return fetch(`${getBackendURL()}/api/support/my-tickets`, { credentials: "include", signal })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Could not load support tickets.");
        return data;
      })
      .then(data => { if (!signal?.aborted) setTickets(Array.isArray(data) ? data : []); })
      .catch(error => { if (!signal?.aborted) setTicketsError(error.message || "Could not load support tickets."); })
      .finally(() => { if (!signal?.aborted) setLoadingTickets(false); });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchTickets(controller.signal);
    return () => controller.abort();
  }, [fetchTickets]);

  const reloadTickets = () => {
    setLoadingTickets(true);
    setTicketsError("" );
    fetchTickets();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (!subject.trim()) {
      setFormError("Please enter a subject.");
      return;
    }
    if (!message.trim()) {
      setFormError("Please enter your message.");
      return;
    }

    setSubmitting(true);
    setFormError("");
    setFormSuccess("");

    try {
      const response = await fetch(`${getBackendURL()}/api/support`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          subject: subject.trim(),
          message: message.trim(),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Failed to submit support ticket. Please try again.");
      }

      setFormSuccess("Your ticket has been submitted successfully! Our support team will review it.");
      setSubject("");
      setMessage("");

      // Update tickets list
      if (data.ticket) {
        setTickets((prev) => [data.ticket, ...prev.filter((t) => t._id !== data.ticket._id)]);
      } else {
        fetchTickets();
      }
    } catch (err) {
      console.error("Error submitting ticket:", err);
      setFormError(err.message || "Could not submit ticket. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="max-w-[1200px] mx-auto py-12 px-4 lg:px-8 space-y-12">
      {/* Page Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-400 border-2 border-black font-black uppercase text-xs shadow-[2px_2px_0px_0px_black]">
          <LifeBuoy size={14} strokeWidth={3} />
          Student Helpdesk & Support
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black uppercase font-spartan text-black tracking-tight">
          Support System
        </h1>
        <p className="text-slate-700 font-bold max-w-xl mx-auto text-sm sm:text-base">
          Have an issue with contests, problems, or your account? Submit a support ticket and our admin team will assist you.
        </p>
      </div>

      {/* Main Grid: Form and Info */}
      <div className="max-w-3xl mx-auto">
        <div className="bg-white border-4 border-black neo-brutal p-6 sm:p-10 shadow-[8px_8px_0px_0px_black]">
          <div className="flex items-center gap-3 border-b-4 border-black pb-4 mb-6">
            <div className="p-2.5 bg-emerald-400 border-2 border-black shadow-[2px_2px_0px_0px_black]">
              <MessageSquare size={24} strokeWidth={2.5} className="text-black" />
            </div>
            <div>
              <h2 className="text-2xl font-black uppercase font-spartan text-black tracking-tight">
                Create a Support Ticket
              </h2>
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Fill out the details below to open a ticket
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Subject Input */}
            <div className="space-y-2">
              <label 
                htmlFor="ticket-subject" 
                className="block text-xs font-black uppercase tracking-wider text-black"
              >
                Subject <span className="text-red-600">*</span>
              </label>
              <input
                id="ticket-subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Issue with rating update in Contest 5"
                required
                maxLength={200}
                disabled={submitting}
                className="w-full p-3.5 border-4 border-black font-bold text-black placeholder:text-slate-400 bg-white outline-none focus:bg-emerald-50 transition-colors shadow-[3px_3px_0px_0px_black] focus:shadow-[4px_4px_0px_0px_black]"
              />
            </div>

            {/* Message Input */}
            <div className="space-y-2">
              <label 
                htmlFor="ticket-message" 
                className="block text-xs font-black uppercase tracking-wider text-black"
              >
                Message <span className="text-red-600">*</span>
              </label>
              <textarea
                id="ticket-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your issue or question in detail so our admins can assist you promptly..."
                required
                rows={5}
                disabled={submitting}
                className="w-full p-3.5 border-4 border-black font-bold text-black placeholder:text-slate-400 bg-white outline-none focus:bg-emerald-50 transition-colors shadow-[3px_3px_0px_0px_black] focus:shadow-[4px_4px_0px_0px_black] resize-y min-h-[140px]"
              />
            </div>

            {/* Alerts */}
            {formError && (
              <div role="alert" className="p-4 bg-red-100 border-4 border-black shadow-[4px_4px_0px_0px_black] flex items-center gap-3">
                <AlertCircle className="text-red-600 shrink-0" size={24} strokeWidth={2.5} />
                <p className="font-black text-red-900 text-sm">{formError}</p>
              </div>
            )}

            {formSuccess && (
              <div role="status" className="p-4 bg-emerald-100 border-4 border-black shadow-[4px_4px_0px_0px_black] flex items-center gap-3">
                <CheckCircle2 className="text-emerald-700 shrink-0" size={24} strokeWidth={2.5} />
                <p className="font-black text-emerald-900 text-sm">{formSuccess}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 px-6 bg-slate-900 text-white font-black uppercase text-lg border-4 border-black shadow-[4px_4px_0px_0px_black] hover:bg-emerald-400 hover:text-black active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Submitting Ticket…</span>
                </>
              ) : (
                <>
                  <Send size={20} strokeWidth={2.5} />
                  <span>Submit Ticket →</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Previous Tickets Section */}
      <div className="max-w-3xl mx-auto space-y-6 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-4 border-black pb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl sm:text-3xl font-black uppercase font-spartan text-black tracking-tight">
              Previous Tickets
            </h2>
            <span className="bg-black text-white px-3 py-0.5 text-sm font-black font-mono border-2 border-black">
              {tickets.length}
            </span>
          </div>
          <button
            onClick={reloadTickets}
            disabled={loadingTickets}
            className="btn btn-sm bg-white border-2 border-black rounded-none font-black uppercase text-xs shadow-[2px_2px_0px_0px_black] hover:bg-emerald-400 hover:text-black flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <RefreshCw size={14} className={loadingTickets ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Tickets Content Area */}
        {loadingTickets && tickets.length === 0 ? (
          <div className="bg-white border-4 border-black neo-brutal p-12 text-center flex flex-col items-center justify-center gap-3">
            <Loader2 size={36} className="animate-spin text-black" />
            <p className="font-black uppercase tracking-wider text-sm text-black">
              Loading your tickets...
            </p>
          </div>
        ) : ticketsError ? (
          <div className="bg-red-50 border-4 border-black neo-brutal p-8 text-center space-y-4">
            <AlertCircle size={40} className="mx-auto text-red-600" />
            <p className="font-black uppercase text-red-800">{ticketsError}</p>
            <button
              onClick={reloadTickets}
              className="px-6 py-2 bg-white border-2 border-black font-black uppercase text-xs shadow-[2px_2px_0px_0px_black] hover:bg-emerald-400 hover:text-black cursor-pointer"
            >
              Retry Loading
            </button>
          </div>
        ) : tickets.length === 0 ? (
          <div className="bg-white border-4 border-black neo-brutal p-12 text-center space-y-3 shadow-[6px_6px_0px_0px_black]">
            <div className="w-16 h-16 bg-slate-100 border-3 border-black mx-auto flex items-center justify-center shadow-[3px_3px_0px_0px_black]">
              <MessageSquare size={32} className="text-slate-400" />
            </div>
            <h3 className="text-xl font-black uppercase font-spartan text-black">
              No tickets yet
            </h3>
            <p className="text-slate-600 font-bold text-sm max-w-md mx-auto">
              You haven't submitted any support requests yet. Once you submit a ticket using the form above, it will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {tickets.map((ticket) => {
              const isResolved = ticket.status === "Resolved";
              return (
                <div
                  key={ticket._id}
                  className="bg-white border-4 border-black neo-brutal p-6 sm:p-8 space-y-4 shadow-[6px_6px_0px_0px_black] transition-all hover:translate-x-0.5 hover:translate-y-0.5"
                >
                  {/* Ticket Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b-2 border-black pb-4">
                    <div className="space-y-1">
                      <h3 className="text-xl sm:text-2xl font-black uppercase font-spartan text-black tracking-tight break-words">
                        {ticket.subject}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 text-xs font-mono font-bold text-slate-600">
                        <span>Submitted: {formatDate(ticket.createdAt)}</span>
                        {ticket.updatedAt && ticket.updatedAt !== ticket.createdAt && (
                          <>
                            <span>•</span>
                            <span>Updated: {formatDate(ticket.updatedAt)}</span>
                          </>
                        )}
                      </div>
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

                  {/* User's Original Message */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                      Your Message
                    </span>
                    <div className="p-4 bg-slate-50 border-2 border-black font-bold text-black text-sm whitespace-pre-wrap leading-relaxed">
                      {ticket.message}
                    </div>
                  </div>

                  {/* Admin Reply (if Resolved) */}
                  {isResolved && ticket.adminReply && (
                    <div className="mt-4 pt-2">
                      <div className="bg-emerald-50 border-3 border-black p-5 shadow-[4px_4px_0px_0px_black] space-y-3">
                        <div className="flex items-center justify-between gap-2 border-b-2 border-emerald-300 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="p-1 bg-black text-emerald-400 border border-black inline-flex">
                              <ShieldCheck size={16} strokeWidth={2.5} />
                            </span>
                            <span className="text-xs font-black uppercase tracking-wider text-black">
                              Admin Reply
                            </span>
                          </div>
                          <span className="text-[11px] font-mono font-black text-emerald-800 uppercase">
                            Official Response
                          </span>
                        </div>
                        <div className="font-bold text-black text-sm whitespace-pre-wrap leading-relaxed">
                          {ticket.adminReply}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Support;
