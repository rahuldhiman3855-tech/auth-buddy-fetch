import { VideoPost, formatCount } from "@/lib/mockData";
import { Heart, MessageCircle, Eye, Play, Crown } from "lucide-react";
import { Link } from "react-router-dom";

interface Props {
  video: VideoPost;
}

export default function VideoCard({ video }: Props) {
  return (
    <Link
      to={`/video/${video.id}`}
      className="group relative flex flex-col overflow-hidden rounded-xl bg-card border border-border shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
    >
      {/* Thumbnail */}
      <div className="relative aspect-[3/4] overflow-hidden">
        <img
          src={video.thumbnailUrl}
          alt={video.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Play button */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/90 shadow-lg">
            <Play className="h-6 w-6 text-primary-foreground ml-0.5" fill="currentColor" />
          </div>
        </div>

        {/* Duration badge */}
        <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-2 py-0.5 text-xs font-medium text-white">
          {video.duration}
        </span>

        {/* Premium badge */}
        {video.isPremium && (
          <span className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-1 text-xs font-bold text-white">
            <Crown className="h-3 w-3" />
            Premium
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-2 p-3">
        <div className="flex items-start gap-2.5">
          <img
            src={video.creator.avatar}
            alt={video.creator.displayName}
            className="h-8 w-8 flex-shrink-0 rounded-full object-cover ring-2 ring-primary/20"
          />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-card-foreground line-clamp-2 leading-tight">
              {video.title}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {video.creator.displayName}
              {video.creator.isVerified && (
                <span className="ml-1 inline-block h-3.5 w-3.5 rounded-full bg-primary text-center text-[8px] leading-[14px] text-primary-foreground">✓</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            {formatCount(video.views)}
          </span>
          <span className="flex items-center gap-1">
            <Heart className="h-3.5 w-3.5" />
            {formatCount(video.likes)}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="h-3.5 w-3.5" />
            {formatCount(video.comments)}
          </span>
        </div>
      </div>
    </Link>
  );
}
