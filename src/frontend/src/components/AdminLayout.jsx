import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Home,
  Users,
  Inbox,
  Trophy,
  Menu,
  X,
  UserCheck,
} from "lucide-react";
import { logoutAdmin } from "../lib/admin-auth";

const navItems = [
  { to: "/admin/dashboard", label: "Dashboard", icon: Home },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/setter-approvals", label: "Setter Approvals", icon: UserCheck },
  { to: "/admin/problem-requests", label: "Problem Requests", icon: Inbox },
  { to: "/admin/contests", label: "Contests", icon: Trophy },
];

const AdminLayout = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logoutAdmin();
    navigate("/admin/login", { replace: true });
  };

  const closeSidebar = () => setSidebarOpen(false);

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 font-black uppercase text-sm border-2 border-transparent transition-colors ${
      isActive
        ? "bg-emerald-400 text-black border-black shadow-[3px_3px_0px_0px_black]"
        : "text-black hover:bg-slate-100 hover:border-black"
    }`;

  const sidebarContent = (
    <>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={linkClass}
            onClick={closeSidebar}
          >
            <Icon size={20} strokeWidth={2.5} />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t-4 border-black">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full py-3 bg-slate-900 text-white font-black uppercase text-sm border-4 border-black shadow-[3px_3px_0px_0px_black] hover:bg-error hover:text-black transition-colors"
        >
          Logout
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-[calc(100svh-0px)] bg-slate-100 flex">
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          aria-label="Close sidebar"
          onClick={closeSidebar}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r-4 border-black flex flex-col transform transition-transform duration-200 ease-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          type="button"
          className="lg:hidden absolute top-4 right-4 p-1 border-2 border-black bg-white hover:bg-emerald-400"
          aria-label="Close menu"
          onClick={closeSidebar}
        >
          <X size={20} />
        </button>
        {sidebarContent}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-white border-b-4 border-black px-4 lg:px-8 py-3 flex items-center gap-3">
          <button
            type="button"
            className="p-2 border-2 border-black bg-emerald-400 hover:bg-white transition-colors lg:hidden"
            aria-label="Open menu"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={22} strokeWidth={2.5} />
          </button>
          <span className="hidden lg:inline-flex p-2 border-2 border-black bg-emerald-400">
            <Menu size={22} strokeWidth={2.5} />
          </span>
          <span className="font-black uppercase font-spartan text-xl tracking-tight text-black">
            Dashboard
          </span>
          <span className="ml-auto text-[10px] font-black uppercase tracking-widest bg-black text-white px-2 py-1 border-2 border-black">
            Admin
          </span>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
