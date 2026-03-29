import { useState, useMemo } from "react";
import Navbar from "@/components/Navbar";
import HeroBanner from "@/components/HeroBanner";
import CategoryBar from "@/components/CategoryBar";
import CreatorSpotlight from "@/components/CreatorSpotlight";
import VideoCard from "@/components/VideoCard";
import { generateVideos } from "@/lib/mockData";

const allVideos = generateVideos(24);

export default function Index() {
  const [category, setCategory] = useState("all");

  const filtered = useMemo(
    () =>
      category === "all"
        ? allVideos
        : allVideos.filter((v) => v.category === category),
    [category]
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-6">
        <HeroBanner />

        <CreatorSpotlight />

        <CategoryBar selected={category} onSelect={setCategory} />

        <section className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground">
              {category === "all" ? "🎬 For You" : `📺 ${category.charAt(0).toUpperCase() + category.slice(1)} Videos`}
            </h2>
            <span className="text-sm text-muted-foreground">
              {filtered.length} videos
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {filtered.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <p className="text-4xl mb-3">📭</p>
              <p className="text-sm">No videos in this category yet</p>
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card mt-12">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-1">
              <span className="text-xl font-black italic text-primary">O</span>
              <span className="text-sm font-bold text-foreground">fficial.me</span>
            </div>
            <p className="text-xs text-muted-foreground">
              © 2026 Official.me — The Creator Super App
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
