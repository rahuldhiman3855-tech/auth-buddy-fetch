import { categories } from "@/lib/mockData";
import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  selected: string;
  onSelect: (id: string) => void;
}

export default function CategoryBar({ selected, onSelect }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const scroll = (dir: number) => {
    ref.current?.scrollBy({ left: dir * 200, behavior: "smooth" });
  };

  return (
    <div className="relative group">
      <button
        onClick={() => scroll(-1)}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 hidden group-hover:flex h-8 w-8 items-center justify-center rounded-full bg-card shadow-md border border-border"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div
        ref={ref}
        className="flex gap-2 overflow-x-auto scrollbar-hide px-1 py-3"
      >
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className={`flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all ${
              selected === cat.id
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-card text-muted-foreground hover:bg-muted border border-border"
            }`}
          >
            <span className="mr-1.5">{cat.emoji}</span>
            {cat.name}
          </button>
        ))}
      </div>

      <button
        onClick={() => scroll(1)}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 hidden group-hover:flex h-8 w-8 items-center justify-center rounded-full bg-card shadow-md border border-border"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
