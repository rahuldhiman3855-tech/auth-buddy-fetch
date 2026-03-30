import { useState, useEffect, useCallback, useRef } from "react";
import Navbar from "@/components/Navbar";
import { Link, useSearchParams } from "react-router-dom";
import {
  formatCount, formatDuration, decodeContent,
  getInfluencerPosts, getStoredCreators,
  type PostData, type StoredCreator,
} from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import {
  Search, Video, Image, Loader2, Play, Eye, Heart, Clock, Download,
  HardDrive, Filter, X, Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PAGE_SIZE = 12;
const PROXY_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/video-proxy`;

function proxyUrl(url?: string | null, options: { alt?: string | null; download?: boolean } = {}): string {
  const params = new URLSearchParams();
  if (url) params.set("url", url);
  if (options.alt) params.set("alt", options.alt);
  if (options.download) params.set("download", "true");
  return params.size > 0 ? `${PROXY_BASE}?${params.toString()}` : "";
}

function deriveOriginalMediaUrl(thumbnailUrl?: string | null): string {
  if (!thumbnailUrl) return "";
  const match = thumbnailUrl.match(/\/media\/(.+)\.jpg$/);
  return match ? `https://cdn.official.me/media/${match[1]}` : "";
}

function getMediaCandidates(post: Pick<PostData, "location" | "mediaUrl" | "thumbnailLocation" | "thumbnailUrl">) {
  const current = post.location || post.mediaUrl || "";
  const original = deriveOriginalMediaUrl(post.thumbnailLocation || post.thumbnailUrl || "");

  if (current.includes("/media/compressed/")) {
    return { primary: original || current, fallback: current };
  }

  return {
    primary: current || original,
    fallback: original && original !== current ? original : "",
  };
}

function getThumbnailProxyUrl(post: Pick<PostData, "thumbnailLocation" | "thumbnailUrl">): string {
  const thumb = post.thumbnailLocation || post.thumbnailUrl || "";
  return thumb ? proxyUrl(thumb) : "";
}

function getPlayableMediaProxyUrl(post: Pick<PostData, "location" | "mediaUrl" | "thumbnailLocation" | "thumbnailUrl">): string {
  const { primary, fallback } = getMediaCandidates(post);
  return primary ? proxyUrl(primary, { alt: fallback }) : "";
}

function getDownloadProxyUrl(post: Pick<PostData, "location" | "mediaUrl" | "thumbnailLocation" | "thumbnailUrl">): string {
  const { primary, fallback } = getMediaCandidates(post);
  return primary ? proxyUrl(primary, { alt: fallback, download: true }) : "";
}

/** Upsert a batch of API posts into the DB in the background */
function cachePostsToDB(posts: PostData[], creator: StoredCreator) {
  const rows = posts
    .filter(p => !p.isDeleted && !p.isHided)
    .map(p => ({
      official_id: p._id,
      creator_id: creator.official_id,
      creator_username: creator.username,
      creator_name: creator.name,
      creator_profile_pic: creator.profile_pic,
      content: decodeContent(p.content),
      category: p.category || null,
      type: p.type || null,
      price: p.price ?? 0,
      duration: p.duration ?? 0,
      file_size_mb: p.fileSizeInMB ?? 0,
      thumbnail_url: p.thumbnailLocation || p.thumbnailUrl || null,
      media_url: p.mediaUrl || null,
      location: p.location || null,
      post_date: p.date || p.created_at || null,
      view_count: p.viewCount ?? 0,
      like_count: p.likeCount ?? (p.likes?.length ?? 0),
      is_premium: p.isPremium ?? false,
    }));
  if (rows.length > 0) {
    supabase.from("posts").upsert(rows, { onConflict: "official_id" }).then(() => {});
  }
}

interface FeedPost extends PostData {
  _creator: StoredCreator;
}

function FeedPostCard({ post, onPlay }: { post: FeedPost; onPlay: (p: FeedPost) => void }) {
  const thumb = getThumbnailProxyUrl(post);
  const title = decodeContent(post.content) || "Untitled";
  const duration = formatDuration(post.duration);
  const creator = post._creator;
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(()(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { rootMargin: "200px" });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      onClick={() => onPlay(post)}
      className="group relative flex flex-col overflow-hidden rounded-xl bg-card border border-border shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-muted">
        {visible && thumb ? (
          <img
            src={thumb}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
            <Play className="h-10 w-10" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/90 shadow-lg">
            <Play className="h-6 w-6 text-primary-foreground ml-0.5" fill="currentColor" />
          </div>
        </div>

        {duration && (
          <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/70 px-2 py-0.5 text-xs font-medium text-white">
            <Clock className="h-3 w-3" />{duration}
          </span>
        )}

        {(post.location || post.mediaUrl || post.thumbnailLocation || post.thumbnailUrl) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              window.open(getDownloadProxyUrl(post), "_blank");
            }}
            className="absolute top-2 left-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-primary transition-colors opacity-0 group-hover:opacity-100"
            title="Download"
          >
            <Download className="h-4 w-4" />
          </button>
        )}

        <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
          {post.type && (
            <span className="rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
              {post.type}
            </span>
          )}
          {post.fileSizeInMB && post.fileSizeInMB > 0 && (
            <span className="flex items-center gap-1 rounded-md bg-emerald-600/80 px-2 py-0.5 text-[10px] font-semibold text-white">
              <HardDrive className="h-2.5 w-2.5" />
              {post.fileSizeInMB >= 1 ? `${post.fileSizeInMB.toFixed(1)} MB` : `${(post.fileSizeInMB * 1024).toFixed(0)} KB`}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5 p-3">
        <Link
          to={`/creator/${creator.username}`}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          {creator.profile_pic ? (
            <img src={creator.profile_pic} alt="" className="h-6 w-6 rounded-full object-cover ring-1 ring-primary/20" />
          ) : (
            <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
              {(creator.name || "?")[0]?.toUpperCase()}
            </div>
          )}
          <span className="text-xs text-muted-foreground truncate">{creator.name || creator.username}</span>
        </Link>

        <h3 className="text-sm font-semibold text-card-foreground line-clamp-2 leading-tight">{title}</h3>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {(post.viewCount ?? 0) > 0 && (
            <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{formatCount(post.viewCount)}</span>
          )}
          {post.likes && post.likes.length > 0 && (
            <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" />{formatCount(post.likes.length)}</span>
          )}
          {post.date && (
            <span>{new Date(post.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Index() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [creators, setCreators] = useState<StoredCreator[]>([]);
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [creatorPage, setCreatorPage] = useState(0);
  const [hasMoreCreators, setHasMoreCreators] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [typeFilter, setTypeFilter] = useState(searchParams.get("type") || "all");

  const [activePost, setActivePost] = useState<FeedPost | null>(null);
  const [activeMediaUrl, setActiveMediaUrl] = useState("");
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  const CREATORS_PER_BATCH = 5;

  // Load a batch of creators and fetch their posts from the API
  const loadBatch = useCallback(async (creatorsToLoad: StoredCreator[], append: boolean) => {
    const allNewPosts: FeedPost[] = [];

    await Promise.allSettled(
      creatorsToLoad.map(async (creator) => {
        try {
          const posts = await getInfluencerPosts(creator.official_id, 0, PAGE_SIZE);
          const feedItems: FeedPost[] = posts
            .filter(p => !p.isDeleted && !p.isHided)
            .filter(p => typeFilter === "all" || p.type === typeFilter)
            .filter(p => {
              if (!searchQuery) return true;
              const title = decodeContent(p.content) || "";
              return title.toLowerCase().includes(searchQuery.toLowerCase());
            })
            .map(p => ({ ...p, _creator: creator }));
          allNewPosts.push(...feedItems);
          // Cache to DB in background
          cachePostsToDB(posts, creator);
        } catch (e) {
          console.error(`Failed to load posts for ${creator.username}:`, e);
        }
      })
    );

    // Sort by date descending
    allNewPosts.sort((a, b) => {
      const da = a.date || a.created_at || "";
      const db = b.date || b.created_at || "";
      return db.localeCompare(da);
    });

    setFeedPosts(prev => append ? [...prev, ...allNewPosts] : allNewPosts);
  }, [typeFilter, searchQuery]);

  // Initial load: get creators then fetch their posts
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data: creatorsData, count } = await getStoredCreators(0, CREATORS_PER_BATCH);
        if (cancelled) return;
        setCreators(creatorsData);
        setCreatorPage(1);
        setHasMoreCreators(creatorsData.length < count);
        await loadBatch(creatorsData, false);
      } catch (e) {
        console.error("Failed to load feed:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [typeFilter, searchQuery]); // Re-fetch when filters change

  // Load more creators on scroll or button click
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMoreCreators) return;
    setLoadingMore(true);
    try {
      const offset = creatorPage * CREATORS_PER_BATCH;
      const { data: moreCreators, count } = await getStoredCreators(offset, CREATORS_PER_BATCH);
      if (moreCreators.length === 0) {
        setHasMoreCreators(false);
        return;
      }
      setCreators(prev => [...prev, ...moreCreators]);
      setCreatorPage(prev => prev + 1);
      setHasMoreCreators(offset + moreCreators.length < count);
      await loadBatch(moreCreators, true);
    } finally {
      setLoadingMore(false);
    }
  }, [creatorPage, loadingMore, hasMoreCreators, loadBatch]);

  // Intersection observer for infinite scroll (optional, can be removed if only button is desired)
  useEffect(() => {
    if (!loadMoreRef.current) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) loadMore();
    }, { threshold: 0.1 });
    obs.observe(loadMoreRef.current);
    return () => obs.disconnect();
  }, [loadMore]);

  const handleSearchChange = (val: string) => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setSearchQuery(val);
      const params: Record<string, string> = {};
      if (val) params.q = val;
      if (typeFilter !== "all") params.type = typeFilter;
      setSearchParams(params);
    }, 500);
  };

  const handlePlayPost = (post: FeedPost) => {
    setActivePost(post);
    setActiveMediaUrl(getPlayableMediaProxyUrl(post));
  };

  const clearFilters = () => {
    setSearchQuery("");
    setTypeFilter("all");
    setSearchParams({});
  };

  const hasFilters = searchQuery || typeFilter !== "all";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-6 space-y-4">
        {/* Search + Filters */}
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search posts by title..."
              defaultValue={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border border-border p-1 bg-muted/50">
              {[
                { value: "all", label: "All", icon: Filter },
                { value: "Video", label: "Video", icon: Video },
                { value: "Image", label: "Image", icon: Image },
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => {
                    setTypeFilter(value);
                    const params: Record<string, string> = {};
                    if (searchQuery) params.q = searchQuery;
                    if (value !== "all") params.type = value;
                    setSearchParams(params);
                  }}
                  className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    typeFilter === value
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-background"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />{label}
                </button>
              ))}
            </div>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs">
                <X className="h-3.5 w-3.5 mr-1" /> Clear
              </Button>
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          {feedPosts.length} posts from {creators.length} creators
        </p>

        {/* Posts Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : feedPosts.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Play className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No posts found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {feedPosts.map((post) => (
              <FeedPostCard key={post._id} post={post} onPlay={handlePlayPost} />
            ))}
          </div>
        )}

        {/* Load More Button */}
        <div className="flex items-center justify-center py-8">
          {loadingMore ? (
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          ) : hasMoreCreators ? (
            <Button
              onClick={loadMore}
              variant="outline"
              className="gap-2"
            >
              <HardDrive className="h-4 w-4" />
              Load More
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">All creators loaded</p>
          )}
        </div>

        {/* Infinite scroll trigger (optional, can be removed if only button is desired) */}
        <div ref={loadMoreRef} className="h-4" />
      </main>

      {/* Media Modal */}
      {activePost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => { setActivePost(null); setActiveMediaUrl(""); }}
        >
          <div className="relative w-full max-w-4xl mx-4" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => { setActivePost(null); setActiveMediaUrl(""); }}
              className="absolute -top-10 right-0 text-white hover:text-primary transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
            <div className="rounded-xl overflow-hidden bg-black">
              {activeMediaUrl ? (
                activePost.type === "Video" ? (
                  <video
                    src={activeMediaUrl}
                    controls
                    autoPlay
                    className="w-full max-h-[80vh]"
                    poster={getThumbnailProxyUrl(activePost)}
                  />
                ) : (
                  <img
                    src={activeMediaUrl}
                    alt={decodeContent(activePost.content)}
                    className="w-full max-h-[80vh] object-contain"
                  />
                )
              ) : (
                <div className="flex items-center justify-center py-32 text-muted-foreground">
                  <p>No media available</p>
                </div>
              )}
            </div>
            <div className="mt-3 flex items-center gap-3">
              {activePost._creator.profile_pic && (
                <img src={activePost._creator.profile_pic} className="h-8 w-8 rounded-full object-cover" alt="" />
              )}
              <div>
                <p className="text-sm text-white/90 line-clamp-1">{decodeContent(activePost.content)}</p>
                <Link
                  to={`/creator/${activePost._creator.username}`}
                  className="text-xs text-primary hover:underline"
                  onClick={() => { setActivePost(null); setActiveMediaUrl(""); }}
                >
                  {activePost._creator.name || activePost._creator.username}
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="border-t border-border bg-card mt-12">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-1">
              <span className="text-xl font-black italic text-primary">O</span>
              <span className="text-sm font-bold text-foreground">fficial.me</span>
            </div>
            <p className="text-xs text-muted-foreground">© 2026 Official.me — Admin Panel</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
