import { useState, useEffect, useCallback, useRef } from "react";
import Navbar from "@/components/Navbar";
import SyncProgressPanel from "@/components/SyncProgressPanel";
import { Link, useSearchParams } from "react-router-dom";
import { formatCount, formatDuration, decodeContent, fetchPostMediaUrl } from "@/lib/api";
import { getStoredPosts, getPostStats, type StoredPost } from "@/lib/postsApi";
import {
  Search, Video, Image, Loader2, ChevronLeft, ChevronRight, RefreshCw,
  Play, Eye, Heart, Clock, Download, HardDrive, Filter, X, Calendar,
  BarChart3, Film, ImageIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const PAGE_SIZE = 24;
const PROXY_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/video-proxy`;

function proxyUrl(url?: string | null): string {
  if (!url) return "";
  return `${PROXY_BASE}?url=${encodeURIComponent(url)}`;
}

function FeedPostCard({ post, onPlay }: { post: StoredPost; onPlay: (p: StoredPost) => void }) {
  const thumb = proxyUrl(post.thumbnail_url);
  const title = post.content || "Untitled";
  const duration = post.duration ? formatDuration(post.duration) : "";

  return (
    <div
      onClick={() => onPlay(post)}
      className="group relative flex flex-col overflow-hidden rounded-xl bg-card border border-border shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-muted">
        {thumb ? (
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
            <Clock className="h-3 w-3" />
            {duration}
          </span>
        )}

        {(post.location || post.media_url) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              const mediaUrl = post.location || post.media_url || '';
              const a = document.createElement('a');
              a.href = proxyUrl(mediaUrl);
              a.download = `${post.content || post.official_id}.${post.type === 'Video' ? 'mp4' : 'jpg'}`;
              a.target = '_blank';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
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
          {post.file_size_mb && post.file_size_mb > 0 && (
            <span className="flex items-center gap-1 rounded-md bg-emerald-600/80 px-2 py-0.5 text-[10px] font-semibold text-white">
              <HardDrive className="h-2.5 w-2.5" />
              {post.file_size_mb >= 1 ? `${Number(post.file_size_mb).toFixed(1)} MB` : `${(Number(post.file_size_mb) * 1024).toFixed(0)} KB`}
            </span>
          )}
          {post.file_size_mb && Number(post.file_size_mb) > 50 && (
            <span className="rounded-md bg-amber-500/90 px-2 py-0.5 text-[10px] font-bold text-white">HD</span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5 p-3">
        {/* Creator info */}
        <Link
          to={`/creator/${post.creator_username || post.creator_id}`}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          {post.creator_profile_pic ? (
            <img src={proxyUrl(post.creator_profile_pic)} alt="" className="h-6 w-6 rounded-full object-cover ring-1 ring-primary/20" />
          ) : (
            <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
              {(post.creator_name || "?")[0]?.toUpperCase()}
            </div>
          )}
          <span className="text-xs text-muted-foreground truncate">{post.creator_name || post.creator_username}</span>
        </Link>

        <h3 className="text-sm font-semibold text-card-foreground line-clamp-2 leading-tight">
          {title}
        </h3>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {(post.view_count ?? 0) > 0 && (
            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {formatCount(post.view_count ?? 0)}
            </span>
          )}
          {(post.like_count ?? 0) > 0 && (
            <span className="flex items-center gap-1">
              <Heart className="h-3.5 w-3.5" />
              {formatCount(post.like_count ?? 0)}
            </span>
          )}
          {post.post_date && (
            <span>
              {new Date(post.post_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Index() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialPage = parseInt(searchParams.get("page") || "0", 10);

  const [posts, setPosts] = useState<StoredPost[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState("");

  // Filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [typeFilter, setTypeFilter] = useState(searchParams.get("type") || "all");
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "date_desc");
  const [dateFrom, setDateFrom] = useState(searchParams.get("from") || "");
  const [dateTo, setDateTo] = useState(searchParams.get("to") || "");

  const [stats, setStats] = useState({ total: 0, videos: 0, images: 0, creators: 0 });
  const [activePost, setActivePost] = useState<StoredPost | null>(null);
  const { toast } = useToast();
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  const loadPosts = useCallback(async (pageNum: number) => {
    setLoading(true);
    try {
      const { data, count } = await getStoredPosts({
        offset: pageNum * PAGE_SIZE,
        limit: PAGE_SIZE,
        type: typeFilter !== "all" ? typeFilter : undefined,
        search: searchQuery || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        sortBy,
      });
      setPosts(data);
      setTotalCount(count);
    } catch (e) {
      console.error("Failed to load posts:", e);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, searchQuery, sortBy, dateFrom, dateTo]);

  const loadStats = useCallback(async () => {
    try {
      const s = await getPostStats();
      setStats(s);
    } catch {}
  }, []);

  useEffect(() => {
    loadPosts(page);
  }, [loadPosts, page]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Debounced search
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setPage(0);
      setSearchParams(buildParams(0, val, typeFilter, sortBy));
    }, 400);
  };

  const buildParams = (p: number, q: string, t: string, s: string) => {
    const params: Record<string, string> = { page: String(p) };
    if (q) params.q = q;
    if (t !== "all") params.type = t;
    if (s !== "date_desc") params.sort = s;
    if (dateFrom) params.from = dateFrom;
    if (dateTo) params.to = dateTo;
    return params;
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    setSearchParams(buildParams(newPage, searchQuery, typeFilter, sortBy));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleFilterChange = (key: string, val: string) => {
    if (key === "type") setTypeFilter(val);
    if (key === "sort") setSortBy(val);
    if (key === "from") setDateFrom(val);
    if (key === "to") setDateTo(val);
    setPage(0);
    const newParams = buildParams(0, searchQuery, 
      key === "type" ? val : typeFilter,
      key === "sort" ? val : sortBy
    );
    setSearchParams(newParams);
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncProgress("Starting sync...");
    const runId = crypto.randomUUID();
    let offset = 0;
    const BATCH = 20;
    let totalProcessed = 0;
    let totalCreators = 99999;

    try {
      while (offset < totalCreators) {
        setSyncProgress(`Syncing creators ${offset + 1}–${Math.min(offset + BATCH, totalCreators)}...`);
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-all-posts?offset=${offset}&limit=${BATCH}&run_id=${runId}`,
          { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, "content-type": "application/json" } }
        );
        if (!res.ok) throw new Error(`Sync failed: ${res.status}`);
        const data = await res.json();
        totalCreators = data.totalCreators || 0;
        totalProcessed += data.totalPosts || 0;
        offset += BATCH;
        if (!data.hasMore) break;
      }
      toast({ title: "Sync complete!", description: `Synced ${totalProcessed} posts.` });
      loadPosts(0);
      loadStats();
      setPage(0);
    } catch (e: any) {
      toast({ title: "Sync error", description: e.message, variant: "destructive" });
    } finally {
      setSyncing(false);
      setSyncProgress("");
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const clearFilters = () => {
    setSearchQuery("");
    setTypeFilter("all");
    setSortBy("date_desc");
    setDateFrom("");
    setDateTo("");
    setPage(0);
    setSearchParams({ page: "0" });
  };

  const hasFilters = searchQuery || typeFilter !== "all" || sortBy !== "date_desc" || dateFrom || dateTo;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-6 space-y-4">
        {/* Stats bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <BarChart3 className="h-4 w-4 text-primary" />
            <span className="font-bold text-foreground">{stats.total.toLocaleString()}</span>
            <span className="text-muted-foreground">posts</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Film className="h-4 w-4 text-primary" />
            <span className="font-semibold">{stats.videos.toLocaleString()}</span>
            <span className="text-muted-foreground">videos</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <ImageIcon className="h-4 w-4 text-primary" />
            <span className="font-semibold">{stats.images.toLocaleString()}</span>
            <span className="text-muted-foreground">images</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold">{stats.creators}</span>
            <span className="text-muted-foreground">creators</span>
          </div>

          <div className="ml-auto">
            <Button variant="outline" size="sm" disabled={syncing} onClick={handleSync}>
              {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="ml-1 text-xs sm:text-sm">{syncing ? syncProgress : "Sync"}</span>
            </Button>
          </div>
        </div>

        {/* Live sync progress */}
        <SyncProgressPanel isVisible={syncing} />

        {/* Search + Filters */}
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search posts by title..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Type filter */}
            <div className="flex items-center gap-1 rounded-lg border border-border p-1 bg-muted/50">
              {[
                { value: "all", label: "All", icon: Filter },
                { value: "Video", label: "Video", icon: Video },
                { value: "Image", label: "Image", icon: Image },
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => handleFilterChange("type", value)}
                  className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    typeFilter === value
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-background"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => handleFilterChange("sort", e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground"
            >
              <option value="date_desc">Newest first</option>
              <option value="date_asc">Oldest first</option>
              <option value="size_desc">Largest files</option>
              <option value="views_desc">Most viewed</option>
              <option value="duration_desc">Longest duration</option>
            </select>

            {/* Date range */}
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => handleFilterChange("from", e.target.value)}
                className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground"
                placeholder="From"
              />
              <span className="text-xs text-muted-foreground">–</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => handleFilterChange("to", e.target.value)}
                className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground"
                placeholder="To"
              />
            </div>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs">
                <X className="h-3.5 w-3.5 mr-1" /> Clear
              </Button>
            )}
          </div>
        </div>

        {/* Results count */}
        <p className="text-xs text-muted-foreground">
          Showing {posts.length} of {totalCount.toLocaleString()} results
        </p>

        {/* Posts Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Play className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>{stats.total === 0 ? "No posts synced yet. Click 'Sync Posts' to start." : "No posts match your filters."}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {posts.map((post) => (
              <FeedPostCard key={post.id} post={post} onPlay={setActivePost} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 py-4">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => handlePageChange(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page + 1} of {totalPages}
            </span>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => handlePageChange(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </main>

      {/* Media Modal */}
      {activePost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setActivePost(null)}
        >
          <div className="relative w-full max-w-4xl mx-4" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setActivePost(null)}
              className="absolute -top-10 right-0 text-white hover:text-primary transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
            <div className="rounded-xl overflow-hidden bg-black">
              {(() => {
                const mediaUrl = activePost.location || activePost.media_url || '';
                const proxiedUrl = proxyUrl(mediaUrl);
                if (activePost.type === "Video" && mediaUrl) {
                  return (
                    <video
                      src={proxiedUrl}
                      controls
                      autoPlay
                      className="w-full max-h-[80vh]"
                      poster={proxyUrl(activePost.thumbnail_url)}
                    />
                  );
                } else if (mediaUrl) {
                  return (
                    <img
                      src={proxiedUrl}
                      alt={activePost.content || ""}
                      className="w-full max-h-[80vh] object-contain"
                    />
                  );
                }
                return (
                  <div className="flex items-center justify-center py-32 text-muted-foreground">
                    <p>No media available</p>
                  </div>
                );
              })()}
            </div>
            <div className="mt-3 flex items-center gap-3">
              {activePost.creator_profile_pic && (
                <img src={proxyUrl(activePost.creator_profile_pic)} className="h-8 w-8 rounded-full object-cover" alt="" />
              )}
              <div>
                <p className="text-sm text-white/90 line-clamp-1">{activePost.content}</p>
                <Link
                  to={`/creator/${activePost.creator_username || activePost.creator_id}`}
                  className="text-xs text-primary hover:underline"
                  onClick={() => setActivePost(null)}
                >
                  {activePost.creator_name || activePost.creator_username}
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
