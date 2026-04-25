import { useEffect, useRef, useState, useImperativeHandle, forwardRef, useCallback } from "react";
import type { AyahWithTranslation } from "@/lib/quran-api";
import type { BackgroundPreset, StylePreset } from "@/lib/presets";

interface VideoPreviewProps {
  ayat: AyahWithTranslation[];
  background: BackgroundPreset;
  style: StylePreset;
  showTranslation: boolean;
  surahName?: string;
}

export interface VideoPreviewHandle {
  play: () => void;
  pause: () => void;
  isPlaying: () => boolean;
  getCanvas: () => HTMLCanvasElement | null;
  getAudioElements: () => HTMLAudioElement[];
}

// Canvas dimensions (9:16 portrait — ideal for Reels/TikTok/Shorts)
const W = 1080;
const H = 1920;

export const VideoPreview = forwardRef<VideoPreviewHandle, VideoPreviewProps>(
  ({ ayat, background, style, showTranslation, surahName }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const audioRefs = useRef<HTMLAudioElement[]>([]);
    const bgImgRef = useRef<HTMLImageElement | null>(null);
    const rafRef = useRef<number | null>(null);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [progress, setProgress] = useState(0); // 0..1 within current ayah
    const [playing, setPlaying] = useState(false);
    const startTimeRef = useRef<number>(0);

    // Preload background image
    useEffect(() => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = background.image;
      img.onload = () => {
        bgImgRef.current = img;
        draw();
      };
    }, [background.image]);

    // Wait for custom fonts (Amiri, Reem Kufi, Tajawal) before drawing,
    // otherwise canvas falls back to a font that may render Arabic poorly or invisibly.
    useEffect(() => {
      const fonts = (document as any).fonts;
      if (!fonts) return;
      Promise.all([
        fonts.load(`400 80px "Amiri"`),
        fonts.load(`400 80px "Reem Kufi"`),
        fonts.load(`400 40px "Tajawal"`),
        fonts.load(`400 40px "Inter"`),
      ]).then(() => draw()).catch(() => draw());
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Preload audio elements for each ayah
    useEffect(() => {
      // cleanup old
      audioRefs.current.forEach((a) => {
        a.pause();
        a.src = "";
      });
      audioRefs.current = ayat.map((a) => {
        const audio = new Audio();
        audio.crossOrigin = "anonymous";
        audio.preload = "auto";
        audio.src = a.audio;
        return audio;
      });
      setCurrentIdx(0);
      setProgress(0);
      draw();
      return () => {
        audioRefs.current.forEach((a) => {
          a.pause();
          a.src = "";
        });
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ayat]);

    // Redraw on style/translation changes
    useEffect(() => {
      draw();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [style, showTranslation, currentIdx, progress]);

    const wrapLines = useCallback(
      (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
        const words = text.split(/\s+/).filter(Boolean);
        const lines: string[] = [];
        let line = "";
        for (const word of words) {
          const test = line ? `${line} ${word}` : word;
          if (ctx.measureText(test).width > maxWidth && line) {
            lines.push(line);
            line = word;
          } else {
            line = test;
          }
        }
        if (line) lines.push(line);
        return lines;
      },
      [],
    );

    /**
     * Auto-fits text inside a box (maxWidth × maxHeight). Shrinks font size
     * for long ayat so they never overflow the canvas.
     * fontTemplate must contain "{SIZE}" placeholder, e.g. `400 {SIZE}px "Amiri"`.
     */
    const drawFittedText = useCallback(
      (
        ctx: CanvasRenderingContext2D,
        text: string,
        cx: number,
        cy: number,
        maxWidth: number,
        maxHeight: number,
        baseSize: number,
        minSize: number,
        lineHeightRatio: number,
        fontTemplate: string,
      ) => {
        let size = baseSize;
        let lines: string[] = [];
        let lineHeight = size * lineHeightRatio;
        // Shrink until lines fit within the box
        for (let i = 0; i < 24; i++) {
          ctx.font = fontTemplate.replace("{SIZE}", String(size));
          lines = wrapLines(ctx, text, maxWidth);
          lineHeight = size * lineHeightRatio;
          const totalH = lines.length * lineHeight;
          if (totalH <= maxHeight || size <= minSize) break;
          size = Math.max(minSize, Math.floor(size * 0.92));
        }
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const totalH = lines.length * lineHeight;
        let curY = cy - totalH / 2 + lineHeight / 2;
        for (const ln of lines) {
          const w = ctx.measureText(ln).width;
          if (w > maxWidth) {
            ctx.save();
            const scale = maxWidth / w;
            ctx.translate(cx, curY);
            ctx.scale(scale, scale);
            ctx.fillText(ln, 0, 0);
            ctx.restore();
          } else {
            ctx.fillText(ln, cx, curY);
          }
          curY += lineHeight;
        }
      },
      [wrapLines],
    );

    const draw = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Background image
      if (bgImgRef.current) {
        const img = bgImgRef.current;
        const ar = img.width / img.height;
        const targetAr = W / H;
        let dw, dh, dx, dy;
        if (ar > targetAr) {
          dh = H;
          dw = H * ar;
          dx = (W - dw) / 2;
          dy = 0;
        } else {
          dw = W;
          dh = W / ar;
          dx = 0;
          dy = (H - dh) / 2;
        }
        // subtle ken-burns based on progress
        const zoom = 1 + progress * 0.04;
        const zw = dw * zoom;
        const zh = dh * zoom;
        ctx.drawImage(img, dx - (zw - dw) / 2, dy - (zh - dh) / 2, zw, zh);
      } else {
        ctx.fillStyle = "#0a0a1a";
        ctx.fillRect(0, 0, W, H);
      }

      // Overlay gradient
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, "rgba(10,10,26,0.35)");
      grad.addColorStop(0.5, "rgba(10,10,26,0.55)");
      grad.addColorStop(1, "rgba(10,10,26,0.85)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Top bar — surah name
      if (surahName) {
        ctx.fillStyle = style.accent;
        ctx.font = `500 ${Math.round(H * 0.022)}px "Inter", sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(surahName.toUpperCase(), W / 2, H * 0.08);
        // small accent line
        ctx.fillRect(W / 2 - 30, H * 0.09, 60, 2);
      }

      const ayah = ayat[currentIdx];
      if (!ayah) return;

      // Fade in/out transition between ayat — only fade while playing.
      // When paused (progress stays at 0), keep text fully visible so it's never hidden.
      let opacity = 1;
      if (playing && progress > 0) {
        const fadeIn = Math.min(1, progress / 0.08);
        const fadeOut = Math.min(1, (1 - progress) / 0.08);
        opacity = Math.max(0.15, Math.min(fadeIn, fadeOut));
      }

      // Layout regions — Arabic occupies the upper/middle band, translation
      // sits below it. Boxes are sized so the longest ayat auto-shrink to fit.
      const arabicBoxTop = H * 0.18;
      const arabicBoxBottom = showTranslation && ayah.translation ? H * 0.66 : H * 0.86;
      const arabicBoxH = arabicBoxBottom - arabicBoxTop;
      const arabicCY = arabicBoxTop + arabicBoxH / 2;
      const arabicMaxW = W * 0.86;

      // Arabic text (auto-fit)
      ctx.save();
      ctx.globalAlpha = opacity;
      const arabicBase = Math.round(H * style.arabicSizeRatio);
      const arabicMin = Math.round(H * 0.022);
      ctx.fillStyle = style.arabicColor;
      ctx.shadowColor = "rgba(0,0,0,0.6)";
      ctx.shadowBlur = 20;
      ctx.shadowOffsetY = 4;
      drawFittedText(
        ctx,
        ayah.text,
        W / 2,
        arabicCY,
        arabicMaxW,
        arabicBoxH,
        arabicBase,
        arabicMin,
        1.55,
        `400 {SIZE}px ${style.arabicFont}`,
      );
      ctx.restore();

      // Translation (auto-fit)
      if (showTranslation && ayah.translation) {
        ctx.save();
        ctx.globalAlpha = opacity * 0.95;
        const transBase = Math.round(H * 0.024);
        const transMin = Math.round(H * 0.014);
        ctx.fillStyle = style.translationColor;
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 12;
        drawFittedText(
          ctx,
          ayah.translation,
          W / 2,
          H * 0.78,
          W * 0.82,
          H * 0.18,
          transBase,
          transMin,
          1.4,
          `400 {SIZE}px "Inter", sans-serif`,
        );
        ctx.restore();
      }

      // Ayah indicator (bottom)
      ctx.save();
      ctx.fillStyle = style.accent;
      ctx.font = `600 ${Math.round(H * 0.02)}px "Inter", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(
        `${currentIdx + 1} / ${ayat.length}  •  Ayah ${ayah.numberInSurah}`,
        W / 2,
        H * 0.92,
      );

      // Progress bar
      const barW = W * 0.6;
      const barX = (W - barW) / 2;
      const barY = H * 0.94;
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.fillRect(barX, barY, barW, 4);
      ctx.fillStyle = style.accent;
      const totalProgress = (currentIdx + progress) / ayat.length;
      ctx.fillRect(barX, barY, barW * totalProgress, 4);
      ctx.restore();
    }, [ayat, currentIdx, progress, background, style, showTranslation, surahName, drawFittedText, playing]);

    // Animation loop
    const tick = useCallback(() => {
      const audio = audioRefs.current[currentIdx];
      if (audio && audio.duration) {
        const p = audio.currentTime / audio.duration;
        setProgress(Math.min(1, Math.max(0, p)));
      }
      draw();
      rafRef.current = requestAnimationFrame(tick);
    }, [currentIdx, draw]);

    useEffect(() => {
      if (playing) {
        rafRef.current = requestAnimationFrame(tick);
      } else if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
    }, [playing, tick]);

    // Handle ayah end -> advance
    useEffect(() => {
      const audio = audioRefs.current[currentIdx];
      if (!audio) return;
      const onEnded = () => {
        if (currentIdx < ayat.length - 1) {
          setCurrentIdx((i) => i + 1);
          setProgress(0);
          // play next
          setTimeout(() => {
            const next = audioRefs.current[currentIdx + 1];
            if (next && playing) next.play().catch(() => {});
          }, 50);
        } else {
          setPlaying(false);
          setProgress(1);
        }
      };
      audio.addEventListener("ended", onEnded);
      return () => audio.removeEventListener("ended", onEnded);
    }, [currentIdx, ayat.length, playing]);

    useImperativeHandle(ref, () => ({
      play: () => {
        const audio = audioRefs.current[currentIdx];
        if (audio) {
          audio.play().catch(() => {});
          setPlaying(true);
          startTimeRef.current = performance.now();
        }
      },
      pause: () => {
        audioRefs.current.forEach((a) => a.pause());
        setPlaying(false);
      },
      isPlaying: () => playing,
      getCanvas: () => canvasRef.current,
      getAudioElements: () => audioRefs.current,
    }));

    const togglePlay = () => {
      if (playing) {
        audioRefs.current.forEach((a) => a.pause());
        setPlaying(false);
      } else {
        const audio = audioRefs.current[currentIdx];
        if (audio) {
          audio.play().catch(() => {});
          setPlaying(true);
        }
      }
    };

    const restart = () => {
      audioRefs.current.forEach((a) => {
        a.pause();
        a.currentTime = 0;
      });
      setCurrentIdx(0);
      setProgress(0);
      setPlaying(false);
    };

    return (
      <div className="relative w-full">
        <div className="relative mx-auto overflow-hidden rounded-2xl shadow-card border border-border" style={{ maxWidth: 360, aspectRatio: "9 / 16" }}>
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="block w-full h-full"
          />
          {/* Play overlay when paused */}
          {!playing && (
            <button
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center group bg-background/20 hover:bg-background/40 transition-colors"
              aria-label="Play preview"
            >
              <div className="w-20 h-20 rounded-full bg-primary/90 backdrop-blur flex items-center justify-center shadow-glow group-hover:scale-110 transition-transform">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-primary-foreground ml-1">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </button>
          )}
        </div>
        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            onClick={togglePlay}
            className="px-5 py-2 rounded-full bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors text-sm"
          >
            {playing ? "Pause" : "Play"}
          </button>
          <button
            onClick={restart}
            className="px-5 py-2 rounded-full glass text-foreground font-medium hover:bg-secondary transition-colors text-sm"
          >
            Restart
          </button>
        </div>
      </div>
    );
  },
);

VideoPreview.displayName = "VideoPreview";
