import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const API_BASE = 'https://api.official.me'
const AUTH_KEY = 'd41d8cd98f00b204e9800998ecf8427e'
const ADMIN_USER_ID = '6144858b2f03d06a7dd008e4'
const BATCH_SIZE = 5
const DELAY_MS = 800
const DEFAULT_LIMIT_PER_CREATOR = 10

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

/** Fetch latest N posts unauthenticated (preserves media URLs) */
async function fetchLatestPosts(influencerId: string, limit: number): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE}/posts/getUserPost`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'x-off-country-code': 'IN',
      },
      body: JSON.stringify({
        isLogin: 'false',
        influencerId,
        userId: ADMIN_USER_ID,
        skip: 0,
        limit,
        key: AUTH_KEY,
      }),
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data?.data ?? []).filter((p: any) => !p.isDeleted && !p.isHided)
  } catch {
    return []
  }
}

function postToRow(p: any, c: { official_id: string; username: string; name: string; profile_pic: string | null }) {
  return {
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
  }
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
    const username = url.searchParams.get('username') // sync just one creator
    const offset = parseInt(url.searchParams.get('offset') || '0')
    const limit = parseInt(url.searchParams.get('limit') || '50') // creators per batch
    const postsPerCreator = parseInt(url.searchParams.get('posts') || String(DEFAULT_LIMIT_PER_CREATOR))
    const runId = url.searchParams.get('run_id') || crypto.randomUUID()

    // Fetch target creator(s)
    let creators: any[] = []
    let totalCreators = 0

    if (username) {
      // Match by username OR official_id (creators may be stored with id as username)
      const { data, error } = await sb
        .from('creators')
        .select('official_id, username, name, profile_pic')
        .or(`username.eq.${username},official_id.eq.${username}`)
        .limit(1)
      if (error) throw error
      creators = data ?? []
      totalCreators = creators.length
    } else {
      const { data, error, count } = await sb
        .from('creators')
        .select('official_id, username, name, profile_pic', { count: 'exact' })
        .order('updated_at', { ascending: true })
        .range(offset, offset + limit - 1)
      if (error) throw error
      creators = data ?? []
      totalCreators = count ?? 0
    }

    if (creators.length === 0) {
      return new Response(JSON.stringify({
        processed: 0, totalPosts: 0, newPosts: 0, runId,
        message: username ? `Creator @${username} not found` : 'No creators in this range',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    await sb.from('sync_log').insert({
      run_id: runId,
      status: 'running',
      message: username
        ? `Syncing latest ${postsPerCreator} posts for @${username}`
        : `Syncing latest ${postsPerCreator} posts: creators ${offset + 1}–${Math.min(offset + limit, totalCreators)}`,
      creators_done: offset,
      creators_total: totalCreators,
    })

    let totalPosts = 0
    let newPosts = 0
    const results: { creator: string; posts: number; new: number; status: string }[] = []
    let creatorsProcessed = 0

    for (let i = 0; i < creators.length; i += BATCH_SIZE) {
      const batch = creators.slice(i, i + BATCH_SIZE)
      const batchResults = await Promise.allSettled(
        batch.map(async (c) => {
          const posts = await fetchLatestPosts(c.official_id, postsPerCreator)
          if (posts.length === 0) {
            return { creator: c.username, name: c.name, posts: 0, new: 0, status: 'no_posts' }
          }

          // Find which posts are new (not already in DB)
          const ids = posts.map((p: any) => p._id)
          const { data: existing } = await sb
            .from('posts')
            .select('official_id')
            .in('official_id', ids)
          const existingIds = new Set((existing ?? []).map((r: any) => r.official_id))
          const newCount = posts.filter((p: any) => !existingIds.has(p._id)).length

          const rows = posts.map((p: any) => postToRow(p, c))
          const { error: upsertError } = await sb
            .from('posts')
            .upsert(rows, { onConflict: 'official_id' })

          if (upsertError) {
            return { creator: c.username, name: c.name, posts: posts.length, new: 0, status: 'upsert_error' }
          }

          // Touch creator updated_at
          await sb.from('creators').update({ updated_at: new Date().toISOString() }).eq('official_id', c.official_id)

          return { creator: c.username, name: c.name, posts: posts.length, new: newCount, status: 'ok' }
        })
      )

      for (const r of batchResults) {
        creatorsProcessed++
        if (r.status === 'fulfilled') {
          results.push(r.value)
          totalPosts += r.value.posts
          newPosts += r.value.new

          await sb.from('sync_log').insert({
            run_id: runId,
            creator_username: r.value.creator,
            creator_name: r.value.name || r.value.creator,
            posts_synced: r.value.new,
            status: r.value.status === 'ok' ? 'synced' : r.value.status,
            message: r.value.status === 'ok'
              ? `@${r.value.creator}: ${r.value.new} new of ${r.value.posts} latest`
              : `${r.value.status} for @${r.value.creator}`,
            creators_done: offset + creatorsProcessed,
            creators_total: totalCreators,
          })
        } else {
          results.push({ creator: 'unknown', posts: 0, new: 0, status: 'failed' })
        }
      }

      if (i + BATCH_SIZE < creators.length) await sleep(DELAY_MS)
    }

    await sb.from('sync_log').insert({
      run_id: runId,
      status: 'batch_complete',
      message: `Done: ${creatorsProcessed} creators, ${newPosts} new of ${totalPosts} latest posts`,
      creators_done: offset + creatorsProcessed,
      creators_total: totalCreators,
      posts_synced: newPosts,
    })

    return new Response(JSON.stringify({
      processed: results.length,
      totalCreators,
      totalPosts,
      newPosts,
      offset,
      limit,
      runId,
      hasMore: !username && offset + limit < totalCreators,
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
