import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSession, signOut, getBackendURL } from "../lib/auth-client";
import { Bell } from "lucide-react";
import { fetchNotifications, NOTIFICATIONS_CHANGED } from "../lib/notifications";
import codingLabLogo from "../assets/CodingLabLogo.png";
import "./navbar.css";

const Navbar = () => {
  const { data: session } = useSession();
  const location = useLocation();
  const userId = session?.user?.id;
  const [unreadState, setUnreadState] = useState({});
  const unreadCount = unreadState.userId === userId ? unreadState.count : 0;

  useEffect(() => {
    if (!userId) return;
    let controller;
    let disposed = false;
    const fetchUnreadCount = async () => {
      controller?.abort();
      const request = new AbortController();
      controller = request;
      try {
        const data = await fetchNotifications(getBackendURL(), request.signal);
        if (!disposed && !request.signal.aborted) {
          const unread = data.filter(n => !n.isRead).length;
          setUnreadState({ userId, count: unread });
        }
      } catch (err) {
        if (!disposed && !request.signal.aborted) console.error("Error fetching notifications count:", err);
      }
    };

    fetchUnreadCount();
    window.addEventListener(NOTIFICATIONS_CHANGED, fetchUnreadCount);
    const interval = setInterval(fetchUnreadCount, 15000);
    return () => {
      disposed = true;
      controller?.abort();
      clearInterval(interval);
      window.removeEventListener(NOTIFICATIONS_CHANGED, fetchUnreadCount);
    };
  }, [userId, location.pathname]);

  // Navigation links based on session
  const navLinks = session ? [
    { name: "Home", path: "/" },
    { name: "Problems", path: "/problems" },
    { name: "Contests", path: "/contests" },
    { name: "Growth", path: "/growth" },
    { name: "Leaderboard", path: "/leaderboard" },
    { name: "Support", path: "/support" },
  ] : [
    { name: "Explore", path: "/" },
    { name: "About", path: "/about" },
    { name: "Support", path: "/support" },
  ];

  const isActive = (path) => path && (location.pathname === path || (path !== "/" && location.pathname.startsWith(path)));

  return (
    <div className="navbar flex-wrap gap-y-3 bg-white px-4 lg:px-8 border-b-4 border-black">
      {/* Brand */}
      <div className="flex-1 gap-4 lg:gap-8 flex items-center">
        <Link
          to="/"
          aria-label="CodingLab home"
          className="navbar-brand"
          onClick={() => window.scrollTo({ top: 0, left: 0, behavior: "instant" })}
        >
          <img src={codingLabLogo} alt="CodingLab" width="2000" height="2000" className="navbar-brand-logo" />
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

      {/* Right Side: Action Buttons & Profile */}
      <div className="flex-none gap-4 md:gap-8 flex items-center">
        {session && (
            <div className="navbar-account-actions flex items-center gap-2 sm:gap-4">
                {/* Become a Problem Setter or Add Problems Button */}
                {session.user.role === "student" && (
                    <Link to="/become-setter">
                        <button className="btn bg-white border-4 border-black font-black uppercase rounded-none hover:bg-error hover:text-white text-xs md:text-sm px-4 shadow-[4px_4px_0px_0px_black] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all cursor-pointer">
                            Become a problem setter
                        </button>
                    </Link>
                )}
                {session.user.role === "problem_setter" && (
                    <Link to="/add-problem">
                        <button className="btn bg-white border-4 border-black font-black uppercase rounded-none hover:bg-emerald-400 hover:text-black text-xs md:text-sm px-4 shadow-[4px_4px_0px_0px_black] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all cursor-pointer">
                            Add New Problems
                        </button>
                    </Link>
                )}

                {/* Notification Bell */}
                <Link to="/inbox" aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`} className="btn btn-ghost btn-circle border-2 border-black bg-white hover:bg-emerald-400 relative mr-2 flex items-center justify-center">
                    <Bell size={20} className="text-black" strokeWidth={2.5} />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 bg-emerald-400 text-black border-2 border-black text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-[1px_1px_0px_black]">
                            {unreadCount}
                        </span>
                    )}
                </Link>

                {/* User Dropdown */}
                <div className="dropdown dropdown-end">
                    <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar border-2 border-black overflow-hidden">
                        <div className="w-10 h-10 rounded-full bg-emerald-400 text-black flex items-center justify-center">
                            {session.user.image ? (
                                <img 
                                    src={session.user.image} 
                                    alt={session.user.name} 
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <span className="text-lg font-black">
                                    {session.user.name?.[0].toUpperCase()}
                                </span>
                            )}
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
                        <li><Link to="/profile" className="font-bold hover:bg-emerald-400 transition-colors">Profile</Link></li>
                        <li><Link to="/settings" className="font-bold hover:bg-emerald-400 transition-colors">Settings</Link></li>
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

      </div>
    </div>
  );
};

export default Navbar;
