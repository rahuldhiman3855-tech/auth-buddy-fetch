import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, RefreshCw, User, Globe, X, CheckCircle2, AlertCircle, Square, Play } from "lucide-react";

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-latest-posts`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface SyncResult {
  creator: string;
  posts: number;
  new: number;
  status: string;
}

export default function SyncLatestPanel({ onClose, onSynced }: { onClose: () => void; onSynced: () => void }) {
  const [mode, setMode] = useState<"all" | "creator">("all");
  const [username, setUsername] = useState("");
  const [postsPerCreator, setPostsPerCreator] = useState("10");
  const [batchSize, setBatchSize] = useState("50");
  const [startOffset, setStartOffset] = useState("0");
  const [totalCreators, setTotalCreators] = useState<number | null>(null);

  const [running, setRunning] = useState(false);
  const stopRef = useRef(false);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [progress, setProgress] = useState("");
  const [results, setResults] = useState<SyncResult[]>([]);
  const [summary, setSummary] = useState({ total: 0, new: 0, processed: 0 });
  const [error, setError] = useState("");

  // Load total creator count for progress display
  useEffect(() => {
    supabase
      .from("creators")
      .select("*", { count: "exact", head: true })
      .then(({ count }) => setTotalCreators(count ?? 0));
  }, []);

  const callFunction = async (offset: number, limit: number, name?: string) => {
    const params = new URLSearchParams({ posts: postsPerCreator });
    if (name) {
      params.set("username", name);
    } else {
      params.set("offset", String(offset));
      params.set("limit", String(limit));
    }
    const res = await fetch(`${FN_URL}?${params.toString()}`, {
      headers: { apikey: ANON, authorization: `Bearer ${ANON}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  };

  const runCreatorSync = async () => {
    if (!username.trim()) {
      setError("Please enter a creator username or ID");
      return;
    }
    setError("");
    setRunning(true);
    setResults([]);
    setSummary({ total: 0, new: 0, processed: 0 });
    setProgress(`Syncing @${username}...`);
    try {
      const data = await callFunction(0, 0, username.trim());
      setResults(data.results ?? []);
      setSummary({
        total: data.totalPosts ?? 0,
        new: data.newPosts ?? 0,
        processed: data.processed ?? 0,
      });
      onSynced();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setProgress("");
      setRunning(false);
    }
  };

  const runAllSync = async () => {
    setError("");
    setRunning(true);
    stopRef.current = false;
    setResults([]);
    setSummary({ total: 0, new: 0, processed: 0 });

    const limit = Math.max(1, Number(batchSize));
    let offset = Math.max(0, Number(startOffset));
    setCurrentOffset(offset);

    try {
      while (!stopRef.current) {
        setProgress(`Batch: creators ${offset + 1} → ${offset + limit}`);
        const data = await callFunction(offset, limit);
        const batchResults: SyncResult[] = data.results ?? [];

        setResults(prev => [...batchResults, ...prev].slice(0, 200));
        setSummary(prev => ({
          total: prev.total + (data.totalPosts ?? 0),
          new: prev.new + (data.newPosts ?? 0),
          processed: prev.processed + (data.processed ?? 0),
        }));

        onSynced();

        if (!data.hasMore) break;
        offset += limit;
        setCurrentOffset(offset);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setProgress("");
      setRunning(false);
    }
  };

  const stopSync = () => { stopRef.current = true; };

  const total = totalCreators ?? 0;
  const done = Math.min(currentOffset + summary.processed, total);
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={running ? undefined : onClose}>
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col rounded-xl bg-card border border-border shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <RefreshCw className={`h-4 w-4 text-primary ${running ? "animate-spin" : ""}`} />
            Sync Latest Posts
          </h2>
          <button
            onClick={onClose}
            disabled={running}
            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Mode toggle */}
          <div className="flex items-center gap-1 rounded-lg border border-border p-1 bg-muted/50">
            <button
              onClick={() => !running && setMode("all")}
              disabled={running}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50 ${
                mode === "all" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Globe className="h-3.5 w-3.5" /> All Creators
            </button>
            <button
              onClick={() => !running && setMode("creator")}
              disabled={running}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50 ${
                mode === "creator" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <User className="h-3.5 w-3.5" /> Specific Creator
            </button>
          </div>

          {mode === "creator" ? (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Creator username or ID</label>
              <Input
                placeholder="e.g. pankhurikunall"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={running}
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Start offset</label>
                <Input type="number" min={0} value={startOffset} onChange={(e) => setStartOffset(e.target.value)} disabled={running} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Creators per batch</label>
                <Input type="number" min={1} max={200} value={batchSize} onChange={(e) => setBatchSize(e.target.value)} disabled={running} />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Latest posts per creator</label>
            <Input type="number" min={1} max={50} value={postsPerCreator} onChange={(e) => setPostsPerCreator(e.target.value)} disabled={running} />
          </div>

          {mode === "all" && totalCreators !== null && (
            <p className="text-[11px] text-muted-foreground">
              {totalCreators.toLocaleString()} creators discovered total
            </p>
          )}

          {/* Action button */}
          {!running ? (
            <Button onClick={mode === "creator" ? runCreatorSync : runAllSync} className="w-full">
              <Play className="h-4 w-4 mr-2" />
              {mode === "creator" ? "Sync Creator" : "Start Sync All"}
            </Button>
          ) : (
            <Button onClick={stopSync} variant="destructive" className="w-full">
              <Square className="h-4 w-4 mr-2" /> Stop Sync
            </Button>
          )}

          {/* Progress bar (all mode) */}
          {mode === "all" && (running || summary.processed > 0) && total > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">{done.toLocaleString()} / {total.toLocaleString()} creators</span>
                <span className="text-muted-foreground">{pct}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}

          {progress && (
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" /> {progress}
            </p>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/30 p-2 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /> {error}
            </div>
          )}

          {(summary.processed > 0 || summary.new > 0) && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                {summary.processed} creators · {summary.new} new posts
              </div>
              <p className="text-[11px] text-muted-foreground">
                {summary.total} latest posts checked
              </p>
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-0 max-h-56 overflow-y-auto rounded-md border border-border">
              {results.map((r, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-1.5 text-xs border-b border-border last:border-0">
                  <span className="truncate">@{r.creator}</span>
                  <span className={`font-medium shrink-0 ml-2 ${
                    r.status === "ok" ? "text-emerald-600" : r.status === "no_posts" ? "text-muted-foreground" : "text-destructive"
                  }`}>
                    {r.status === "ok" ? `+${r.new} new / ${r.posts}` : r.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
