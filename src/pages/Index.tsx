import { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import { Link, useSearchParams } from "react-router-dom";
import { getStoredCreators, discoverCreator, bulkDiscoverCreators, formatCount, type StoredCreator } from "@/lib/api";
import { Search, UserPlus, Users, Video, Eye, Loader2, ChevronLeft, ChevronRight, RefreshCw, CheckCircle2, Pin, PinOff, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const PAGE_SIZE = 20;

function getVisitedCreators(): Set<string> {
  try {
    const stored = localStorage.getItem("visited_creators");
    return new Set(stored ? JSON.parse(stored) : []);
  } catch { return new Set(); }
}

function markCreatorVisited(username: string) {
  const visited = getVisitedCreators();
  visited.add(username);
  localStorage.setItem("visited_creators", JSON.stringify([...visited]));
}

function getPinnedCreators(): string[] {
  try {
    const stored = localStorage.getItem("pinned_creators");
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function togglePinCreator(username: string): string[] {
  const pinned = getPinnedCreators();
  const idx = pinned.indexOf(username);
  if (idx >= 0) {
    pinned.splice(idx, 1);
  } else {
    pinned.unshift(username);
  }
  localStorage.setItem("pinned_creators", JSON.stringify(pinned));
  return pinned;
}

function CreatorCard({
  c,
  isVisited,
  isPinned,
  onPin,
  onClick,
}: {
  c: StoredCreator;
  isVisited: boolean;
  isPinned: boolean;
  onPin: (e: React.MouseEvent) => void;
  onClick: () => void;
}) {
  return (
    <div className="relative group">
      <Link
        to={`/creator/${c.username}`}
        onClick={onClick}
        className={`group block rounded-xl border overflow-hidden transition-all ${
          isPinned
            ? "border-accent bg-accent/5 ring-2 ring-accent/30 hover:shadow-xl"
            : isVisited
            ? "border-primary/30 bg-primary/5 hover:border-primary/60 hover:shadow-lg"
            : "border-border bg-card hover:border-primary/50 hover:shadow-lg"
        }`}
      >
        {/* Cover */}
        <div className="h-24 bg-gradient-to-br from-primary/20 to-accent/20 relative overflow-hidden">
          {isPinned && (
            <span className="absolute top-2 left-2 z-10 flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">
              <Pin className="h-3 w-3" /> Pinned
            </span>
          )}
          {isVisited && !isPinned && (
            <span className="absolute top-2 left-2 z-10 flex items-center gap-1 rounded-full bg-primary/90 px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
              <CheckCircle2 className="h-3 w-3" /> Visited
            </span>
          )}
          {c.cover_pic && (
            <img src={c.cover_pic} alt="" className="w-full h-full object-cover" />
          )}
        </div>

        {/* Profile */}
        <div className="px-4 pb-4 -mt-8 relative">
          <div className="h-16 w-16 rounded-full border-4 border-card bg-muted overflow-hidden">
            {c.profile_pic ? (
              <img src={c.profile_pic} alt={c.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xl font-bold text-muted-foreground">
                {(c.name || c.username)[0]?.toUpperCase()}
              </div>
            )}
          </div>

          <h3 className="mt-2 font-bold text-foreground truncate group-hover:text-primary transition-colors">
            {c.name || c.username}
          </h3>
          <p className="text-xs text-muted-foreground">@{c.username}</p>

          {c.bio && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{c.bio}</p>
          )}

          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
            {(c.follower_count || 0) > 0 && (
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {formatCount(c.follower_count)}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Video className="h-3 w-3" />
              {formatCount(c.post_count || c.video_count || 0)} posts
            </span>
            {c.category && (
              <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-primary text-[10px] font-medium">
                {c.category}
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* Pin button — floating on top-right of cover */}
      <button
        onClick={onPin}
        className={`absolute top-2 right-2 z-20 flex h-7 w-7 items-center justify-center rounded-full transition-all ${
          isPinned
            ? "bg-accent text-accent-foreground shadow-md hover:bg-destructive hover:text-destructive-foreground"
            : "bg-black/50 text-white sm:opacity-0 sm:group-hover:opacity-100 hover:bg-accent hover:text-accent-foreground"
        }`}
        title={isPinned ? "Unpin creator" : "Pin creator"}
      >
        {isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}


export default function Index() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialPage = parseInt(searchParams.get("page") || "0", 10);
  const [creators, setCreators] = useState<StoredCreator[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [visitedSet, setVisitedSet] = useState<Set<string>>(getVisitedCreators);
  const [pinnedList, setPinnedList] = useState<string[]>(getPinnedCreators);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState("");
  const [filterQuery, setFilterQuery] = useState("");
  const { toast } = useToast();

  // Load ALL creators once so we can show pinned ones from any page
  const [allCreators, setAllCreators] = useState<StoredCreator[]>([]);

  const loadCreators = useCallback(async (pageNum: number) => {
    setLoading(true);
    try {
      const { data, count } = await getStoredCreators(pageNum * PAGE_SIZE, PAGE_SIZE);
      setCreators(data);
      setTotalCount(count);
    } catch (e) {
      console.error("Failed to load creators:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAllCreators = useCallback(async () => {
    try {
      const { data } = await getStoredCreators(0, 1000);
      setAllCreators(data);
    } catch {}
  }, []);

  useEffect(() => {
    loadCreators(initialPage);
    loadAllCreators();
  }, [loadCreators, loadAllCreators, initialPage]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    setSearchParams({ page: String(newPage) });
    loadCreators(newPage);
  };

  const handleCreatorClick = (username: string) => {
    markCreatorVisited(username);
    setVisitedSet(new Set(getVisitedCreators()));
  };

  const handlePin = (e: React.MouseEvent, username: string) => {
    e.preventDefault();
    e.stopPropagation();
    const updated = togglePinCreator(username);
    setPinnedList([...updated]);
    const isPinning = updated.includes(username);
    toast({
      title: isPinning ? "📌 Creator pinned!" : "Unpinned",
      description: isPinning ? `${username} will appear at the top.` : `${username} removed from pins.`,
    });
  };

  const handleDiscover = async () => {
    const username = searchQuery.trim().toLowerCase();
    if (!username) return;
    setSearching(true);
    try {
      const result = await discoverCreator(username);
      if (result) {
        toast({ title: "Creator found!", description: `${result.name || result.username} added to dashboard.` });
        setSearchQuery("");
        loadCreators(0);
        loadAllCreators();
        setPage(0);
      } else {
        toast({ title: "Not found", description: `No creator with username "${username}"`, variant: "destructive" });
      }
    } finally {
      setSearching(false);
    }
  };

  const handleBatchSync = async () => {
    setSyncing(true);
    setSyncProgress("Starting...");
    const BATCH = 50;
    let offset = 0;
    let totalProcessed = 0;
    let total = totalCount;

    try {
      while (offset < total) {
        setSyncProgress(`Scanning ${offset + 1}–${Math.min(offset + BATCH, total)} of ${total}...`);
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/batch-sync-posts?offset=${offset}&limit=${BATCH}`,
          {
            headers: {
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              "content-type": "application/json",
            },
          }
        );
        if (!res.ok) throw new Error(`Sync failed: ${res.status}`);
        const data = await res.json();
        total = data.total || total;
        totalProcessed += data.processed || 0;
        offset += BATCH;
      }
      toast({ title: "Sync complete!", description: `Updated post counts for ${totalProcessed} creators.` });
      loadCreators(page);
      loadAllCreators();
    } catch (e: any) {
      toast({ title: "Sync error", description: e.message, variant: "destructive" });
    } finally {
      setSyncing(false);
      setSyncProgress("");
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Build pinned creators list from allCreators
  const pinnedSet = new Set(pinnedList);
  const pinnedCreators = pinnedList
    .map((username) => allCreators.find((c) => c.username === username))
    .filter(Boolean) as StoredCreator[];

  // Filter pinned out, then sort visited to the bottom
  const unpinnedCreators = creators
    .filter((c) => !pinnedSet.has(c.username))
    .sort((a, b) => {
      const aVisited = visitedSet.has(a.username) ? 1 : 0;
      const bVisited = visitedSet.has(b.username) ? 1 : 0;
      return aVisited - bVisited;
    });

  // Filter by search
  const filteredUnpinned = filterQuery.trim()
    ? unpinnedCreators.filter(
        (c) =>
          c.username.toLowerCase().includes(filterQuery.toLowerCase()) ||
          (c.name || "").toLowerCase().includes(filterQuery.toLowerCase()) ||
          (c.category || "").toLowerCase().includes(filterQuery.toLowerCase())
      )
    : unpinnedCreators;
  const filteredPinned = filterQuery.trim()
    ? pinnedCreators.filter(
        (c) =>
          c.username.toLowerCase().includes(filterQuery.toLowerCase()) ||
          (c.name || "").toLowerCase().includes(filterQuery.toLowerCase()) ||
          (c.category || "").toLowerCase().includes(filterQuery.toLowerCase())
      )
    : pinnedCreators;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              All Creators
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {totalCount} creators discovered • {pinnedList.length} pinned
            </p>
          </div>

          {/* Discover new creator */}
          <form
            onSubmit={(e) => { e.preventDefault(); handleDiscover(); }}
            className="flex items-center gap-2 w-full md:w-auto"
          >
            <div className="relative flex-1 md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Add creator by username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button type="submit" disabled={searching || !searchQuery.trim()} size="sm">
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              <span className="ml-1 hidden sm:inline">Add</span>
            </Button>
          </form>

          <Button
            variant="outline"
            size="sm"
            disabled={syncing}
            onClick={handleBatchSync}
          >
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-1 hidden sm:inline">{syncing ? syncProgress : "Sync Posts"}</span>
          </Button>
        </div>

        {/* Filter creators */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter creators by name, username, or category..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Pinned Creators Section */}
        {filteredPinned.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5 mb-3">
              <Pin className="h-4 w-4 text-accent" />
              Pinned Creators ({filteredPinned.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredPinned.map((c) => (
                <CreatorCard
                  key={`pin-${c.id}`}
                  c={c}
                  isVisited={visitedSet.has(c.username)}
                  isPinned={true}
                  onPin={(e) => handlePin(e, c.username)}
                  onClick={() => handleCreatorClick(c.username)}
                />
              ))}
            </div>
          </section>
        )}

        {/* All Creators */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredUnpinned.length === 0 && filteredPinned.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>{filterQuery.trim() ? "No creators match your filter." : "No creators yet. Search for a username to add one."}</p>
          </div>
        ) : (
          <>
            {filteredPinned.length > 0 && (
              <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Users className="h-4 w-4 text-muted-foreground" />
                All Creators
              </h2>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredUnpinned.map((c) => (
                <CreatorCard
                  key={c.id}
                  c={c}
                  isVisited={visitedSet.has(c.username)}
                  isPinned={false}
                  onPin={(e) => handlePin(e, c.username)}
                  onClick={() => handleCreatorClick(c.username)}
                />
              ))}
            </div>
          </>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 py-4">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => handlePageChange(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => handlePageChange(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </main>

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
