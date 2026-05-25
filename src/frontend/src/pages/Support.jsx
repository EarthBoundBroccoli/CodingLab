import { useState } from "react";

const Support = () => {
  const [complaint, setComplaint] = useState("");

  const handleSend = (e) => {
    e.preventDefault();
    // Logic for sending the complaint would go here
    console.log("Complaint sent:", complaint);
    setComplaint("");
    alert("Thank you for your feedback! We will get back to you soon.");
  };

  return (
    <div className="max-w-[1200px] mx-auto py-16 px-4 lg:px-8 text-center">
      <h1 className="text-5xl lg:text-6xl font-black uppercase font-spartan text-black mb-8">Support</h1>
      
      <div className="bg-white neo-brutal p-8 md:p-12 max-w-2xl mx-auto text-left">
        <h2 className="text-2xl font-black uppercase italic mb-6">How can we help you?</h2>
        
        <form onSubmit={handleSend} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-black">Your Complaint / Feedback</label>
            <textarea
              className="w-full min-h-[200px] p-4 border-4 border-black font-bold focus:bg-emerald-50 transition-colors outline-none rounded-none resize-none"
              placeholder="WRITE YOUR MESSAGE HERE..."
              value={complaint}
              onChange={(e) => setComplaint(e.target.value)}
              required
            ></textarea>
          </div>

          <button 
            type="submit" 
            className="w-full py-4 bg-slate-900 text-white font-black uppercase text-xl border-4 border-black shadow-[4px_4px_0px_0px_black] hover:bg-emerald-400 hover:text-black active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
          >
            SEND MESSAGE →
          </button>
        </form>
      </div>
    </div>
  );
};

export default Support;
