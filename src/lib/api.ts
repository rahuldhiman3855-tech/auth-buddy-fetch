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
const ADMIN_USER_ID = "6144858b2f03d06a7dd008e4";

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
      key: "d41d8cd98f00b204e9800998ecf8427e",
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
