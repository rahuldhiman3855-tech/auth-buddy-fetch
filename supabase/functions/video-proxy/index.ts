const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Cache cookies in memory (edge function instance lifetime)
let cachedCookies: string | null = null;
let cookieExpiry = 0;

async function fetchCloudFrontCookies(): Promise<string> {
  const now = Date.now();
  if (cachedCookies && now < cookieExpiry) {
    return cachedCookies;
  }

  const res = await fetch('https://api.official.me/api/status', {
    headers: {
      'accept': 'application/json, text/plain, */*',
      'content-type': 'application/json',
      'x-off-country-code': 'IN',
      'Origin': 'https://official.me',
      'Referer': 'https://official.me/',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    },
  });

  const setCookieHeaders = res.headers.getSetCookie?.() ?? [];
  
  if (setCookieHeaders.length === 0) {
    // Try parsing from raw header
    const raw = res.headers.get('set-cookie');
    if (raw) {
      // Extract cookie key=value pairs
      const cookies = raw.split(/,(?=\s*\w+=)/).map(c => c.split(';')[0].trim()).join('; ');
      cachedCookies = cookies;
      cookieExpiry = now + 25 * 60 * 1000; // 25 min
      return cachedCookies;
    }
    throw new Error('No cookies returned from /api/status');
  }

  // Extract just the key=value from each Set-Cookie header
  const cookies = setCookieHeaders.map(c => c.split(';')[0].trim()).join('; ');
  cachedCookies = cookies;
  cookieExpiry = now + 25 * 60 * 1000;
  return cachedCookies;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const videoUrl = url.searchParams.get('url');

    if (!videoUrl) {
      return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate it's a cdn.official.me URL
    const parsed = new URL(videoUrl);
    if (!parsed.hostname.endsWith('official.me')) {
      return new Response(JSON.stringify({ error: 'Invalid URL domain' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const cookies = await fetchCloudFrontCookies();

    // Support range requests for video seeking
    const fetchHeaders: Record<string, string> = {
      'Cookie': cookies,
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      'Referer': 'https://official.me/',
      'Origin': 'https://official.me',
    };

    const rangeHeader = req.headers.get('range');
    if (rangeHeader) {
      fetchHeaders['Range'] = rangeHeader;
    }

    const videoRes = await fetch(videoUrl, { headers: fetchHeaders });

    const responseHeaders: Record<string, string> = {
      ...corsHeaders,
      'Content-Type': videoRes.headers.get('content-type') || 'video/mp4',
      'Accept-Ranges': 'bytes',
    };

    const contentLength = videoRes.headers.get('content-length');
    if (contentLength) responseHeaders['Content-Length'] = contentLength;

    const contentRange = videoRes.headers.get('content-range');
    if (contentRange) responseHeaders['Content-Range'] = contentRange;

    return new Response(videoRes.body, {
      status: videoRes.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('Video proxy error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
