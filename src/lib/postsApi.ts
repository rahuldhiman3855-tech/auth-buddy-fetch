import { supabase } from "@/integrations/supabase/client";

export interface StoredPost {
  id: string;
  official_id: string;
  creator_id: string;
  creator_username: string | null;
  creator_name: string | null;
  creator_profile_pic: string | null;
  content: string | null;
  category: string | null;
  type: string | null;
  price: number | null;
  duration: number | null;
  file_size_mb: number | null;
  thumbnail_url: string | null;
  media_url: string | null;
  location: string | null;
  post_date: string | null;
  created_at: string | null;
  view_count: number | null;
  like_count: number | null;
  is_premium: boolean | null;
}

export interface PostFilterParams {
  offset: number;
  limit: number;
  type?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  minDuration?: number;
  maxDuration?: number;
  sortBy?: string;
  isPremium?: boolean;
}

export async function getStoredPosts(params: PostFilterParams): Promise<{ data: StoredPost[]; count: number }> {
  let query = supabase
    .from("posts")
    .select("*", { count: "exact" });

  if (params.type && params.type !== "all") {
    query = query.eq("type", params.type);
  }

  if (params.search) {
    query = query.ilike("content", `%${params.search}%`);
  }

  if (params.dateFrom) {
    query = query.gte("post_date", params.dateFrom);
  }

  if (params.dateTo) {
    query = query.lte("post_date", params.dateTo);
  }

  if (params.minDuration) {
    query = query.gte("duration", params.minDuration);
  }

  if (params.maxDuration) {
    query = query.lte("duration", params.maxDuration);
  }

  if (params.isPremium !== undefined) {
    query = query.eq("is_premium", params.isPremium);
  }

  // Sorting
  switch (params.sortBy) {
    case "date_asc":
      query = query.order("post_date", { ascending: true });
      break;
    case "size_desc":
      query = query.order("file_size_mb", { ascending: false });
      break;
    case "views_desc":
      query = query.order("view_count", { ascending: false });
      break;
    case "duration_desc":
      query = query.order("duration", { ascending: false });
      break;
    case "duration_asc":
      query = query.order("duration", { ascending: true });
      break;
    default:
      query = query.order("post_date", { ascending: false });
  }

  query = query.range(params.offset, params.offset + params.limit - 1);

  const { data, count, error } = await query;
  if (error) throw error;
  return { data: (data as StoredPost[]) ?? [], count: count ?? 0 };
}

export async function getPostStats(): Promise<{ total: number; videos: number; images: number; creators: number }> {
  const { count: total } = await supabase.from("posts").select("*", { count: "exact", head: true });
  const { count: videos } = await supabase.from("posts").select("*", { count: "exact", head: true }).eq("type", "Video");
  const { count: images } = await supabase.from("posts").select("*", { count: "exact", head: true }).eq("type", "Image");
  
  // Get distinct creators - paginate to avoid 1000-row cap
  const allCreatorIds = new Set<string>();
  let creatorOffset = 0;
  const CHUNK = 1000;
  while (true) {
    const { data: chunk } = await supabase
      .from("posts")
      .select("creator_id")
      .range(creatorOffset, creatorOffset + CHUNK - 1);
    if (!chunk || chunk.length === 0) break;
    chunk.forEach(r => allCreatorIds.add(r.creator_id));
    if (chunk.length < CHUNK) break;
    creatorOffset += CHUNK;
  }

  return {
    total: total ?? 0,
    videos: videos ?? 0,
    images: images ?? 0,
    creators: allCreatorIds.size,
  };
}
