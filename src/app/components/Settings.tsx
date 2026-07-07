import { useState, useEffect} from "react";
import { Moon, Sun, LogOut } from "lucide-react";

import { useTheme } from "../context/ThemeContext";

import { NotificationSettings } from "./settings/NotificationSettings";
import StaffManagement from "./settings/StaffManagement";

import {
  exportProductsCsv,
  exportProductsPdf,
  exportSalesCsv,
  exportSalesPdf,
  exportDashboardPdf,
} from "../../api/export";
import {
  getBusinessSettings,
  saveBusinessSettings,
} from "../../api/settings";
import toast from "react-hot-toast";
import BillingSettings from "./settings/BillingSettings";

export function Settings() {
  
  const { theme, toggleTheme } = useTheme();
  const [taxEnabled, setTaxEnabled] = useState(false);
const [taxRate, setTaxRate] = useState("");
const [debtThreshold, setDebtThreshold] = useState("");
const [savingTax, setSavingTax] = useState(false);
const [savingDebt, setSavingDebt] = useState(false);

const [showBilling, setShowBilling] = useState(false);

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

const saveTaxSettings = async () => {
  try {
    setSavingTax(true);

    await saveBusinessSettings(
      taxEnabled,
      Number(taxRate),
      Number(debtThreshold)
    );

    toast.success("Tax settings saved");
  } catch {
    toast.error("Failed to save tax settings");
  } finally {
    setSavingTax(false);
  }
};

const saveDebtThreshold = async () => {
  try {
    setSavingDebt(true);

    await saveBusinessSettings(
      taxEnabled,
      Number(taxRate),
      Number(debtThreshold)
    );

    toast.success("Debt threshold saved");
  } catch {
    toast.error("Failed to save debt threshold");
  } finally {
    setSavingDebt(false);
  }
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

 const [showStaffManagement, setShowStaffManagement] = useState(false);
useEffect(() => {
  const loadSettings = async () => {
    try {
      const res = await getBusinessSettings();

      setTaxEnabled(res.data.tax_enabled);
      setTaxRate(String(res.data.tax_rate));
      setDebtThreshold(String(res.data.debt_threshold));
    } catch (err) {
      console.error(err);
    }
  };

  loadSettings();
}, []);

if (showStaffManagement) {
  return (
    <StaffManagement
      onBack={() => setShowStaffManagement(false)}
    />
  );
}
if (showBilling) {
  return (
   <BillingSettings
  onBack={() => setShowBilling(false)}
/>
  );
}

  return (
    <div className="space-y-6 pb-20">



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
    onClick={() => toggleSection("tax")}
    className="w-full flex justify-between items-center p-4"
  >
    <span>Tax Settings</span>

    <label className="relative inline-flex items-center cursor-pointer">
      <input
          type="checkbox"
          checked={taxEnabled}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => setTaxEnabled(e.target.checked)}
          className="sr-only peer"
        />
      <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-green-600"></div>
      <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition peer-checked:translate-x-5"></div>
    </label>
  </button>

  {expanded === "tax" && (
    <div className="border-t p-4 space-y-3">
      <label className="text-sm font-medium">
        Tax Percentage (%)
      </label>

      <input
        type="number"
        value={taxRate}
        onChange={(e) => setTaxRate(e.target.value)}
        className="w-full border rounded-lg p-2"
        placeholder="7.5"
      />

      <button
        onClick={saveTaxSettings}
        disabled={savingTax}
        className="w-full py-2 bg-blue-600 text-white rounded-lg disabled:bg-blue-400 disabled:cursor-not-allowed"
      >
        {savingTax ? "Saving..." : "Save"}
      </button>
    </div>
  )}
</div>  

<div className="bg-white dark:bg-slate-800 rounded-xl border">
  <button
    onClick={() => toggleSection("debt")}
    className="w-full flex justify-between p-4"
  >
    <span>Debt Threshold</span>
    <span>{expanded === "debt" ? "−" : "+"}</span>
  </button>

  {expanded === "debt" && (
    <div className="border-t p-4 space-y-3">

      <label className="text-sm font-medium">
        Debt Threshold
      </label>

      <input
        type="number"
        value={debtThreshold}
        onChange={(e)=>setDebtThreshold(e.target.value)}
        className="w-full border rounded-lg p-2"
        placeholder="50000"
      />

      <button
        onClick={saveDebtThreshold}
        disabled={savingDebt}
        className="w-full py-2 bg-red-600 text-white rounded-lg disabled:bg-red-400 disabled:cursor-not-allowed"
      >
        {savingDebt ? "Saving..." : "Save"}
      </button>
    </div>
  )}
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
  <div className="bg-white dark:bg-slate-800 rounded-xl border">
  <button
    onClick={() => setShowBilling(true)}
    className="w-full flex justify-between items-center p-4"
  >
    <span>Billing & Subscription</span>

    <span>→</span>
  </button>
</div>
 </div>
  );
}