export type AppRole =
  | "ADMIN"
  | "PROCUREMENT_MANAGER"
  | "SUPPLY_CHAIN_MANAGER"
  | "BUSINESS_ANALYST"
  | "FINANCE_MANAGER"
  | "EXECUTIVE";

export const APP_ROLES: AppRole[] = [
  "ADMIN",
  "PROCUREMENT_MANAGER",
  "SUPPLY_CHAIN_MANAGER",
  "BUSINESS_ANALYST",
  "FINANCE_MANAGER",
  "EXECUTIVE",
];

export const ROLE_LABELS: Record<AppRole, string> = {
  ADMIN: "Administrator",
  PROCUREMENT_MANAGER: "Procurement Manager",
  SUPPLY_CHAIN_MANAGER: "Supply Chain Manager",
  BUSINESS_ANALYST: "Business Analyst",
  FINANCE_MANAGER: "Finance Manager",
  EXECUTIVE: "Executive",
};

export const WRITE_ROLES: AppRole[] = ["ADMIN", "SUPPLY_CHAIN_MANAGER", "PROCUREMENT_MANAGER"];

export type SessionContext = {
  userId: string;
  email: string;
  fullName: string | null;
  jobTitle: string | null;
  roles: AppRole[];
  canWrite: boolean;
  workspace: { id: string; name: string; industry: string; currency: string; isDemo: boolean };
};

export type KpiTrendPoint = { label: string; value: number };
