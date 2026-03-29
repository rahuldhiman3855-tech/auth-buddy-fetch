import { useParams, Link } from "react-router-dom";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { useRef, useEffect, useState } from "react";
import {
  getInfluencer,
  getAllPosts,
  decodeContent,
  formatDuration,
  formatCount,
  type PostData,
  type InfluencerData,
} from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import {
  BadgeCheck,
  ArrowLeft,
  Play,
  Eye,
  Heart,
  Loader2,
  Clock,
  X,
  Download,
  HardDrive,
} from "lucide-react";

const PROXY_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/video-proxy`;
function proxyUrl(url?: string): string {
  if (!url) return "";
  return `${PROXY_BASE}?url=${encodeURIComponent(url)}`;
}

function PostCard({ post, onPlay }: { post: PostData; onPlay: (post: PostData) => void }) {
  const thumb = proxyUrl(post.thumbnailLocation || post.thumbnailUrl);
  const title = decodeContent(post.content) || "Untitled";
  const isPrivate = post.category === "private";
  const duration = formatDuration(post.duration);

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
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
            <Play className="h-10 w-10" />
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Play button on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/90 shadow-lg">
            <Play className="h-6 w-6 text-primary-foreground ml-0.5" fill="currentColor" />
          </div>
        </div>

        {/* Duration */}
        {duration && (
          <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/70 px-2 py-0.5 text-xs font-medium text-white">
            <Clock className="h-3 w-3" />
            {duration}
          </span>
        )}

        {/* Download button */}
        {(post.location || post.mediaUrl) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              const proxyBase = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/video-proxy`;
              const mediaUrl = post.location || post.mediaUrl || '';
              const proxiedUrl = `${proxyBase}?url=${encodeURIComponent(mediaUrl)}`;
              const a = document.createElement('a');
              a.href = proxiedUrl;
              a.download = `${decodeContent(post.content) || post._id}.${post.type === 'Video' ? 'mp4' : 'jpg'}`;
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

        {/* Type & Quality badges */}
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
          {post.fileSizeInMB && post.fileSizeInMB > 50 && (
            <span className="rounded-md bg-amber-500/90 px-2 py-0.5 text-[10px] font-bold text-white">
              HD
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5 p-3">
        <h3 className="text-sm font-semibold text-card-foreground line-clamp-2 leading-tight">
          {title}
        </h3>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {post.viewCount !== undefined && post.viewCount > 0 && (
            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {formatCount(post.viewCount)}
            </span>
          )}
          {post.likes && post.likes.length > 0 && (
            <span className="flex items-center gap-1">
              <Heart className="h-3.5 w-3.5" />
              {formatCount(post.likes.length)}
            </span>
          )}
          {post.date && (
            <span>
              {new Date(post.date).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
              })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CreatorProfile() {
  const { username } = useParams<{ username: string }>();
  const [activePost, setActivePost] = useState<PostData | null>(null);

  // Check if username is an ObjectID placeholder (hex string, 12 chars)
  const isObjectId = /^[a-f0-9]{12,24}$/.test(username || "");

  // For ObjectID usernames, load from DB (check both username and official_id)
  const { data: dbCreator } = useQuery({
    queryKey: ["db-creator", username],
    queryFn: async () => {
      // Try by username first
      const { data: byUsername } = await supabase
        .from("creators")
        .select("*")
        .eq("username", username!)
        .single();
      if (byUsername) return byUsername;
      // Fallback: try by official_id
      const { data: byOfficialId } = await supabase
        .from("creators")
        .select("*")
        .eq("official_id", username!)
        .single();
      return byOfficialId;
    },
    enabled: !!username && isObjectId,
  });

  // For real usernames, load from API
  const {
    data: apiInfluencer,
    isLoading: loadingInfluencer,
    error: influencerError,
  } = useQuery({
    queryKey: ["influencer", username],
    queryFn: () => getInfluencer(username!),
    enabled: !!username && !isObjectId,
  });

  // Build a unified influencer object
  const influencer: Partial<InfluencerData> | undefined = isObjectId && dbCreator
    ? {
        _id: dbCreator.official_id,
        username: dbCreator.username,
        name: dbCreator.name,
        userProfileImage: dbCreator.profile_pic,
        coverPic: dbCreator.cover_pic,
        userBio: dbCreator.bio,
        category: dbCreator.category,
        followerCount: dbCreator.follower_count,
        videoCount: dbCreator.video_count,
        postCount: dbCreator.post_count,
        isVerified: dbCreator.is_verified,
      }
    : apiInfluencer;

  const influencerId = influencer?._id || (isObjectId && dbCreator?.official_id);

  const PAGE_SIZE = 10;

  const {
    data: postsData,
    isLoading: loadingPosts,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["posts", influencerId],
    queryFn: ({ pageParam = 0 }) => getAllPosts(influencerId!, pageParam, PAGE_SIZE),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.reduce((sum, page) => sum + page.length, 0);
    },
    initialPageParam: 0,
    enabled: !!influencerId,
  });

  const posts = postsData?.pages.flat() ?? [];

  // Update creator post count in DB when posts are loaded
  useEffect(() => {
    if (influencerId && posts.length > 0) {
      const validPosts = posts.filter(p => !p.isDeleted && !p.isHided);
      supabase
        .from("creators")
        .update({
          post_count: validPosts.length,
          video_count: validPosts.filter(p => p.type === "Video").length,
          updated_at: new Date().toISOString(),
        })
        .eq("official_id", influencerId)
        .then(() => {});
    }
  }, [influencerId, posts.length]);

  // Intersection observer for infinite scroll
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loadMoreRef.current || !hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const profileImage = proxyUrl(influencer?.userProfileImage || influencer?.profilePic);
  const bio = influencer?.userBio || influencer?.bio || "";
  const totalPosts = influencer?.videoCount || influencer?.postCount || posts?.length || 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        {loadingInfluencer && (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {influencerError && (
          <div className="flex flex-col items-center justify-center py-32">
            <p className="text-5xl mb-4">😕</p>
            <p className="text-muted-foreground">Could not load creator profile</p>
            <p className="text-xs text-muted-foreground mt-1">
              {(influencerError as Error).message}
            </p>
          </div>
        )}

        {influencer && (
          <>
            {/* Profile header */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-accent/10 to-muted">
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />
              <div className="relative px-6 pb-6 pt-16 md:px-10 md:pt-24">
                <div className="flex flex-col md:flex-row md:items-end gap-5">
                  <div className="h-24 w-24 md:h-32 md:w-32 rounded-full p-1 bg-gradient-to-br from-primary to-accent shadow-xl">
                    {profileImage ? (
                      <img
                        src={profileImage}
                        alt={influencer.name}
                        className="h-full w-full rounded-full object-cover border-4 border-card"
                      />
                    ) : (
                      <div className="h-full w-full rounded-full bg-muted border-4 border-card flex items-center justify-center text-3xl font-bold text-primary">
                        {influencer.name?.[0]?.toUpperCase() || "?"}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h1 className="text-2xl font-black text-foreground md:text-3xl">
                        {influencer.name}
                      </h1>
                      {influencer.isVerifiedEmail && (
                        <BadgeCheck className="h-6 w-6 text-primary" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">@{influencer.username}</p>
                    {bio && (
                      <p className="mt-2 text-sm text-foreground/80 max-w-lg">{bio}</p>
                    )}
                    <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
                      <span>
                        <span className="font-bold text-foreground">{totalPosts}</span> videos
                      </span>
                      {influencer.imageCount ? (
                        <>
                          <span>•</span>
                          <span>
                            <span className="font-bold text-foreground">{influencer.imageCount}</span> images
                          </span>
                        </>
                      ) : null}
                    </div>

                  </div>
                </div>
              </div>
            </div>

            {/* Posts */}
            <section className="mt-8">
              <h2 className="text-lg font-bold text-foreground mb-4">
                📺 Videos & Posts ({posts.length})
              </h2>

              {loadingPosts && (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}

              {posts.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {posts
                      .filter((p) => !p.isDeleted && !p.isHided)
                      .map((post) => (
                        <PostCard key={post._id} post={post} onPlay={setActivePost} />
                      ))}
                  </div>

                  {/* Infinite scroll trigger */}
                  <div ref={loadMoreRef} className="flex items-center justify-center py-8">
                    {isFetchingNextPage && (
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    )}
                    {!hasNextPage && posts.length > PAGE_SIZE && (
                      <p className="text-xs text-muted-foreground">No more posts</p>
                    )}
                  </div>
                </>
              ) : (
                !loadingPosts && (
                  <div className="flex flex-col items-center py-16 text-muted-foreground">
                    <p className="text-4xl mb-3">🎬</p>
                    <p className="text-sm">No posts yet</p>
                  </div>
                )
              )}
            </section>
          </>
        )}

        {/* Video Player Modal */}
        {activePost && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setActivePost(null)}
          >
            <div
              className="relative w-full max-w-4xl mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setActivePost(null)}
                className="absolute -top-10 right-0 text-white hover:text-primary transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
              <div className="rounded-xl overflow-hidden bg-black">
                {(() => {
                  const mediaUrl = activePost.location || activePost.mediaUrl || '';
                  const proxiedUrl = proxyUrl(mediaUrl);
                  if (activePost.type === "Video" && mediaUrl) {
                    return (
                      <video
                        src={proxiedUrl}
                        controls
                        autoPlay
                        className="w-full max-h-[80vh]"
                        poster={proxyUrl(activePost.thumbnailLocation || activePost.thumbnailUrl)}
                      />
                    );
                  } else if (mediaUrl) {
                    return (
                      <img
                        src={proxiedUrl}
                        alt={decodeContent(activePost.content)}
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
              <p className="mt-3 text-sm text-white/80 line-clamp-2">
                {decodeContent(activePost.content)}
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
