import { Bell } from "lucide-react";

interface Props {
  expanded: string | null;
  toggleSection: (section: string) => void;
}

export function NotificationSettings({
  expanded,
  toggleSection,
}: Props) {
  const isOpen = expanded === "notifications";

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
        <div className="p-4 border-t">

          Email Alerts

          SMS Alerts

          Browser Notifications

          Sound Alerts

          Low Stock Alerts

          Daily Reports

        </div>
      )}
    </div>
  );
}