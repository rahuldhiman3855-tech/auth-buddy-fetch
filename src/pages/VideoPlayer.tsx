import { useParams, Link } from "react-router-dom";
import { generateVideos, formatCount } from "@/lib/mockData";
import Navbar from "@/components/Navbar";
import VideoCard from "@/components/VideoCard";
import { Heart, MessageCircle, Share2, BookmarkPlus, BadgeCheck, Eye, ThumbsUp, ArrowLeft } from "lucide-react";
import { useState } from "react";

const allVideos = generateVideos(24);

export default function VideoPlayer() {
  const { id } = useParams();
  const video = allVideos.find((v) => v.id === id);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!video) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-32">
          <p className="text-5xl mb-4">😕</p>
          <p className="text-muted-foreground">Video not found</p>
          <Link to="/" className="mt-4 text-sm text-primary hover:underline">Go back home</Link>
        </div>
      </div>
    );
  }

  const related = allVideos.filter((v) => v.id !== id && v.category === video.category).slice(0, 8);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Main video area */}
          <div>
            {/* Video placeholder */}
            <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
              <img
                src={video.thumbnailUrl}
                alt={video.title}
                className="h-full w-full object-cover opacity-80"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/90 shadow-2xl cursor-pointer hover:scale-110 transition-transform">
                  <svg className="h-8 w-8 text-primary-foreground ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Video info */}
            <div className="mt-4 space-y-3">
              <h1 className="text-xl font-bold text-foreground md:text-2xl">{video.title}</h1>

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Eye className="h-4 w-4" />{formatCount(video.views)} views</span>
                <span>{new Date(video.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setLiked(!liked)}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    liked ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  <ThumbsUp className="h-4 w-4" />
                  {formatCount(video.likes + (liked ? 1 : 0))}
                </button>
                <button className="flex items-center gap-1.5 rounded-full bg-muted px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/80">
                  <MessageCircle className="h-4 w-4" />
                  {formatCount(video.comments)}
                </button>
                <button className="flex items-center gap-1.5 rounded-full bg-muted px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/80">
                  <Share2 className="h-4 w-4" />
                  Share
                </button>
                <button
                  onClick={() => setSaved(!saved)}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    saved ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  <BookmarkPlus className="h-4 w-4" />
                  {saved ? "Saved" : "Save"}
                </button>
              </div>

              {/* Creator card */}
              <Link
                to={`/creator/${video.creator.username}`}
                className="flex items-center gap-3 rounded-xl bg-card border border-border p-4 hover:shadow-md transition-shadow"
              >
                <img src={video.creator.avatar} alt="" className="h-12 w-12 rounded-full object-cover ring-2 ring-primary/20" />
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-foreground">{video.creator.displayName}</span>
                    {video.creator.isVerified && <BadgeCheck className="h-4 w-4 text-primary" />}
                  </div>
                  <p className="text-xs text-muted-foreground">{formatCount(video.creator.followers)} followers</p>
                </div>
                <button className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90">
                  Follow
                </button>
              </Link>

              <div className="rounded-xl bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">{video.description}</p>
              </div>
            </div>
          </div>

          {/* Related videos */}
          <aside>
            <h3 className="mb-3 text-sm font-bold text-foreground">More {video.category} videos</h3>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
              {related.map((v) => (
                <VideoCard key={v.id} video={v} />
              ))}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
