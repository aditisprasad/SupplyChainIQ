REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_any_role(uuid, public.app_role[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_access_workspace(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_write_workspace(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, public.app_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_workspace(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_write_workspace(uuid) TO authenticated;