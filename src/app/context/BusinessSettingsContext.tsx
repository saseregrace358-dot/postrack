
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import toast from "react-hot-toast";
import { getBusinessSettings } from "../../api/settings";

const SUPPORTED_CURRENCIES = [
  "NGN",
  "USD",
  "GBP",
  "EUR",
  "CAD",
  "AUD",
  "GHS",
  "KES",
  "ZAR",
  "INR",
  "JPY",
  "CHF",
];

export interface BusinessSettings {
  base_currency: string;
  currency: string;
  exchange_rate: number;
  tax_enabled: boolean;
  tax_rate: number;
  debt_threshold: number;
}

interface BusinessSettingsContextType {
  settings: BusinessSettings | null;
  currency: string | null;
  baseCurrency: string | null;
  exchangeRate: number | null;
  taxEnabled: boolean | null;
  taxRate: number | null;
  debtThreshold: number | null;
  loading: boolean;
  error: string | null;
  refreshSettings: () => Promise<BusinessSettings>;
}

const BusinessSettingsContext =
  createContext<BusinessSettingsContextType | undefined>(
    undefined
  );

interface BusinessSettingsProviderProps {
  children: ReactNode;
}

export function BusinessSettingsProvider({
  children,
}: BusinessSettingsProviderProps) {
  const [settings, setSettings] =
    useState<BusinessSettings | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tracks requests so older responses cannot overwrite newer ones.
  const requestId = useRef(0);

  // Tracks whether the first successful settings request has completed.
  const hasLoadedSettings = useRef(false);

  // Prevents state updates after the provider unmounts.
  const mounted = useRef(false);

  const refreshSettings = useCallback(async (): Promise<BusinessSettings> => {
    const currentRequest = ++requestId.current;
    const hadPreviousSettings = hasLoadedSettings.current;

    // Do not hide existing settings during a refresh.
    if (!hadPreviousSettings) {
      setLoading(true);
    }

    setError(null);

    try {
      const response = await getBusinessSettings();
      const data = response.data;

      const currency = data?.currency;
      const baseCurrency = data?.base_currency;

      if (
        typeof currency !== "string" ||
        !SUPPORTED_CURRENCIES.includes(currency)
      ) {
        throw new Error(
          "The business currency is missing or unsupported. Please check your currency settings."
        );
      }

      if (
        typeof baseCurrency !== "string" ||
        !SUPPORTED_CURRENCIES.includes(baseCurrency)
      ) {
        throw new Error(
          "The business base currency is missing or unsupported."
        );
      }

      if (
        data.exchange_rate === null ||
        data.exchange_rate === undefined ||
        data.exchange_rate === ""
      ) {
        throw new Error(
          "The currency exchange rate is missing."
        );
      }

      const exchangeRate = Number(data.exchange_rate);

      if (
        !Number.isFinite(exchangeRate) ||
        exchangeRate <= 0
      ) {
        throw new Error(
          "The currency exchange rate is invalid."
        );
      }

      if (
        typeof data.tax_enabled !== "boolean" ||
        data.tax_rate === null ||
        data.tax_rate === undefined ||
        data.debt_threshold === null ||
        data.debt_threshold === undefined
      ) {
        throw new Error(
          "Some business settings are missing or invalid."
        );
      }

      const taxRate = Number(data.tax_rate);
      const debtThreshold = Number(data.debt_threshold);

      if (
        !Number.isFinite(taxRate) ||
        taxRate < 0 ||
        !Number.isFinite(debtThreshold) ||
        debtThreshold < 0
      ) {
        throw new Error(
          "The tax rate or debt threshold is invalid."
        );
      }

      const validatedSettings: BusinessSettings = {
        base_currency: baseCurrency,
        currency,
        exchange_rate: exchangeRate,
        tax_enabled: data.tax_enabled,
        tax_rate: taxRate,
        debt_threshold: debtThreshold,
      };

      // Ignore outdated requests.
      if (
        currentRequest !== requestId.current ||
        !mounted.current
      ) {
        throw new Error(
          "Settings refresh was superseded."
        );
      }

      hasLoadedSettings.current = true;

      setSettings(validatedSettings);
      setError(null);

      return validatedSettings;
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ||
        err?.message ||
        "Unable to load business settings.";

      if (
        currentRequest === requestId.current &&
        mounted.current
      ) {
        setError(message);

        // Notify the user only if previously loaded settings exist.
        if (hadPreviousSettings) {
          toast.error(
            "Unable to refresh business settings. Your previously loaded settings are still available."
          );
        }
      }

      throw err;
    } finally {
      if (
        currentRequest === requestId.current &&
        mounted.current
      ) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;

    refreshSettings().catch(() => {
      // Initial loading errors are exposed through the context.
    });

    return () => {
      mounted.current = false;
      requestId.current += 1;
    };
  }, [refreshSettings]);

  const value: BusinessSettingsContextType = {
    settings,
    currency: settings?.currency ?? null,
    baseCurrency: settings?.base_currency ?? null,
    exchangeRate: settings?.exchange_rate ?? null,
    taxEnabled: settings?.tax_enabled ?? null,
    taxRate: settings?.tax_rate ?? null,
    debtThreshold: settings?.debt_threshold ?? null,
    loading,
    error,
    refreshSettings,
  };

  return (
    <BusinessSettingsContext.Provider value={value}>
      {children}
    </BusinessSettingsContext.Provider>
  );
}

export function useBusinessSettings() {
  const context = useContext(BusinessSettingsContext);

  if (!context) {
    throw new Error(
      "useBusinessSettings must be used inside BusinessSettingsProvider."
    );
  }

  return context;
}
