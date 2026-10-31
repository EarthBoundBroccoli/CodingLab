import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { getBackendURL, useSession } from "../lib/auth-client";
import { loadNotificationInbox, markNotificationsRead, NOTIFICATIONS_CHANGED } from "../lib/notifications";
import { Bell, Inbox as InboxIcon, AlertCircle, Check, Loader2 } from "lucide-react";

const Inbox = () => {
  const { data: session, isPending } = useSession();
  const userId = session?.user?.id;
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [readError, setReadError] = useState("");
  const [markingRead, setMarkingRead] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const activeRequest = useRef(null);

  const notifyBadge = () => window.dispatchEvent(new CustomEvent(NOTIFICATIONS_CHANGED));

  const markAllAsRead = async () => {
    const controller = activeRequest.current;
    if (!controller || controller.signal.aborted || markingRead) return;
    setMarkingRead(true);
    setReadError("");
    try {
      const data = await markNotificationsRead(getBackendURL(), notifications, controller.signal);
      if (!controller.signal.aborted) {
        setNotifications(data);
        notifyBadge();
      }
    } catch (err) {
      if (!controller.signal.aborted) setReadError(err.message);
    } finally {
      if (!controller.signal.aborted) setMarkingRead(false);
    }
  };

  useEffect(() => {
    if (isPending || !userId) return;
    const controller = new AbortController();
    activeRequest.current = controller;
    let fetching = false;
    const refresh = () => {
    if (fetching) return;
    fetching = true;
    loadNotificationInbox(getBackendURL(), {
      signal: controller.signal,
      onLoaded: data => {
        setError("");
        setNotifications(data);
        setLoading(false);
        setMarkingRead(data.some(item => !item.isRead));
      },
    }).then(result => {
      if (!result || controller.signal.aborted) return;
      setNotifications(result.notifications);
      setReadError(result.readError);
      setMarkingRead(false);
      if (!result.readError) notifyBadge();
    }).catch(() => {
      if (controller.signal.aborted) return;
      setError("Could not load notifications. Please try again.");
      setLoading(false);
    }).finally(() => { fetching = false; });
    };
    refresh();
    const timer = setInterval(refresh, 15000);
    return () => { clearInterval(timer); controller.abort(); };
  }, [userId, isPending, attempt]);

  const retryLoad = () => {
    setError("");
    setReadError("");
    setLoading(true);
    setAttempt(value => value + 1);
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <div className="bg-white border-4 border-black neo-brutal overflow-hidden">
        {/* Page Header */}
        <div className="bg-slate-900 text-white p-6 border-b-4 border-black flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 border-2 border-black bg-emerald-400 text-black">
              <Bell size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-3xl font-black uppercase font-spartan tracking-tight">
                Notification Inbox
              </h1>
              <p className="text-[11px] font-bold uppercase opacity-75">
                Stay updated with platform alerts and request statuses
              </p>
            </div>
          </div>

          {notifications.some(n => !n.isRead) && (
            <button
              onClick={markAllAsRead}
              disabled={markingRead}
              className="btn btn-sm bg-emerald-400 text-black border-2 border-black rounded-none font-black uppercase text-xs hover:bg-white cursor-pointer"
            >
              <Check size={14} strokeWidth={3} className="mr-1 inline-block" /> {markingRead ? "Marking read…" : "Mark all read"}
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className="p-6 bg-slate-50 space-y-4 min-h-[400px]">
          {readError && (
            <div role="alert" className="p-4 border-2 border-black bg-white text-sm flex items-center justify-between gap-4">
              <p>{readError}</p>
              <button onClick={markAllAsRead} disabled={markingRead} className="btn btn-sm rounded-none border-2 border-black bg-white">Retry</button>
            </div>
          )}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-black" size={40} />
            </div>
          ) : error ? (
            <div role="alert" className="p-8 text-center text-error font-black uppercase flex flex-col items-center justify-center gap-2">
              <AlertCircle size={40} />
              {error}
              <button onClick={retryLoad} className="btn btn-sm rounded-none border-2 border-black bg-white text-black">Retry</button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-4">
              <InboxIcon size={64} className="opacity-40" />
              <p className="font-black uppercase text-sm tracking-widest">Your inbox is empty</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notif) => {
                const isRejected = notif.title.toLowerCase().includes("rejected") || notif.note;
                const isApproved = notif.title.toLowerCase().includes("approved");

                let cardBgClass = "bg-white";
                let accentBorderClass = "border-l-8 border-black";

                if (isApproved) {
                  cardBgClass = "bg-emerald-50/70";
                  accentBorderClass = "border-l-8 border-emerald-400";
                } else if (isRejected) {
                  cardBgClass = "bg-rose-50/70";
                  accentBorderClass = "border-l-8 border-rose-400";
                }

                return (
                  <div
                    key={notif._id}
                    className={`flex flex-col md:flex-row justify-between items-start md:items-center p-4 border-2 border-black ${accentBorderClass} ${cardBgClass} transition-colors relative`}
                  >
                    {!notif.isRead && (
                      <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-emerald-400 border border-black rounded-full" title="New notification"></span>
                    )}

                    <div className="space-y-1.5 flex-1 pr-4">
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-sm uppercase tracking-tight text-black">
                          {notif.title}
                        </h4>
                        <span className="text-[10px] font-bold text-slate-500">
                          {formatDate(notif.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-700 leading-relaxed">
                        {notif.message}
                      </p>
                      {notif.type === 'contest' && notif.contestId && (
                        <Link to={`/contests/${encodeURIComponent(notif.contestId)}`} className="inline-block text-sm font-bold underline focus-visible:outline-2">
                          View contest
                        </Link>
                      )}

                      {/* Explicit Rejection Reason / Note */}
                      {isRejected && notif.note && (
                        <div className="mt-2.5 p-3 bg-white border-2 border-black font-mono text-xs text-rose-700">
                          <span className="font-black uppercase block text-[10px] text-slate-400 mb-1">
                            Reason specified by Admin:
                          </span>
                          {notif.note}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Inbox;
