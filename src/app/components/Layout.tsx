import { Outlet, NavLink } from "react-router";
import { useState } from "react";
import {
  ShoppingCart,
  Package,
  Receipt,
  BarChart3,
  Settings as SettingsIcon,
  User,
  MessageCircle,
  LogOut,
  ChevronDown,
  Bell
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export function Layout() {
  
const user = JSON.parse(localStorage.getItem("user") || "{}");
console.log("USER:", user);
const isOwner =
user.role === "owner" ||
user.role === "admin";

const permissions: string[] =
user.permissions || [];

const canView = (permission: string) =>
isOwner || permissions.includes(permission);

const [showProfileMenu, setShowProfileMenu] = useState(false);

const initials = user?.name
  ? user.name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
  : "U";

  const { handleLogout } = useAuth();
return ( <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
{/* Header */} <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10"> <div className="px-4 py-3"> <div className="flex items-center justify-between">

        <div className="flex items-center gap-3">
          <div className="size-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
            <ShoppingCart className="size-5 text-white" />
          </div>

          <div>
            <h1 className="font-semibold text-slate-900 dark:text-white text-base">
              BizTrack POS
            </h1>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Point of Sale System
            </p>
          </div>
        </div>

        {/* Right Side Icons */}
        <div className="flex items-center gap-3">

          <button className="relative p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            <Bell className="size-5 text-slate-700 dark:text-slate-300" />

            <span className="absolute top-1 right-1 size-2 bg-red-500 rounded-full"></span>
          </button>

          <div className="relative">

  <button
    onClick={() => setShowProfileMenu(!showProfileMenu)}
    className="flex items-center gap-2"
  >
    <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold">
      {initials}
    </div>

    <ChevronDown size={18} />
  </button>

  {showProfileMenu && (
    <div className="absolute right-0 top-12 w-72 bg-white dark:bg-slate-900 rounded-xl shadow-xl border z-50">

      {/* User Info */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-3">

          <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
            {initials}
          </div>

          <div>
            <h3 className="font-semibold">
              {user.name}
            </h3>

            <p className="text-sm text-gray-500">
              {user.email}
            </p>
          </div>

        </div>
      </div>

      {/* AI Chat */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-800"
        onClick={() => {
          // open AI modal
        }}
      >
        <MessageCircle size={18} />
        <span>AI Assistant</span>
      </button>

      {/* Profile */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <User size={18} />
        <span>Profile</span>
      </button>

      {/* Logout */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50"
        onClick={handleLogout}
             >
        <LogOut size={18} />
        <span>Logout</span>
      </button>

    </div>
  )}
</div>
        </div>

      </div>
    </div>
  </header>

  {/* Main Content */}
  <main className="px-4 py-6 max-w-7xl mx-auto">
    <Outlet />
  </main>

  {/* Bottom Navigation */}
  <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-20">
    <div className="flex items-center justify-around">

      {canView("POS") && (
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center gap-1 py-3 ${
              isActive
                ? "text-blue-600 dark:text-blue-400"
                : "text-slate-600 dark:text-slate-400"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <ShoppingCart
                className={`size-5 ${
                  isActive ? "stroke-[2.5px]" : ""
                }`}
              />
              <span className="text-xs font-medium">
                POS
              </span>
            </>
          )}
        </NavLink>
      )}

      {canView("Inventory") && (
        <NavLink
          to="/Inventory"
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center gap-1 py-3 ${
              isActive
                ? "text-blue-600 dark:text-blue-400"
                : "text-slate-600 dark:text-slate-400"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Package
                className={`size-5 ${
                  isActive ? "stroke-[2.5px]" : ""
                }`}
              />
              <span className="text-xs font-medium">
                Inventory
              </span>
            </>
          )}
        </NavLink>
      )}

      {canView("sales") && (
        <NavLink
          to="/sales"
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center gap-1 py-3 ${
              isActive
                ? "text-blue-600 dark:text-blue-400"
                : "text-slate-600 dark:text-slate-400"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Receipt
                className={`size-5 ${
                  isActive ? "stroke-[2.5px]" : ""
                }`}
              />
              <span className="text-xs font-medium">
                Sales
              </span>
            </>
          )}
        </NavLink>
      )}

      {canView("dashboard") && (
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center gap-1 py-3 ${
              isActive
                ? "text-blue-600 dark:text-blue-400"
                : "text-slate-600 dark:text-slate-400"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <BarChart3
                className={`size-5 ${
                  isActive ? "stroke-[2.5px]" : ""
                }`}
              />
              <span className="text-xs font-medium">
                Dashboard
              </span>
            </>
          )}
        </NavLink>
      )}

      {isOwner && (
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center gap-1 py-3 ${
              isActive
                ? "text-blue-600 dark:text-blue-400"
                : "text-slate-600 dark:text-slate-400"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <SettingsIcon
                className={`size-5 ${
                  isActive ? "stroke-[2.5px]" : ""
                }`}
              />
              <span className="text-xs font-medium">
                Settings
              </span>
            </>
          )}
        </NavLink>
      )}

    </div>
  </nav>
</div>


);
}
