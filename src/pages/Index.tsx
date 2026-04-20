import { useState, useEffect, useRef } from "react";
import Navbar from "@/components/Navbar";
import { Link, useSearchParams } from "react-router-dom";
import { formatCount } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import {
  Search, Loader2, BadgeCheck, Users, Video, Filter, X,
  ArrowUpDown, ChevronLeft, ChevronRight, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import SyncLatestPanel from "@/components/SyncLatestPanel";

const PAGE_SIZE = 24;

interface CreatorRow {
  id: string;
  official_id: string;
  username: string;
  name: string;
  profile_pic: string | null;
  cover_pic: string | null;
  bio: string | null;
  category: string | null;
  follower_count: number | null;
  video_count: number | null;
  post_count: number | null;
  is_verified: boolean | null;
  discovered_at: string;
  updated_at: string;
}

const PROXY_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/video-proxy`;
function thumbProxy(url?: string | null): string {
  if (!url) return "";
  return `${PROXY_BASE}?url=${encodeURIComponent(url)}`;
}

function CreatorCard({ creator, thumbs }: { creator: CreatorRow; thumbs: string[] }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { rootMargin: "200px" }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <Link
      ref={ref}
      to={`/creator/${creator.username}`}
      className="group relative flex flex-col overflow-hidden rounded-xl bg-card border border-border shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
    >
      {/* Cover */}
      <div className="relative aspect-[3/2] overflow-hidden bg-muted">
        {visible && creator.cover_pic ? (
          <img
            src={creator.cover_pic}
            alt={creator.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary/30 to-accent/30" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      </div>

      {/* Avatar + name */}
      <div className="flex flex-col items-center px-3 pb-3 -mt-8">
        <div className="relative">
          <div className="h-16 w-16 rounded-full p-0.5 bg-gradient-to-br from-primary to-accent">
            {visible && creator.profile_pic ? (
              <img
                src={creator.profile_pic}
                alt={creator.name}
                className="h-full w-full rounded-full object-cover border-2 border-card"
                loading="lazy"
              />
            ) : (
              <div className="h-full w-full rounded-full bg-muted border-2 border-card flex items-center justify-center text-lg font-bold text-foreground">
                {(creator.name || creator.username || "?")[0]?.toUpperCase()}
              </div>
            )}
          </div>
          {creator.is_verified && (
            <BadgeCheck className="absolute -bottom-0.5 right-0 h-5 w-5 text-primary fill-primary stroke-primary-foreground" />
          )}
        </div>

        <div className="mt-2 text-center w-full">
          <h3 className="text-sm font-bold text-card-foreground truncate group-hover:text-primary transition-colors">
            {creator.name || creator.username}
          </h3>
          <p className="text-[11px] text-muted-foreground truncate">@{creator.username}</p>
        </div>

        <div className="mt-2 flex items-center justify-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />{formatCount(creator.follower_count ?? 0)}
          </span>
          <span className="flex items-center gap-1">
            <Video className="h-3 w-3" />{formatCount(creator.video_count ?? 0)}
          </span>
        </div>

        {creator.category && (
          <span className="mt-2 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary truncate max-w-full">
            {creator.category}
          </span>
        )}

        {/* Latest video thumbnails strip */}
        {thumbs.length > 0 && (
          <div className="mt-2 grid grid-cols-3 gap-1 w-full">
            {thumbs.map((t, i) => (
              <div key={i} className="aspect-square overflow-hidden rounded-md bg-muted">
                <img
                  src={t}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

export default function Index() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlPage = Math.max(1, Number(searchParams.get("page")) || 1);

  const [creators, setCreators] = useState<CreatorRow[]>([]);
  const [thumbsByCreator, setThumbsByCreator] = useState<Record<string, string[]>>({});
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "latest");
  const [verifiedOnly, setVerifiedOnly] = useState(searchParams.get("verified") === "1");

  const [currentPage, setCurrentPage] = useState(urlPage);
  const [gotoInput, setGotoInput] = useState(String(urlPage));

  const [showSync, setShowSync] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);

  const updateParams = (overrides: Record<string, string | undefined> = {}) => {
    const p: Record<string, string> = {};
    const page = overrides.page ?? String(currentPage);
    const q = overrides.q ?? searchQuery;
    const sort = overrides.sort ?? sortBy;
    const verified = overrides.verified ?? (verifiedOnly ? "1" : "");
    if (Number(page) > 1) p.page = page;
    if (q) p.q = q;
    if (sort && sort !== "latest") p.sort = sort;
    if (verified) p.verified = "1";
    setSearchParams(p);
  };

  // Fetch creators from DB
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const offset = (safePage - 1) * PAGE_SIZE;
        let query = supabase
          .from("creators")
          .select("*", { count: "exact" });

        if (searchQuery) {
          const q = searchQuery.replace(/[%,]/g, "");
          query = query.or(`username.ilike.%${q}%,name.ilike.%${q}%`);
        }
        if (verifiedOnly) {
          query = query.eq("is_verified", true);
        }

        switch (sortBy) {
          case "followers":
            query = query.order("follower_count", { ascending: false, nullsFirst: false });
            break;
          case "videos":
            query = query.order("video_count", { ascending: false, nullsFirst: false });
            break;
          case "name":
            query = query.order("name", { ascending: true });
            break;
          case "updated":
            query = query.order("updated_at", { ascending: false });
            break;
          case "latest":
          default:
            query = query.order("discovered_at", { ascending: false });
            break;
        }

        const { data, count, error } = await query.range(offset, offset + PAGE_SIZE - 1);
        if (error) throw error;
        if (cancelled) return;
        const list = (data as CreatorRow[]) ?? [];
        setCreators(list);
        setTotalCount(count ?? 0);
        setThumbsByCreator({});

        // Fetch latest 3 video thumbnails for each creator in parallel
        const creatorIds = list.map((c) => c.official_id).filter(Boolean);
        if (creatorIds.length > 0) {
          const results = await Promise.all(
            creatorIds.map(async (cid) => {
              const { data: posts } = await supabase
                .from("posts")
                .select("thumbnail_url")
                .eq("creator_id", cid)
                .eq("type", "Video")
                .not("thumbnail_url", "is", null)
                .order("post_date", { ascending: false, nullsFirst: false })
                .limit(3);
              return [cid, (posts ?? []).map((p) => thumbProxy(p.thumbnail_url)).filter(Boolean)] as const;
            })
          );
          if (cancelled) return;
          setThumbsByCreator(Object.fromEntries(results));
        }
      } catch (e) {
        console.error("Failed to load creators:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [safePage, searchQuery, sortBy, verifiedOnly]);

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
    }, 400);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSortBy("latest");
    setVerifiedOnly(false);
    setCurrentPage(1);
    setGotoInput("1");
    setSearchParams({});
  };

  const hasFilters = searchQuery || sortBy !== "latest" || verifiedOnly;

  const renderPagination = () =>
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
    ) : null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-6 space-y-4">
        {/* Search + Filters */}
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search creators by username or name..."
              defaultValue={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                const next = !verifiedOnly;
                setVerifiedOnly(next);
                setCurrentPage(1);
                setGotoInput("1");
                updateParams({ verified: next ? "1" : "", page: "1" });
              }}
              className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium border transition-colors ${
                verifiedOnly
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <BadgeCheck className="h-3.5 w-3.5" /> Verified
            </button>

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
                <SelectItem value="latest">Latest Added</SelectItem>
                <SelectItem value="updated">Recently Updated</SelectItem>
                <SelectItem value="followers">Most Followers</SelectItem>
                <SelectItem value="videos">Most Videos</SelectItem>
                <SelectItem value="name">Name A–Z</SelectItem>
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

        {/* Stats + Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {totalCount} creators · Page {safePage} of {totalPages}
          </p>
          {renderPagination()}
        </div>

        {/* Creators Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : creators.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No creators found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {creators.map((c) => (
              <CreatorCard key={c.id} creator={c} />
            ))}
          </div>
        )}

        <div className="flex items-center justify-center py-4">
          {renderPagination()}
        </div>
      </main>

      {showSync && (
        <SyncLatestPanel
          onClose={() => setShowSync(false)}
          onSynced={() => setCurrentPage(1)}
        />
      )}
    </div>
  );
}
