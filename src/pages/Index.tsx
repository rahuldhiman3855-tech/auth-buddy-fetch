import { useState, useEffect, useRef } from "react";
import Navbar from "@/components/Navbar";
import { Link, useSearchParams } from "react-router-dom";
import {
  formatCount, formatDuration, decodeContent,
  type PostData,
} from "@/lib/api";
import { getStoredPosts, type StoredPost } from "@/lib/postsApi";
import {
  Search, Video, Image, Loader2, Play, Eye, Heart, Clock, Download,
  HardDrive, Filter, X, ArrowUpDown, ChevronLeft, ChevronRight, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import SyncLatestPanel from "@/components/SyncLatestPanel";

const PAGE_SIZE = 24;
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

function getMediaCandidates(post: { location?: string | null; media_url?: string | null; thumbnail_url?: string | null }) {
  const current = post.location || post.media_url || "";
  const original = deriveOriginalMediaUrl(post.thumbnail_url);

  if (current.includes("/media/compressed/")) {
    return { primary: original || current, fallback: current };
  }
  return {
    primary: current || original,
    fallback: original && original !== current ? original : "",
  };
}

function getThumbnailProxyUrl(post: { thumbnail_url?: string | null }): string {
  return post.thumbnail_url ? proxyUrl(post.thumbnail_url) : "";
}

function getPlayableMediaProxyUrl(post: { location?: string | null; media_url?: string | null; thumbnail_url?: string | null }): string {
  const { primary, fallback } = getMediaCandidates(post);
  return primary ? proxyUrl(primary, { alt: fallback }) : "";
}

function getDownloadProxyUrl(post: { location?: string | null; media_url?: string | null; thumbnail_url?: string | null }): string {
  const { primary, fallback } = getMediaCandidates(post);
  return primary ? proxyUrl(primary, { alt: fallback, download: true }) : "";
}

function FeedPostCard({ post, onPlay }: { post: StoredPost; onPlay: (p: StoredPost) => void }) {
  const thumb = getThumbnailProxyUrl(post);
  const title = post.content || "Untitled";
  const duration = formatDuration(post.duration ?? undefined);
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
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

        {(post.location || post.media_url || post.thumbnail_url) && (
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
          {post.file_size_mb && post.file_size_mb > 0 && (
            <span className="flex items-center gap-1 rounded-md bg-emerald-600/80 px-2 py-0.5 text-[10px] font-semibold text-white">
              <HardDrive className="h-2.5 w-2.5" />
              {post.file_size_mb >= 1 ? `${post.file_size_mb.toFixed(1)} MB` : `${(post.file_size_mb * 1024).toFixed(0)} KB`}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5 p-3">
        <Link
          to={`/creator/${post.creator_username}`}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          {post.creator_profile_pic ? (
            <img src={post.creator_profile_pic} alt="" className="h-6 w-6 rounded-full object-cover ring-1 ring-primary/20" />
          ) : (
            <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
              {(post.creator_name || "?")[0]?.toUpperCase()}
            </div>
          )}
          <span className="text-xs text-muted-foreground truncate">{post.creator_name || post.creator_username}</span>
        </Link>

        <h3 className="text-sm font-semibold text-card-foreground line-clamp-2 leading-tight">{title}</h3>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {(post.view_count ?? 0) > 0 && (
            <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{formatCount(post.view_count ?? 0)}</span>
          )}
          {(post.like_count ?? 0) > 0 && (
            <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" />{formatCount(post.like_count ?? 0)}</span>
          )}
          {post.post_date && (
            <span>{new Date(post.post_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Index() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read page from URL
  const urlPage = Math.max(1, Number(searchParams.get("page")) || 1);

  const [posts, setPosts] = useState<StoredPost[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [typeFilter, setTypeFilter] = useState(searchParams.get("type") || "all");
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "date");

  // Pagination
  const [currentPage, setCurrentPage] = useState(urlPage);
  const [gotoInput, setGotoInput] = useState(String(urlPage));

  const [activePost, setActivePost] = useState<StoredPost | null>(null);
  const [activeMediaUrl, setActiveMediaUrl] = useState("");
  const [showSync, setShowSync] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);

  // Update URL params
  const updateParams = (overrides: Record<string, string | undefined> = {}) => {
    const p: Record<string, string> = {};
    const page = overrides.page ?? String(currentPage);
    const q = overrides.q ?? searchQuery;
    const type = overrides.type ?? typeFilter;
    const sort = overrides.sort ?? sortBy;
    if (Number(page) > 1) p.page = page;
    if (q) p.q = q;
    if (type && type !== "all") p.type = type;
    if (sort && sort !== "date") p.sort = sort;
    setSearchParams(p);
  };

  // Fetch posts from DB
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const offset = (safePage - 1) * PAGE_SIZE;
        const sortMap: Record<string, string> = {
          date: "date_desc",
          duration_desc: "duration_desc",
          duration_asc: "date_asc", // we'll handle duration_asc below
          size_desc: "size_desc",
          views_desc: "views_desc",
        };
        const { data, count } = await getStoredPosts({
          offset,
          limit: PAGE_SIZE,
          type: typeFilter !== "all" ? typeFilter : undefined,
          search: searchQuery || undefined,
          sortBy: sortMap[sortBy] || undefined,
        });
        if (cancelled) return;
        setPosts(data);
        setTotalCount(count);
      } catch (e) {
        console.error("Failed to load posts:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [safePage, typeFilter, searchQuery, sortBy, refreshKey]);

  const goToPage = (p: number) => {
    const clamped = Math.max(1, Math.min(p, totalPages));
    setCurrentPage(clamped);
    setGotoInput(String(clamped));
    updateParams({ page: String(clamped) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSearchChange = (val: string) => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setSearchQuery(val);
      setCurrentPage(1);
      setGotoInput("1");
      updateParams({ q: val, page: "1" });
    }, 500);
  };

  const handlePlayPost = (post: StoredPost) => {
    setActivePost(post);
    setActiveMediaUrl(getPlayableMediaProxyUrl(post));
  };

  const clearFilters = () => {
    setSearchQuery("");
    setTypeFilter("all");
    setSortBy("date");
    setCurrentPage(1);
    setGotoInput("1");
    setSearchParams({});
  };

  const hasFilters = searchQuery || typeFilter !== "all" || sortBy !== "date";

  // Pagination controls component
  const PaginationControls = () => (
    totalPages > 1 ? (
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={safePage <= 1} onClick={() => goToPage(safePage - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-1">
          <Input
            type="number"
            min={1}
            max={totalPages}
            value={gotoInput}
            onChange={(e) => setGotoInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") goToPage(Number(gotoInput)); }}
            className="h-8 w-16 text-center text-xs"
          />
          <span className="text-xs text-muted-foreground">/ {totalPages}</span>
          <Button variant="secondary" size="sm" className="h-8 text-xs" onClick={() => goToPage(Number(gotoInput))}>
            Go
          </Button>
        </div>
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={safePage >= totalPages} onClick={() => goToPage(safePage + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    ) : null
  );

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
                    setCurrentPage(1);
                    setGotoInput("1");
                    updateParams({ type: value, page: "1" });
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

            {/* Sort by */}
            <Select value={sortBy} onValueChange={(v) => {
              setSortBy(v);
              setCurrentPage(1);
              setGotoInput("1");
              updateParams({ sort: v, page: "1" });
            }}>
              <SelectTrigger className="w-auto h-8 text-xs gap-1">
                <ArrowUpDown className="h-3.5 w-3.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Newest</SelectItem>
                <SelectItem value="duration_desc">Duration ↓</SelectItem>
                <SelectItem value="duration_asc">Duration ↑</SelectItem>
                <SelectItem value="size_desc">Size ↓</SelectItem>
                <SelectItem value="views_desc">Views ↓</SelectItem>
              </SelectContent>
            </Select>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs">
                <X className="h-3.5 w-3.5 mr-1" /> Clear
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSync(true)}
              className="ml-auto text-xs gap-1"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Sync Latest
            </Button>
          </div>
        </div>

        {/* Stats + Pagination header */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {totalCount} posts · Page {safePage} of {totalPages}
          </p>
          <PaginationControls />
        </div>

        {/* Posts Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Play className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No posts found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {posts.map((post) => (
              <FeedPostCard key={post.id} post={post} onPlay={handlePlayPost} />
            ))}
          </div>
        )}

        {/* Bottom pagination */}
        <div className="flex items-center justify-center py-4">
          <PaginationControls />
        </div>
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
                    alt={activePost.content || ""}
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
              {activePost.creator_profile_pic && (
                <img src={activePost.creator_profile_pic} className="h-8 w-8 rounded-full object-cover" alt="" />
              )}
              <div>
                <p className="text-sm text-white/90 line-clamp-1">{activePost.content}</p>
                <Link
                  to={`/creator/${activePost.creator_username}`}
                  className="text-xs text-primary hover:underline"
                  onClick={() => { setActivePost(null); setActiveMediaUrl(""); }}
                >
                  {activePost.creator_name || activePost.creator_username}
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSync && (
        <SyncLatestPanel
          onClose={() => setShowSync(false)}
          onSynced={() => setRefreshKey(k => k + 1)}
        />
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
