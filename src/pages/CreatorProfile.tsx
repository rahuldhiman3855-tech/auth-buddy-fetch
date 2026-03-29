import { useParams, Link } from "react-router-dom";
import { creators, generateVideos, formatCount } from "@/lib/mockData";
import Navbar from "@/components/Navbar";
import VideoCard from "@/components/VideoCard";
import { BadgeCheck, MapPin, Link as LinkIcon, ArrowLeft } from "lucide-react";

const allVideos = generateVideos(24);

export default function CreatorProfile() {
  const { username } = useParams();
  const creator = creators.find((c) => c.username === username);

  if (!creator) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-32">
          <p className="text-5xl mb-4">🤷</p>
          <p className="text-muted-foreground">Creator not found</p>
          <Link to="/" className="mt-4 text-sm text-primary hover:underline">Go back home</Link>
        </div>
      </div>
    );
  }

  const creatorVideos = allVideos.filter((v) => v.creatorId === creator.id);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        {/* Profile header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-accent/10 to-muted">
          <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
          <div className="relative px-6 pb-6 pt-16 md:px-10 md:pt-24">
            <div className="flex flex-col md:flex-row md:items-end gap-5">
              <div className="h-24 w-24 md:h-32 md:w-32 rounded-full p-1 bg-gradient-to-br from-primary to-accent shadow-xl">
                <img
                  src={creator.avatar}
                  alt={creator.displayName}
                  className="h-full w-full rounded-full object-cover border-4 border-card"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-black text-foreground md:text-3xl">
                    {creator.displayName}
                  </h1>
                  {creator.isVerified && <BadgeCheck className="h-6 w-6 text-primary" />}
                </div>
                <p className="text-sm text-muted-foreground mt-1">@{creator.username}</p>
                <p className="mt-2 text-sm text-foreground/80 max-w-lg">{creator.bio}</p>
                <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="font-bold text-foreground">{formatCount(creator.followers)}</span> followers
                  <span>•</span>
                  <span className="font-bold text-foreground">{creatorVideos.length}</span> videos
                </div>
              </div>
              <button className="self-start md:self-end rounded-full bg-primary px-8 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 transition-opacity shadow-lg">
                Follow
              </button>
            </div>
          </div>
        </div>

        {/* Videos */}
        <section className="mt-8">
          <h2 className="text-lg font-bold text-foreground mb-4">📺 Videos</h2>
          {creatorVideos.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {creatorVideos.map((v) => (
                <VideoCard key={v.id} video={v} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-16 text-muted-foreground">
              <p className="text-4xl mb-3">🎬</p>
              <p className="text-sm">No videos yet</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
