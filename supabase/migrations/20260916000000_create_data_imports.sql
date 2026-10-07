-- ============ DATA IMPORTS AUDIT LOG ============
CREATE TABLE IF NOT EXISTS public.data_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  filename text NOT NULL,
  dataset text NOT NULL,
  row_count integer NOT NULL DEFAULT 0,
  valid_count integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  quality_score numeric(5,2) NOT NULL DEFAULT 100.00,
  status text NOT NULL DEFAULT 'COMPLETED',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_data_imports_ws_created ON public.data_imports (workspace_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.data_imports TO authenticated;
GRANT ALL ON public.data_imports TO service_role;
ALTER TABLE public.data_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "data_imports_select" ON public.data_imports FOR SELECT TO authenticated
  USING (public.can_access_workspace(workspace_id));
CREATE POLICY "data_imports_insert" ON public.data_imports FOR INSERT TO authenticated
  WITH CHECK (public.can_write_workspace(workspace_id));
CREATE POLICY "data_imports_update" ON public.data_imports FOR UPDATE TO authenticated
  USING (public.can_write_workspace(workspace_id)) WITH CHECK (public.can_write_workspace(workspace_id));
CREATE POLICY "data_imports_delete" ON public.data_imports FOR DELETE TO authenticated
  USING (public.can_write_workspace(workspace_id));
