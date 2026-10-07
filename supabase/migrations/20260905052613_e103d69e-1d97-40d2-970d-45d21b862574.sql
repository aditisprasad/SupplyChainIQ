CREATE OR REPLACE FUNCTION public.bootstrap_current_user(_full_name text DEFAULT NULL, _job_title text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid(); v_email text; v_ws uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;

  INSERT INTO public.profiles (id, email, full_name, job_title)
  VALUES (v_uid, COALESCE(v_email, ''), NULLIF(_full_name, ''), NULLIF(_job_title, ''))
  ON CONFLICT (id) DO UPDATE
    SET full_name = COALESCE(NULLIF(_full_name, ''), public.profiles.full_name),
        job_title = COALESCE(NULLIF(_job_title, ''), public.profiles.job_title),
        updated_at = now();

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_uid) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_uid, 'ADMIN'::app_role), (v_uid, 'SUPPLY_CHAIN_MANAGER'::app_role)
    ON CONFLICT DO NOTHING;
  END IF;

  SELECT id INTO v_ws FROM public.workspaces WHERE is_demo ORDER BY created_at LIMIT 1;
  IF v_ws IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.workspace_members WHERE workspace_id = v_ws AND user_id = v_uid
  ) THEN
    INSERT INTO public.workspace_members (workspace_id, user_id) VALUES (v_ws, v_uid);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_my_roles(_roles app_role[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid(); r app_role;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _roles IS NULL OR array_length(_roles, 1) IS NULL THEN RAISE EXCEPTION 'At least one role is required'; END IF;
  DELETE FROM public.user_roles WHERE user_id = v_uid;
  FOREACH r IN ARRAY _roles LOOP
    INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, r) ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_current_user(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_my_roles(app_role[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bootstrap_current_user(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_my_roles(app_role[]) TO authenticated;