import { Outlet, NavLink } from "react-router";
import { useState, useEffect} from "react";
import {
  ShoppingCart,
  Package,
  Receipt,
  BarChart3,
  Settings as SettingsIcon,
  MessageCircle,
  LogOut,
  Bell
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import { markNotificationReadApi, getNotificationsApi } from "../../api/notifications";

export function Layout() {
  
  const [showAiModal, setShowAiModal] = useState(false);
const [message, setMessage] = useState("");
const [messages, setMessages] = useState<any[]>([]);

const { notifications, setNotifications, settings } =
  useNotifications();

useEffect(() => {
  loadNotifications();
}, []);



const loadNotifications = async () => {
  try {
    const res = await getNotificationsApi();

    console.log("NOTIFICATIONS:", res.data);

    setNotifications(res.data);
  } catch (err) {
    console.log("NOTIFICATION ERROR:", err);
  }
};
const markRead = async (id: number) => {
  try {
    await markNotificationReadApi(id);

    await loadNotifications();
  } catch (err) {
    console.log(err);
  }
};
const [showNotifications, setShowNotifications] =
  useState(false);


const unreadCount = notifications.filter(
  (n: any) => !n.read
).length;

const filteredNotifications =
  notifications.filter((n: any) => {
    if (settings.hideNotifications) return false;

    if (
      n.type === "lowStock" &&
      !settings.lowStockAlerts
    )
      return false;

    if (
      n.type === "payment" &&
      !settings.paymentAlerts
    )
      return false;

    if (
      n.type === "debt" &&
      !settings.debtReminders
    )
      return false;

    return true;
  });

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

          <div className="relative">

  <button
    onClick={() =>
      setShowNotifications(!showNotifications)
    }
    className="relative p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
  >
    <Bell className="size-5" />

    {unreadCount > 0 && (
      <span
        className="
        absolute
        -top-1
        -right-1
        bg-red-500
        text-white
        text-[10px]
        min-w-[18px]
        h-[18px]
        rounded-full
        flex
        items-center
        justify-center
      "
      >
        {unreadCount}
      </span>
    )}
  </button>

  {showNotifications && (
    <div
      className="
      absolute
      right-0
      top-12
      w-80
      bg-white
      dark:bg-slate-900
      border
      rounded-xl
      shadow-xl
      z-50
      overflow-hidden
    "
    >
      <div className="p-3 border-b font-semibold">
        Notifications
      </div>
      

      {notifications.length === 0 ? (
        <div className="p-4 text-center text-gray-500">
          No notifications
        </div>
      ) : (
        filteredNotifications.map((notification: any) => (
     <div
      key={notification.id}
      onClick={() => markRead(notification.id)}
      className={`
        p-4 border-b cursor-pointer
        hover:bg-slate-50 dark:hover:bg-slate-800
        ${!notification.read ? "bg-blue-50 dark:bg-slate-800" : ""}
      `}
    >
          <h4 className="font-medium">
            {notification.title}
          </h4>

          <p className="text-sm text-gray-500">
            {notification.message}
          </p>

          
        </div>

        ))
      )}
    </div>
  )}

</div>

          <div className="relative">

  

<button
onClick={() => setShowProfileMenu(!showProfileMenu)}
className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold hover:bg-blue-700 transition"

>


{initials}


  </button>

{showProfileMenu && ( <div className="absolute right-0 top-14 w-72 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden">


  {/* User Info */}
  <div className="p-4 border-b border-slate-200 dark:border-slate-800">
    <div className="flex items-center gap-3">

      <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
        {initials}
      </div>

      <div>
        <h3 className="font-semibold text-slate-900 dark:text-white">
          {user.name}
        </h3>

        <p className="text-sm text-slate-500">
          {user.email}
        </p>
      </div>

    </div>
  </div>

  {/* AI Assistant */}
  <button
  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-800 text-left"
  onClick={() => {
    setShowAiModal(true);
    setShowProfileMenu(false);
  }}
>
    <MessageCircle size={18} />
    <span>AI Assistant</span>
  </button>

  {/* Logout */}
  <button
    className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 text-left"
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

  {/* AI CHAT PANEL */}
{showAiModal && (
  <div className="fixed inset-0 z-[100]">

    {/* Backdrop */}
    <div
      className="absolute inset-0 bg-black/40"
      onClick={() => setShowAiModal(false)}
    />

    {/* Chat Window */}
    <div
      className="
        absolute
        right-0
        top-0
        h-full
        w-full
        md:w-[450px]
        bg-white
        dark:bg-slate-900
        shadow-2xl
        flex
        flex-col
      "
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h2 className="font-semibold text-lg">
            AI Assistant
          </h2>

          <p className="text-sm text-slate-500">
            Ask anything about your business
          </p>
        </div>

        <button
          onClick={() => setShowAiModal(false)}
          className="px-3 py-2 rounded-lg bg-red-500 text-white"
        >
          End Chat
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-xl max-w-[85%]">
          Hello 👋 I'm your AI assistant.
        </div>

      </div>

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Ask something..."
            className="flex-1 border rounded-xl px-4 py-3 dark:bg-slate-800"
          />

          <button className="px-4 py-3 bg-blue-600 text-white rounded-xl">
            Send
          </button>
        </div>
      </div>
    </div>
  </div>
)}
</div>


);
}
