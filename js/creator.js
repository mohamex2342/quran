/**
 * creator.js — منشئ الفيديو القرآني
 *
 * الإصلاح الرئيسي:
 * ================
 * المشكلة السابقة: كان الصوت يُشغَّل عبر <audio> منفصل، فلا يُلتقط بـ MediaRecorder.
 *
 * الحل المُطبَّق:
 * 1. استخدام AudioContext كامل.
 * 2. تحميل كل آية صوتية كـ ArrayBuffer ثم فكّها بـ decodeAudioData.
 * 3. دمج مسارات الآيات تسلسليًا ببثّ مباشر عبر AudioContext.destination.
 * 4. رَبط AudioContext.destination بـ MediaStreamDestination → إضافة مسار الصوت
 *    إلى MediaRecorder مع مسار Canvas (captureStream).
 * 5. المعادلة: canvas.captureStream(30fps) + audioCtx.createMediaStreamDestination()
 *    → MediaStream مشترك → MediaRecorder → Blob WebM يحتوي فيديو + صوت.
 */

'use strict';

/* =============================================
   DOM REFS
   ============================================= */
const reciterSel   = document.getElementById('reciter-select');
const moshafSel    = document.getElementById('moshaf-select');
const surahSel     = document.getElementById('surah-select');
const verseFrom    = document.getElementById('verse-from');
const verseTo      = document.getElementById('verse-to');
const verseCount   = document.getElementById('verse-count-text');
const btnCreate    = document.getElementById('btn-create');
const btnPlayPause = document.getElementById('btn-play-pause');
const btnStop      = document.getElementById('btn-stop');
const btnReset     = document.getElementById('btn-reset');
const btnRetry     = document.getElementById('btn-retry');
const playIcon     = document.getElementById('play-icon');
const canvas       = document.getElementById('preview-canvas');
const ctx          = canvas.getContext('2d');
const progressBar  = document.getElementById('progress-bar');
const progressPct  = document.getElementById('progress-pct');
const progressText = document.getElementById('progress-text');
const errorText    = document.getElementById('error-text');
const downloadLink = document.getElementById('download-link');
const previewVideo = document.getElementById('preview-video');
const currentVerseNum = document.getElementById('current-verse-num');
const totalVersesNum  = document.getElementById('total-verses-num');

/* Background elements */
const bgOptions    = document.querySelectorAll('input[name="bg-type"]');
const bgUrlWrap    = document.getElementById('bg-url-input');
const bgFileWrap   = document.getElementById('bg-file-input');
const bgUrlInput   = document.getElementById('bg-url');
const bgFileInput  = document.getElementById('bg-file');
const loadBgUrlBtn = document.getElementById('load-bg-url');

/* Sections */
const sec = {
    placeholder: document.getElementById('preview-placeholder'),
    canvas:      document.getElementById('canvas-section'),
    progress:    document.getElementById('progress-section'),
    download:    document.getElementById('download-section'),
    error:       document.getElementById('creator-error'),
};

/* =============================================
   STATE
   ============================================= */
const state = {
    reciters:   [],
    suwar:      [],
    verses:     [],       // { text, audio: ArrayBuffer }
    bgImage:    null,     // HTMLImageElement | null
    bgType:     'auto',

    // Playback
    isPlaying:  false,
    currentIdx: 0,
    animFrame:  null,

    // Recording
    recorder:   null,
    chunks:     [],

    // Audio
    audioCtx:   null,
    audioDest:  null,
    currentSource: null,
};

/* =============================================
   PROXY / FETCH HELPERS
   ============================================= */
const CREATOR_PROXY = 'https://corsproxy.io/?';

async function apiFetch(url, asBuffer = false) {
    let res;
    try {
        res = await fetch(url);
        if (!res.ok) throw new Error();
    } catch (_) {
        res = await fetch(CREATOR_PROXY + encodeURIComponent(url));
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
    return asBuffer ? res.arrayBuffer() : res.json();
}

/* =============================================
   SECTION HELPER
   ============================================= */
function showSection(name) {
    Object.values(sec).forEach(el => el && (el.style.display = 'none'));
    if (sec[name]) sec[name].style.display = '';
    // Specific flex overrides
    if (name === 'placeholder') sec.placeholder.style.display = 'flex';
}

/* =============================================
   INIT — load reciters + suwar on page load
   ============================================= */
async function initCreator() {
    showSection('placeholder');
    await Promise.all([loadReciters(), loadSuwar()]);
}

/* ---- Reciters ---- */
async function loadReciters() {
    reciterSel.innerHTML = '<option value="">جاري التحميل...</option>';
    try {
        const data = await apiFetch('https://mp3quran.net/api/v3/reciters?language=ar');
        state.reciters = data.reciters || [];
        reciterSel.innerHTML = '<option value="">اختر القارئ...</option>';
        state.reciters.forEach(r => {
            const opt = new Option(r.name, r.id);
            reciterSel.appendChild(opt);
        });
    } catch (e) {
        reciterSel.innerHTML = '<option value="">تعذّر التحميل</option>';
        console.error(e);
    }
}

reciterSel.addEventListener('change', () => {
    const id = parseInt(reciterSel.value);
    const reciter = state.reciters.find(r => r.id === id);
    moshafSel.innerHTML = '<option value="">اختر الرواية...</option>';
    moshafSel.disabled = true;
    if (!reciter) return;

    (reciter.moshaf || []).forEach(m => {
        const opt = new Option(m.name, m.id);
        opt.dataset.server   = m.server;
        opt.dataset.surahList = m.surah_list;
        moshafSel.appendChild(opt);
    });
    moshafSel.disabled = false;
});

moshafSel.addEventListener('change', () => updateSurahAvailability());

/* ---- Suwar ---- */
async function loadSuwar() {
    surahSel.innerHTML = '<option value="">جاري التحميل...</option>';
    try {
        const data = await apiFetch('https://mp3quran.net/api/v3/suwar?language=ar');
        state.suwar = data.suwar || [];
        surahSel.innerHTML = '<option value="">اختر السورة...</option>';
        state.suwar.forEach(s => {
            const opt = new Option(`${s.id}. ${s.name}`, s.id);
            opt.dataset.name = s.name;
            opt.dataset.type = s.makkia; // 1=مكية 0=مدنية
            surahSel.appendChild(opt);
        });
        surahSel.addEventListener('change', onSurahChange);
    } catch (e) {
        surahSel.innerHTML = '<option value="">تعذّر التحميل</option>';
        console.error(e);
    }
}

/** Count ayat per surah (hardcoded array – avoids extra API call) */
const SURAH_VERSE_COUNT = [
    7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,
    112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,
    59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,
    52,44,28,28,20,56,40,31,50,45,26,29,19,36,25,22,17,19,26,30,20,15,21,11,8,
    8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6
];

function getVerseCount(surahId) {
    return SURAH_VERSE_COUNT[surahId - 1] || 7;
}

function onSurahChange() {
    const sid = parseInt(surahSel.value);
    if (!sid) return;
    const max = getVerseCount(sid);
    verseFrom.max = max;
    verseTo.max   = max;
    verseFrom.value = 1;
    verseTo.value   = Math.min(7, max);
    updateVerseInfo();
    updateSurahAvailability();
}

verseFrom.addEventListener('input', updateVerseInfo);
verseTo.addEventListener('input',   updateVerseInfo);

function updateVerseInfo() {
    const from = parseInt(verseFrom.value) || 1;
    const to   = parseInt(verseTo.value)   || 1;
    const sid  = parseInt(surahSel.value)  || 1;
    const max  = getVerseCount(sid);
    const clamped = Math.min(to, max);
    verseCount.textContent = `سيتم عرض الآيات من ${from} إلى ${clamped} — (${clamped - from + 1} آية)`;
}

function updateSurahAvailability() {
    const opt = moshafSel.options[moshafSel.selectedIndex];
    if (!opt || !opt.dataset.surahList) return;
    const available = opt.dataset.surahList.split(',').map(Number);
    Array.from(surahSel.options).forEach(o => {
        if (!o.value) return;
        o.disabled = !available.includes(parseInt(o.value));
    });
}

/* =============================================
   BACKGROUND HANDLING
   ============================================= */
bgOptions.forEach(radio => {
    radio.addEventListener('change', () => {
        state.bgType = radio.value;
        bgUrlWrap.style.display  = radio.value === 'url'  ? '' : 'none';
        bgFileWrap.style.display = radio.value === 'file' ? '' : 'none';
        document.querySelectorAll('.bg-option').forEach(l => l.classList.remove('active'));
        radio.parentElement.classList.add('active');
        if (radio.value !== 'url' && radio.value !== 'file') state.bgImage = null;
    });
});

loadBgUrlBtn.addEventListener('click', () => loadBgFromUrl(bgUrlInput.value.trim()));
bgUrlInput.addEventListener('keydown', e => { if (e.key === 'Enter') loadBgFromUrl(bgUrlInput.value.trim()); });

function loadBgFromUrl(url) {
    if (!url) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => { state.bgImage = img; };
    img.onerror = () => alert('تعذّر تحميل الصورة من هذا الرابط');
    img.src = url;
}

bgFileInput.addEventListener('change', () => {
    const file = bgFileInput.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload  = () => { state.bgImage = img; };
    img.onerror = () => alert('تعذّر قراءة الملف');
    img.src = url;
});

/* =============================================
   QURAN TEXT (Quran.com API)
   ============================================= */
async function fetchVerseText(surahId, verseNum) {
    try {
        const url = `https://api.quran.com/api/v4/quran/verses/uthmani?verse_key=${surahId}:${verseNum}`;
        const data = await apiFetch(url);
        return data.verses?.[0]?.text_uthmani || '';
    } catch (e) {
        // Fallback: alquran.cloud
        try {
            const data = await apiFetch(`https://api.alquran.cloud/v1/ayah/${surahId}:${verseNum}/quran-uthmani`);
            return data.data?.text || '';
        } catch (_) {
            return `آية ${verseNum}`;
        }
    }
}

/* =============================================
   AUDIO FETCH (EveryAyah)
   ============================================= */
function buildAudioUrl(server, surahId, verseNum) {
    // mp3quran server pattern: https://server6.mp3quran.net/akdr/
    const s = String(surahId).padStart(3, '0');
    const v = String(verseNum).padStart(3, '0');
    return `${server}${s}${v}.mp3`;
}

async function fetchVerseAudio(server, surahId, verseNum) {
    const url = buildAudioUrl(server, surahId, verseNum);
    try {
        const buf = await apiFetch(url, true);
        return buf;
    } catch (_) {
        // Fallback: EveryAyah Mishary Alafasy 128kbps
        const s = String(surahId).padStart(3, '0');
        const v = String(verseNum).padStart(3, '0');
        const fallback = `https://everyayah.com/data/Alafasy_128kbps/${s}${v}.mp3`;
        return apiFetch(fallback, true);
    }
}

/* =============================================
   MAIN CREATE FLOW
   ============================================= */
btnCreate.addEventListener('click', startCreate);

async function startCreate() {
    const reciterId = parseInt(reciterSel.value);
    const surahId   = parseInt(surahSel.value);
    const from      = parseInt(verseFrom.value);
    const to        = parseInt(verseTo.value);

    if (!reciterId) { alert('الرجاء اختيار القارئ'); return; }
    if (!moshafSel.value) { alert('الرجاء اختيار الرواية'); return; }
    if (!surahId)   { alert('الرجاء اختيار السورة'); return; }
    if (from > to || from < 1) { alert('نطاق الآيات غير صحيح'); return; }

    const moshafOpt = moshafSel.options[moshafSel.selectedIndex];
    const server = moshafOpt.dataset.server;
    const surahName = surahSel.options[surahSel.selectedIndex].dataset.name;

    stopPlayback();
    showSection('progress');
    sec.error.style.display = 'none';
    btnCreate.disabled = true;

    try {
        // ---- Phase 1: Fetch verse texts + audio ----
        const verses = [];
        const total  = to - from + 1;

        for (let i = from; i <= to; i++) {
            const pct = Math.round(((i - from) / total) * 80);
            setProgress(pct, `جاري تحميل الآية ${i} / ${to}...`);

            const [text, audio] = await Promise.all([
                fetchVerseText(surahId, i),
                fetchVerseAudio(server, surahId, i).catch(() => null),
            ]);
            verses.push({ num: i, text, audio, surahName });
        }

        state.verses = verses;
        setProgress(85, 'جاري إعداد الفيديو...');

        // ---- Phase 2: Record ----
        const blob = await recordVideo(verses, surahName);

        setProgress(100, 'اكتمل!');
        await delay(400);

        // ---- Phase 3: Show download ----
        const objUrl = URL.createObjectURL(blob);
        downloadLink.href = objUrl;
        downloadLink.download = `quran-${surahName}-${from}-${to}.webm`;
        previewVideo.src = objUrl;
        previewVideo.load();
        showSection('download');

    } catch (e) {
        console.error(e);
        errorText.textContent = e.message || 'حدث خطأ أثناء إنشاء الفيديو';
        sec.error.style.display = '';
        showSection('placeholder');
    } finally {
        btnCreate.disabled = false;
    }
}

/* =============================================
   RECORD VIDEO — الحل الأساسي لدمج الصوت
   ============================================= */
async function recordVideo(verses, surahName) {
    return new Promise(async (resolve, reject) => {
        try {
            /* --- 1. AudioContext + MediaStreamDestination ---- */
            const audioCtx  = new (window.AudioContext || window.webkitAudioContext)();
            const audioDest = audioCtx.createMediaStreamDestination();
            state.audioCtx  = audioCtx;
            state.audioDest = audioDest;

            /* --- 2. Canvas stream (30 fps) ---- */
            const canvasStream = canvas.captureStream(30);

            /* --- 3. Combine: canvas video tracks + audio track ---- */
            const combinedStream = new MediaStream([
                ...canvasStream.getVideoTracks(),
                ...audioDest.stream.getAudioTracks(),
            ]);

            /* --- 4. MediaRecorder with combined stream ---- */
            const mimeType = getSupportedMimeType();
            const recorder = new MediaRecorder(combinedStream, {
                mimeType,
                videoBitsPerSecond: 3_000_000,
                audioBitsPerSecond: 128_000,
            });
            const chunks = [];
            recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: mimeType });
                resolve(blob);
            };
            recorder.onerror = e => reject(e.error);

            /* --- 5. Start recording ---- */
            recorder.start(100); // collect every 100ms

            /* --- 6. Play verses sequentially on canvas + audio ---- */
            setProgress(90, 'جاري تسجيل الفيديو...');
            showSection('canvas');
            totalVersesNum.textContent = verses.length;

            for (let i = 0; i < verses.length; i++) {
                const v = verses[i];
                currentVerseNum.textContent = i + 1;

                // Draw frame
                renderFrame(v.text, v.num, surahName, i + 1, verses.length);

                // Play audio and wait for it to finish
                if (v.audio) {
                    await playAudioBuffer(audioCtx, audioDest, v.audio);
                } else {
                    // No audio: show slide for 3 seconds
                    await animateSlide(v.text, v.num, surahName, i + 1, verses.length, 3000);
                }
            }

            /* --- 7. Small pause then stop ---- */
            await delay(500);
            recorder.stop();
            audioCtx.close();

        } catch (e) {
            reject(e);
        }
    });
}

/* =============================================
   PLAY AUDIO BUFFER — يعزف الآية ويُعيد Promise
   تنتهي عند انتهاء الصوت فعليًا
   ============================================= */
function playAudioBuffer(audioCtx, audioDest, arrayBuffer) {
    return new Promise(async (resolve, reject) => {
        try {
            // Copy buffer (decodeAudioData يستهلكه)
            const bufCopy = arrayBuffer.slice(0);
            const decoded = await audioCtx.decodeAudioData(bufCopy);

            const source = audioCtx.createBufferSource();
            source.buffer = decoded;

            // Connect: source → dest speaker (سماع) + audioDest (تسجيل)
            source.connect(audioCtx.destination);
            source.connect(audioDest);

            source.onended = () => resolve();
            source.onerror = e  => reject(e);

            source.start(0);

            // أثناء التشغيل: رسم متحرك (نبض)
            const duration = decoded.duration * 1000;
            await animateSlide(null, null, null, null, null, duration, source);

        } catch (e) {
            // فشل decode → انتظر ثانيتين فقط
            await delay(2000);
            resolve();
        }
    });
}

/* =============================================
   CANVAS RENDERING
   ============================================= */
function renderFrame(text, verseNum, surahName, idx, total, pulse = 0) {
    const W = canvas.width;  // 1280
    const H = canvas.height; // 720

    ctx.clearRect(0, 0, W, H);

    // Background
    if (state.bgImage) {
        ctx.drawImage(state.bgImage, 0, 0, W, H);
        // Dark overlay
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(0, 0, W, H);
    } else {
        // Islamic gradient
        const grad = ctx.createLinearGradient(0, 0, W, H);
        grad.addColorStop(0,   '#0a3d26');
        grad.addColorStop(0.5, '#1a6b4a');
        grad.addColorStop(1,   '#2d9b6e');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        // Pattern overlay
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        for (let x = 0; x < W; x += 60) for (let y = 0; y < H; y += 60) {
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Decorative top/bottom bars
    ctx.fillStyle = 'rgba(212,168,67,0.25)';
    ctx.fillRect(0, 0, W, 4);
    ctx.fillRect(0, H - 4, W, 4);

    // Bismillah (top)
    ctx.font = '600 42px "Amiri", serif';
    ctx.fillStyle = 'rgba(232, 199, 106, 0.9)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', W / 2, 80);

    // Surah name banner
    if (surahName) {
        ctx.fillStyle = 'rgba(26,107,74,0.7)';
        roundRect(ctx, W / 2 - 200, 130, 400, 50, 12);
        ctx.fill();
        ctx.font = 'bold 24px "Noto Kufi Arabic", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`سورة ${surahName}`, W / 2, 156);
    }

    // Verse text (with word wrap)
    if (text) {
        ctx.font = `${pulse > 0 ? 52 + pulse * 2 : 52}px "Amiri", serif`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign  = 'center';
        ctx.textBaseline = 'middle';
        wrapText(ctx, text, W / 2, H / 2, W - 200, 70);
    }

    // Verse number badge
    if (verseNum !== null) {
        const badge = `﴿${toArabicNum(verseNum)}﴾`;
        ctx.font = '38px "Amiri", serif';
        ctx.fillStyle = 'rgba(232,199,106,0.95)';
        ctx.fillText(badge, W / 2, H - 120);
    }

    // Progress indicator
    if (idx !== null && total !== null) {
        const barW = W * 0.6;
        const barX = (W - barW) / 2;
        const barY = H - 60;
        // Track
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        roundRect(ctx, barX, barY, barW, 6, 3);
        ctx.fill();
        // Fill
        ctx.fillStyle = 'rgba(212,168,67,0.9)';
        roundRect(ctx, barX, barY, barW * (idx / total), 6, 3);
        ctx.fill();
        // Label
        ctx.font = '20px "Noto Kufi Arabic", sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillText(`${idx} / ${total}`, W / 2, H - 30);
    }
}

/* Animate slide with optional pulse during audio playback */
async function animateSlide(text, verseNum, surahName, idx, total, durationMs, source) {
    return new Promise(resolve => {
        const start = performance.now();
        let raf;

        function frame(now) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / durationMs, 1);

            // Pulse: gentle scale oscillation
            const pulse = Math.sin(progress * Math.PI * 6) * 0.5;

            // Use stored verse state if not provided (during audio playback)
            const vtext = text || (state.verses[state.currentIdx]?.text) || '';
            const vnum  = verseNum || (state.verses[state.currentIdx]?.num) || null;
            const vsname = surahName || (state.verses[0]?.surahName) || '';
            const vidx  = idx   || (state.currentIdx + 1);
            const vtotal = total || state.verses.length;

            renderFrame(vtext, vnum, vsname, vidx, vtotal, pulse);

            if (elapsed < durationMs) {
                raf = requestAnimationFrame(frame);
            } else {
                resolve();
            }
        }

        raf = requestAnimationFrame(frame);
    });
}

/* =============================================
   INTERACTIVE PREVIEW CONTROLS (قبل التسجيل)
   ============================================= */
btnPlayPause.addEventListener('click', togglePlayback);
btnStop.addEventListener('click', stopPlayback);

function togglePlayback() {
    if (state.isPlaying) pausePlayback();
    else startPreviewPlayback();
}

async function startPreviewPlayback() {
    if (!state.verses.length) return;
    state.isPlaying = true;
    playIcon.className = 'fas fa-pause';

    if (!state.audioCtx) {
        state.audioCtx  = new (window.AudioContext || window.webkitAudioContext)();
        state.audioDest = state.audioCtx.createMediaStreamDestination();
    }
    if (state.audioCtx.state === 'suspended') await state.audioCtx.resume();

    for (let i = state.currentIdx; i < state.verses.length; i++) {
        if (!state.isPlaying) break;
        state.currentIdx = i;
        currentVerseNum.textContent = i + 1;

        const v = state.verses[i];
        renderFrame(v.text, v.num, v.surahName, i + 1, state.verses.length);

        if (v.audio) await playAudioBuffer(state.audioCtx, state.audioDest, v.audio);
        else         await delay(3000);
    }

    if (state.isPlaying) {
        state.isPlaying = false;
        state.currentIdx = 0;
        playIcon.className = 'fas fa-play';
    }
}

function pausePlayback() {
    state.isPlaying = false;
    playIcon.className = 'fas fa-play';
    if (state.audioCtx) state.audioCtx.suspend();
}

function stopPlayback() {
    state.isPlaying = false;
    state.currentIdx = 0;
    playIcon.className = 'fas fa-play';
    if (state.currentSource) { try { state.currentSource.stop(); } catch (_) {} }
    if (state.audioCtx) { state.audioCtx.close(); state.audioCtx = null; }
    if (state.animFrame) { cancelAnimationFrame(state.animFrame); state.animFrame = null; }
}

/* =============================================
   RESET
   ============================================= */
btnReset.addEventListener('click', () => {
    stopPlayback();
    state.verses = [];
    showSection('placeholder');
    sec.error.style.display = 'none';
    if (previewVideo.src) {
        URL.revokeObjectURL(previewVideo.src);
        previewVideo.src = '';
    }
    if (downloadLink.href) URL.revokeObjectURL(downloadLink.href);
});

btnRetry.addEventListener('click', () => {
    sec.error.style.display = 'none';
    startCreate();
});

/* =============================================
   UTILITIES
   ============================================= */
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function setProgress(pct, msg) {
    progressBar.style.width = pct + '%';
    progressPct.textContent = pct + '%';
    if (msg) progressText.textContent = msg;
}

function getSupportedMimeType() {
    const types = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
        'video/mp4',
    ];
    return types.find(t => MediaRecorder.isTypeSupported(t)) || 'video/webm';
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    // Arabic text wrap — split on spaces
    const words = text.split(' ');
    const lines = [];
    let line = '';

    for (const word of words) {
        const test = line ? line + ' ' + word : word;
        if (ctx.measureText(test).width > maxWidth) {
            if (line) lines.push(line);
            line = word;
        } else {
            line = test;
        }
    }
    if (line) lines.push(line);

    const totalHeight = lines.length * lineHeight;
    const startY = y - totalHeight / 2 + lineHeight / 2;

    lines.forEach((l, i) => {
        ctx.fillText(l, x, startY + i * lineHeight);
    });
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function toArabicNum(n) {
    return String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
}

/* =============================================
   INIT
   ============================================= */
window.addEventListener('DOMContentLoaded', () => {
    initCreator();
    updateVerseInfo();
});
