const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Cache the auth token in memory
let cachedToken: string | null = null;
let tokenExpiry = 0;

async function getAuthToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry) {
    return cachedToken;
  }

  const rawEmail = Deno.env.get('OFFICIAL_ADMIN_EMAIL');
  const rawPassword = Deno.env.get('OFFICIAL_ADMIN_PASSWORD');
  const email = (rawEmail && rawEmail !== 'na') ? rawEmail : 'dehad34999@exespay.com';
  const password = (rawPassword && rawPassword !== 'na') ? rawPassword : 'Rdman@100%';

  if (!email || !password) {
    throw new Error('Admin credentials not configured');
  }

  const res = await fetch('https://api.official.me/doUserLoginOrSignup', {
    method: 'POST',
    headers: {
      'accept': 'application/json, text/plain, */*',
      'content-type': 'application/json',
      'x-off-country-code': 'IN',
    },
    body: JSON.stringify({
      email,
      password,
      userType: 'user',
      key: 'd41d8cd98f00b204e9800998ecf8427e',
      influencerUsername: 'pankhurikunall',
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Login failed [${res.status}]: ${text}`);
  }

  const data = await res.json();
  const token = data?.savedUserData?.accessToken || data?.data?.accessToken || data?.accessToken || data?.token;

  if (!token) {
    throw new Error('No token in login response: ' + JSON.stringify(data));
  }

  cachedToken = token;
  tokenExpiry = now + 55 * 60 * 1000; // 55 min cache
  return cachedToken!;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    if (action === 'token') {
      // Return the cached/fresh token
      const token = await getAuthToken();
      return new Response(JSON.stringify({ token }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Proxy any API call with auth
    const apiPath = url.searchParams.get('path');
    if (!apiPath) {
      return new Response(JSON.stringify({ error: 'Missing path parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = await getAuthToken();
    const method = req.method;
    let body: string | undefined;
    if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
      body = await req.text();
    }

    const apiRes = await fetch(`https://api.official.me${apiPath}`, {
      method,
      headers: {
        'accept': 'application/json, text/plain, */*',
        'content-type': 'application/json',
        'x-off-country-code': 'IN',
        'Authorization': `Bearer ${token}`,
        'x-access-token': token,
      },
      body,
    });

    const responseData = await apiRes.text();
    return new Response(responseData, {
      status: apiRes.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Official auth error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
