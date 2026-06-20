import { useState } from "react";
import { Moon, Sun, LogOut } from "lucide-react";

import { useTheme } from "../context/ThemeContext";
import { useUser } from "../hooks/useUser";
import { ProfileSettings } from "./settings/ProfileSettings";
import { PrivacySettings } from "./settings/PrivacySettings";
import { NotificationSettings } from "./settings/NotificationSettings";
import { LanguageSettings } from "./settings/LanguageSettings";
import { SupportSettings } from "./settings/SupportSettings";
import { useNavigate } from "react-router-dom";
export function Settings() {
  const { theme, toggleTheme } = useTheme();
  const { user, setUser } = useUser();

  const [expanded, setExpanded] = useState<string | null>(null);

 const toggleSection = (section: string) => {
    setExpanded(expanded === section ? null : section);
  };

 const navigate = useNavigate();

const handleLogout = () => {
  localStorage.removeItem("token");
  navigate("/"); // back to Auth
};
  return (
    <div className="space-y-6 pb-20">

      <h2 className="text-2xl font-semibold">Settings</h2>

      {/* Theme */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border">
        <button
          onClick={toggleTheme}
          className="w-full flex justify-between p-4"
        >
          <span>{theme === "dark" ? "Dark" : "Light"} Mode</span>
          {theme === "dark" ? <Moon /> : <Sun />}
        </button>
      </div>

      {/* ONLY Profile gets user */}
      <ProfileSettings
        expanded={expanded}
        toggleSection={toggleSection}
        user={user}
        setUser={setUser}
      />

      <PrivacySettings
        expanded={expanded}
        toggleSection={toggleSection}
        
      />

      <NotificationSettings
        expanded={expanded}
        toggleSection={toggleSection}
      />

      <LanguageSettings
        expanded={expanded}
        toggleSection={toggleSection}
      />

      <SupportSettings
        expanded={expanded}
        toggleSection={toggleSection}
      />

      <button
  onClick={handleLogout}
  className="w-full flex items-center justify-center gap-2 py-3 bg-red-500 text-white rounded-xl"
>
  <LogOut size={18} />
  Logout
</button>
    </div>
  );
}