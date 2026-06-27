import { Bell } from "lucide-react";
import { useNotifications } from "../../context/NotificationContext";
import { useState} from "react";
interface Props {
  expanded: string | null;
  toggleSection: (section: string) => void;
}

export function NotificationSettings({
  expanded,
  toggleSection,
}: Props) {
  const isOpen = expanded === "notifications";
const {
  settings,
  setSettings,
} = useNotifications();
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border">

      <button
        onClick={() => toggleSection("notifications")}
        className="w-full p-4 flex justify-between"
      >
        <div className="flex items-center gap-3">
          <Bell size={20} />
          Notifications
        </div>

        <span>{isOpen ? "−" : "›"}</span>
      </button>

      {isOpen && (
  <div className="border-t divide-y dark:divide-slate-700">

    {[
      {
        title: "Sound Alerts",
        description: "Play sound when sales or alerts occur",
      },
      {
        title: "Email Notifications",
        description: "Receive reports and important updates by email",
      },
      {
        title: "Browser Notifications",
        description: "Show desktop notifications",
      },
      {
        title: "SMS Alerts",
        description: "Receive critical alerts by SMS",
      },
      {
        title: "Low Stock Alerts",
        description: "Notify when products are running low",
      },
      {
        title: "Daily Reports",
        description: "Receive daily sales summaries",
      },
      {
        title: "Weekly Reports",
        description: "Receive weekly business reports",
      },
      {
        title: "Payment Alerts",
        description: "Notify when payments are received",
      },
      {
        title: "Debt Reminders",
        description: "Notify about outstanding customer balances",
      },
      {
        title: "New Employee Alerts",
        description: "Notify when employees are added",
      },
      {
        title: "System Updates",
        description: "Receive updates about new features",
      },
      {
        title: "Hide Notifications",
        description: "Temporarily disable all notifications",
      },
    ].map((item) => (
      <div
        key={item.title}
        className="flex items-center justify-between p-4"
      >
        <div>
          <h4 className="font-medium text-slate-900 dark:text-white">
            {item.title}
          </h4>

          <p className="text-sm text-slate-500">
            {item.description}
          </p>
        </div>

        <label className="relative inline-flex items-center cursor-pointer">
          <input
                  type="checkbox"
                  checked={settings.soundAlerts}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      soundAlerts: e.target.checked,
                    })
                  }
                  className="sr-only peer"
                />

          <div className="w-11 h-6 bg-slate-300 peer-checked:bg-blue-600 rounded-full transition">
            <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition peer-checked:translate-x-5"></div>
          </div>
        </label>
      </div>
    ))}
  </div>
)}
    </div>
  );
}