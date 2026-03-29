import { OFFICIAL_API } from "./constants";

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
