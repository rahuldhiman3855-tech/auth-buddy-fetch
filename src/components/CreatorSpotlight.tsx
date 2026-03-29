import { creators, formatCount } from "@/lib/mockData";
import { Link } from "react-router-dom";
import { BadgeCheck } from "lucide-react";

export default function CreatorSpotlight() {
  return (
    <section className="py-6">
      <h2 className="mb-4 text-lg font-bold text-foreground">
        🔥 Trending Creators
      </h2>
      <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
        {creators.map((c) => (
          <Link
            key={c.id}
            to={`/creator/${c.username}`}
            className="flex flex-shrink-0 flex-col items-center gap-2 w-24 group"
          >
            <div className="relative">
              <div className="h-20 w-20 rounded-full p-0.5 bg-gradient-to-br from-primary to-accent">
                <img
                  src={c.avatar}
                  alt={c.displayName}
                  className="h-full w-full rounded-full object-cover border-2 border-card"
                />
              </div>
              {c.isVerified && (
                <BadgeCheck className="absolute -bottom-0.5 right-0 h-5 w-5 text-primary fill-primary stroke-primary-foreground" />
              )}
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                {c.displayName}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {formatCount(c.followers)} followers
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
