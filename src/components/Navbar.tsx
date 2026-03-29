import { Search, Bell } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Navbar() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = () => {
    const trimmed = query.trim();
    if (trimmed) {
      navigate(`/search?q=${encodeURIComponent(trimmed)}`);
      setQuery("");
      setSearchOpen(false);
    }
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-1">
          <span className="text-2xl font-black italic text-primary">O</span>
          <span className="text-lg font-bold tracking-tight text-foreground">fficial.me</span>
        </Link>

        <Link
          to="/search"
          className="hidden md:flex items-center gap-1 rounded-full bg-muted px-4 py-2 w-96 hover:bg-muted/80 transition-colors cursor-pointer"
        >
          <Search className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Search creators...</span>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            to="/search"
            className="md:hidden rounded-full p-2 hover:bg-muted"
          >
            <Search className="h-5 w-5 text-muted-foreground" />
          </Link>
          <button className="relative rounded-full p-2 hover:bg-muted">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
          </button>
          <Link
            to="/login"
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Creator Login
          </Link>
        </div>
      </div>
    </nav>
  );
}
