import { useEffect, useMemo, useRef, useState } from "react";
import { Header } from "@/components/Header";
import { VideoPreview, type VideoPreviewHandle } from "@/components/VideoPreview";
import { BACKGROUNDS, STYLES } from "@/lib/presets";
import {
  POPULAR_RECITERS,
  TRANSLATIONS,
  fetchAyatRange,
  fetchSurahs,
  type AyahWithTranslation,
  type SurahMeta,
} from "@/lib/quran-api";
import { recordVideo, downloadBlob } from "@/lib/video-export";
import { toast } from "sonner";
import { Loader2, Download, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function Studio() {
  const { t, lang } = useI18n();
  const isAr = lang === "ar";

  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const [surahNumber, setSurahNumber] = useState(1);
  const [fromAyah, setFromAyah] = useState(1);
  const [toAyah, setToAyah] = useState(7);
  const [reciter, setReciter] = useState(POPULAR_RECITERS[0].identifier);
  const [translationId, setTranslationId] = useState<string>("en.sahih");
  const [showTranslation, setShowTranslation] = useState(true);
  const [bgId, setBgId] = useState(BACKGROUNDS[0].id);
  const [styleId, setStyleId] = useState(STYLES[0].id);

  const [ayat, setAyat] = useState<AyahWithTranslation[]>([]);
  const [loadingAyat, setLoadingAyat] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const previewRef = useRef<VideoPreviewHandle>(null);

  const surah = useMemo(() => surahs.find((s) => s.number === surahNumber), [surahs, surahNumber]);
  const background = useMemo(() => BACKGROUNDS.find((b) => b.id === bgId)!, [bgId]);
  const style = useMemo(() => STYLES.find((s) => s.id === styleId)!, [styleId]);

  useEffect(() => {
    fetchSurahs()
      .then(setSurahs)
      .catch(() => toast.error(t("toast.failedSurahs")));
  }, [t]);

  useEffect(() => {
    if (!surah) return;
    setFromAyah((f) => Math.min(Math.max(1, f), surah.numberOfAyahs));
    setToAyah((tt) => Math.min(Math.max(1, tt), surah.numberOfAyahs));
  }, [surah]);

  useEffect(() => {
    if (!surah) return;
    if (toAyah < fromAyah) return;
    const span = toAyah - fromAyah + 1;
    if (span > 15) return;
    setLoadingAyat(true);
    const handle = setTimeout(() => {
      fetchAyatRange(surahNumber, fromAyah, toAyah, reciter, showTranslation ? translationId : undefined)
        .then((data) => setAyat(data))
        .catch(() => toast.error(t("toast.failedAyat")))
        .finally(() => setLoadingAyat(false));
    }, 250);
    return () => clearTimeout(handle);
  }, [surah, surahNumber, fromAyah, toAyah, reciter, translationId, showTranslation, t]);

  const span = toAyah - fromAyah + 1;
  const tooMany = span > 15;

  const handleExport = async () => {
    const canvas = previewRef.current?.getCanvas();
    const audios = previewRef.current?.getAudioElements();
    if (!canvas || !audios || audios.length === 0) {
      toast.error(t("toast.previewNotReady"));
      return;
    }
    setExporting(true);
    setExportProgress(0);
    toast.info(t("toast.recording"), { duration: 5000 });
    try {
      const result = await recordVideo({
        canvas,
        audioElements: audios,
        fps: 30,
        onProgress: (current, total) => setExportProgress(Math.round((current / total) * 100)),
      });
      const surahLabel = surah?.englishName?.toLowerCase().replace(/\s+/g, "-") ?? "quran";
      downloadBlob(result.blob, `noor-${surahLabel}-${fromAyah}-${toAyah}.${result.extension}`);
      toast.success(t("toast.exported"));
    } catch (e) {
      console.error(e);
      toast.error(t("toast.exportFailed"));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen pb-20">
      <Header />
      <main className="container pt-32">
        <div className="mb-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs text-muted-foreground mb-4">
            <Sparkles className="w-3 h-3 text-accent" />
            {t("studio.badge")}
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-semibold mb-3">
            {t("studio.title.1")} <em className="text-gradient-gold not-italic">{t("studio.title.2")}</em>{t("studio.title.3")}
          </h1>
          <p className="text-muted-foreground">{t("studio.subtitle")}</p>
        </div>

        <div className="grid lg:grid-cols-[1fr,420px] gap-8">
          <div className="space-y-6">
            <section className="glass rounded-2xl p-6">
              <h2 className="font-display text-xl font-semibold mb-4">{t("studio.source")}</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label={t("studio.reciter")}>
                  <select value={reciter} onChange={(e) => setReciter(e.target.value)} className={selectCls}>
                    {POPULAR_RECITERS.map((r) => (
                      <option key={r.identifier} value={r.identifier}>
                        {isAr ? r.name : r.englishName}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t("studio.surah")}>
                  <select
                    value={surahNumber}
                    onChange={(e) => setSurahNumber(Number(e.target.value))}
                    className={selectCls}
                  >
                    {surahs.map((s) => (
                      <option key={s.number} value={s.number}>
                        {s.number}. {isAr ? s.name : `${s.englishName} — ${s.englishNameTranslation}`}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t("studio.fromAyah", { max: surah?.numberOfAyahs ?? "…" })}>
                  <input
                    type="number"
                    min={1}
                    max={surah?.numberOfAyahs ?? 1}
                    value={fromAyah}
                    onChange={(e) => setFromAyah(Math.max(1, Number(e.target.value)))}
                    className={selectCls}
                  />
                </Field>
                <Field label={t("studio.toAyah", { max: Math.min(surah?.numberOfAyahs ?? 0, fromAyah + 14) })}>
                  <input
                    type="number"
                    min={fromAyah}
                    max={surah?.numberOfAyahs ?? 1}
                    value={toAyah}
                    onChange={(e) => setToAyah(Math.max(fromAyah, Number(e.target.value)))}
                    className={selectCls}
                  />
                </Field>
              </div>
              {tooMany && (
                <p className="text-xs text-destructive mt-3">{t("studio.tooMany")}</p>
              )}
            </section>

            <section className="glass rounded-2xl p-6">
              <h2 className="font-display text-xl font-semibold mb-4">{t("studio.translation")}</h2>
              <div className="grid sm:grid-cols-2 gap-4 items-end">
                <Field label={t("studio.language")}>
                  <select
                    value={translationId}
                    onChange={(e) => setTranslationId(e.target.value)}
                    disabled={!showTranslation}
                    className={selectCls}
                  >
                    {TRANSLATIONS.map((tr) => (
                      <option key={tr.id} value={tr.id}>{tr.label}</option>
                    ))}
                  </select>
                </Field>
                <label className="flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary/50 cursor-pointer hover:bg-secondary transition-colors">
                  <input
                    type="checkbox"
                    checked={showTranslation}
                    onChange={(e) => setShowTranslation(e.target.checked)}
                    className="w-4 h-4 accent-primary"
                  />
                  <span className="text-sm">{t("studio.showSubtitle")}</span>
                </label>
              </div>
            </section>

            <section className="glass rounded-2xl p-6">
              <h2 className="font-display text-xl font-semibold mb-4">{t("studio.background")}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {BACKGROUNDS.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setBgId(b.id)}
                    className={`relative aspect-[9/16] rounded-xl overflow-hidden border-2 transition-all ${
                      bgId === b.id ? "border-primary shadow-glow scale-[1.03]" : "border-transparent hover:border-border"
                    }`}
                  >
                    <img src={b.image} alt={b.label} className="w-full h-full object-cover" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
                    <div className="absolute bottom-2 left-2 right-2 text-xs font-medium">{b.label}</div>
                  </button>
                ))}
              </div>
            </section>

            <section className="glass rounded-2xl p-6">
              <h2 className="font-display text-xl font-semibold mb-4">{t("studio.style")}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {STYLES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStyleId(s.id)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      styleId === s.id ? "border-primary bg-primary/10 shadow-glow" : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div
                      className="text-3xl mb-2"
                      dir="rtl"
                      style={{ fontFamily: s.arabicFont, color: s.arabicColor }}
                    >
                      نُور
                    </div>
                    <div className="text-xs font-medium">{s.label}</div>
                  </button>
                ))}
              </div>
            </section>

            <section className="glass rounded-2xl p-6">
              <h2 className="font-display text-xl font-semibold mb-4">{t("studio.export")}</h2>
              <p className="text-sm text-muted-foreground mb-4">{t("studio.export.desc")}</p>
              <button
                onClick={handleExport}
                disabled={exporting || loadingAyat || ayat.length === 0 || tooMany}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-gradient-primary text-primary-foreground font-medium shadow-glow hover:scale-[1.01] transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {exporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> {t("studio.export.recording")} {exportProgress}%
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" /> {t("studio.export.button")}
                  </>
                )}
              </button>
              <p className="text-xs text-muted-foreground mt-3 text-center">{t("studio.export.note")}</p>
            </section>
          </div>

          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl font-semibold">{t("studio.preview")}</h2>
                <span className="text-xs text-muted-foreground" dir="ltr">{t("studio.previewSize")}</span>
              </div>
              {loadingAyat || ayat.length === 0 ? (
                <div className="aspect-[9/16] rounded-2xl bg-secondary/40 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <VideoPreview
                  ref={previewRef}
                  ayat={ayat}
                  background={background}
                  style={style}
                  showTranslation={showTranslation}
                  surahName={surah?.englishName}
                />
              )}
              {ayat.length > 0 && (
                <div className="mt-4 text-xs text-muted-foreground text-center">
                  {t("studio.ayatCount", { count: ayat.length, surah: isAr ? surah?.name ?? "" : surah?.englishName ?? "" })}
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">{label}</span>
      {children}
    </label>
  );
}

const selectCls =
  "w-full px-4 py-3 rounded-xl bg-secondary/60 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary transition-all";
