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

  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: "Low Stock Alert",
      message: "Coca Cola remaining stock is 3",
      read: false,
      type: "lowStock",
      createdAt: new Date(),
    },
    {
      id: 2,
      title: "Payment Received",
      message: "₦5,000 payment received",
      read: false,
      type: "payment",
      createdAt: new Date(),
    },
  ]);

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