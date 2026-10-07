// Session + RBAC service. Server-only.
import type { Db } from "./intelligence.server";
import { WRITE_ROLES, type AppRole, type SessionContext } from "./types";
import { getActiveWorkspace } from "./intelligence.server";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function bootstrapUser(db: Db, input: { fullName?: string; jobTitle?: string }) {
  try {
    const res = await (db as any).rpc("bootstrap_current_user", {
      _full_name: input.fullName ?? null,
      _job_title: input.jobTitle ?? null,
    });
    if (res.error) console.warn("[bootstrapUser] Error:", res.error.message);
  } catch (e) {
    console.warn("[bootstrapUser] Exception:", e);
  }
}

export async function setMyRoles(db: Db, roles: AppRole[]) {
  try {
    const res = await (db as any).rpc("set_my_roles", { _roles: roles });
    if (res.error) console.warn("[setMyRoles] Error:", res.error.message);
  } catch (e) {
    console.warn("[setMyRoles] Exception:", e);
  }
}

export async function getSessionContext(
  db: Db,
  userId: string,
  email: string,
  preferredWorkspaceId?: string,
  isExplicitSwitch?: boolean,
): Promise<SessionContext> {
  let profileData: { email?: string; full_name?: string | null; job_title?: string | null } | null = null;
  let roleList: AppRole[] = [];

  let workspace = {
    id: "",
    name: "Workspace unavailable",
    industry: "",
    currency: "",
    is_demo: false,
  };

  try {
    await bootstrapUser(db, {});

    const [profile, roles] = await Promise.all([
      db.from("profiles").select("email,full_name,job_title").eq("id", userId).maybeSingle(),
      db.from("user_roles").select("role").eq("user_id", userId),
    ]);

    if (profile?.data) profileData = profile.data;
    if (roles?.data && roles.data.length > 0) roleList = roles.data.map((r) => r.role as AppRole);

    const activeWs = await getActiveWorkspace(db, userId, preferredWorkspaceId, isExplicitSwitch);
    if (activeWs) {
      workspace = {
        id: activeWs.id,
        name: activeWs.name,
        industry: activeWs.industry ?? "",
        currency: activeWs.currency ?? "",
        is_demo: activeWs.is_demo ?? false,
      };
    }
  } catch (err) {
    console.warn("[getSessionContext] Database context fallback active:", err);
  }

  return {
    userId,
    email: profileData?.email ?? email ?? "",
    fullName: profileData?.full_name ?? "User",
    jobTitle: profileData?.job_title ?? null,
    roles: roleList,
    canWrite: roleList.some((r) => WRITE_ROLES.includes(r)),
    workspace: {
      id: workspace.id,
      name: workspace.name,
      industry: workspace.industry,
      currency: workspace.currency,
      isDemo: workspace.is_demo,
    },
  };
}
