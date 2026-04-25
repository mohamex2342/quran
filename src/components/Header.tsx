import { Link } from "react-router-dom";
import { Sparkles, Languages } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function Header() {
  const { t, toggle, lang } = useI18n();
  return (
    <header className="absolute top-0 left-0 right-0 z-50">
      <div className="container flex items-center justify-between py-6">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow group-hover:scale-105 transition-transform">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-display text-2xl font-semibold tracking-tight">
            {lang === "ar" ? "نور" : "Noor"}
            <span className="text-gradient-gold">.</span>
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="/#features" className="hover:text-foreground transition-colors">{t("nav.features")}</a>
          <a href="/#how" className="hover:text-foreground transition-colors">{t("nav.how")}</a>
          <a href="/#pricing" className="hover:text-foreground transition-colors">{t("nav.pricing")}</a>
        </nav>
        <div className="flex items-center gap-3">
          <button
            onClick={toggle}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full glass text-xs text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Toggle language"
          >
            <Languages className="w-3.5 h-3.5" />
            {t("lang.toggle")}
          </button>
          <Link
            to="/studio"
            className="px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-glow"
          >
            {t("nav.openStudio")}
          </Link>
        </div>
      </div>
    </header>
  );
}
