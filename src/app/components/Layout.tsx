import { Outlet, NavLink } from "react-router";
import { ShoppingCart, Package, Receipt, BarChart3, FileText, Settings as SettingsIcon } from "lucide-react";

export function Layout() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      {/* Mobile-First Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="size-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <ShoppingCart className="size-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-slate-900 dark:text-white text-base">BizTrack POS</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Point of Sale System</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6 max-w-7xl mx-auto">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-20">
        <div className="flex items-center justify-around">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
                isActive
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-slate-600 dark:text-slate-400"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <ShoppingCart className={`size-5 ${isActive ? "stroke-[2.5px]" : ""}`} />
                <span className="text-xs font-medium">POS</span>
              </>
            )}
          </NavLink>
          <NavLink
            to="/Inventory"
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
                isActive
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-slate-600 dark:text-slate-400"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Package className={`size-5 ${isActive ? "stroke-[2.5px]" : ""}`} />
                <span className="text-xs font-medium">Inventory</span>
              </>
            )}
          </NavLink>
          <NavLink
            to="/sales"
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
                isActive
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-slate-600 dark:text-slate-400"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Receipt className={`size-5 ${isActive ? "stroke-[2.5px]" : ""}`} />
                <span className="text-xs font-medium">Sales</span>
              </>
            )}
          </NavLink>
           
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
                isActive
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-slate-600 dark:text-slate-400"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <BarChart3 className={`size-5 ${isActive ? "stroke-[2.5px]" : ""}`} />
                <span className="text-xs font-medium">Dashboard</span>
              </>
            )}
          </NavLink>

          <NavLink
            to="/reports"
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
                isActive
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-slate-600 dark:text-slate-400"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <FileText className={`size-5 ${isActive ? "stroke-[2.5px]" : ""}`} />
                <span className="text-xs font-medium">Reports</span>
              </>
            )}
          </NavLink>

          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
                isActive
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-slate-600 dark:text-slate-400"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <SettingsIcon className={`size-5 ${isActive ? "stroke-[2.5px]" : ""}`} />
                <span className="text-xs font-medium">Settings</span>
              </>
            )}
          </NavLink>
        </div>
      </nav>
    </div>
  );
}
