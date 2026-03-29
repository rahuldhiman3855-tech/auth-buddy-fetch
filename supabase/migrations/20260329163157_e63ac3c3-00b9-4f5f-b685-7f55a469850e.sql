
CREATE TABLE public.sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id text NOT NULL,
  creator_username text,
  creator_name text,
  posts_synced integer DEFAULT 0,
  status text DEFAULT 'pending',
  message text,
  creators_done integer DEFAULT 0,
  creators_total integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read sync_log" ON public.sync_log FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert sync_log" ON public.sync_log FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update sync_log" ON public.sync_log FOR UPDATE TO public USING (true);
CREATE POLICY "Anyone can delete sync_log" ON public.sync_log FOR DELETE TO public USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.sync_log;
