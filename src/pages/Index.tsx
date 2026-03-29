import { useState, useMemo } from "react";
import Navbar from "@/components/Navbar";
import HeroBanner from "@/components/HeroBanner";
import CategoryBar from "@/components/CategoryBar";
import CreatorSpotlight from "@/components/CreatorSpotlight";
import VideoCard from "@/components/VideoCard";
import { generateVideos } from "@/lib/mockData";
import { Link } from "react-router-dom";

const allVideos = generateVideos(24);

export default function Index() {
  const [category, setCategory] = useState("all");
  const [creatorInput, setCreatorInput] = useState("");

  const filtered = useMemo(
    () => (category === "all" ? allVideos : allVideos.filter((v) => v.category === category)),
    [category],
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-6">
        <HeroBanner />
      </main>

      <footer className="border-t border-border bg-card mt-12">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-1">
              <span className="text-xl font-black italic text-primary">O</span>
              <span className="text-sm font-bold text-foreground">fficial.me</span>
            </div>
            <p className="text-xs text-muted-foreground">© 2026 Official.me — The Creator Super App</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
