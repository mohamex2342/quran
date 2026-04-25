// Client-side MP4 export using MediaRecorder.
// Captures a canvas stream + mixed audio from per-ayah <audio> elements.

export interface ExportOptions {
  canvas: HTMLCanvasElement;
  audioElements: HTMLAudioElement[];
  fps?: number;
  onProgress?: (current: number, total: number) => void;
  onAyahChange?: (idx: number) => void;
  onCanvasTick?: () => void; // called each frame to redraw with current state
}

export interface ExportResult {
  blob: Blob;
  mimeType: string;
  extension: string;
  url: string;
}

function pickMimeType(): { mime: string; ext: string } {
  const candidates = [
    { mime: "video/mp4;codecs=h264,aac", ext: "mp4" },
    { mime: "video/mp4", ext: "mp4" },
    { mime: "video/webm;codecs=vp9,opus", ext: "webm" },
    { mime: "video/webm;codecs=vp8,opus", ext: "webm" },
    { mime: "video/webm", ext: "webm" },
  ];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c.mime)) return c;
  }
  return { mime: "video/webm", ext: "webm" };
}

/**
 * Sequentially plays each audio element while recording the canvas stream,
 * mixing all audio sources into a single track.
 */
export async function recordVideo(opts: ExportOptions): Promise<ExportResult> {
  const { canvas, audioElements, fps = 30, onProgress, onAyahChange } = opts;

  // Reset all audio
  audioElements.forEach((a) => {
    a.pause();
    a.currentTime = 0;
  });

  // Create AudioContext + MediaStreamDestination so all <audio> elements feed one track.
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioCtx = new AudioCtx();
  const dest = audioCtx.createMediaStreamDestination();

  const sources = audioElements.map((a) => {
    const src = audioCtx.createMediaElementSource(a);
    src.connect(dest);
    src.connect(audioCtx.destination); // also play out loud during recording
    return src;
  });

  const canvasStream = canvas.captureStream(fps);
  const audioTrack = dest.stream.getAudioTracks()[0];
  if (audioTrack) canvasStream.addTrack(audioTrack);

  const { mime, ext } = pickMimeType();
  const recorder = new MediaRecorder(canvasStream, { mimeType: mime, videoBitsPerSecond: 5_000_000 });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const stopPromise = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });

  recorder.start(100);

  // Play each audio sequentially, awaiting end
  for (let i = 0; i < audioElements.length; i++) {
    onAyahChange?.(i);
    onProgress?.(i, audioElements.length);
    const audio = audioElements[i];
    audio.currentTime = 0;
    await audio.play().catch(() => {});
    await new Promise<void>((resolve) => {
      const onEnd = () => {
        audio.removeEventListener("ended", onEnd);
        resolve();
      };
      audio.addEventListener("ended", onEnd);
    });
  }
  onProgress?.(audioElements.length, audioElements.length);

  // Small tail to flush
  await new Promise((r) => setTimeout(r, 300));
  recorder.stop();
  await stopPromise;

  // Cleanup
  sources.forEach((s) => s.disconnect());
  await audioCtx.close();
  canvasStream.getTracks().forEach((t) => t.stop());

  const blob = new Blob(chunks, { type: mime });
  const url = URL.createObjectURL(blob);
  return { blob, mimeType: mime, extension: ext, url };
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
