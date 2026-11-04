
import { useState, useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

import { router } from "./routes";
import { Splash } from "./components/Splash";
import { Auth } from "./components/Auth";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthContext } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import { BusinessSettingsProvider } from "./context/BusinessSettingsContext";
import { Toaster } from "react-hot-toast";
import { InstallPrompt } from "./components/InstallPrompt";

// Create the client outside App so it is not recreated during renders.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});

export default function App() {
  const [token, setToken] = useState<string | null>(() => {
    return (
      localStorage.getItem("token") ||
      sessionStorage.getItem("token")
    );
  });

  const [showSplash, setShowSplash] = useState(true);

  const publicPages = [
    "/payment-success",
    "/terms",
    "/privacy",
  ];

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

  const returnToLogin = () => {
    clearAuthData();

    // Clear cached business data when the session ends.
    queryClient.clear();

    window.history.replaceState({}, "", "/");

    setToken(null);
    setShowSplash(false);
  };

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

  const handleLogin = (newToken: string) => {
    // Avoid carrying any previous session's cached data into this session.
    queryClient.clear();

    setToken(newToken);
    setShowSplash(false);
  };

  const handleLogout = () => {
    returnToLogin();
  };

  let content;

  if (showSplash) {
    content = (
      <Splash
        onComplete={() => setShowSplash(false)}
      />
    );
  } else {
    const isPublicPage = publicPages.includes(
      window.location.pathname
    );

    if (!token && !isPublicPage) {
      content = (
        <>
          <InstallPrompt />
          <Auth onLogin={handleLogin} />
          <Toaster position="top-center" />
        </>
      );
    } else {
      content = (
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
  }

  return (
    <QueryClientProvider client={queryClient}>
      {content}
    </QueryClientProvider>
  );
}
