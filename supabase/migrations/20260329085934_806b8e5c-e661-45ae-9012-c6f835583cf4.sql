CREATE TABLE public.creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  official_id TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  profile_pic TEXT,
  cover_pic TEXT,
  bio TEXT,
  category TEXT,
  follower_count INTEGER DEFAULT 0,
  video_count INTEGER DEFAULT 0,
  post_count INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  discovered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.creators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read creators" ON public.creators FOR SELECT USING (true);
CREATE POLICY "Anyone can insert creators" ON public.creators FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update creators" ON public.creators FOR UPDATE USING (true);