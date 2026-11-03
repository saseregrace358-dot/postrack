import { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";

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
import ReturnItems from "./settings/return";

const SUPPORTED_CURRENCIES = [
  { code: "NGN", name: "Nigerian Naira" },
  { code: "USD", name: "US Dollar" },
  { code: "GBP", name: "British Pound" },
  { code: "EUR", name: "Euro" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "GHS", name: "Ghanaian Cedi" },
  { code: "KES", name: "Kenyan Shilling" },
  { code: "ZAR", name: "South African Rand" },
  { code: "INR", name: "Indian Rupee" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "CHF", name: "Swiss Franc" },
];

export function Settings() {
  const { theme, toggleTheme } = useTheme();

  const [taxEnabled, setTaxEnabled] = useState(false);
  const [taxRate, setTaxRate] = useState("");
  const [debtThreshold, setDebtThreshold] = useState("");

  const [savingTax, setSavingTax] = useState(false);
  const [savingDebt, setSavingDebt] = useState(false);

  const [baseCurrency, setBaseCurrency] = useState("");
  const [activeCurrency, setActiveCurrency] = useState("");
  const [exchangeRate, setExchangeRate] = useState("");

  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingCurrency, setSavingCurrency] = useState(false);

  const [currencyError, setCurrencyError] = useState(false);

  const [showBilling, setShowBilling] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const [showStaffManagement, setShowStaffManagement] = useState(false);

  const [expanded, setExpanded] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setExpanded((current) => current === section ? null : section);
  };

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

  const loadSettings = async () => {
    try {
      setLoadingSettings(true);
      setCurrencyError(false);

      const res = await getBusinessSettings();
      const data = res.data;

      setTaxEnabled(Boolean(data.tax_enabled));
      setTaxRate(String(data.tax_rate ?? ""));
      setDebtThreshold(String(data.debt_threshold ?? ""));

      const base = String(data.base_currency ?? "").toUpperCase();
      const active = String(data.currency ?? "").toUpperCase();
      const rate = String(data.exchange_rate ?? "");

      if (
        !SUPPORTED_CURRENCIES.some((item) => item.code === base) ||
        !SUPPORTED_CURRENCIES.some((item) => item.code === active) ||
        !rate ||
        !Number.isFinite(Number(rate)) ||
        Number(rate) <= 0
      ) {
        setBaseCurrency("");
        setActiveCurrency("");
        setExchangeRate("");
        setCurrencyError(true);
      } else {
        setBaseCurrency(base);
        setActiveCurrency(active);
        setExchangeRate(rate);
      }
    } catch (error) {
      console.error("Failed to load business settings:", error);
      setCurrencyError(true);
      toast.error("Unable to load business settings");
    } finally {
      setLoadingSettings(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const saveTaxSettings = async () => {
    try {
      setSavingTax(true);

      await saveBusinessSettings(
        taxEnabled,
        Number(taxRate),
        Number(debtThreshold)
      );

      toast.success("Tax settings saved");
    } catch (error) {
      console.error(error);
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
    } catch (error) {
      console.error(error);
      toast.error("Failed to save debt threshold");
    } finally {
      setSavingDebt(false);
    }
  };

  const saveCurrencySettings = async () => {
    if (!activeCurrency) {
      toast.error("Please select a currency");
      return;
    }

    if (!SUPPORTED_CURRENCIES.some((item) => item.code === activeCurrency)) {
      toast.error("Please select a supported currency");
      return;
    }

    try {
      setSavingCurrency(true);

      await saveBusinessSettings(
        taxEnabled,
        Number(taxRate),
        Number(debtThreshold),
        activeCurrency
      );

      await loadSettings();

      toast.success("Currency settings saved");
    } catch (error: any) {
      console.error("Currency update failed:", error);

      toast.error(
        error?.response?.data?.detail ||
        "Failed to update currency settings"
      );
    } finally {
      setSavingCurrency(false);
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

  if (showReturn) {
    return (
      <ReturnItems
        onBack={() => setShowReturn(false)}
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

      {/* Staff Management */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border">
        <button
          onClick={() => setShowStaffManagement(true)}
          className="w-full flex justify-between items-center p-4"
        >
          <span>Staff Management</span>
          <span>→</span>
        </button>
      </div>

      {/* Currency Settings */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700">
        <button
          onClick={() => toggleSection("currency")}
          className="w-full flex justify-between items-center p-4"
        >
          <span>Currency Settings</span>
          <span>{expanded === "currency" ? "−" : "+"}</span>
        </button>

        {expanded === "currency" && (
          <div className="border-t dark:border-slate-700 p-4 space-y-4">

            {loadingSettings ? (
              <p className="text-sm text-gray-500">
                Loading currency settings...
              </p>
            ) : currencyError ? (
              <div className="space-y-3">
                <p className="text-sm text-red-600">
                  Business currency settings could not be loaded.
                  Please check your business settings before continuing.
                </p>

                <button
                  onClick={loadSettings}
                  className="w-full py-2 bg-blue-600 text-white rounded-lg"
                >
                  Retry
                </button>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Original Business Currency
                  </label>

                  <div className="w-full border dark:border-slate-600 rounded-lg p-3 bg-gray-100 dark:bg-slate-700">
                    {baseCurrency}
                  </div>

                  <p className="text-xs text-gray-500 mt-1">
                    This is the currency in which your original business
                    records are stored. It cannot be changed here.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Active Display Currency
                  </label>

                  <select
                    value={activeCurrency}
                    onChange={(e) => setActiveCurrency(e.target.value)}
                    className="w-full border dark:border-slate-600 rounded-lg p-3 bg-white dark:bg-slate-800"
                  >
                    <option value="" disabled>
                      Select a currency
                    </option>

                    {SUPPORTED_CURRENCIES.map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.code} - {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-lg bg-gray-50 dark:bg-slate-700 p-3">
                  <p className="text-sm font-medium">
                    Current Exchange Rate
                  </p>

                  <p className="text-sm mt-1">
                    1 {baseCurrency} = {exchangeRate} {activeCurrency}
                  </p>

                  <p className="text-xs text-gray-500 mt-1">
                    Your existing transaction records keep their original
                    currency and exchange-rate history.
                  </p>
                </div>

                <button
                  onClick={saveCurrencySettings}
                  disabled={
                    savingCurrency ||
                    !activeCurrency ||
                    activeCurrency === ""
                  }
                  className="w-full py-2 bg-blue-600 text-white rounded-lg disabled:bg-blue-400 disabled:cursor-not-allowed"
                >
                  {savingCurrency ? "Updating Currency..." : "Save Currency"}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Tax Settings */}
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
              min="0"
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

      {/* Debt Threshold */}
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
              Debt Threshold ({activeCurrency || "Currency not set"})
            </label>

            <input
              type="number"
              min="0"
              value={debtThreshold}
              onChange={(e) => setDebtThreshold(e.target.value)}
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

      {/* Returned Items */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border">
        <button
          onClick={() => setShowReturn(true)}
          className="w-full flex justify-between items-center p-4"
        >
          <span>Returned Items</span>
          <span>→</span>
        </button>
      </div>

      {/* Export */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border">
        <button
          onClick={() => toggleSection("export")}
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

      {/* Billing */}
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