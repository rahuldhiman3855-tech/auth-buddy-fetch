const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

let cachedCookies: string | null = null;
let cookieExpiry = 0;

async function fetchCloudFrontCookies(): Promise<string> {
  const now = Date.now();
  if (cachedCookies && now < cookieExpiry) return cachedCookies;

  const res = await fetch('https://api.official.me/api/status', {
    headers: {
      accept: 'application/json, text/plain, */*',
      'content-type': 'application/json',
      'x-off-country-code': 'IN',
      Origin: 'https://official.me',
      Referer: 'https://official.me/',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    },
  });

  const setCookieHeaders = res.headers.getSetCookie?.() ?? [];
  if (setCookieHeaders.length === 0) {
    const raw = res.headers.get('set-cookie');
    if (raw) {
      const cookies = raw.split(/,(?=\s*\w+=)/).map((c) => c.split(';')[0].trim()).join('; ');
      cachedCookies = cookies;
      cookieExpiry = now + 25 * 60 * 1000;
      return cachedCookies;
    }
    throw new Error('No cookies returned from /api/status');
  }

  cachedCookies = setCookieHeaders.map((c) => c.split(';')[0].trim()).join('; ');
  cookieExpiry = now + 25 * 60 * 1000;
  return cachedCookies;
}

function getValidatedCandidate(rawUrl: string | null): string | null {
  if (!rawUrl) return null;
  const parsed = new URL(rawUrl);
  if (!parsed.hostname.endsWith('official.me')) {
    throw new Error('Invalid URL domain');
  }
  return parsed.toString();
}

function getFilenameFromUrl(rawUrl: string): string {
  const pathname = new URL(rawUrl).pathname;
  return pathname.split('/').pop() || 'media-file';
}

async function fetchFirstWorkingResponse(urls: string[], headers: Record<string, string>) {
  let lastStatus = 500;

  for (const targetUrl of urls) {
    const response = await fetch(targetUrl, { headers });
    lastStatus = response.status;
    const contentType = response.headers.get('content-type') || '';

    if (response.ok && !contentType.includes('text/html')) {
      return { response, targetUrl };
    }
  }

  throw new Error(`No working media URL found (last status: ${lastStatus})`);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const primaryUrl = getValidatedCandidate(url.searchParams.get('url'));
    const altUrl = getValidatedCandidate(url.searchParams.get('alt'));
    const download = url.searchParams.get('download') === 'true';

    if (!primaryUrl) {
      return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const cookies = await fetchCloudFrontCookies();
    const fetchHeaders: Record<string, string> = {
      Cookie: cookies,
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      Referer: 'https://official.me/',
      Origin: 'https://official.me',
    };

    const rangeHeader = req.headers.get('range');
    if (rangeHeader) fetchHeaders.Range = rangeHeader;

    const candidates = [...new Set([primaryUrl, altUrl].filter(Boolean) as string[])];
    const { response: mediaRes, targetUrl } = await fetchFirstWorkingResponse(candidates, fetchHeaders);

    const responseHeaders: Record<string, string> = {
      ...corsHeaders,
      'Content-Type': mediaRes.headers.get('content-type') || 'application/octet-stream',
      'Accept-Ranges': 'bytes',
    };

    const contentLength = mediaRes.headers.get('content-length');
    if (contentLength) responseHeaders['Content-Length'] = contentLength;

    const contentRange = mediaRes.headers.get('content-range');
    if (contentRange) responseHeaders['Content-Range'] = contentRange;

    if (download) {
      responseHeaders['Content-Disposition'] = `attachment; filename="${getFilenameFromUrl(targetUrl)}"`;
    }

    return new Response(mediaRes.body, {
      status: mediaRes.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('Video proxy error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
