import { OFFICIAL_API } from "./constants";
import { supabase } from "@/integrations/supabase/client";
const API_BASE = OFFICIAL_API.BASE_URL;
const AUTH_PROXY_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/official-auth`;

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

/** Make an authenticated API call through the auth proxy */
async function authFetch<T>(
  apiPath: string,
  options: RequestInit = {}
): Promise<T> {
  const method = options.method || "GET";
  const url = `${AUTH_PROXY_BASE}?path=${encodeURIComponent(apiPath)}`;
  const res = await fetch(url, {
    method,
    headers: {
      "content-type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: options.body,
  });
  if (!res.ok) throw new Error(`Auth API error: ${res.status}`);
  return res.json();
}

export interface InfluencerData {
  _id: string;
  username: string;
  name: string;
  userProfileImage?: string;
  profilePic?: string;
  coverPic?: string;
  userBio?: string;
  bio?: string;
  category?: string;
  followerCount?: number;
  videoCount?: number;
  imageCount?: number;
  audioCount?: number;
  postCount?: number;
  isVerified?: boolean;
  isVerifiedEmail?: boolean;
  instagram?: string;
  facebook?: string;
  twitter?: string;
  linkedin?: string;
  subscriptionDetails?: Array<{
    _id: string;
    packType: string;
    charge_description: string;
    amount: number;
  }>;
  [key: string]: unknown;
}

export interface PostData {
  _id: string;
  content?: string; // URL-encoded HTML
  category?: string; // "private" | "public"
  type?: string; // "Video" | "Image"
  price?: number;
  duration?: number; // in seconds
  location?: string; // video URL
  thumbnailLocation?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  likeCount?: number;
  likes?: unknown[];
  commentCount?: number;
  viewCount?: number;
  date?: string;
  created_at?: string;
  isPremium?: boolean;
  isHided?: boolean;
  isDeleted?: boolean;
  fileSizeInMB?: number;
  compressedfileSizeInMB?: number;
  [key: string]: unknown;
}

// Admin user ID with full access
const ADMIN_USER_ID = OFFICIAL_API.ADMIN_USER_ID;

export async function getInfluencer(username: string): Promise<InfluencerData> {
  const res = await apiFetch<{ status: boolean; data: InfluencerData }>(`/influencer/${username}`);
  return res.data;
}

export async function getInfluencerPosts(
  influencerId: string,
  skip = 0,
  limit = 20
): Promise<PostData[]> {
  const res = await apiFetch<{ status: boolean; data: PostData[]; currencySymbol?: string }>("/posts/getUserPost", {
    method: "POST",
    body: JSON.stringify({
      isLogin: "false",
      influencerId,
      userId: ADMIN_USER_ID,
      skip,
      limit,
      key: OFFICIAL_API.AUTH_KEY,
    }),
  });
  return res.data ?? [];
}

/** Get all posts using authenticated admin endpoint */
export async function getAllPosts(
  influencerId: string,
  skip = 0,
  limit = 8
): Promise<PostData[]> {
  try {
    const res = await authFetch<{ status: boolean; data: PostData[] }>(
      `/posts/getAllPost/${influencerId}/${skip}/${limit}`,
      { method: "GET" }
    );
    return res.data ?? [];
  } catch {
    // Fallback to public endpoint
    return getInfluencerPosts(influencerId, skip, limit);
  }
}

/** Decode URL-encoded HTML content to plain text */
export function decodeContent(content?: string): string {
  if (!content) return "";
  try {
    const decoded = decodeURIComponent(content);
    return decoded.replace(/<[^>]*>/g, "").trim();
  } catch {
    return content.replace(/<[^>]*>/g, "").trim();
  }
}

/** Format duration from seconds to mm:ss */
export function formatDuration(seconds?: number): string {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatCount(num: number | undefined): string {
  if (!num) return "0";
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
}

/** Save or update a creator in the local database */
export async function saveCreatorToDB(data: InfluencerData): Promise<void> {
  try {
    const postCount = data.postCount || 0;
    // Skip creators with zero posts
    if (postCount === 0) return;
    
    await supabase.from("creators").upsert({
      official_id: data._id,
      username: data.username,
      name: data.name || data.username,
      profile_pic: data.userProfileImage || data.profilePic,
      cover_pic: data.coverPic,
      bio: data.userBio || data.bio,
      category: data.category,
      follower_count: data.followerCount || 0,
      video_count: data.videoCount || 0,
      post_count: postCount,
      is_verified: data.isVerified || false,
      updated_at: new Date().toISOString(),
    }, { onConflict: "official_id" });
  } catch (e) {
    console.error("Failed to save creator:", e);
  }
}

export interface StoredCreator {
  id: string;
  official_id: string;
  username: string;
  name: string;
  profile_pic: string | null;
  cover_pic: string | null;
  bio: string | null;
  category: string | null;
  follower_count: number;
  video_count: number;
  post_count: number;
  is_verified: boolean;
  discovered_at: string;
  updated_at: string;
}

/** Get all stored creators from the database */
export async function getStoredCreators(
  offset = 0,
  limit = 20
): Promise<{ data: StoredCreator[]; count: number }> {
  const { data, count, error } = await supabase
    .from("creators")
    .select("*", { count: "exact" })
    .order("discovered_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return { data: (data as StoredCreator[]) ?? [], count: count ?? 0 };
}

/** Bulk discover creators via edge function */
export async function bulkDiscoverCreators(usernames: string[]): Promise<InfluencerData[]> {
  try {
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/discover-creators`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ usernames }),
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const found: InfluencerData[] = data.data ?? [];
    // Save all to DB in parallel
    await Promise.allSettled(found.map(c => saveCreatorToDB(c)));
    return found;
  } catch {
    return [];
  }
}

/** Search and discover a creator, saving to DB */
export async function discoverCreator(username: string): Promise<InfluencerData | null> {
  try {
    const data = await getInfluencer(username);
    if (data?._id) {
      await saveCreatorToDB(data);
      return data;
    }
    return null;
  } catch {
    return null;
  }
}
