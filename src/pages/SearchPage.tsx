import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getInfluencer, formatCount } from "@/lib/api";
import Navbar from "@/components/Navbar";
import { Search, ArrowLeft, Loader2, BadgeCheck, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const {
    data: result,
    isLoading,
    error,
    isFetched,
  } = useQuery({
    queryKey: ["search-creator", searchTerm],
    queryFn: () => getInfluencer(searchTerm),
    enabled: searchTerm.length > 0,
    retry: false,
  });

  const handleSearch = () => {
    const trimmed = query.trim();
    if (trimmed) setSearchTerm(trimmed);
  };

  const profileImage = result?.userProfileImage || result?.profilePic || "";
  const bio = result?.userBio || result?.bio || "";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <h1 className="text-2xl font-black text-foreground mb-2">
          🔍 Find a Creator
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Enter a creator's username to view their profile and content.
        </p>

        <div className="flex gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-xl bg-card border border-border px-4 py-3 focus-within:ring-2 focus-within:ring-primary/40">
            <Search className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="e.g. pankhurikunall"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              autoFocus
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={!query.trim()}
            className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            Search
          </button>
        </div>

        {/* Result */}
        <div className="mt-8">
          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}

          {error && isFetched && (
            <div className="flex flex-col items-center py-16 text-muted-foreground">
              <p className="text-4xl mb-3">🤷</p>
              <p className="text-sm">
                No creator found with username <span className="font-semibold text-foreground">"{searchTerm}"</span>
              </p>
              <p className="text-xs mt-1">Check the spelling and try again.</p>
            </div>
          )}

          {result && !isLoading && (
            <button
              onClick={() => navigate(`/creator/${result.username}`)}
              className="w-full text-left flex items-center gap-4 rounded-xl bg-card border border-border p-5 hover:shadow-lg hover:border-primary/30 transition-all group"
            >
              <div className="h-16 w-16 flex-shrink-0 rounded-full p-0.5 bg-gradient-to-br from-primary to-accent">
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt={result.name}
                    className="h-full w-full rounded-full object-cover border-2 border-card"
                  />
                ) : (
                  <div className="h-full w-full rounded-full bg-muted border-2 border-card flex items-center justify-center text-xl font-bold text-primary">
                    {result.name?.[0]?.toUpperCase() || "?"}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                    {result.name}
                  </span>
                  {result.isVerifiedEmail && (
                    <BadgeCheck className="h-5 w-5 text-primary" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">@{result.username}</p>
                {bio && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{bio}</p>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  {result.videoCount ? (
                    <span><span className="font-semibold text-foreground">{result.videoCount}</span> videos</span>
                  ) : null}
                  {result.imageCount ? (
                    <span><span className="font-semibold text-foreground">{result.imageCount}</span> images</span>
                  ) : null}
                </div>
              </div>

              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
            </button>
          )}
        </div>

        {/* Recent searches hint */}
        {!searchTerm && (
          <div className="mt-12 text-center text-muted-foreground">
            <p className="text-3xl mb-3">✨</p>
            <p className="text-sm">Type a username and hit Search or Enter</p>
          </div>
        )}
      </main>
    </div>
  );
}
