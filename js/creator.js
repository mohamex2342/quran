/**
 * فيديوهات القرآن الكريم
 * ملف منشئ الفيديو
 * يتضمن: Canvas API، MediaRecorder، Web Audio API، Everyayah
 */

'use strict';

/* =============================================
   Polyfill for roundRect
   ============================================= */
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        this.beginPath();
        this.moveTo(x + r, y);
        this.arcTo(x + w, y, x + w, y + h, r);
        this.arcTo(x + w, y + h, x, y + h, r);
        this.arcTo(x, y + h, x, y, r);
        this.arcTo(x, y, x + w, y, r);
        this.closePath();
        return this;
    };
}

/* =============================================
   Creator State
   ============================================= */
const CREATOR = {
    canvas: null,
    ctx: null,
    audioContext: null,
    verses: [],          // [{surah, number, text_uthmani}]
    audioBuffers: [],    // AudioBuffer per verse
    currentVerseIdx: 0,
    isPlaying: false,
    animFrame: null,
    bgImage: null,
    bgVideo: null,
    bgType: 'auto',
    mediaRecorder: null,
    recordedChunks: [],
    isRecording: false,
    reciterMoshaf: null,
    totalDuration: 0,
    verseTimings: [],    // [{start, duration}]
    startTime: 0,
    pausedAt: 0,
    audioSource: null,
    gainNode: null,
    sourceNodes: [],
    playbackBuffer: null,  // merged audio
    isReady: false,
};

/* =============================================
   EVERYAYAH RECITER CODES (most popular)
   ============================================= */
const EVERYAYAH_RECITERS = {
    // Map from mp3quran reciter id → everyayah folder name
    102: 'Maher_Al_Muaiqly_64kbps',
    54:  'Abdul_Basit_Murattal_64kbps',
    4:   'Abu_Bakr_Ash-Shaatree_64kbps',
    30:  'Saad_Al-Ghamdi_40kbps',
    31:  'Saud_Al-Shuraim_64kbps',
    92:  'Yasser_Ad-Dussary_128kbps',
    21:  'Khaalid_Abdullaah_al-Qahtaanee_192kbps',
    48:  'Adel_Kalbani_64kbps',
    // Default fallback
    default: 'Maher_Al_Muaiqly_64kbps',
};

function getEveryayahCode(reciterId) {
    return EVERYAYAH_RECITERS[reciterId] || EVERYAYAH_RECITERS.default;
}

/* =============================================
   MAIN: CREATE TILAWA
   ============================================= */
async function createTilawa() {
    const reciterSelect = document.getElementById('reciterSelect');
    const surahSelect = document.getElementById('surahSelect');

    if (!reciterSelect.value) {
        showAlert('يرجى اختيار القارئ أولاً', 'warning');
        return;
    }
    if (!surahSelect.value) {
        showAlert('يرجى اختيار السورة أولاً', 'warning');
        return;
    }

    const verseRange = validateVerseRange();
    if (!verseRange) {
        showAlert('يرجى تحديد نطاق الآيات', 'warning');
        return;
    }

    const reciterId = parseInt(reciterSelect.value);
    const surahId = parseInt(surahSelect.value);
    const surahName = surahSelect.options[surahSelect.selectedIndex].textContent.replace(/^\d+\.\s*/, '');
    const reciterName = reciterSelect.options[reciterSelect.selectedIndex].textContent;

    // Get reciter moshaf info
    const reciterData = APP.reciters.find(r => r.id === reciterId);
    CREATOR.reciterMoshaf = reciterData?.moshaf?.[0] || null;

    // Disable create button
    const createBtn = document.getElementById('createBtn');
    createBtn.disabled = true;
    createBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإنشاء...';

    // Reset creator
    stopPlayback();
    resetCreator();

    try {
        // Step 1: Prepare background
        updateProgress('جاري تحضير الخلفية...', 5);
        await prepareBackground();

        // Step 2: Fetch verse texts
        updateProgress('جاري جلب نصوص الآيات...', 20);
        await fetchVerseTexts(surahId, verseRange.from, verseRange.to);

        // Step 3: Fetch audio files
        updateProgress('جاري تحميل الملفات الصوتية...', 40);
        await fetchAudioFiles(reciterId, surahId, verseRange.from, verseRange.to);

        // Step 4: Setup canvas
        updateProgress('جاري إعداد معاينة الفيديو...', 75);
        setupCanvas(reciterName, surahName, surahId);

        // Step 5: Merge audio
        updateProgress('جاري دمج الصوت...', 85);
        await mergeAudioBuffers();

        updateProgress('جاهز!', 100);
        setTimeout(hideProgress, 800);

        // Show controls
        CREATOR.isReady = true;
        showCanvas();
        document.getElementById('playerControls').style.display = 'flex';
        document.getElementById('verseDisplay').style.display = 'block';
        document.getElementById('downloadSection').style.display = 'block';

        // Draw first frame
        CREATOR.currentVerseIdx = 0;
        drawFrame(reciterName, surahName);

        showAlert('تم إنشاء التلاوة بنجاح! يمكنك الآن المعاينة والتحميل.', 'success');

    } catch (err) {
        console.error('Creator error:', err);
        updateProgress(`حدث خطأ: ${err.message}`, 0);
        showAlert(`تعذر إنشاء التلاوة: ${err.message}`, 'error');
        showPlaceholder();
    } finally {
        createBtn.disabled = false;
        createBtn.innerHTML = '<i class="fas fa-magic"></i> إنشاء التلاوة';
    }
}

/* =============================================
   PREPARE BACKGROUND
   ============================================= */
async function prepareBackground() {
    const bgSetting = getBackgroundSetting();
    CREATOR.bgType = bgSetting.type;
    CREATOR.bgImage = null;
    CREATOR.bgVideo = null;

    if (bgSetting.type === 'url' && bgSetting.value) {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => { CREATOR.bgImage = img; resolve(); };
            img.onerror = () => { CREATOR.bgType = 'auto'; resolve(); };
            img.src = bgSetting.value;
            // Timeout fallback
            setTimeout(() => { CREATOR.bgType = 'auto'; resolve(); }, 5000);
        });
    } else if (bgSetting.type === 'file' && bgSetting.value) {
        return new Promise((resolve) => {
            const url = URL.createObjectURL(bgSetting.value);
            if (bgSetting.value.type.startsWith('video/')) {
                const video = document.createElement('video');
                video.src = url;
                video.loop = true;
                video.muted = true;
                video.playsInline = true;
                video.oncanplay = () => { CREATOR.bgVideo = video; resolve(); };
                video.onerror = () => { CREATOR.bgType = 'auto'; resolve(); };
                video.load();
                setTimeout(() => { CREATOR.bgType = 'auto'; resolve(); }, 5000);
            } else {
                const img = new Image();
                img.onload = () => { CREATOR.bgImage = img; resolve(); };
                img.onerror = () => { CREATOR.bgType = 'auto'; resolve(); };
                img.src = url;
                setTimeout(() => { CREATOR.bgType = 'auto'; resolve(); }, 5000);
            }
        });
    }
}

/* =============================================
   FETCH VERSE TEXTS FROM QURAN.COM API
   ============================================= */
async function fetchVerseTexts(surahId, from, to) {
    CREATOR.verses = [];

    // Use quran.com v4 API
    const url = `https://api.quran.com/api/v4/verses/by_chapter/${surahId}?language=ar&fields=text_uthmani&page=1&per_page=50`;

    try {
        const data = await fetchWithFallback(url);
        if (data && Array.isArray(data.verses)) {
            for (let i = from; i <= to; i++) {
                const verse = data.verses.find(v => {
                    const key = v.verse_key || '';
                    const num = parseInt(key.split(':')[1]);
                    return num === i;
                });
                if (verse) {
                    CREATOR.verses.push({
                        surah: surahId,
                        number: i,
                        text: verse.text_uthmani || `﴿ آية ${i} ﴾`,
                    });
                } else {
                    CREATOR.verses.push({
                        surah: surahId,
                        number: i,
                        text: `﴿ آية ${i} ﴾`,
                    });
                }
            }
        } else {
            throw new Error('no data');
        }
    } catch (err) {
        // Fallback: use placeholder texts
        for (let i = from; i <= to; i++) {
            CREATOR.verses.push({
                surah: surahId,
                number: i,
                text: `﴿ الآية ${i} من السورة ${surahId} ﴾`,
            });
        }
    }
}

/* =============================================
   FETCH AUDIO FILES FROM EVERYAYAH
   ============================================= */
async function fetchAudioFiles(reciterId, surahId, from, to) {
    CREATOR.audioBuffers = [];
    CREATOR.verseTimings = [];

    if (!CREATOR.audioContext) {
        CREATOR.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    const everyayahCode = getEveryayahCode(reciterId);
    const total = to - from + 1;
    let loaded = 0;

    for (let verse = from; verse <= to; verse++) {
        const url = `https://everyayah.com/data/${everyayahCode}/${String(surahId).padStart(3,'0')}${String(verse).padStart(3,'0')}.mp3`;

        try {
            const buffer = await loadAudioBuffer(url);
            CREATOR.audioBuffers.push(buffer);
        } catch (e) {
            // Try mp3quran server as fallback
            try {
                if (CREATOR.reciterMoshaf && CREATOR.reciterMoshaf.server) {
                    const mp3url = `${CREATOR.reciterMoshaf.server}${String(surahId).padStart(3,'0')}.mp3`;
                    // We can't easily get individual verse from full surah mp3, so use silence
                }
            } catch {}
            // Push silent buffer (1 second)
            const silentBuffer = CREATOR.audioContext.createBuffer(1, 44100, 44100);
            CREATOR.audioBuffers.push(silentBuffer);
        }

        loaded++;
        const pct = 40 + (loaded / total) * 35;
        updateProgress(`تحميل الصوت: آية ${verse} (${loaded}/${total})`, pct);
    }
}

/* =============================================
   LOAD AUDIO BUFFER
   ============================================= */
async function loadAudioBuffer(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    return await CREATOR.audioContext.decodeAudioData(arrayBuffer);
}

/* =============================================
   MERGE AUDIO BUFFERS
   ============================================= */
async function mergeAudioBuffers() {
    if (CREATOR.audioBuffers.length === 0) return;

    const sampleRate = CREATOR.audioContext.sampleRate;
    let totalSamples = 0;

    // Calculate timings
    CREATOR.verseTimings = [];
    CREATOR.totalDuration = 0;

    CREATOR.audioBuffers.forEach(buf => {
        CREATOR.verseTimings.push({
            start: CREATOR.totalDuration,
            duration: buf.duration,
        });
        CREATOR.totalDuration += buf.duration;
        totalSamples += buf.length;
    });

    // Add small gap between verses (0.5s)
    const gapSamples = Math.floor(sampleRate * 0.5);
    const totalWithGaps = totalSamples + gapSamples * (CREATOR.audioBuffers.length - 1);
    CREATOR.totalDuration += 0.5 * (CREATOR.audioBuffers.length - 1);

    // Recalculate timings with gaps
    CREATOR.verseTimings = [];
    let currentTime = 0;
    CREATOR.audioBuffers.forEach((buf, i) => {
        CREATOR.verseTimings.push({
            start: currentTime,
            duration: buf.duration,
        });
        currentTime += buf.duration + 0.5;
    });

    // Create merged offline context
    const channels = Math.max(...CREATOR.audioBuffers.map(b => b.numberOfChannels));
    const offlineCtx = new OfflineAudioContext(channels, totalWithGaps, sampleRate);

    let offset = 0;
    CREATOR.audioBuffers.forEach((buf, i) => {
        const source = offlineCtx.createBufferSource();
        source.buffer = buf;
        source.connect(offlineCtx.destination);
        source.start(offset / sampleRate);
        offset += buf.length + gapSamples;
    });

    try {
        CREATOR.playbackBuffer = await offlineCtx.startRendering();
    } catch (e) {
        // Fallback: play individually
        CREATOR.playbackBuffer = null;
    }
}

/* =============================================
   SETUP CANVAS
   ============================================= */
function setupCanvas(reciterName, surahName, surahId) {
    CREATOR.canvas = document.getElementById('videoCanvas');
    CREATOR.ctx = CREATOR.canvas.getContext('2d');
    CREATOR.canvas.width = 1280;
    CREATOR.canvas.height = 720;
    CREATOR._reciterName = reciterName;
    CREATOR._surahName = surahName;
    CREATOR._surahId = surahId;
}

/* =============================================
   DRAW FRAME
   ============================================= */
function drawFrame(reciterName, surahName, progress = 0) {
    const ctx = CREATOR.ctx;
    const W = CREATOR.canvas.width;
    const H = CREATOR.canvas.height;

    // --- Background ---
    if (CREATOR.bgVideo && CREATOR.bgVideo.readyState >= 2) {
        ctx.drawImage(CREATOR.bgVideo, 0, 0, W, H);
    } else if (CREATOR.bgImage) {
        // Cover fit
        const imgAspect = CREATOR.bgImage.width / CREATOR.bgImage.height;
        const canvasAspect = W / H;
        let sx, sy, sw, sh;
        if (imgAspect > canvasAspect) {
            sh = CREATOR.bgImage.height;
            sw = sh * canvasAspect;
            sx = (CREATOR.bgImage.width - sw) / 2;
            sy = 0;
        } else {
            sw = CREATOR.bgImage.width;
            sh = sw / canvasAspect;
            sx = 0;
            sy = (CREATOR.bgImage.height - sh) / 2;
        }
        ctx.drawImage(CREATOR.bgImage, sx, sy, sw, sh, 0, 0, W, H);
    } else {
        // Auto gradient
        const grad = ctx.createLinearGradient(0, 0, W, H);
        grad.addColorStop(0, '#0d1f14');
        grad.addColorStop(0.5, '#1a3d25');
        grad.addColorStop(1, '#0a2010');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
        drawIslamicPattern(ctx, W, H);
    }

    // --- Semi-transparent overlay ---
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(0, 0, W, H);

    // --- Decorative borders ---
    drawDecorations(ctx, W, H);

    // --- Current verse ---
    const verse = CREATOR.verses[CREATOR.currentVerseIdx];
    if (verse) {
        // Verse number badge
        const verseLabel = `﴿ ${toArabicNumber(verse.number)} ﴾`;
        ctx.fillStyle = 'rgba(201, 168, 76, 0.15)';
        ctx.beginPath();
        ctx.roundRect(W/2 - 60, H * 0.2 - 20, 120, 40, 20);
        ctx.fill();
        ctx.fillStyle = '#e8c97e';
        ctx.font = '500 22px Amiri, serif';
        ctx.textAlign = 'center';
        ctx.fillText(verseLabel, W / 2, H * 0.2 + 5);

        // Verse text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 42px Amiri, serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 12;
        wrapText(ctx, verse.text, W / 2, H / 2, W - 120, 60);
        ctx.shadowBlur = 0;
    }

    // --- Surah name ---
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = '600 26px Noto Kufi Arabic, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`سورة ${surahName}`, W / 2, H * 0.82);

    // --- Reciter name ---
    ctx.fillStyle = 'rgba(232, 201, 126, 0.9)';
    ctx.font = '500 22px Noto Kufi Arabic, sans-serif';
    ctx.fillText(reciterName, W / 2, H * 0.88);

    // --- Branding ---
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '400 18px Noto Kufi Arabic, sans-serif';
    ctx.fillText('فيديوهات القرآن الكريم', W / 2, H * 0.95);

    // --- Progress bar ---
    if (progress > 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(60, H - 30, W - 120, 6);
        ctx.fillStyle = '#e8c97e';
        ctx.fillRect(60, H - 30, (W - 120) * progress, 6);
    }

    // Update verse display below canvas
    updateVerseDisplay(verse, reciterName, surahName);
}

/* =============================================
   DRAW ISLAMIC PATTERN
   ============================================= */
function drawIslamicPattern(ctx, W, H) {
    ctx.save();
    ctx.globalAlpha = 0.04;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    const size = 60;
    for (let x = 0; x < W + size; x += size) {
        for (let y = 0; y < H + size; y += size) {
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const r = size * 0.4;
                if (i === 0) ctx.moveTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r);
                else ctx.lineTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r);
            }
            ctx.closePath();
            ctx.stroke();
        }
    }
    ctx.restore();
}

/* =============================================
   DRAW DECORATIONS
   ============================================= */
function drawDecorations(ctx, W, H) {
    // Top border line
    const topGrad = ctx.createLinearGradient(0, 0, W, 0);
    topGrad.addColorStop(0, 'transparent');
    topGrad.addColorStop(0.5, '#c9a84c');
    topGrad.addColorStop(1, 'transparent');
    ctx.strokeStyle = topGrad;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(60, 50);
    ctx.lineTo(W - 60, 50);
    ctx.stroke();

    // Bottom border line
    ctx.beginPath();
    ctx.moveTo(60, H - 50);
    ctx.lineTo(W - 60, H - 50);
    ctx.stroke();

    // Corner ornaments
    const corners = [[80, 68], [W - 80, 68], [80, H - 68], [W - 80, H - 68]];
    corners.forEach(([cx, cy]) => {
        ctx.fillStyle = '#c9a84c';
        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fill();
    });
}

/* =============================================
   WRAP TEXT ON CANVAS
   ============================================= */
function wrapText(ctx, text, x, centerY, maxWidth, lineHeight) {
    if (!text) return;

    // Simple word wrapping for Arabic
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (let i = words.length - 1; i >= 0; i--) {
        const testLine = currentLine ? words[i] + ' ' + currentLine : words[i];
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && currentLine) {
            lines.unshift(currentLine.trim());
            currentLine = words[i];
        } else {
            currentLine = testLine;
        }
    }
    if (currentLine) lines.unshift(currentLine.trim());

    const totalHeight = lines.length * lineHeight;
    const startY = centerY - totalHeight / 2 + lineHeight / 2;

    lines.forEach((line, i) => {
        ctx.fillText(line, x, startY + i * lineHeight);
    });
}

/* =============================================
   ARABIC NUMBERS
   ============================================= */
function toArabicNumber(num) {
    const ar = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
    return String(num).replace(/[0-9]/g, d => ar[d]);
}

/* =============================================
   UPDATE VERSE DISPLAY (below canvas)
   ============================================= */
function updateVerseDisplay(verse, reciterName, surahName) {
    const textEl = document.getElementById('verseText');
    const infoEl = document.getElementById('verseInfo');

    if (verse && textEl) {
        textEl.textContent = verse.text;
        const num = toArabicNumber(CREATOR.currentVerseIdx + 1);
        infoEl.textContent = `${reciterName} • سورة ${surahName} • الآية ${toArabicNumber(verse.number)}`;
    }
}

/* =============================================
   PLAY / PAUSE CONTROLS
   ============================================= */
function togglePlayPause() {
    if (!CREATOR.isReady) return;

    if (CREATOR.isPlaying) {
        pausePlayback();
    } else {
        startPlayback();
    }
}

function startPlayback() {
    if (!CREATOR.audioContext) return;

    if (CREATOR.audioContext.state === 'suspended') {
        CREATOR.audioContext.resume();
    }

    CREATOR.isPlaying = true;
    document.getElementById('playIcon').className = 'fas fa-pause';

    if (CREATOR.playbackBuffer) {
        // Play merged audio
        CREATOR.audioSource = CREATOR.audioContext.createBufferSource();
        CREATOR.audioSource.buffer = CREATOR.playbackBuffer;
        CREATOR.audioSource.connect(CREATOR.audioContext.destination);
        CREATOR.audioSource.start(0, CREATOR.pausedAt || 0);
        CREATOR.startTime = CREATOR.audioContext.currentTime - (CREATOR.pausedAt || 0);

        CREATOR.audioSource.onended = () => {
            if (CREATOR.isPlaying) {
                CREATOR.isPlaying = false;
                CREATOR.pausedAt = 0;
                CREATOR.currentVerseIdx = 0;
                document.getElementById('playIcon').className = 'fas fa-play';
                cancelAnimationFrame(CREATOR.animFrame);
                document.getElementById('playerProgressFill').style.width = '100%';
            }
        };
    } else {
        // Fallback: play individual verse audio sequentially
        playVerseSequence(CREATOR.currentVerseIdx);
    }

    // Start background video if any
    if (CREATOR.bgVideo) CREATOR.bgVideo.play().catch(() => {});

    // Start animation loop
    animateCanvas();
}

function pausePlayback() {
    CREATOR.isPlaying = false;
    document.getElementById('playIcon').className = 'fas fa-play';

    if (CREATOR.audioSource) {
        CREATOR.pausedAt = CREATOR.audioContext.currentTime - CREATOR.startTime;
        try { CREATOR.audioSource.stop(); } catch (e) {}
        CREATOR.audioSource = null;
    }

    if (CREATOR.bgVideo) CREATOR.bgVideo.pause();
    cancelAnimationFrame(CREATOR.animFrame);
}

function stopPlayback() {
    if (CREATOR.isPlaying) pausePlayback();
    CREATOR.pausedAt = 0;
    CREATOR.currentVerseIdx = 0;
    cancelAnimationFrame(CREATOR.animFrame);

    const playIcon = document.getElementById('playIcon');
    if (playIcon) playIcon.className = 'fas fa-play';
}

/* =============================================
   PLAY VERSE SEQUENCE (fallback)
   ============================================= */
async function playVerseSequence(startIdx) {
    for (let i = startIdx; i < CREATOR.audioBuffers.length; i++) {
        if (!CREATOR.isPlaying) break;
        CREATOR.currentVerseIdx = i;
        await playAudioBuffer(CREATOR.audioBuffers[i]);
        await sleep(500);
    }
    if (CREATOR.isPlaying) {
        CREATOR.isPlaying = false;
        CREATOR.pausedAt = 0;
        document.getElementById('playIcon').className = 'fas fa-play';
    }
}

function playAudioBuffer(buffer) {
    return new Promise((resolve) => {
        if (!CREATOR.audioContext || !buffer) { resolve(); return; }
        const source = CREATOR.audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(CREATOR.audioContext.destination);
        source.onended = resolve;
        source.start(0);
        CREATOR.audioSource = source;
    });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/* =============================================
   ANIMATE CANVAS LOOP
   ============================================= */
function animateCanvas() {
    if (!CREATOR.isPlaying) return;

    const elapsed = CREATOR.audioContext.currentTime - CREATOR.startTime;
    const total = CREATOR.totalDuration;
    const progress = Math.min(elapsed / total, 1);

    // Find current verse
    let currentIdx = 0;
    for (let i = 0; i < CREATOR.verseTimings.length; i++) {
        if (elapsed >= CREATOR.verseTimings[i].start) {
            currentIdx = i;
        }
    }
    CREATOR.currentVerseIdx = Math.min(currentIdx, CREATOR.verses.length - 1);

    // Update progress bar (player)
    document.getElementById('playerProgressFill').style.width = `${progress * 100}%`;

    // Update player time
    const timeEl = document.getElementById('playerTime');
    if (timeEl) {
        timeEl.textContent = `${formatTime(elapsed)} / ${formatTime(total)}`;
    }

    // Draw frame
    drawFrame(CREATOR._reciterName, CREATOR._surahName, progress);

    CREATOR.animFrame = requestAnimationFrame(animateCanvas);
}

function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
}

/* =============================================
   RECORDING (MediaRecorder)
   ============================================= */
async function startRecording() {
    if (CREATOR.isRecording) return;
    if (!CREATOR.isReady) {
        showAlert('يرجى إنشاء التلاوة أولاً', 'warning');
        return;
    }

    const recordBtn = document.getElementById('recordBtn');
    const recordingStatus = document.getElementById('recordingStatus');
    const statusText = document.getElementById('recordingStatusText');

    // Reset to beginning
    stopPlayback();
    CREATOR.pausedAt = 0;
    CREATOR.currentVerseIdx = 0;

    try {
        // Create audio stream from AudioContext
        const dest = CREATOR.audioContext.createMediaStreamDestination();

        // Connect audio
        if (CREATOR.playbackBuffer) {
            const source = CREATOR.audioContext.createBufferSource();
            source.buffer = CREATOR.playbackBuffer;
            source.connect(dest);
            source.connect(CREATOR.audioContext.destination);
            CREATOR.audioSource = source;
        }

        // Capture canvas stream
        const canvasStream = CREATOR.canvas.captureStream(30);

        // Merge audio + video
        const combinedStream = new MediaStream([
            ...canvasStream.getVideoTracks(),
            ...dest.stream.getAudioTracks(),
        ]);

        CREATOR.recordedChunks = [];
        CREATOR.mediaRecorder = new MediaRecorder(combinedStream, {
            mimeType: 'video/webm;codecs=vp9,opus',
            videoBitsPerSecond: 5000000,
        });

        CREATOR.mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) CREATOR.recordedChunks.push(e.data);
        };

        CREATOR.mediaRecorder.onstop = () => {
            downloadRecording();
            CREATOR.isRecording = false;
            recordBtn.innerHTML = '<i class="fas fa-record-vinyl"></i> تسجيل وتحميل الفيديو';
            recordBtn.disabled = false;
            recordingStatus.style.display = 'none';
            stopPlayback();
        };

        CREATOR.mediaRecorder.start(100);
        CREATOR.isRecording = true;

        // Start playback + animation
        if (CREATOR.audioContext.state === 'suspended') {
            await CREATOR.audioContext.resume();
        }

        CREATOR.startTime = CREATOR.audioContext.currentTime;
        if (CREATOR.audioSource) {
            CREATOR.audioSource.start(0);
        }

        CREATOR.isPlaying = true;
        document.getElementById('playIcon').className = 'fas fa-pause';
        if (CREATOR.bgVideo) CREATOR.bgVideo.play().catch(() => {});
        animateCanvas();

        recordBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التسجيل...';
        recordBtn.disabled = true;
        recordingStatus.style.display = 'flex';

        // Auto stop after total duration
        const stopDelay = (CREATOR.totalDuration + 1) * 1000;
        statusText.textContent = `جاري التسجيل... (${Math.ceil(CREATOR.totalDuration + 1)} ثانية)`;

        setTimeout(() => {
            if (CREATOR.isRecording && CREATOR.mediaRecorder.state === 'recording') {
                CREATOR.mediaRecorder.stop();
            }
        }, stopDelay);

        if (CREATOR.audioSource) {
            CREATOR.audioSource.onended = () => {
                setTimeout(() => {
                    if (CREATOR.isRecording && CREATOR.mediaRecorder.state === 'recording') {
                        CREATOR.mediaRecorder.stop();
                    }
                }, 500);
            };
        }

    } catch (err) {
        console.error('Recording error:', err);
        CREATOR.isRecording = false;
        recordBtn.innerHTML = '<i class="fas fa-record-vinyl"></i> تسجيل وتحميل الفيديو';
        recordBtn.disabled = false;
        recordingStatus.style.display = 'none';
        showAlert(`تعذر التسجيل: ${err.message}`, 'error');
    }
}

/* =============================================
   DOWNLOAD RECORDING
   ============================================= */
function downloadRecording() {
    if (CREATOR.recordedChunks.length === 0) return;

    const blob = new Blob(CREATOR.recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    const surahName = CREATOR._surahName || 'quran';
    const reciterName = CREATOR._reciterName || 'reciter';
    a.download = `tilawa_${surahName}_${reciterName}_${Date.now()}.webm`
        .replace(/\s+/g, '_')
        .replace(/[^\w_.-]/g, '');

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => URL.revokeObjectURL(url), 10000);
    showAlert('تم حفظ الفيديو بنجاح! تحقق من مجلد التنزيلات.', 'success');
}

/* =============================================
   RESET CREATOR STATE
   ============================================= */
function resetCreator() {
    stopPlayback();
    CREATOR.verses = [];
    CREATOR.audioBuffers = [];
    CREATOR.verseTimings = [];
    CREATOR.currentVerseIdx = 0;
    CREATOR.totalDuration = 0;
    CREATOR.pausedAt = 0;
    CREATOR.playbackBuffer = null;
    CREATOR.isReady = false;
    CREATOR.recordedChunks = [];

    document.getElementById('playerControls').style.display = 'none';
    document.getElementById('verseDisplay').style.display = 'none';
    document.getElementById('downloadSection').style.display = 'none';
    document.getElementById('playerProgressFill').style.width = '0%';

    showPlaceholder();
}

/* =============================================
   ALERT NOTIFICATION
   ============================================= */
function showAlert(message, type = 'info') {
    // Remove existing alerts
    document.querySelectorAll('.site-alert').forEach(a => a.remove());

    const colors = {
        success: '#1a7a4a',
        error: '#dc3545',
        warning: '#f5a623',
        info: '#1a6b4a',
    };

    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle',
    };

    const alert = document.createElement('div');
    alert.className = 'site-alert';
    alert.style.cssText = `
        position: fixed;
        top: 90px;
        right: 20px;
        z-index: 9999;
        background: ${colors[type]};
        color: white;
        padding: 14px 20px;
        border-radius: 12px;
        box-shadow: 0 8px 30px rgba(0,0,0,0.25);
        display: flex;
        align-items: center;
        gap: 10px;
        font-family: 'Noto Kufi Arabic', sans-serif;
        font-size: 0.95rem;
        font-weight: 600;
        max-width: 380px;
        animation: slideInRight 0.3s ease;
        direction: rtl;
    `;

    alert.innerHTML = `
        <i class="fas ${icons[type]}" style="flex-shrink:0;font-size:1.1rem;"></i>
        <span>${escapeHtml(message)}</span>
    `;

    document.body.appendChild(alert);

    setTimeout(() => {
        alert.style.opacity = '0';
        alert.style.transition = 'opacity 0.3s';
        setTimeout(() => alert.remove(), 300);
    }, 4000);
}

// Add CSS for alert animation
const alertStyle = document.createElement('style');
alertStyle.textContent = `
@keyframes slideInRight {
    from { opacity: 0; transform: translateX(30px); }
    to { opacity: 1; transform: translateX(0); }
}
`;
document.head.appendChild(alertStyle);

/* =============================================
   EXPOSE GLOBALS
   ============================================= */
window.createTilawa = createTilawa;
window.togglePlayPause = togglePlayPause;
window.startRecording = startRecording;
