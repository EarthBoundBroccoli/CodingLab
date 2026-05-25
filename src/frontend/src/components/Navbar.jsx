import { Link, useLocation } from "react-router-dom";
import { useSession, signOut } from "../lib/auth-client";

const Navbar = () => {
  const { data: session } = useSession();
  const location = useLocation();

  // Navigation links based on session
  const navLinks = session ? [
    { name: "Home", path: "/" },
    { name: "Problems", path: "/problems" },
    { name: "Contests", path: null }, // Null functionality as requested
    { name: "Growth", path: null },    // Null functionality as requested
  ] : [
    { name: "Explore", path: "/" },
    { name: "About", path: "/about" },
    { name: "Support", path: "/support" },
  ];

  const isActive = (path) => path && location.pathname === path;

  return (
    <div className="navbar bg-white px-4 lg:px-8 border-b-4 border-black">
      {/* Brand */}
      <div className="flex-1 gap-8 flex items-center">
        <Link to="/" className="text-4xl font-black text-black tracking-tighter font-spartan hover:text-emerald-400 transition-all duration-300 active:scale-95">
          CodingLab
        </Link>

        {/* Navigation Links */}
        <div className="hidden md:flex gap-6 items-center">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.path || "#"}
              onClick={(e) => !link.path && e.preventDefault()}
              className={`text-xl font-bold text-black hover:text-emerald-400 transition-colors ${
                isActive(link.path) ? "underline decoration-4 underline-offset-8" : ""
              } ${!link.path ? "cursor-default opacity-50" : ""}`}
            >
              {link.name}
            </Link>
          ))}
          
          {!session && (
            <Link
              to="/auth"
              className={`text-xl font-bold text-black hover:text-emerald-400 transition-colors ${
                isActive("/auth") ? "underline decoration-4 underline-offset-8" : ""
              }`}
            >
              Login
            </Link>
          )}
        </div>
      </div>

      {/* Right Side: Action Buttons, Profile & Logo Placeholder */}
      <div className="flex-none gap-4 md:gap-8 flex items-center">
        {session && (
            <div className="flex items-center gap-4">
                {/* Become a Problem Setter Button */}
                {session.user.role === "student" && (
                    <button className="btn bg-white border-4 border-black font-black uppercase rounded-none hover:bg-error hover:text-white text-xs md:text-sm px-4 shadow-[4px_4px_0px_0px_black] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all">
                        Become a problem setter
                    </button>
                )}

                {/* User Dropdown */}
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
            </div>
        )}

        {/* Logo Placeholder */}
        <div className="bg-slate-200 border-2 border-black p-2 font-black text-[10px] md:text-xs uppercase text-center w-20 md:w-24 leading-tight">
          Logo<br/>placeholder
        </div>
      </div>
    </div>
  );
};

export default Navbar;
