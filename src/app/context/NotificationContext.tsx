// context/NotificationContext.tsx

import { createContext, useContext, useState } from "react";

const NotificationContext = createContext<any>(null);

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, setSettings] = useState({
    soundAlerts: true,
    emailNotifications: true,
    browserNotifications: true,
    smsAlerts: false,
    lowStockAlerts: true,
    dailyReports: true,
    weeklyReports: false,
    paymentAlerts: true,
    debtReminders: true,
    newEmployeeAlerts: true,
    systemUpdates: true,
    hideNotifications: false,
  });

  const [notifications, setNotifications] = useState<any[]>([]);

  return (
    <NotificationContext.Provider
      value={{
        settings,
        setSettings,
        notifications,
        setNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () =>
  useContext(NotificationContext);