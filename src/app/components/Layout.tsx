import { Outlet, NavLink, useLocation } from "react-router";
import { useState, useEffect, useRef } from "react";
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
import { markNotificationReadApi, getNewNotificationsApi, getAllNotificationsApi } from "../../api/notifications";
import { askAiApi } from "../../api/ai";
import { playNotificationSound } from "../utils/notificationSound";

export function Layout() {
const pageInfo = {
  dashboard: {
    title: "Dashboard",
    description: "Business overview and analytics",
  },
  pos: {
    title: "DGTrack POS",
    description: "Point of Sale System",
  },
  inventory: {
    title: "Inventory",
    description: "Manage products and stock",
  },
  sales: {
    title: "Sales History",
    description: "Sales transactions and receipts",
  },
  customers: {
    title: "Customers",
    description: "Customer management",
  },
  employees: {
    title: "Employees",
    description: "Staff management",
  },
  reports: {
    title: "Reports",
    description: "Business reports and insights",
  },
  settings: {
    title: "Settings",
    description: "System configuration",
  },
};

const location = useLocation();

const currentPage = (() => {
  const path = location.pathname.toLowerCase();

  if (path === "/") return "pos";
  if (path.startsWith("/dashboard")) return "dashboard";
  if (path.startsWith("/inventory")) return "inventory";
  if (path.startsWith("/sales")) return "sales";
  if (path.startsWith("/customers")) return "customers";
  if (path.startsWith("/employees")) return "employees";
  if (path.startsWith("/reports")) return "reports";
  if (path.startsWith("/settings")) return "settings";

  return "pos";
})() as keyof typeof pageInfo;
const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
const [showAllNotifications, setShowAllNotifications] = useState(false);
const [allNotifications, setAllNotifications] = useState<any[]>([]);
const [showAiModal, setShowAiModal] = useState(false);
const [message, setMessage] = useState("");
const [messages, setMessages] = useState<any[]>([]);
const previousNotificationCount = useRef(0);
const profileRef = useRef<HTMLDivElement>(null);
const notificationRef = useRef<HTMLDivElement>(null);
const [showProfileMenu, setShowProfileMenu] = useState(false);
const [showInstallModal, setShowInstallModal] = useState(false);
const [showIOSInstall, setShowIOSInstall] = useState(false);
const [showNotifications, setShowNotifications] =
  useState(false);

  
const { notifications, setNotifications, settings } =
  useNotifications();

  useEffect(() => {
  const handler = (e: any) => {
    e.preventDefault();

    setDeferredPrompt(e);

    // Show YOUR popup
    setShowInstallModal(true);
  };

  window.addEventListener("beforeinstallprompt", handler);

  return () =>
    window.removeEventListener("beforeinstallprompt", handler);
}, []);

const installApp = async () => {
  if (!deferredPrompt) return;

  deferredPrompt.prompt();

  const { outcome } = await deferredPrompt.userChoice;

  console.log(outcome);

  setDeferredPrompt(null);
  setShowInstallModal(false);
};

const cancelInstall = () => {
  setShowInstallModal(false);
};

useEffect(() => {
  const isIOS =
    /iphone|ipad|ipod/i.test(navigator.userAgent);

  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone;

  if (isIOS && !isStandalone) {
    setShowIOSInstall(true);
  }

  const handler = (e: any) => {
    e.preventDefault();

    setDeferredPrompt(e);

    if (!isIOS) {
      setShowInstallModal(true);
    }
  };

  window.addEventListener("beforeinstallprompt", handler);

  return () => {
    window.removeEventListener(
      "beforeinstallprompt",
      handler
    );
  };
}, []);


useEffect(() => {
  const handler = (e: any) => {
    console.log("beforeinstallprompt fired");

    e.preventDefault();

    setDeferredPrompt(e);
    setShowInstallModal(true);
  };

  window.addEventListener("beforeinstallprompt", handler);

  return () =>
    window.removeEventListener("beforeinstallprompt", handler);
}, []);

useEffect(() => {
  if (!settings.soundAlerts) return;

  if (notifications.length > previousNotificationCount.current) {
    playNotificationSound();
  }

  previousNotificationCount.current = notifications.length;
}, [notifications, settings.soundAlerts]);



useEffect(() => {
  loadNotifications();
}, []);

useEffect(() => {
  const WS_URL =
    import.meta.env.VITE_API_URL.replace("https://", "wss://")
      .replace("http://", "ws://") + "/ws/notifications";

  const socket = new WebSocket(WS_URL);

  socket.onopen = () => {
    console.log("✅ Connected to notifications");
  };

  socket.onmessage = async () => {
  await loadNotifications();

  if (settings.soundAlerts) {
    playNotificationSound();
  }
};

  socket.onerror = (err) => {
    console.log("WebSocket error:", err);
  };

  socket.onclose = () => {
    console.log("Disconnected");
  };

  return () => socket.close();
}, [settings.soundAlerts]);


useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (
      profileRef.current &&
      !profileRef.current.contains(event.target as Node)
    ) {
      setShowProfileMenu(false);
    }
  };

  if (showProfileMenu) {
    document.addEventListener("mousedown", handleClickOutside);
  }

  return () => {
    document.removeEventListener("mousedown", handleClickOutside);
  };
}, [showProfileMenu]);
useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (
      notificationRef.current &&
      !notificationRef.current.contains(event.target as Node)
    ) {
      setShowNotifications(false);
    }
  };

  if (showNotifications) {
    document.addEventListener("mousedown", handleClickOutside);
  }

  return () => {
    document.removeEventListener(
      "mousedown",
      handleClickOutside
    );
  };
}, [showNotifications]);

const sendMessage = async () => {
  if (!message.trim()) return;

  const userMessage = {
    role: "user",
    content: message,
  };

  setMessages((prev) => [...prev, userMessage]);

  const currentMessage = message;

  setMessage("");

  try {
    const res = await askAiApi(currentMessage);

    const aiMessage = {
      role: "assistant",
      content: res.data.reply,
    };

    setMessages((prev) => [...prev, aiMessage]);
  } catch (err) {
    console.log(err);

    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content:
          "Sorry, AI service is unavailable.",
      },
    ]);
  }
};
const loadNotifications = async () => {
  try {
    const res = await getNewNotificationsApi();

    setNotifications(res.data);
  } catch (err) {
    console.log(err);
  }
};

const loadAllNotifications = async () => {
  try {
    const res = await getAllNotificationsApi();
    setAllNotifications(res.data);
  } catch (err) {
    console.log(err);
  }
};

const markRead = async (id: number) => {
  try {
    await markNotificationReadApi(id);

    await Promise.all([
      loadNotifications(),
      loadAllNotifications(),
    ]);
  } catch (err) {
    console.log(err);
  }
};

const filteredNotifications = notifications.filter((n: any) => {
  if (settings.hideNotifications) return false;

  // Only allow these notification types
  const allowedTypes = [
    "debt",
    "lowStock",
    "export",
    "update",
  ];

  if (!allowedTypes.includes(n.type)) {
    return false;
  }

  if (n.type === "lowStock" && !settings.lowStockAlerts) {
    return false;
  }

  if (n.type === "debt" && !settings.debtReminders) {
    return false;
  }

  return true;
});

const unreadCount = filteredNotifications.filter(
  (n: any) => !n.read
).length;

const user = JSON.parse(localStorage.getItem("user") || "{}");
console.log("USER:", user);
const isOwner =
user.role === "owner" ||
user.role === "admin";

const permissions: string[] =
user.permissions || [];

const canView = (permission: string) =>
isOwner || permissions.includes(permission);


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
            {pageInfo[currentPage].title}
          </h1>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            {pageInfo[currentPage].description}
          </p>
          </div>
        </div>

        {/* Right Side Icons */}
        <div className="flex items-center gap-3">
<div
  ref={notificationRef}
  className="relative"
>
          

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
    fixed
    inset-0
    md:absolute
    md:top-12
    md:right-0
    md:inset-auto

    w-full
    h-full
    md:w-80
    md:h-auto

    bg-white
    dark:bg-slate-900

    md:rounded-xl

    border
    shadow-xl
    z-50
    overflow-y-auto
  "
>
      <div className="flex items-center justify-between p-4 border-b">
  <h2 className="font-semibold text-lg">
    Notifications
  </h2>

  <button
    onClick={() => setShowNotifications(false)}
    className="md:hidden text-2xl"
  >
    ✕
  </button>
</div>

      {filteredNotifications.length === 0 ? (
  <div className="p-6 text-center text-slate-500">
    No new notifications
  </div>
) : (
  filteredNotifications.map((notification: any) => (
    <div
      key={notification.id}
      onClick={() => markRead(notification.id)}
      className={`p-4 border-b cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 ${
        !notification.read
          ? "bg-blue-50 dark:bg-slate-800"
          : ""
      }`}
    >
      <h4 className="font-medium">
        {notification.title}
      </h4>

      <p className="text-sm text-slate-500">
        {notification.message}
      </p>
    </div>
  ))
)}

<div className="p-4 border-t sticky bottom-0 bg-white dark:bg-slate-900">
  <button
  onClick={async () => {
    await loadAllNotifications();
    setShowNotifications(false);
    setShowAllNotifications(true);
  }}
  className="w-full py-2 rounded-lg bg-blue-600 text-white"
>
  All Notifications
</button>

</div>

      
    </div>
  )}

</div>

{showAllNotifications && (
  <div className="fixed inset-0 bg-black/40 z-[120] flex justify-center items-center">

    <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">

      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="font-semibold text-lg">
          All Notifications
        </h2>

        <button
          onClick={() => setShowAllNotifications(false)}
          className="text-xl"
        >
          ✕
        </button>
      </div>

      <div className="overflow-y-auto max-h-[65vh]">

        {allNotifications.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No notifications found
          </div>
        ) : (
          allNotifications.map((notification: any) => (
            <div
              key={notification.id}
              className="border-b p-4"
            >
              <div className="font-semibold">
                {notification.title}
              </div>

              <div className="text-sm text-slate-500">
                {notification.message}
              </div>

              <div className="text-xs mt-2 text-slate-400">
                {new Date(notification.created_at).toLocaleString()}
              </div>
            </div>
          ))
        )}

      </div>

    </div>

  </div>
)}

<div ref={profileRef} className="relative">


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

  {messages.map((msg, index) => (
    <div
      key={index}
      className={`p-3 rounded-xl max-w-[85%] ${
        msg.role === "user"
          ? "ml-auto bg-blue-600 text-white"
          : "bg-slate-100 dark:bg-slate-800"
      }`}
    >
      {msg.content}
    </div>
  ))}
</div>

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) =>
            e.key === "Enter" && sendMessage()
          }
          type="text"
          placeholder="Ask something..."
          className="flex-1 border rounded-xl px-4 py-3 dark:bg-slate-800"
        />
          <button
          onClick={sendMessage}
          className="px-4 py-3 bg-blue-600 text-white rounded-xl"
        >
          Send
        </button>
        </div>
      </div>
    </div>
  </div>
)}

{showInstallModal && (
  <div className="fixed inset-0 bg-black/50 z-[999] flex items-center justify-center">

    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-[90%] max-w-sm">

      <h2 className="text-xl font-bold">
        Install DGTrack
      </h2>

      <p className="mt-2 text-gray-500">
        Install DGTrack for a faster experience with offline support.
      </p>

      <div className="flex justify-end gap-3 mt-6">

        <button
          onClick={cancelInstall}
          className="px-4 py-2 rounded-lg border"
        >
          Cancel
        </button>

        <button
          onClick={installApp}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white"
        >
          Install
        </button>

      </div>
{showIOSInstall && (
  <div className="fixed inset-0 bg-black/50 z-[999] flex items-center justify-center">

    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-[90%] max-w-sm">

      <h2 className="text-xl font-bold">
        Install POSTracker
      </h2>

      <p className="mt-3 text-gray-500">
        Install POSTracker on your iPhone.
      </p>

      <div className="mt-4 rounded-lg bg-slate-100 dark:bg-slate-800 p-4">

        <p className="text-sm">
          1. Tap the
          <strong> Share </strong>
          button
          <span className="mx-1">⬆️</span>

          in Safari.
        </p>

        <p className="text-sm mt-2">
          2. Tap
          <strong> Add to Home Screen.</strong>
        </p>

      </div>

      <div className="flex justify-end gap-3 mt-6">

        <button
          onClick={() => setShowIOSInstall(false)}
          className="px-4 py-2 border rounded-lg"
        >
          Cancel
        </button>

        <button
          onClick={() => {
            alert(
              "Tap the Share button in Safari, then choose 'Add to Home Screen'."
            );
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          Install
        </button>

      </div>

    </div>

  </div>
)}
    </div>

  </div>
)}
</div>


);
}
