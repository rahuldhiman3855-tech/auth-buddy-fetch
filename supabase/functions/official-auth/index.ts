const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const API_BASE = 'https://api.official.me';
const AUTH_KEY = 'd41d8cd98f00b204e9800998ecf8427e';

// Cache tokens by type
const tokenCache: Record<string, { token: string; expiry: number }> = {};

async function getToken(userType: 'user' | 'influencer' | 'agency'): Promise<string> {
  const now = Date.now();
  const cached = tokenCache[userType];
  if (cached && now < cached.expiry) return cached.token;

  const accounts: Record<string, { email: string; password: string; username: string }> = {
    user: { email: 'dehad34999@exespay.com', password: 'Rdman@100%', username: 'admin' },
    influencer: { email: 'lovableadmin1@proton.me', password: 'Admin@12345', username: 'lovableadmin1' },
    agency: { email: 'lovableagency1@proton.me', password: 'Admin@12345', username: 'lovableagency1' },
  };

  const acc = accounts[userType];
  const isInfluencer = userType === 'influencer';

  // Use /login for influencer/agency, /doUserLoginOrSignup for user
  const endpoint = isInfluencer || userType === 'agency'
    ? `${API_BASE}/login`
    : `${API_BASE}/doUserLoginOrSignup`;

  const body = isInfluencer || userType === 'agency'
    ? { email: acc.email, password: acc.password, influencerUsername: acc.username }
    : { email: acc.email, password: acc.password, userType: 'user', key: AUTH_KEY, influencerUsername: acc.username };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'accept': 'application/json', 'content-type': 'application/json', 'x-off-country-code': 'IN' },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Login failed [${res.status}]`);
  const data = await res.json();

  const token = data?.accessToken || data?.savedUserData?.accessToken;
  if (!token) throw new Error('No token in response');

  tokenCache[userType] = { token, expiry: now + 50 * 60 * 1000 };
  return token;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    if (action === 'token') {
      const type = (url.searchParams.get('type') || 'influencer') as 'user' | 'influencer' | 'agency';
      const token = await getToken(type);
      return new Response(JSON.stringify({ token, userType: type }), {
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

    // Determine which token to use based on endpoint
    let tokenType: 'user' | 'influencer' | 'agency' = 'influencer';
    const reqType = url.searchParams.get('auth');
    if (reqType === 'user' || reqType === 'agency') tokenType = reqType;
    if (apiPath.startsWith('/admin/')) tokenType = 'influencer'; // best we have

    const token = await getToken(tokenType);
    const method = req.method;
    let body: string | undefined;
    if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
      body = await req.text();
    }

    const apiRes = await fetch(`${API_BASE}${apiPath}`, {
      method,
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'x-off-country-code': 'IN',
        'Authorization': `bearer ${token}`,
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
