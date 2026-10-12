import { useState } from "react";
import { getBackendURL } from "../lib/auth-client";

const Support = () => {
  const [complaint, setComplaint] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSend = async (e) => {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`${getBackendURL()}/api/support`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message: complaint }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not save your message. Please try again.");
      setSuccess("Your message has been saved for the support team. Thank you for contacting us.");
      setComplaint("");
    } catch (err) {
      setError(err.message || "Could not connect. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto py-16 px-4 lg:px-8 text-center">
      <h1 className="text-5xl lg:text-6xl font-black uppercase font-spartan text-black mb-8">Support</h1>
      
      <div className="bg-white neo-brutal p-8 md:p-12 max-w-2xl mx-auto text-left">
        <h2 className="text-2xl font-black uppercase italic mb-6">How can we help you?</h2>
        
        <form onSubmit={handleSend} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="support-name" className="text-xs font-black uppercase tracking-widest text-black">Your name</label>
            <input id="support-name" value={name} onChange={e => setName(e.target.value)} required maxLength={100} autoComplete="name" disabled={sending} className="w-full p-3 border-4 border-black outline-none focus:bg-emerald-50" />
          </div>
          <div className="space-y-2">
            <label htmlFor="support-email" className="text-xs font-black uppercase tracking-widest text-black">Contact email</label>
            <input id="support-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required maxLength={254} autoComplete="email" disabled={sending} className="w-full p-3 border-4 border-black outline-none focus:bg-emerald-50" />
          </div>
          <div className="space-y-2">
            <label htmlFor="support-message" className="text-xs font-black uppercase tracking-widest text-black">Your Complaint / Feedback</label>
            <textarea
              id="support-message"
              minLength={10}
              maxLength={5000}
              disabled={sending}
              className="w-full min-h-[200px] p-4 border-4 border-black font-bold focus:bg-emerald-50 transition-colors outline-none rounded-none resize-none"
              placeholder="WRITE YOUR MESSAGE HERE..."
              value={complaint}
              onChange={(e) => setComplaint(e.target.value)}
              required
            ></textarea>
          </div>
          {error && <p role="alert" className="text-red-700 font-bold">{error}</p>}
          {success && <p role="status" className="text-emerald-800 font-bold">{success}</p>}

          <button 
            type="submit" 
            disabled={sending}
            className="w-full py-4 bg-slate-900 text-white font-black uppercase text-xl border-4 border-black shadow-[4px_4px_0px_0px_black] hover:bg-emerald-400 hover:text-black active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
          >
            {sending ? "Sending…" : "Send message →"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Support;
