import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, XCircle, User, FileVideo, ArrowDown } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface SyncLogEntry {
  id: string;
  run_id: string;
  creator_username: string | null;
  creator_name: string | null;
  posts_synced: number | null;
  status: string | null;
  message: string | null;
  creators_done: number | null;
  creators_total: number | null;
  created_at: string | null;
}

export default function SyncProgressPanel({ isVisible }: { isVisible: boolean }) {
  const [logs, setLogs] = useState<SyncLogEntry[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isVisible) return;

    // Fetch recent logs
    const fetchLogs = async () => {
      const { data } = await supabase
        .from("sync_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (data) setLogs(data.reverse() as SyncLogEntry[]);
    };
    fetchLogs();

    // Subscribe to realtime
    const channel = supabase
      .channel("sync-progress")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "sync_log" },
        (payload) => {
          setLogs((prev) => [...prev.slice(-99), payload.new as SyncLogEntry]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isVisible]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  if (!isVisible || logs.length === 0) return null;

  const latest = logs[logs.length - 1];
  const progress = latest?.creators_total
    ? Math.round(((latest.creators_done ?? 0) / latest.creators_total) * 100)
    : 0;

  const statusIcon = (status: string | null) => {
    switch (status) {
      case "synced":
      case "batch_complete":
        return <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />;
      case "failed":
      case "upsert_error":
        return <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />;
      case "running":
        return <Loader2 className="h-3.5 w-3.5 text-primary animate-spin shrink-0" />;
      default:
        return <FileVideo className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card shadow-lg overflow-hidden">
      {/* Header with progress */}
      <div className="p-3 border-b border-border bg-muted/50 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Sync Progress
          </h3>
          <span className="text-xs text-muted-foreground">
            {latest?.creators_done ?? 0} / {latest?.creators_total ?? "?"} creators
          </span>
        </div>
        <Progress value={progress} className="h-2" />
        <p className="text-xs text-muted-foreground">{progress}% complete</p>
      </div>

      {/* Live log feed */}
      <div
        ref={scrollRef}
        className="max-h-60 overflow-y-auto p-2 space-y-1"
        onScroll={(e) => {
          const el = e.currentTarget;
          const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 30;
          setAutoScroll(isAtBottom);
        }}
      >
        {logs.map((log) => (
          <div
            key={log.id}
            className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-muted/50 transition-colors"
          >
            {statusIcon(log.status)}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {log.creator_username && (
                  <span className="font-medium text-foreground flex items-center gap-1">
                    <User className="h-3 w-3" />
                    @{log.creator_username}
                  </span>
                )}
                {log.posts_synced && log.posts_synced > 0 && (
                  <span className="text-emerald-600 font-medium">
                    +{log.posts_synced} posts
                  </span>
                )}
              </div>
              {log.message && (
                <p className="text-muted-foreground truncate">{log.message}</p>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground shrink-0">
              {log.created_at ? new Date(log.created_at).toLocaleTimeString() : ""}
            </span>
          </div>
        ))}
      </div>

      {!autoScroll && (
        <button
          onClick={() => {
            setAutoScroll(true);
            scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
          }}
          className="w-full flex items-center justify-center gap-1 py-1.5 text-xs text-primary bg-muted/50 border-t border-border hover:bg-muted"
        >
          <ArrowDown className="h-3 w-3" /> Scroll to latest
        </button>
      )}
    </div>
  );
}
