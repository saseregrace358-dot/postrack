import { useState, useEffect } from "react";
import { RouterProvider } from "react-router-dom";

import { router } from "./routes";
import { Splash } from "./components/Splash";
import { Auth } from "./components/Auth";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthContext } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import { BusinessSettingsProvider } from "./context/BusinessSettingsContext";
import { Toaster } from "react-hot-toast";
import { InstallPrompt } from "./components/InstallPrompt";

export default function App() {
  // Restore the existing session immediately.
  const [token, setToken] = useState<string | null>(() => {
    return (
      localStorage.getItem("token") ||
      sessionStorage.getItem("token")
    );
  });

  // Splash is displayed only during initial application startup.
  const [showSplash, setShowSplash] = useState(true);

  const publicPages = [
    "/payment-success",
    "/terms",
    "/privacy",
  ];

  // Clear authentication information from both storage locations.
  const clearAuthData = () => {
    const authKeys = [
      "token",
      "user",
      "role",
      "permissions",
    ];

    authKeys.forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  };

  // Return the application to the login page.
  const returnToLogin = () => {
    clearAuthData();

    window.history.replaceState({}, "", "/");

    setToken(null);
    setShowSplash(false);
  };

  // Listen for expired sessions.
  useEffect(() => {
    const handleSessionExpired = () => {
      returnToLogin();
    };

    window.addEventListener(
      "session-expired",
      handleSessionExpired
    );

    const isPublicPage = publicPages.includes(
      window.location.pathname
    );

    if (!token && !isPublicPage) {
      window.history.replaceState({}, "", "/");
    }

    return () => {
      window.removeEventListener(
        "session-expired",
        handleSessionExpired
      );
    };
  }, []);

  // Called after successful login.
  const handleLogin = (newToken: string) => {
    setToken(newToken);
    setShowSplash(false);
  };

  // Called when the user logs out.
  const handleLogout = () => {
    returnToLogin();
  };

  // Initial splash screen only.
  if (showSplash) {
    return (
      <Splash
        onComplete={() => setShowSplash(false)}
      />
    );
  }

  const isPublicPage = publicPages.includes(
    window.location.pathname
  );

  // Show login when there is no token and the page is protected.
  if (!token && !isPublicPage) {
    return (
      <>
        <InstallPrompt />
        <Auth onLogin={handleLogin} />
        <Toaster position="top-center" />
      </>
    );
  }

  return (
  <AuthContext.Provider value={{ handleLogout }}>
    <ThemeProvider>
      <NotificationProvider>
        <Toaster
          position="top-center"
          reverseOrder={false}
          containerStyle={{
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
          toastOptions={{
            duration: 2500,
            style: {
              borderRadius: "12px",
              padding: "16px",
              fontSize: "15px",
            },
            success: {
              style: {
                background: "#16a34a",
                color: "#fff",
              },
            },
            error: {
              style: {
                background: "#dc2626",
                color: "#fff",
              },
            },
          }}
        />

        <BusinessSettingsProvider>
          <RouterProvider router={router} />
        </BusinessSettingsProvider>
      </NotificationProvider>
    </ThemeProvider>
  </AuthContext.Provider>
);
}