import { Bell } from "lucide-react";
import { useNotifications } from "../../context/NotificationContext";

interface Props {
  expanded: string | null;
  toggleSection: (section: string) => void;
}

export function NotificationSettings({
  expanded,
  toggleSection,
}: Props) {
  const isOpen = expanded === "notifications";

  const { settings, setSettings } = useNotifications();

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border">
      <button
        onClick={() => toggleSection("notifications")}
        className="w-full p-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <Bell size={20} />
          <span>Notifications</span>
        </div>

        <span>{isOpen ? "−" : "›"}</span>
      </button>

      {isOpen && (
        <div className="border-t p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-slate-900 dark:text-white">
                Sound Notifications
              </h4>

              <p className="text-sm text-slate-500">
                Play a sound whenever a new notification arrives.
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

              <div className="w-11 h-6 bg-slate-300 peer-checked:bg-blue-600 rounded-full transition relative">
                <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-5"></div>
              </div>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}