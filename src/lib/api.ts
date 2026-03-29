const API_BASE = "https://api.official.me";

const defaultHeaders: Record<string, string> = {
  accept: "application/json, text/plain, */*",
  "content-type": "application/json",
  "x-off-country-code": "IN",
};

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export interface InfluencerData {
  _id: string;
  username: string;
  name: string;
  profilePic: string;
  coverPic?: string;
  bio?: string;
  category?: string;
  followerCount?: number;
  followingCount?: number;
  postCount?: number;
  isVerified?: boolean;
  socialLinks?: Record<string, string>;
  [key: string]: unknown;
}

export interface PostData {
  _id: string;
  title?: string;
  description?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  mediaType?: string;
  likeCount?: number;
  commentCount?: number;
  viewCount?: number;
  createdAt?: string;
  isPremium?: boolean;
  [key: string]: unknown;
}

export async function getInfluencer(username: string): Promise<InfluencerData> {
  const res = await apiFetch<{ data: InfluencerData }>(`/influencer/${username}`);
  return res.data;
}

export async function getInfluencerPosts(
  influencerId: string,
  skip = 0,
  limit = 20
): Promise<PostData[]> {
  const res = await apiFetch<{ data: PostData[] }>("/posts/getUserPost", {
    method: "POST",
    body: JSON.stringify({
      isLogin: "false",
      influencerId,
      userId: "6144858b2f03d06a7dd008e4",
      skip,
      limit,
      key: "d41d8cd98f00b204e9800998ecf8427e",
    }),
  });
  return res.data ?? [];
}
