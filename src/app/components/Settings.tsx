import { useState } from "react";
import { Moon, Sun, LogOut } from "lucide-react";

import { useTheme } from "../context/ThemeContext";

import { NotificationSettings } from "./settings/NotificationSettings";
import StaffManagement from "./settings/StaffManagement";
import { useAuth } from "../context/AuthContext";

import {
  exportProductsCsv,
  exportProductsPdf,
  exportSalesCsv,
  exportSalesPdf,
  exportDashboardPdf,
} from "../../api/export";
export function Settings() {
  const { theme, toggleTheme } = useTheme();
  
  const downloadFile = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;

  document.body.appendChild(a);
  a.click();

  a.remove();

  window.URL.revokeObjectURL(url);
};

const handleExportProductsCsv = async () => {
  const res = await exportProductsCsv();
  downloadFile(res.data, "products.csv");
};

const handleExportProductsPdf = async () => {
  const res = await exportProductsPdf();
  downloadFile(res.data, "products.pdf");
};

const handleExportSalesCsv = async () => {
  const res = await exportSalesCsv();
  downloadFile(res.data, "sales.csv");
};

const handleExportSalesPdf = async () => {
  const res = await exportSalesPdf();
  downloadFile(res.data, "sales.pdf");
};

const handleExportDashboardPdf = async () => {
  const res = await exportDashboardPdf();
  downloadFile(res.data, "dashboard-summary.pdf");
};

  const [expanded, setExpanded] = useState<string | null>(null);

 const toggleSection = (section: string) => {
    setExpanded(expanded === section ? null : section);
  };
const { handleLogout } = useAuth();
 const [showStaffManagement, setShowStaffManagement] = useState(false);

if (showStaffManagement) {
  return (
    <StaffManagement
      onBack={() => setShowStaffManagement(false)}
    />
  );
}

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

 
<NotificationSettings
  expanded={expanded}
  toggleSection={toggleSection}
/>


{/* STAFF MANAGEMENT */}
<div className="bg-white dark:bg-slate-800 rounded-xl border">
  <button
    onClick={() => setShowStaffManagement(true)}
    className="w-full flex justify-between items-center p-4"
  >
    <span>Staff Management</span>
    <span>→</span>
  </button>
</div>

<div className="bg-white dark:bg-slate-800 rounded-xl border">
  <button
    onClick={() => setExpanded(expanded === "export" ? null : "export")}
    className="w-full flex justify-between p-4"
  >
    <span>Export & Reports</span>
    <span>{expanded === "export" ? "−" : "+"}</span>
  </button>

  {expanded === "export" && (
    <div className="border-t p-4 space-y-3">

     <button
  onClick={handleExportProductsCsv}
  className="w-full py-2 bg-blue-600 text-white rounded"
>
  Export Products (CSV)
</button>

<button
  onClick={handleExportProductsPdf}
  className="w-full py-2 bg-blue-600 text-white rounded"
>
  Export Products (PDF)
</button>

<button
  onClick={handleExportSalesCsv}
  className="w-full py-2 bg-green-600 text-white rounded"
>
  Export Sales (CSV)
</button>

<button
  onClick={handleExportSalesPdf}
  className="w-full py-2 bg-green-600 text-white rounded"
>
  Export Sales (PDF)
</button>



<button
  onClick={handleExportDashboardPdf}
  className="w-full py-2 bg-orange-600 text-white rounded"
>
  Dashboard Summary (PDF)
</button>

    </div>
  )}
</div>   
 </div>
  );
}