

## Architecture Shift: API-First with Lazy DB Caching

### Current Problem
78K+ posts stored in DB with broken media URLs (authenticated sync strips them). Complex sync machinery that doesn't work reliably.

### New Approach
Load posts directly from Official.me API using `isLogin=false` (which returns media URLs). Show 10 posts at a time. Save to DB only as users browse — building the cache organically.

### Steps

**1. Clear existing broken data**
- Run SQL to truncate `posts` and `sync_log` tables (keeps `creators` intact since those are valid)

**2. Rewrite Index page to be API-driven**
- Replace DB-based `getStoredPosts` with direct API calls using `getInfluencerPosts()` (isLogin=false, limit=10)
- Load a feed by fetching posts from stored creators, paginated
- Remove sync button and SyncProgressPanel
- Remove stats bar (no longer meaningful with on-demand loading)
- After fetching posts from API, upsert them into DB in background (with media URLs intact)

**3. Rewrite CreatorProfile to use unauthenticated API**
- Already