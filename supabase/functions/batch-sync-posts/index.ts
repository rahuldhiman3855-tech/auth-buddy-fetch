import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const API_BASE = 'https://api.official.me'
const AUTH_KEY = 'd41d8cd98f00b204e9800998ecf8427e'
const ADMIN_USER_ID = '6144858b2f03d06a7dd008e4'
const BATCH_SIZE = 5 // concurrent fetches
const DELAY_MS = 1500 // delay between batches

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

async function fetchPostCount(influencerId: string): Promise<{ postCount: number; videoCount: number }> {
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
        limit: 1,
        key: AUTH_KEY,
      }),
    })
    if (!res.ok) return { postCount: 0, videoCount: 0 }
    const data = await res.json()
    const posts = data?.data ?? []
    // The API returns total in different ways; we fetch a bigger batch to count
    // Actually let's fetch up to 200 to get real count
    const res2 = await fetch(`${API_BASE}/posts/getUserPost`, {
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
        limit: 200,
        key: AUTH_KEY,
      }),
    })
    if (!res2.ok) return { postCount: posts.length, videoCount: 0 }
    const data2 = await res2.json()
    const allPosts = (data2?.data ?? []).filter((p: any) => !p.isDeleted && !p.isHided)
    const videoCount = allPosts.filter((p: any) => p.type === 'Video').length
    return { postCount: allPosts.length, videoCount }
  } catch {
    return { postCount: 0, videoCount: 0 }
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

    // Get params
    const url = new URL(req.url)
    const offset = parseInt(url.searchParams.get('offset') || '0')
    const limit = parseInt(url.searchParams.get('limit') || '50')

    // Fetch creators from DB
    const { data: creators, error, count } = await sb
      .from('creators')
      .select('official_id, username, name', { count: 'exact' })
      .order('updated_at', { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) throw error

    const results: { id: string; name: string; postCount: number; videoCount: number; status: string }[] = []

    // Process in batches
    for (let i = 0; i < creators.length; i += BATCH_SIZE) {
      const batch = creators.slice(i, i + BATCH_SIZE)
      const batchResults = await Promise.allSettled(
        batch.map(async (c) => {
          const { postCount, videoCount } = await fetchPostCount(c.official_id)
          // Update DB
          await sb.from('creators').update({
            post_count: postCount,
            video_count: videoCount,
            updated_at: new Date().toISOString(),
          }).eq('official_id', c.official_id)

          return { id: c.official_id, name: c.name || c.username, postCount, videoCount, status: 'ok' }
        })
      )

      for (const r of batchResults) {
        if (r.status === 'fulfilled') results.push(r.value)
        else results.push({ id: 'unknown', name: 'error', postCount: 0, videoCount: 0, status: 'failed' })
      }

      if (i + BATCH_SIZE < creators.length) await sleep(DELAY_MS)
    }

    return new Response(JSON.stringify({
      processed: results.length,
      total: count,
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
