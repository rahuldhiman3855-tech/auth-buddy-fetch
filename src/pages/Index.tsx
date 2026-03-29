import { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import { Link, useSearchParams } from "react-router-dom";
import { getStoredCreators, discoverCreator, bulkDiscoverCreators, formatCount, type StoredCreator } from "@/lib/api";
import { Search, UserPlus, Users, Video, Eye, Loader2, ChevronLeft, ChevronRight, RefreshCw, CheckCircle2 } from "lucide-react";
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


export default function Index() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialPage = parseInt(searchParams.get("page") || "0", 10);
  const [creators, setCreators] = useState<StoredCreator[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [visitedSet, setVisitedSet] = useState<Set<string>>(getVisitedCreators);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState("");
  const { toast } = useToast();

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

  useEffect(() => {
    loadCreators(initialPage);
  }, [loadCreators, initialPage]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    setSearchParams({ page: String(newPage) });
    loadCreators(newPage);
  };

  const handleCreatorClick = (username: string) => {
    markCreatorVisited(username);
    setVisitedSet(new Set(getVisitedCreators()));
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
    } catch (e: any) {
      toast({ title: "Sync error", description: e.message, variant: "destructive" });
    } finally {
      setSyncing(false);
      setSyncProgress("");
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

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
              {totalCount} creators discovered • Search to add more
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

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : creators.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No creators yet. Search for a username to add one.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {creators.map((c) => {
              const isVisited = visitedSet.has(c.username);
              return (
              <Link
                key={c.id}
                to={`/creator/${c.username}`}
                onClick={() => handleCreatorClick(c.username)}
                className={`group rounded-xl border overflow-hidden transition-all ${
                  isVisited
                    ? "border-primary/30 bg-primary/5 hover:border-primary/60 hover:shadow-lg"
                    : "border-border bg-card hover:border-primary/50 hover:shadow-lg"
                }`}
              >
                {/* Cover */}
                <div className="h-24 bg-gradient-to-br from-primary/20 to-accent/20 relative overflow-hidden">
                  {isVisited && (
                    <span className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-full bg-primary/90 px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                      <CheckCircle2 className="h-3 w-3" /> Visited
                    </span>
                  )}
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
            ))}
          </div>
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
