import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import heroImg from "@/assets/hero.jpg";
import { ArrowRight, Mic2, Type, Image as ImageIcon, Download, Wand2, Music4 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function Landing() {
  const { t, lang, dir } = useI18n();
  const isAr = lang === "ar";
  const Arrow = () => <ArrowRight className={`w-4 h-4 ${dir === "rtl" ? "rotate-180" : ""}`} />;

  return (
    <div className="min-h-screen overflow-hidden">
      <Header />

      {/* Hero */}
      <section className="relative min-h-screen flex items-center pt-32 pb-20">
        <div className="absolute inset-0 star-field opacity-60 pointer-events-none" />
        <div className={`absolute -top-32 ${isAr ? "-left-32" : "-right-32"} w-[600px] h-[600px] rounded-full bg-gradient-aurora opacity-30 blur-3xl animate-drift pointer-events-none`} />
        <div className={`absolute -bottom-40 ${isAr ? "-right-32" : "-left-32"} w-[500px] h-[500px] rounded-full bg-primary/20 blur-3xl animate-pulse-glow pointer-events-none`} />

        <div className="container relative z-10 grid lg:grid-cols-2 gap-12 items-center">
          <div className="animate-fade-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs text-muted-foreground mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              {t("hero.badge")}
            </div>
            <h1 className={`font-display text-5xl md:text-7xl font-semibold leading-[0.95] tracking-tight mb-6 ${isAr ? "font-arabic" : ""}`}>
              {t("hero.title.1")}{" "}
              <span className="text-gradient-gold italic">{t("hero.title.2")}</span>{" "}
              {t("hero.title.3")}
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl leading-relaxed">
              {t("hero.subtitle")}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/studio"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-gradient-primary text-primary-foreground font-medium shadow-glow hover:shadow-gold transition-all hover:scale-[1.02]"
              >
                {t("hero.cta.primary")}
                <Arrow />
              </Link>
              <a
                href="#how"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full glass font-medium hover:bg-secondary transition-colors"
              >
                {t("hero.cta.secondary")}
              </a>
            </div>
            <div className="flex items-center gap-6 mt-10 text-sm text-muted-foreground flex-wrap">
              <div className="flex items-center gap-2"><Mic2 className="w-4 h-4 text-accent" /> {t("hero.stats.reciters")}</div>
              <div className="flex items-center gap-2"><Type className="w-4 h-4 text-accent" /> {t("hero.stats.translations")}</div>
              <div className="flex items-center gap-2"><Download className="w-4 h-4 text-accent" /> {t("hero.stats.export")}</div>
            </div>
          </div>

          <div className="relative animate-fade-up" style={{ animationDelay: "0.15s" }}>
            <div className="absolute inset-0 bg-gradient-aurora opacity-40 blur-3xl" />
            <div className="relative rounded-3xl overflow-hidden glass shadow-card aspect-[4/3]">
              <img
                src={heroImg}
                alt={isAr ? "معاينة فيديو قرآني سينمائي مع هلال وصورة ظلية لمسجد" : "Cinematic Quran video preview with crescent moon and mosque silhouette"}
                className="w-full h-full object-cover"
                width={1600}
                height={1200}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-glow">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-primary-foreground ml-0.5">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground">{t("hero.nowPlaying")}</div>
                  <div className="text-sm font-medium">{t("hero.nowPlaying.value")}</div>
                </div>
              </div>
            </div>
            <div className={`absolute ${isAr ? "-right-6" : "-left-6"} top-12 glass rounded-2xl px-5 py-4 shadow-card animate-float hidden md:block`}>
              <div className="text-xs text-accent mb-1">{t("hero.ayah1")}</div>
              <div className="font-arabic text-2xl text-foreground" dir="rtl">بِسْمِ ٱللَّهِ</div>
            </div>
            <div className={`absolute ${isAr ? "-left-4" : "-right-4"} bottom-20 glass rounded-2xl px-4 py-3 shadow-card animate-float hidden md:block`} style={{ animationDelay: "1s" }}>
              <div className="text-xs text-muted-foreground">{t("hero.exporting")}</div>
              <div className="text-sm font-medium" dir="ltr">1080×1920 · 30fps</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-32 relative">
        <div className="container">
          <div className="max-w-2xl mb-16">
            <div className="text-sm text-accent mb-3 font-medium tracking-wider uppercase">{t("features.kicker")}</div>
            <h2 className="font-display text-4xl md:text-5xl font-semibold mb-4">
              {t("features.title.1")} <em className="text-gradient-gold not-italic">{t("features.title.2")}</em>.
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Mic2, title: t("features.f1.title"), desc: t("features.f1.desc") },
              { icon: Type, title: t("features.f2.title"), desc: t("features.f2.desc") },
              { icon: ImageIcon, title: t("features.f3.title"), desc: t("features.f3.desc") },
              { icon: Wand2, title: t("features.f4.title"), desc: t("features.f4.desc") },
              { icon: Music4, title: t("features.f5.title"), desc: t("features.f5.desc") },
              { icon: Download, title: t("features.f6.title"), desc: t("features.f6.desc") },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="glass rounded-2xl p-6 hover:border-primary/50 transition-colors group">
                <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center mb-4 group-hover:bg-primary/25 transition-colors">
                  <Icon className="w-5 h-5 text-primary-glow" />
                </div>
                <h3 className="font-display text-2xl font-semibold mb-2">{title}</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-32 relative">
        <div className="absolute inset-0 star-field opacity-30 pointer-events-none" />
        <div className="container relative z-10">
          <div className="max-w-2xl mb-16">
            <div className="text-sm text-accent mb-3 font-medium tracking-wider uppercase">{t("how.kicker")}</div>
            <h2 className="font-display text-4xl md:text-5xl font-semibold">
              {t("how.title.1")} <em className="text-gradient-gold not-italic">{t("how.title.2")}</em> {t("how.title.3")}
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { n: "01", title: t("how.step1.title"), desc: t("how.step1.desc") },
              { n: "02", title: t("how.step2.title"), desc: t("how.step2.desc") },
              { n: "03", title: t("how.step3.title"), desc: t("how.step3.desc") },
            ].map((step) => (
              <div key={step.n} className="relative">
                <div className="font-display text-7xl font-semibold text-gradient-primary opacity-80 mb-4">{step.n}</div>
                <h3 className="font-display text-2xl font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-32 relative">
        <div className="container">
          <div className="max-w-2xl mb-16">
            <div className="text-sm text-accent mb-3 font-medium tracking-wider uppercase">{t("pricing.kicker")}</div>
            <h2 className="font-display text-4xl md:text-5xl font-semibold">{t("pricing.title")}</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
            <div className="glass rounded-3xl p-8">
              <div className="text-sm text-muted-foreground mb-2">{t("pricing.free")}</div>
              <div className="font-display text-5xl font-semibold mb-1">$0</div>
              <div className="text-sm text-muted-foreground mb-6">{t("pricing.forever")}</div>
              <ul className="space-y-3 text-sm">
                <li>{t("pricing.free.f1")}</li>
                <li>{t("pricing.free.f2")}</li>
                <li>{t("pricing.free.f3")}</li>
                <li>{t("pricing.free.f4")}</li>
              </ul>
            </div>
            <div className="rounded-3xl p-8 bg-gradient-to-br from-primary/20 to-primary-glow/10 border border-primary/40 shadow-glow relative overflow-hidden">
              <div className={`absolute top-4 ${isAr ? "left-4" : "right-4"} px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-semibold`}>{t("pricing.soon")}</div>
              <div className="text-sm text-accent mb-2">{t("pricing.pro")}</div>
              <div className="font-display text-5xl font-semibold mb-1">$9</div>
              <div className="text-sm text-muted-foreground mb-6">{t("pricing.perMonth")}</div>
              <ul className="space-y-3 text-sm">
                <li>{t("pricing.pro.f1")}</li>
                <li>{t("pricing.pro.f2")}</li>
                <li>{t("pricing.pro.f3")}</li>
                <li>{t("pricing.pro.f4")}</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 relative">
        <div className="container">
          <div className="relative rounded-3xl p-12 md:p-20 text-center glass overflow-hidden">
            <div className="absolute inset-0 bg-gradient-aurora opacity-20 blur-2xl" />
            <div className="relative">
              <h2 className="font-display text-4xl md:text-6xl font-semibold mb-6 max-w-3xl mx-auto leading-tight">
                {t("cta.title")}
              </h2>
              <Link
                to="/studio"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-primary text-primary-foreground font-medium shadow-glow hover:scale-[1.02] transition-transform"
              >
                {t("cta.button")}
                <Arrow />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-12 border-t border-border">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div>{t("footer.rights", { year: new Date().getFullYear() })}</div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-foreground">{t("footer.privacy")}</a>
            <a href="#" className="hover:text-foreground">{t("footer.terms")}</a>
            <a href="#" className="hover:text-foreground">{t("footer.contact")}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
