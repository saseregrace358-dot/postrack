import { useState, useEffect } from "react";
import { RouterProvider } from "react-router";
import { router } from "./routes";
import { Splash } from "./components/Splash";
import { Auth } from "./components/Auth";
import { ThemeProvider } from "./context/ThemeContext";

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken) {
      setToken(savedToken);
    }
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
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}