import { Search, Bell, User, Menu } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

export default function Navbar() {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-1">
          <span className="text-2xl font-black italic text-primary">O</span>
          <span className="text-lg font-bold tracking-tight text-foreground">fficial.me</span>
        </Link>

        <div className="hidden md:flex items-center gap-1 rounded-full bg-muted px-4 py-2 w-96">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search creators, videos..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="md:hidden rounded-full p-2 hover:bg-muted"
          >
            <Search className="h-5 w-5 text-muted-foreground" />
          </button>
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

      {searchOpen && (
        <div className="md:hidden border-t border-border px-4 py-3">
          <div className="flex items-center gap-2 rounded-full bg-muted px-4 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search creators, videos..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              autoFocus
            />
          </div>
        </div>
      )}
    </nav>
  );
}
