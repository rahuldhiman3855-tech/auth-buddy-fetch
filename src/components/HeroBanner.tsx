import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

export default function HeroBanner() {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-accent to-primary/80 px-6 py-10 md:px-12 md:py-16">
      {/* Decorative shapes */}
      <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -bottom-12 -left-12 h-52 w-52 rounded-full bg-white/10 blur-3xl" />

      <div className="relative z-10 max-w-xl">
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white">
          <Sparkles className="h-3.5 w-3.5" />
          100,000+ creators strong
        </div>
        <h1 className="text-3xl font-black leading-tight text-white md:text-5xl">
          The Creator Super App
          <br />
          <span className="text-white/80">that maximizes profits.</span>
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-white/70 md:text-base">
          Whether you're a pro or just starting out — maximize your income and
          save on expenses, all in one place.
        </p>
        <Link
          to="/signup"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-primary shadow-lg hover:shadow-xl transition-all hover:scale-105"
        >
          Sign Up Now
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
