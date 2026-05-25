import { Link } from "react-router-dom";
import { useSession, signOut } from "../lib/auth-client";

const Navbar = () => {
  const { data: session, isPending } = useSession();

  return (
    <div className="navbar bg-white px-4 lg:px-8 border-b-4 border-black">
      <div className="flex-1">
        <Link to="/" className="text-4xl font-black text-black tracking-tighter font-spartan hover:text-emerald-400 transition-all duration-300 active:scale-95">
          CodingLab
        </Link>
      </div>
      <div className="flex-none gap-2">
        {isPending ? (
          <span className="loading loading-spinner loading-sm text-black"></span>
        ) : session ? (
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar border-2 border-black">
              <div className="w-10 rounded-full bg-emerald-400 text-black flex items-center justify-center">
                <span className="text-lg font-black">
                    {session.user.name?.[0].toUpperCase()}
                </span>
              </div>
            </div>
            <ul tabIndex={0} className="mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-white rounded-none w-52 border-4 border-black">
              <li className="menu-title px-4 py-2 opacity-50">
                <div className="flex flex-col">
                    <span className="font-black text-black truncate">{session.user.name}</span>
                    <span className="text-xs truncate">{session.user.email}</span>
                </div>
                <div className="badge badge-sm bg-emerald-400 text-black border-2 border-black mt-1 uppercase font-black">
                    {session.user.role}
                </div>
              </li>
              <div className="divider my-0 h-1 bg-black"></div>
              <li><a className="font-bold hover:bg-emerald-400 transition-colors">Profile</a></li>
              <li><a className="font-bold hover:bg-emerald-400 transition-colors">Settings</a></li>
              <div className="divider my-0 h-1 bg-black"></div>
              <li>
                <button 
                    onClick={() => signOut()}
                    className="text-black font-black hover:bg-error transition-colors"
                >
                    Logout
                </button>
              </li>
            </ul>
          </div>
        ) : (
          <Link to="/auth" className="btn bg-slate-900 text-white border-2 border-black hover:bg-emerald-400 hover:text-black rounded-none px-6 font-black uppercase">Login</Link>
        )}
      </div>
    </div>
  );
};

export default Navbar;
