
CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  official_id text UNIQUE NOT NULL,
  creator_id text NOT NULL,
  creator_username text,
  creator_name text,
  creator_profile_pic text,
  content text,
  category text,
  type text,
  price numeric DEFAULT 0,
  duration integer DEFAULT 0,
  file_size_mb numeric DEFAULT 0,
  thumbnail_url text,
  media_url text,
  location text,
  post_date timestamptz,
  created_at timestamptz DEFAULT now(),
  view_count integer DEFAULT 0,
  like_count integer DEFAULT 0,
  is_premium boolean DEFAULT false
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read posts" ON public.posts FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert posts" ON public.posts FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update posts" ON public.posts FOR UPDATE TO public USING (true);

CREATE INDEX idx_posts_type ON public.posts (type);
CREATE INDEX idx_posts_post_date ON public.posts (post_date DESC);
CREATE INDEX idx_posts_creator_id ON public.posts (creator_id);
CREATE INDEX idx_posts_content ON public.posts USING gin (to_tsvector('english', coalesce(content, '')));
CREATE INDEX idx_posts_file_size ON public.posts (file_size_mb DESC);
