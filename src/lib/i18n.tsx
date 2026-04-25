import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Lang = "ar" | "en";

type Dict = Record<string, string>;

const ar: Dict = {
  // Header / Nav
  "nav.features": "المميزات",
  "nav.how": "كيف يعمل",
  "nav.pricing": "الأسعار",
  "nav.openStudio": "افتح الاستوديو",

  // Landing hero
  "hero.badge": "استوديو فيديوهات قرآنية سينمائي · في متصفحك",
  "hero.title.1": "حوّل القرآن إلى",
  "hero.title.2": "نور",
  "hero.title.3": "على الشاشة.",
  "hero.subtitle":
    "اختر القارئ والآيات، ويقوم نور بإنشاء فيديو متزامن جميل — خط عربي متحرك، وخلفيات ساحرة، جاهز لـ Reels و TikTok و YouTube Shorts.",
  "hero.cta.primary": "أنشئ أول فيديو لك",
  "hero.cta.secondary": "شاهد كيف يعمل",
  "hero.stats.reciters": "٨ قرّاء",
  "hero.stats.translations": "+٣٠ ترجمة",
  "hero.stats.export": "تصدير 1080p",
  "hero.nowPlaying": "يُعرض الآن",
  "hero.nowPlaying.value": "سورة الفاتحة · مشاري العفاسي",
  "hero.exporting": "جاري التصدير",
  "hero.ayah1": "الآية ١",

  // Features
  "features.kicker": "المميزات",
  "features.title.1": "كل ما تحتاجه لجعل الآيات",
  "features.title.2": "لا تُنسى",
  "features.f1.title": "قرّاء عالميون",
  "features.f1.desc": "مشاري العفاسي، السديس، الحصري، المنشاوي وأكثر — تلاوة عالية الجودة، متزامنة لكل آية.",
  "features.f2.title": "خط عربي بديع",
  "features.f2.desc": "خطوط أميري وريم كوفي بدقة 1080p، مع ظلال خفيفة وإبرازات ذهبية.",
  "features.f3.title": "خلفيات سينمائية",
  "features.f3.desc": "إعدادات ذات طابع إسلامي: مساجد تحت القمر، سدم ذهبية، صحاري مرصّعة بالنجوم.",
  "features.f4.title": "معاينة حية",
  "features.f4.desc": "عدّل النمط والترجمة ونطاق الآيات وشاهد الفيديو يتحدّث فورًا.",
  "features.f5.title": "ترجمات بلغات متعددة",
  "features.f5.desc": "إنجليزي، أردو، فرنسي، إندونيسي، تركي، إسباني — اختر ترجمة لكل فيديو.",
  "features.f6.title": "تصدير بنقرة واحدة",
  "features.f6.desc": "صدّر إلى MP4 / WebM مباشرة من المتصفح. بدون حسابات أو رفع أو انتظار.",

  // How it works
  "how.kicker": "كيف يعمل",
  "how.title.1": "ثلاث خطوات. فيديو",
  "how.title.2": "خلّاب",
  "how.title.3": "واحد.",
  "how.step1.title": "اختر آياتك",
  "how.step1.desc": "اختر سورة ونطاق آيات وقارئك المفضّل.",
  "how.step2.title": "نسّق الفيديو",
  "how.step2.desc": "اختر خلفية ونمط خط. فعّل الترجمة كترجمة أسفل الشاشة إن أردت.",
  "how.step3.title": "عاين وصدّر",
  "how.step3.desc": "شاهد المعاينة الحية، ثم صدّر MP4 جاهز للمشاركة في أي مكان.",

  // Pricing
  "pricing.kicker": "الأسعار",
  "pricing.title": "بسيطة، سخيّة، شفّافة.",
  "pricing.free": "مجّاني",
  "pricing.forever": "للأبد",
  "pricing.free.f1": "✓ معاينات غير محدودة",
  "pricing.free.f2": "✓ جميع القرّاء الثمانية",
  "pricing.free.f3": "✓ تصدير حتى 720p مع علامة مائية",
  "pricing.free.f4": "✓ جميع الخلفيات والأنماط",
  "pricing.pro": "احترافي",
  "pricing.perMonth": "شهريًا",
  "pricing.soon": "قريبًا",
  "pricing.pro.f1": "✓ تصدير 1080p / 4K بدون علامة مائية",
  "pricing.pro.f2": "✓ رفع خلفيات مخصّصة",
  "pricing.pro.f3": "✓ اقتراحات آيات بالذكاء الاصطناعي حسب المزاج",
  "pricing.pro.f4": "✓ مشاريع وتاريخ محفوظ",

  // CTA
  "cta.title": "تذكيرك القادم على بُعد نقرة واحدة.",
  "cta.button": "افتح الاستوديو",

  // Footer
  "footer.rights": "© {year} استوديو نور · صُنع بحبّ للأمة.",
  "footer.privacy": "الخصوصية",
  "footer.terms": "الشروط",
  "footer.contact": "تواصل",

  // Studio
  "studio.badge": "الاستوديو",
  "studio.title.1": "صمّم",
  "studio.title.2": "فيديو القرآن",
  "studio.title.3": "خاصتك.",
  "studio.subtitle": "اختر سورة وقارئًا وأجواء — عاين مباشرة، ثم صدّر MP4.",

  "studio.source": "المصدر",
  "studio.reciter": "القارئ",
  "studio.surah": "السورة",
  "studio.fromAyah": "من الآية (١–{max})",
  "studio.toAyah": "إلى الآية (الحد الأقصى {max})",
  "studio.tooMany": "اختر ١٥ آية كحدّ أقصى لكل فيديو لتصدير سريع.",

  "studio.translation": "الترجمة",
  "studio.language": "اللغة",
  "studio.showSubtitle": "إظهار الترجمة كترجمة أسفل الفيديو",

  "studio.background": "الخلفية",
  "studio.style": "النمط",

  "studio.export": "التصدير",
  "studio.export.desc": "يسجّل المعاينة الحية مع الصوت المتزامن في متصفحك. أبقِ هذا التبويب نشطًا أثناء التصدير.",
  "studio.export.button": "صدّر الفيديو",
  "studio.export.recording": "جاري التسجيل…",
  "studio.export.note": "الخطة المجانية تصدّر حتى 720p. الاحترافي قريبًا.",

  "studio.preview": "معاينة حية",
  "studio.previewSize": "9:16 · 1080p",
  "studio.ayatCount": "{count} آية · {surah}",

  // Toasts
  "toast.failedSurahs": "تعذّر تحميل قائمة السور",
  "toast.failedAyat": "تعذّر تحميل الآيات",
  "toast.previewNotReady": "المعاينة غير جاهزة",
  "toast.recording": "جاري تسجيل الفيديو — لا تبدّل التبويب من فضلك.",
  "toast.exported": "تم تصدير الفيديو! تحقّق من مجلد التنزيلات.",
  "toast.exportFailed": "فشل التصدير. جرّب نطاق آيات أقصر.",

  // Lang switch
  "lang.toggle": "English",
};

const en: Dict = {
  "nav.features": "Features",
  "nav.how": "How it works",
  "nav.pricing": "Pricing",
  "nav.openStudio": "Open Studio",

  "hero.badge": "Cinematic Quran video studio · in your browser",
  "hero.title.1": "Turn the Quran into",
  "hero.title.2": "light",
  "hero.title.3": "on the screen.",
  "hero.subtitle":
    "Pick a reciter, choose your ayat, and Noor renders a beautiful synced video — animated Arabic, dreamy backgrounds, ready for Reels, TikTok and YouTube Shorts.",
  "hero.cta.primary": "Create your first video",
  "hero.cta.secondary": "See how it works",
  "hero.stats.reciters": "8 reciters",
  "hero.stats.translations": "30+ translations",
  "hero.stats.export": "1080p export",
  "hero.nowPlaying": "Now playing",
  "hero.nowPlaying.value": "Surah Al-Fatiha · Mishary Alafasy",
  "hero.exporting": "Exporting",
  "hero.ayah1": "Ayah 1",

  "features.kicker": "Features",
  "features.title.1": "Everything you need to make ayat",
  "features.title.2": "unforgettable",
  "features.f1.title": "World-class reciters",
  "features.f1.desc": "Mishary Alafasy, Sudais, Husary, Minshawi and more — high-quality recitation, synced per ayah.",
  "features.f2.title": "Beautiful Arabic typography",
  "features.f2.desc": "Amiri and Reem Kufi rendered crisply at 1080p, with subtle shadows and accent highlights.",
  "features.f3.title": "Cinematic backgrounds",
  "features.f3.desc": "Hand-picked Islamic-aesthetic presets: moonlit mosques, golden nebulas, starlit deserts.",
  "features.f4.title": "Live preview studio",
  "features.f4.desc": "Adjust style, translation and ayat range and watch the video update in real time.",
  "features.f5.title": "Multi-language subtitles",
  "features.f5.desc": "English, Urdu, French, Indonesian, Turkish, Spanish — pick a translation per video.",
  "features.f6.title": "One-click export",
  "features.f6.desc": "Render to MP4 / WebM right in your browser. No accounts, no upload, no waiting.",

  "how.kicker": "How it works",
  "how.title.1": "Three steps. One",
  "how.title.2": "breathtaking",
  "how.title.3": "video.",
  "how.step1.title": "Choose your ayat",
  "how.step1.desc": "Pick a surah, an ayah range, and your favorite reciter.",
  "how.step2.title": "Style the video",
  "how.step2.desc": "Select a background and a typography preset. Toggle a translation if you want subtitles.",
  "how.step3.title": "Preview & export",
  "how.step3.desc": "Watch the live preview, then export an MP4 ready to share anywhere.",

  "pricing.kicker": "Pricing",
  "pricing.title": "Simple, generous, transparent.",
  "pricing.free": "Free",
  "pricing.forever": "Forever",
  "pricing.free.f1": "✓ Unlimited previews",
  "pricing.free.f2": "✓ All 8 reciters",
  "pricing.free.f3": "✓ Up to 720p export with watermark",
  "pricing.free.f4": "✓ All backgrounds & styles",
  "pricing.pro": "Pro",
  "pricing.perMonth": "per month",
  "pricing.soon": "Coming soon",
  "pricing.pro.f1": "✓ 1080p / 4K export, no watermark",
  "pricing.pro.f2": "✓ Custom background uploads",
  "pricing.pro.f3": "✓ AI mood-based ayah suggestions",
  "pricing.pro.f4": "✓ Saved projects & history",

  "cta.title": "Your next viral reminder is one click away.",
  "cta.button": "Open the Studio",

  "footer.rights": "© {year} Noor Studio · Made with care for the Ummah.",
  "footer.privacy": "Privacy",
  "footer.terms": "Terms",
  "footer.contact": "Contact",

  "studio.badge": "Studio",
  "studio.title.1": "Compose your",
  "studio.title.2": "Quran video",
  "studio.title.3": ".",
  "studio.subtitle": "Pick a surah, a reciter, a vibe — preview live, then export an MP4.",

  "studio.source": "Source",
  "studio.reciter": "Reciter",
  "studio.surah": "Surah",
  "studio.fromAyah": "From ayah (1–{max})",
  "studio.toAyah": "To ayah (max {max})",
  "studio.tooMany": "Pick at most 15 ayat per video for snappy export.",

  "studio.translation": "Translation",
  "studio.language": "Language",
  "studio.showSubtitle": "Show translation as subtitle",

  "studio.background": "Background",
  "studio.style": "Style",

  "studio.export": "Export",
  "studio.export.desc": "Records the live preview with synced audio in your browser. Keep this tab focused while exporting.",
  "studio.export.button": "Export video",
  "studio.export.recording": "Recording…",
  "studio.export.note": "Free plan exports up to 720p. Pro coming soon.",

  "studio.preview": "Live preview",
  "studio.previewSize": "9:16 · 1080p",
  "studio.ayatCount": "{count} ayah(s) · {surah}",

  "toast.failedSurahs": "Failed to load surah list",
  "toast.failedAyat": "Failed to load ayat",
  "toast.previewNotReady": "Preview not ready",
  "toast.recording": "Recording your video — please don't switch tabs.",
  "toast.exported": "Video exported! Check your downloads.",
  "toast.exportFailed": "Export failed. Try a shorter ayah range.",

  "lang.toggle": "العربية",
};

const dicts: Record<Lang, Dict> = { ar, en };

interface I18nContextValue {
  lang: Lang;
  dir: "rtl" | "ltr";
  t: (key: string, vars?: Record<string, string | number>) => string;
  setLang: (l: Lang) => void;
  toggle: () => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === "undefined") return "ar";
    const saved = localStorage.getItem("noor.lang") as Lang | null;
    return saved === "en" || saved === "ar" ? saved : "ar";
  });

  const dir: "rtl" | "ltr" = lang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    const html = document.documentElement;
    html.lang = lang;
    html.dir = dir;
    localStorage.setItem("noor.lang", lang);
  }, [lang, dir]);

  const value = useMemo<I18nContextValue>(
    () => ({
      lang,
      dir,
      setLang: setLangState,
      toggle: () => setLangState((l) => (l === "ar" ? "en" : "ar")),
      t: (key, vars) => {
        let str = dicts[lang][key] ?? dicts.en[key] ?? key;
        if (vars) {
          for (const [k, v] of Object.entries(vars)) {
            str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
          }
        }
        return str;
      },
    }),
    [lang, dir]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
