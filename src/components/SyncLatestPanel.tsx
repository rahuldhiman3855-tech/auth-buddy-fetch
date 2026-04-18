import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, RefreshCw, User, Globe, X, CheckCircle2, AlertCircle } from "lucide-react";

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
  const [offset, setOffset] = useState("0");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const [results, setResults] = useState<SyncResult[]>([]);
  const [summary, setSummary] = useState<{ total: number; new: number; processed: number } | null>(null);
  const [error, setError] = useState<string>("");

  const runSync = async (autoContinue = false) => {
    setRunning(true);
    setError("");
    if (!autoContinue) {
      setResults([]);
      setSummary(null);
    }

    try {
      const params = new URLSearchParams();
      params.set("posts", postsPerCreator);

      if (mode === "creator") {
        if (!username.trim()) {
          setError("Please enter a username");
          setRunning(false);
          return;
        }
        params.set("username", username.trim());
      } else {
        params.set("offset", offset);
        params.set("limit", batchSize);
      }

      setProgress(mode === "creator" ? `Syncing @${username}...` : `Syncing creators ${offset} → ${Number(offset) + Number(batchSize)}...`);

      const res = await fetch(`${FN_URL}?${params.toString()}`, {
        headers: { apikey: ANON, authorization: `Bearer ${ANON}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setResults(prev => [...prev, ...(data.results ?? [])]);
      setSummary(prev => ({
        total: (prev?.total ?? 0) + (data.totalPosts ?? 0),
        new: (prev?.new ?? 0) + (data.newPosts ?? 0),
        processed: (prev?.processed ?? 0) + (data.processed ?? 0),
      }));
      setProgress("");

      onSynced();

      // Auto-continue for "all" mode
      if (mode === "all" && data.hasMore) {
        setOffset(String(Number(offset) + Number(batchSize)));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col rounded-xl bg-card border border-border shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-primary" />
            Sync Latest Posts
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Mode toggle */}
          <div className="flex items-center gap-1 rounded-lg border border-border p-1 bg-muted/50">
            <button
              onClick={() => setMode("all")}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                mode === "all" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Globe className="h-3.5 w-3.5" /> All Creators
            </button>
            <button
              onClick={() => setMode("creator")}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                mode === "creator" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <User className="h-3.5 w-3.5" /> Specific Creator
            </button>
          </div>

          {mode === "creator" ? (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Creator username</label>
              <Input
                placeholder="e.g. abc123"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={running}
              />
              <p className="text-[11px] text-muted-foreground">Creator must already exist in your discovered list.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Start offset</label>
                <Input type="number" min={0} value={offset} onChange={(e) => setOffset(e.target.value)} disabled={running} />
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

          <Button onClick={() => runSync()} disabled={running} className="w-full">
            {running ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Syncing...</>
            ) : (
              <><RefreshCw className="h-4 w-4 mr-2" /> {mode === "creator" ? "Sync Creator" : "Sync Batch"}</>
            )}
          </Button>

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

          {summary && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                {summary.processed} creators · {summary.new} new posts
              </div>
              <p className="text-[11px] text-muted-foreground">
                {summary.total} latest posts checked · {summary.new} added/updated
              </p>
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-1 max-h-48 overflow-y-auto rounded-md border border-border">
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
