CREATE OR REPLACE FUNCTION public.bootstrap_current_user(_full_name text DEFAULT NULL, _job_title text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_demo_ws uuid;
  v_cust_ws uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('bootstrap_current_user:' || v_uid::text, 0));

  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;

  INSERT INTO public.profiles (id, email, full_name, job_title)
  VALUES (v_uid, COALESCE(v_email, ''), NULLIF(_full_name, ''), NULLIF(_job_title, ''))
  ON CONFLICT (id) DO UPDATE
    SET full_name = COALESCE(NULLIF(_full_name, ''), public.profiles.full_name),
        job_title = COALESCE(NULLIF(_job_title, ''), public.profiles.job_title),
        updated_at = now();

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_uid) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_uid, 'ADMIN'::public.app_role), (v_uid, 'SUPPLY_CHAIN_MANAGER'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  SELECT m.workspace_id INTO v_cust_ws
  FROM public.workspace_members m
  JOIN public.workspaces w ON w.id = m.workspace_id
  WHERE m.user_id = v_uid AND w.is_demo = false
  ORDER BY w.created_at DESC
  LIMIT 1;

  IF v_cust_ws IS NULL THEN
    v_cust_ws := gen_random_uuid();
    INSERT INTO public.workspaces (id, name, slug, industry, currency, is_demo)
    VALUES (
      v_cust_ws,
      'My Organization Workspace',
      'org-' || substring(v_cust_ws::text, 1, 8),
      'Consumer Electronics & Manufacturing',
      'INR',
      false
    );

    INSERT INTO public.workspace_members (workspace_id, user_id)
    VALUES (v_cust_ws, v_uid)
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
  END IF;

  INSERT INTO public.sites (workspace_id, code, name, site_type, city, country, region)
  VALUES (v_cust_ws, 'DC-MAIN', 'Main Distribution Center', 'DISTRIBUTION_CENTER', 'Bengaluru', 'India', 'APAC')
  ON CONFLICT (workspace_id, code) DO NOTHING;

  SELECT id INTO v_demo_ws FROM public.workspaces WHERE is_demo ORDER BY created_at LIMIT 1;
  IF v_demo_ws IS NOT NULL THEN
    INSERT INTO public.workspace_members (workspace_id, user_id)
    VALUES (v_demo_ws, v_uid)
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_current_user(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bootstrap_current_user(text, text) TO authenticated;
