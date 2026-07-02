import { useState, useEffect } from "react";
import { RouterProvider } from 'react-router-dom';
import { router } from "./routes";
import { Splash } from "./components/Splash";
import { Auth } from "./components/Auth";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthContext } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import { Toaster } from "react-hot-toast";
import { InstallPrompt } from "./components/InstallPrompt";
  
export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [token, setToken] = useState<string | null>(null);

useEffect(() => {
  setToken(localStorage.getItem("token"));
}, []);

  const handleLogin = (token: string) => {
    localStorage.setItem("token", token);
    setToken(token);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
  };

  if (showSplash) {
    return <Splash onComplete={() => setShowSplash(false)} />;
  }

  if (!token) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <AuthContext.Provider value={{ handleLogout }}>
      <ThemeProvider>
        <NotificationProvider>

          {/* ADD THIS */}
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

<InstallPrompt />

          <RouterProvider router={router} />

        </NotificationProvider>
      </ThemeProvider>
    </AuthContext.Provider>
  );
}