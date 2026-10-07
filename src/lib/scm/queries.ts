import { queryOptions } from "@tanstack/react-query";

import {
  fetchAlerts,
  fetchDemand,
  fetchInventory,
  fetchLogistics,
  fetchOverview,
  fetchPurchaseOrders,
  fetchNotifications,
  fetchSession,
  fetchSuppliers,
  fetchWorkspaces,
  fetchImportHistory,
  fetchProcurementIntelligence,
  fetchAiDecisionIntelligence,
  fetchRecommendations,
  globalSearch,
} from "./scm.functions";

export const sessionQuery = queryOptions({
  queryKey: ["scm", "session"],
  queryFn: () => fetchSession(),
  staleTime: 60_000,
});

export const overviewQuery = queryOptions({
  queryKey: ["scm", "overview"],
  queryFn: () => fetchOverview(),
});

export const demandQuery = (productId?: string) =>
  queryOptions({
    queryKey: ["scm", "demand", productId ?? "all"],
    queryFn: () => fetchDemand({ data: productId ? { productId } : {} }),
  });

export const inventoryQuery = queryOptions({
  queryKey: ["scm", "inventory"],
  queryFn: () => fetchInventory(),
});

export const suppliersQuery = queryOptions({
  queryKey: ["scm", "suppliers"],
  queryFn: () => fetchSuppliers(),
});

export const logisticsQuery = queryOptions({
  queryKey: ["scm", "logistics"],
  queryFn: () => fetchLogistics(),
});

export const alertsQuery = queryOptions({
  queryKey: ["scm", "alerts"],
  queryFn: () => fetchAlerts({ data: {} }),
});

export const purchaseOrdersQuery = queryOptions({
  queryKey: ["scm", "purchase-orders"],
  queryFn: () => fetchPurchaseOrders(),
});

export const notificationsQuery = queryOptions({
  queryKey: ["scm", "notifications"],
  queryFn: () => fetchNotifications(),
  staleTime: 30_000,
  refetchInterval: 60_000,
});

export const searchQuery = (term: string) =>
  queryOptions({
    queryKey: ["scm", "search", term],
    queryFn: () => globalSearch({ data: { term } }),
    enabled: term.trim().length >= 2,
    staleTime: 15_000,
  });

export const importHistoryQuery = queryOptions({
  queryKey: ["scm", "import-history"],
  queryFn: () => fetchImportHistory(),
});

export const procurementIntelligenceQuery = queryOptions({
  queryKey: ["scm", "procurement-intelligence"],
  queryFn: () => fetchProcurementIntelligence(),
});

export const aiDecisionQuery = queryOptions({
  queryKey: ["scm", "ai-decision"],
  queryFn: () => fetchAiDecisionIntelligence(),
});

export const recommendationsQuery = queryOptions({
  queryKey: ["scm", "recommendations"],
  queryFn: () => fetchRecommendations(),
});

export const workspacesQuery = queryOptions({
  queryKey: ["scm", "workspaces"],
  queryFn: () => fetchWorkspaces(),
  staleTime: 60_000,
});


