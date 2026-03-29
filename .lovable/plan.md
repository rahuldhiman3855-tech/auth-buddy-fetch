

# Transform Dashboard: Creator Grid → Posts Feed with Filters

## Current State
- Index page shows a grid of 3000 creator cards with pin/visited features
- Posts are only fetched per-creator when visiting their profile page
- Posts come from the official.me API (`/posts/getUserPost`) — they are NOT stored in our database

## Core Challenge
Posts live on official.me's API, not in our DB. Showing all posts from 3000 creators with filters requires storing them locally first.

## Plan

### Step 1: Create a `posts` table in the database
Store post metadata locally so we can query/filter/paginate efficiently.

```sql
CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  official_id text UNIQUE NOT NULL,        -- _id from API
  creator_id text NOT NULL,                -- userId/influencerId
  creator_name text,
  content text,                            -- decoded title
  category text,                           -- "private" / "public"
  type text,                               -- "Video" / "Image"
  price numeric DEFAULT 0,
  duration integer DEFAULT 0,
  file_size_mb numeric DEFAULT 0,
  thumbnail_url text,
  media_url text,
  location text,
  post_date timestamptz,
  created_at timestamptz DEFAULT now(),
  view_count integer DEFAULT 0
);
-- RLS: public read
-- Index on type, post_date, creator_id for filter performance
```

### Step 2: Create an edge function `sync-all-posts`
- Iterates through all creators in DB
- For each creator, fetches posts from official.me API
- Upserts into the `posts` table
- Can be called in batches (offset/limit on creators)
- Returns progress so the frontend can show sync status

### Step 3: Rebuild Index.tsx as a Posts Feed
Replace the creator card grid with a post card grid (reusing the existing `PostCard` component from CreatorProfile).

**UI Layout:**
- Top bar: Search input (filters by decoded content/title)
- Filter row: Type dropdown (All/Video/Image), Date range picker, Duration range, Sort by (newest/oldest/largest)
- Paginated grid of post cards with infinite scroll
- Each post card shows creator name as a subtitle link
- Clicking a post opens the media modal (same as CreatorProfile)

### Step 4: Add filter/search API helper
```typescript
export async function getStoredPosts(params: {
  offset: number; limit: number;
  type?: string;           // "Video" | "Image"
  search?: string;         // title search
  dateFrom?: string;       // ISO date
  dateTo?: string;
  minDuration?: number;
  sortBy?: string;         // "date_desc" | "date_asc" | "size_desc"
}): Promise<{ data: Post[]; count: number }>
```
Uses Supabase client with chained `.ilike()`, `.eq()`, `.gte()`, `.order()` filters.

### Step 5: Keep creator navigation
- Post cards include a small creator name/avatar link
- Clicking it navigates to `/creator/:username` (existing page unchanged)
- "Sync Posts" button triggers the edge function to populate/refresh the posts table

## File Changes
| File | Action |
|------|--------|
| `supabase/migrations/` | New migration for `posts` table |
| `supabase/functions/sync-all-posts/index.ts` | New edge function |
| `src/lib/api.ts` | Add `getStoredPosts()` helper |
| `src/pages/Index.tsx` | Rewrite as posts feed with filters |
| `src/components/PostCard.tsx` | Extract from CreatorProfile, add creator name |

