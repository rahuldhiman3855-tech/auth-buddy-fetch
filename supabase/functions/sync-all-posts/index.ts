import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const API_BASE = 'https://api.official.me'
const AUTH_KEY = 'd41d8cd98f00b204e9800998ecf8427e'
const ADMIN_USER_ID = '6144858b2f03d06a7dd008e4'
const BATCH_SIZE = 3
const DELAY_MS = 2000

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

/** Fetch ALL posts for a creator by paginating through getUserPost */
async function fetchAllCreatorPosts(influencerId: string): Promise<any[]> {
  const allPosts: any[] = []
  let skip = 0
  const pageSize = 100

  while (true) {
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
          skip,
          limit: pageSize,
          key: AUTH_KEY,
        }),
      })
      if (!res.ok) break
      const data = await res.json()
      const posts = (data?.data ?? []).filter((p: any) => !p.isDeleted && !p.isHided)
      if (posts.length === 0) break
      allPosts.push(...posts)
      // If fewer than requested, we got all of them
      if (posts.length < pageSize) break
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

    const { data: creators, error, count } = await sb
      .from('creators')
      .select('official_id, username, name, profile_pic', { count: 'exact' })
      .order('updated_at', { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) throw error

    let totalPosts = 0
    const results: { creator: string; posts: number; status: string }[] = []

    for (let i = 0; i < creators.length; i += BATCH_SIZE) {
      const batch = creators.slice(i, i + BATCH_SIZE)
      const batchResults = await Promise.allSettled(
        batch.map(async (c) => {
          const posts = await fetchAllCreatorPosts(c.official_id)
          if (posts.length === 0) return { creator: c.username, posts: 0, status: 'no_posts' }

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
            console.error(`Upsert error for ${c.username}:`, upsertError)
            return { creator: c.username, posts: posts.length, status: 'upsert_error' }
          }

          return { creator: c.username, posts: posts.length, status: 'ok' }
        })
      )

      for (const r of batchResults) {
        if (r.status === 'fulfilled') {
          results.push(r.value)
          totalPosts += r.value.posts
        } else {
          results.push({ creator: 'unknown', posts: 0, status: 'failed' })
        }
      }

      if (i + BATCH_SIZE < creators.length) await sleep(DELAY_MS)
    }

    return new Response(JSON.stringify({
      processed: results.length,
      totalCreators: count,
      totalPosts,
      offset,
      limit,
      hasMore: offset + limit < (count ?? 0),
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
