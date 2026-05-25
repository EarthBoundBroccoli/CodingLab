import { useSession } from "../lib/auth-client";

const AdminDashboard = () => {
  const { data: session } = useSession();

  return (
    <div className="max-w-[1400px] mx-auto py-12 px-4 lg:px-8">
      <div className="bg-black text-white neo-brutal p-8 mb-8 border-emerald-400">
        <h1 className="text-4xl lg:text-5xl font-black uppercase font-spartan text-white mb-2">
          Administrator Control Panel
        </h1>
        <p className="text-xl font-bold italic text-emerald-400">
          Logged in as: {session?.user?.email}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Admin Controls */}
        <div className="bg-white neo-brutal overflow-hidden">
            <div className="bg-slate-900 p-4 border-b-4 border-black">
                <h2 className="text-xl font-black text-white uppercase">User Management</h2>
            </div>
            <div className="p-6">
                <button className="btn bg-white border-4 border-black w-full font-black uppercase rounded-none hover:bg-emerald-400">Approve Setter Requests</button>
                <div className="divider before:bg-black after:bg-black"></div>
                <button className="btn bg-white border-4 border-black w-full font-black uppercase rounded-none hover:bg-error">Manage Banned Users</button>
            </div>
        </div>

        <div className="bg-white neo-brutal overflow-hidden">
            <div className="bg-slate-900 p-4 border-b-4 border-black">
                <h2 className="text-xl font-black text-white uppercase">Problem Moderation</h2>
            </div>
            <div className="p-6">
                <button className="btn bg-white border-4 border-black w-full font-black uppercase rounded-none hover:bg-sky-400 text-black">Review Pending Problems</button>
                <div className="divider before:bg-black after:bg-black"></div>
                <button className="btn bg-white border-4 border-black w-full font-black uppercase rounded-none hover:bg-amber-400 text-black">Feature A Problem</button>
            </div>
        </div>

        <div className="bg-white neo-brutal overflow-hidden">
            <div className="bg-slate-900 p-4 border-b-4 border-black">
                <h2 className="text-xl font-black text-white uppercase">System Health</h2>
            </div>
            <div className="p-6 space-y-4">
                <div className="flex justify-between font-black uppercase text-xs">
                    <span>Server Status:</span>
                    <span className="text-emerald-500">Online</span>
                </div>
                <div className="flex justify-between font-black uppercase text-xs">
                    <span>Database:</span>
                    <span className="text-emerald-500">Connected</span>
                </div>
                <div className="flex justify-between font-black uppercase text-xs">
                    <span>Active Sessions:</span>
                    <span>1</span>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
