
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import api from "../../api/api";
import { getSalesApi } from "../../api/sales";
import { getReturnsApi } from "../../api/returns";

// ================= QUERY KEYS =================

export const dashboardQueryKeys = {
  all: ["dashboard-summary"] as const,
  byDate: (date: string) =>
    ["dashboard-summary", date] as const,
};

export const salesHistoryQueryKeys = {
  sales: ["sales-history"] as const,
  returns: ["sales-history-returns"] as const,
};

// ================= DASHBOARD QUERY =================

export function useDashboardQuery(selectedDate: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: dashboardQueryKeys.byDate(selectedDate),

    queryFn: async ({ signal }) => {
      const response = await api.get("/dashboard/summary", {
        params: {
          selected_date: selectedDate,
        },
        signal,
      });

      return response.data;
    },
  });

  useEffect(() => {
    const refreshEvents = [
      "returns-updated",
      "sales-updated",
      "inventory-updated",
      "products-updated",
      "currency-updated",
    ];

    const refreshDashboard = () => {
      void queryClient.invalidateQueries({
        queryKey: dashboardQueryKeys.all,
      });
    };

    refreshEvents.forEach((eventName) => {
      window.addEventListener(eventName, refreshDashboard);
    });

    window.addEventListener("focus", refreshDashboard);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshDashboard();
      }
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      refreshEvents.forEach((eventName) => {
        window.removeEventListener(eventName, refreshDashboard);
      });

      window.removeEventListener("focus", refreshDashboard);

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, [queryClient]);

  return query;
}

// ================= SALES HISTORY QUERY =================

export function useSalesHistoryQuery() {
  const queryClient = useQueryClient();

  const salesQuery = useQuery({
    queryKey: salesHistoryQueryKeys.sales,

    queryFn: async () => {
      const response = await getSalesApi();
      return response.data;
    },
  });

  const returnsQuery = useQuery({
    queryKey: salesHistoryQueryKeys.returns,

    queryFn: async () => {
      const response = await getReturnsApi();
      return response.data;
    },
  });

  useEffect(() => {
    const refreshSales = () => {
      void queryClient.invalidateQueries({
        queryKey: salesHistoryQueryKeys.sales,
      });
    };

    const refreshReturns = () => {
      void queryClient.invalidateQueries({
        queryKey: salesHistoryQueryKeys.returns,
      });
    };

    window.addEventListener("sales-updated", refreshSales);
    window.addEventListener("returns-updated", refreshReturns);

    return () => {
      window.removeEventListener("sales-updated", refreshSales);
      window.removeEventListener("returns-updated", refreshReturns);
    };
  }, [queryClient]);

  return {
    sales: salesQuery.data ?? [],
    returns: returnsQuery.data ?? [],
    loadingSales: salesQuery.isLoading,
    loadingReturns: returnsQuery.isLoading,
    salesError: salesQuery.error,
    returnsError: returnsQuery.error,
    refreshSales: salesQuery.refetch,
    refreshReturns: returnsQuery.refetch,
  };
}

// ================= CACHE INVALIDATION =================

export function useRefreshSalesHistory() {
  const queryClient = useQueryClient();

  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: salesHistoryQueryKeys.sales,
      }),
      queryClient.invalidateQueries({
        queryKey: salesHistoryQueryKeys.returns,
      }),
      queryClient.invalidateQueries({
        queryKey: dashboardQueryKeys.all,
      }),
    ]);
  };
}
