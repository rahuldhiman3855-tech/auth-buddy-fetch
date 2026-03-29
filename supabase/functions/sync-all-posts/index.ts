import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const API_BASE = 'https://api.official.me'
const AUTH_KEY = 'd41d8cd98f00b204e9800998ecf8427e'
const ADMIN_USER_ID = '6144858b2f03d06a7dd008e4'
const BATCH_SIZE = 3
const DELAY_MS = 1500

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

function decodeContent(content?: string): string {
  if (!content) return ''
  try {
    const decoded = decodeURIComponent(content)
    return decoded.replace(/<[^>]*>/g, '').trim()
  } catch {
    return content.replace(/<[^>]*>/g, '').trim()
  }
}

/** Get influencer auth token for authenticated requests */
async function getInfluencerToken(): Promise<string> {
  const res = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'accept': 'application/json', 'content-type': 'application/json', 'x-off-country-code': 'IN' },
    body: JSON.stringify({
      email: 'lovableadmin1@proton.me',
      password: 'Admin@12345',
      influencerUsername: 'lovableadmin1',
    }),
  })
  if (!res.ok) throw new Error(`Login failed [${res.status}]`)
  const data = await res.json()
  const token = data?.accessToken || data?.savedUserData?.accessToken
  if (!token) throw new Error('No token in login response')
  return token
}

/** Fetch ALL posts for a creator using authenticated limit=500 requests */
async function fetchAllCreatorPosts(influencerId: string, token: string): Promise<any[]> {
  const allPosts: any[] = []
  const seenIds = new Set<string>()
  let skip = 0

  while (true) {
    try {
      const res = await fetch(`${API_BASE}/posts/getUserPost`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'x-off-country-code': 'IN',
          'Authorization': `bearer ${token}`,
        },
        body: JSON.stringify({
          isLogin: 'true',
          influencerId,
          userId: ADMIN_USER_ID,
          skip,
          limit: 500,
          key: AUTH_KEY,
        }),
      })
      if (!res.ok) break
      const data = await res.json()
      const posts = (data?.data ?? []).filter((p: any) => !p.isDeleted && !p.isHided)
      if (posts.length === 0) break

      let newCount = 0
      for (const p of posts) {
        if (!seenIds.has(p._id)) {
          seenIds.add(p._id)
          allPosts.push(p)
          newCount++
        }
      }
      if (newCount === 0) break
      skip += posts.length
    } catch {
      break
    }
  }

  return allPosts
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const sb = createClient(supabaseUrl, supabaseKey)

    const url = new URL(req.url)
    const offset = parseInt(url.searchParams.get('offset') || '0')
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const runId = url.searchParams.get('run_id') || crypto.randomUUID()

    // Get auth token for fast 500-per-request fetching
    let token: string
    try {
      token = await getInfluencerToken()
      console.log('Got influencer token for authenticated sync')
    } catch (e) {
      console.error('Token fetch failed, falling back to unauthenticated:', e.message)
      token = '' // will fall back to unauthenticated (10 per request)
    }

    const { data: creators, error, count } = await sb
      .from('creators')
      .select('official_id, username, name, profile_pic', { count: 'exact' })
      .order('updated_at', { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) throw error

    const totalCreators = count ?? 0

    // Log start
    await sb.from('sync_log').insert({
      run_id: runId,
      status: 'running',
      message: `Starting batch: creators ${offset + 1}–${Math.min(offset + limit, totalCreators)} (${token ? 'authenticated, limit=500' : 'unauthenticated, limit=10'})`,
      creators_done: offset,
      creators_total: totalCreators,
    })

    let totalPosts = 0
    const results: { creator: string; posts: number; status: string }[] = []
    let creatorsProcessed = 0

    for (let i = 0; i < creators.length; i += BATCH_SIZE) {
      const batch = creators.slice(i, i + BATCH_SIZE)
      const batchResults = await Promise.allSettled(
        batch.map(async (c) => {
          const posts = await fetchAllCreatorPosts(c.official_id, token)
          if (posts.length === 0) return { creator: c.username, name: c.name, posts: 0, status: 'no_posts' }

          const rows = posts.map((p: any) => ({
            official_id: p._id,
            creator_id: c.official_id,
            creator_username: c.username,
            creator_name: c.name || c.username,
            creator_profile_pic: c.profile_pic,
            content: decodeContent(p.content),
            category: p.category || 'public',
            type: p.type || 'Video',
            price: p.price || 0,
            duration: p.duration || 0,
            file_size_mb: p.fileSizeInMB || 0,
            thumbnail_url: p.thumbnailLocation || p.thumbnailUrl || '',
            media_url: p.mediaUrl || p.location || '',
            location: p.location || '',
            post_date: p.date || p.created_at || new Date().toISOString(),
            view_count: p.viewCount || 0,
            like_count: Array.isArray(p.likes) ? p.likes.length : (p.likeCount || 0),
            is_premium: p.isPremium || p.category === 'private',
          }))

          const { error: upsertError } = await sb
            .from('posts')
            .upsert(rows, { onConflict: 'official_id' })

          if (upsertError) {
            return { creator: c.username, name: c.name, posts: posts.length, status: 'upsert_error' }
          }

          return { creator: c.username, name: c.name, posts: posts.length, status: 'ok' }
        })
      )

      for (const r of batchResults) {
        creatorsProcessed++
        if (r.status === 'fulfilled') {
          results.push(r.value)
          totalPosts += r.value.posts

          await sb.from('sync_log').insert({
            run_id: runId,
            creator_username: r.value.creator,
            creator_name: r.value.name || r.value.creator,
            posts_synced: r.value.posts,
            status: r.value.status === 'ok' ? 'synced' : r.value.status,
            message: r.value.status === 'ok'
              ? `Synced ${r.value.posts} posts from @${r.value.creator}`
              : `${r.value.status} for @${r.value.creator}`,
            creators_done: offset + creatorsProcessed,
            creators_total: totalCreators,
          })
        } else {
          results.push({ creator: 'unknown', posts: 0, status: 'failed' })
          await sb.from('sync_log').insert({
            run_id: runId,
            status: 'failed',
            message: `Failed to process creator`,
            creators_done: offset + creatorsProcessed,
            creators_total: totalCreators,
          })
        }
      }

      if (i + BATCH_SIZE < creators.length) await sleep(DELAY_MS)
    }

    // Final log
    await sb.from('sync_log').insert({
      run_id: runId,
      status: 'batch_complete',
      message: `Batch done: ${creatorsProcessed} creators, ${totalPosts} posts`,
      creators_done: offset + creatorsProcessed,
      creators_total: totalCreators,
      posts_synced: totalPosts,
    })

    return new Response(JSON.stringify({
      processed: results.length,
      totalCreators,
      totalPosts,
      offset,
      limit,
      runId,
      hasMore: offset + limit < totalCreators,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
