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

async function checkUsername(username: string): Promise<any | null> {
  try {
    const res = await fetch(`${API_BASE}/influencer/${username}`, { headers: defaultHeaders });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.data?._id) {
      const d = data.data;
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { usernames } = await req.json();
    
    if (!Array.isArray(usernames) || usernames.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Provide an array of usernames' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Limit batch size
    const batch = usernames.slice(0, 50);
    
    // Check all usernames in parallel with small delay groups
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
      
      // Small delay between chunks
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
