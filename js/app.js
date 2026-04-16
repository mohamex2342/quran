/**
 * فيديوهات القرآن الكريم
 * ملف JavaScript الرئيسي
 * يتضمن: التنقل، تحميل البيانات، عرض الفيديوهات، إدارة الواجهة
 */

'use strict';

/* =============================================
   Global State
   ============================================= */
const APP = {
    currentSection: 'home',
    reciters: [],
    suwar: [],
    videos: [],
    videoTypes: [],
    filteredVideos: [],
    activeFilter: 'all',
    searchQuery: '',
    homeVideosLoaded: false,
    allVideosLoaded: false,
    recitersLoaded: false,
    suwarLoaded: false,
};

/* =============================================
   API URLs
   ============================================= */
const API = {
    VIDEOS: 'https://mp3quran.net/api/v3/videos?language=ar',
    VIDEO_TYPES: 'https://mp3quran.net/api/v3/video_types?language=ar',
    RECITERS: 'https://mp3quran.net/api/v3/reciters?language=ar',
    SUWAR: 'https://mp3quran.net/api/v3/suwar?language=ar',
    QURAN_VERSES: (surah, from, to) => 
        `https://api.quran.com/api/v4/verses/by_chapter/${surah}?language=ar&translations=131&word_fields=text_uthmani&per_page=${to - from + 1}&page=1&verse_key=${surah}:${from}-${surah}:${to}`,
    QURAN_UTHMANI: (surah, verseNum) =>
        `https://api.quran.com/api/v4/verses/by_key/${surah}:${verseNum}?fields=text_uthmani`,
    EVERYAYAH_AUDIO: (reciterCode, surah, verse) =>
        `https://everyayah.com/data/${reciterCode}/${String(surah).padStart(3, '0')}${String(verse).padStart(3, '0')}.mp3`,
    MP3QURAN_AUDIO: (server, surah) =>
        `${server}${String(surah).padStart(3, '0')}.mp3`,
};

/* =============================================
   CORS Proxy helper (used as fallback)
   ============================================= */
const PROXY = 'https://api.allorigins.win/raw?url=';

async function fetchWithFallback(url) {
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (e) {
        // Try with CORS proxy
        try {
            const res2 = await fetch(PROXY + encodeURIComponent(url));
            if (!res2.ok) throw new Error(`HTTP ${res2.status}`);
            return await res2.json();
        } catch (e2) {
            throw new Error('فشل في الاتصال بالخادم');
        }
    }
}

/* =============================================
   NAVIGATION
   ============================================= */
function navigateTo(section) {
    if (APP.currentSection === section) return;
    
    // Update active section
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active-section'));
    const target = document.getElementById(`section-${section}`);
    if (target) {
        target.classList.add('active-section');
        target.classList.add('fade-in');
        setTimeout(() => target.classList.remove('fade-in'), 600);
    }

    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.section === section);
    });

    APP.currentSection = section;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Close mobile menu
    closeMobileMenu();

    // Load section data if not loaded
    if (section === 'home' && !APP.homeVideosLoaded) loadHomeVideos();
    if (section === 'videos' && !APP.allVideosLoaded) loadAllVideos();
    if (section === 'creator') initCreatorIfNeeded();
}

// Nav links click handler
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo(link.dataset.section);
    });
});

/* =============================================
   MOBILE MENU
   ============================================= */
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileNav = document.getElementById('mobileNav');

mobileMenuBtn.addEventListener('click', () => {
    const isOpen = mobileNav.classList.contains('open');
    if (isOpen) {
        closeMobileMenu();
    } else {
        mobileNav.classList.add('open');
        mobileMenuBtn.classList.add('open');
        mobileMenuBtn.setAttribute('aria-expanded', 'true');
    }
});

function closeMobileMenu() {
    mobileNav.classList.remove('open');
    mobileMenuBtn.classList.remove('open');
    mobileMenuBtn.setAttribute('aria-expanded', 'false');
}

// Close on outside click
document.addEventListener('click', (e) => {
    if (!e.target.closest('.header')) closeMobileMenu();
});

/* =============================================
   HEADER SCROLL EFFECT
   ============================================= */
window.addEventListener('scroll', () => {
    const header = document.getElementById('main-header');
    header.classList.toggle('scrolled', window.scrollY > 20);
});

/* =============================================
   VIDEOS: HOME PREVIEW (6 videos)
   ============================================= */
async function loadHomeVideos() {
    const grid = document.getElementById('homeVideosGrid');
    if (!grid) return;

    grid.innerHTML = `<div class="loading-state"><div class="loading-spinner"></div><p>جاري تحميل الفيديوهات...</p></div>`;

    try {
        await loadVideosData();
        const preview = APP.videos.slice(0, 6);
        renderVideosToGrid(grid, preview, true);
        APP.homeVideosLoaded = true;
    } catch (err) {
        grid.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>تعذر تحميل الفيديوهات. يرجى التحقق من اتصالك.</p>
                <button class="btn btn-primary btn-sm" onclick="APP.homeVideosLoaded=false; loadHomeVideos()">
                    <i class="fas fa-redo"></i> إعادة المحاولة
                </button>
            </div>`;
    }
}

/* =============================================
   VIDEOS: ALL VIDEOS PAGE
   ============================================= */
async function loadAllVideos() {
    const grid = document.getElementById('allVideosGrid');
    if (!grid) return;

    grid.innerHTML = `<div class="loading-state"><div class="loading-spinner"></div><p>جاري تحميل الفيديوهات...</p></div>`;

    try {
        await Promise.all([loadVideosData(), loadVideoTypesData()]);
        buildFilterTags();
        applyFilter();
        setupSearch();
        APP.allVideosLoaded = true;
    } catch (err) {
        grid.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>تعذر تحميل الفيديوهات: ${err.message}</p>
                <button class="btn btn-primary btn-sm" onclick="APP.allVideosLoaded=false; loadAllVideos()">
                    <i class="fas fa-redo"></i> إعادة المحاولة
                </button>
            </div>`;
    }
}

/* =============================================
   VIDEOS DATA LOADER
   ============================================= */
async function loadVideosData() {
    if (APP.videos.length > 0) return; // already loaded

    const data = await fetchWithFallback(API.VIDEOS);
    if (!data || !Array.isArray(data.videos)) throw new Error('بيانات غير صالحة');

    // Flatten: each reciter may have multiple videos
    APP.videos = [];
    data.videos.forEach(reciter => {
        if (Array.isArray(reciter.videos)) {
            reciter.videos.forEach(v => {
                APP.videos.push({
                    id: v.id,
                    reciter_name: reciter.reciter_name,
                    reciter_id: reciter.id,
                    video_type: v.video_type,
                    video_url: v.video_url,
                    video_thumb_url: v.video_thumb_url,
                });
            });
        }
    });
}

/* =============================================
   VIDEO TYPES DATA LOADER
   ============================================= */
async function loadVideoTypesData() {
    if (APP.videoTypes.length > 0) return;

    const data = await fetchWithFallback(API.VIDEO_TYPES);
    if (data && Array.isArray(data.video_types)) {
        APP.videoTypes = data.video_types;
    }
}

/* =============================================
   BUILD FILTER TAGS
   ============================================= */
function buildFilterTags() {
    const container = document.getElementById('filterTags');
    if (!container) return;

    container.innerHTML = `<button class="filter-tag active" data-type="all" onclick="filterVideos('all')">الكل</button>`;

    APP.videoTypes.forEach(type => {
        const btn = document.createElement('button');
        btn.className = 'filter-tag';
        btn.dataset.type = type.id;
        btn.onclick = () => filterVideos(type.id);
        btn.textContent = type.video_type;
        container.appendChild(btn);
    });
}

/* =============================================
   FILTER VIDEOS
   ============================================= */
function filterVideos(typeId) {
    APP.activeFilter = typeId;

    // Update active filter tag
    document.querySelectorAll('.filter-tag').forEach(tag => {
        tag.classList.toggle('active', String(tag.dataset.type) === String(typeId));
    });

    applyFilter();
}

function applyFilter() {
    let filtered = [...APP.videos];

    if (APP.activeFilter !== 'all') {
        filtered = filtered.filter(v => String(v.video_type) === String(APP.activeFilter));
    }

    if (APP.searchQuery) {
        const q = APP.searchQuery.toLowerCase();
        filtered = filtered.filter(v => v.reciter_name.toLowerCase().includes(q));
    }

    APP.filteredVideos = filtered;

    const grid = document.getElementById('allVideosGrid');
    if (!grid) return;

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <p>لا توجد فيديوهات مطابقة لبحثك</p>
            </div>`;
        return;
    }

    renderVideosToGrid(grid, filtered, false);
}

/* =============================================
   SETUP SEARCH
   ============================================= */
function setupSearch() {
    const searchInput = document.getElementById('videoSearch');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        APP.searchQuery = e.target.value.trim();
        applyFilter();
    });
}

/* =============================================
   RENDER VIDEOS TO GRID
   ============================================= */
function renderVideosToGrid(grid, videos, isPreview) {
    if (videos.length === 0) {
        grid.innerHTML = `<div class="empty-state"><i class="fas fa-video-slash"></i><p>لا توجد فيديوهات متاحة حالياً</p></div>`;
        return;
    }

    grid.innerHTML = '';
    videos.forEach((video, i) => {
        const card = createVideoCard(video);
        card.style.animationDelay = `${i * 60}ms`;
        card.classList.add('fade-in');
        grid.appendChild(card);
    });
}

/* =============================================
   CREATE VIDEO CARD
   ============================================= */
function createVideoCard(video) {
    const typeName = getVideoTypeName(video.video_type);

    const card = document.createElement('article');
    card.className = 'video-card';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `فيديو ${video.reciter_name}`);

    const thumbUrl = fixImageUrl(video.video_thumb_url);

    card.innerHTML = `
        <div class="video-thumb-wrap">
            <img src="${thumbUrl}" 
                 alt="صورة مصغرة لفيديو ${escapeHtml(video.reciter_name)}"
                 loading="lazy"
                 onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'320\\' height=\\'180\\' viewBox=\\'0 0 320 180\\'%3E%3Crect width=\\'320\\' height=\\'180\\' fill=\\'%231a3a2a\\'/%3E%3Ctext x=\\'160\\' y=\\'95\\' text-anchor=\\'middle\\' fill=\\'%232d9b6f\\' font-size=\\'14\\' font-family=\\'sans-serif\\'%3Eفيديو قرآني%3C/text%3E%3C/svg%3E'">
            <div class="video-play-overlay">
                <i class="fas fa-play"></i>
            </div>
        </div>
        <div class="video-card-body">
            <div class="video-reciter">${escapeHtml(video.reciter_name)}</div>
            ${typeName ? `<span class="video-type-badge"><i class="fas fa-tag"></i>${escapeHtml(typeName)}</span>` : ''}
        </div>
        <div class="video-card-footer">
            <button class="btn-watch" onclick="openVideoModal(event, ${JSON.stringify(video).replace(/"/g, '&quot;')})">
                <i class="fas fa-play"></i> مشاهدة
            </button>
        </div>
    `;

    card.addEventListener('click', (e) => {
        if (!e.target.closest('.btn-watch')) {
            openVideoModal(e, video);
        }
    });

    card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') openVideoModal(e, video);
    });

    return card;
}

/* =============================================
   FIX IMAGE URL (http → https)
   ============================================= */
function fixImageUrl(url) {
    if (!url) return '';
    return url.replace('http://', 'https://');
}

/* =============================================
   GET VIDEO TYPE NAME
   ============================================= */
function getVideoTypeName(typeId) {
    const found = APP.videoTypes.find(t => t.id === typeId);
    return found ? found.video_type : '';
}

/* =============================================
   OPEN VIDEO MODAL
   ============================================= */
function openVideoModal(e, video) {
    if (e) e.stopPropagation();

    const modal = document.getElementById('videoModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalVideoSrc = document.getElementById('modalVideoSrc');
    const modalVideo = document.getElementById('modalVideo');
    const modalInfo = document.getElementById('modalInfo');

    modalTitle.textContent = video.reciter_name;
    modalVideoSrc.src = video.video_url;
    modalVideo.load();

    const typeName = getVideoTypeName(video.video_type);
    modalInfo.innerHTML = typeName ? `<span class="video-type-badge"><i class="fas fa-tag"></i>${escapeHtml(typeName)}</span>` : '';

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeVideoModal() {
    const modal = document.getElementById('videoModal');
    const modalVideo = document.getElementById('modalVideo');
    modal.classList.remove('open');
    modalVideo.pause();
    document.body.style.overflow = '';
}

// Close modal on overlay click
document.getElementById('videoModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeVideoModal();
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeVideoModal();
});

/* =============================================
   ESCAPE HTML
   ============================================= */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(String(text || '')));
    return div.innerHTML;
}

/* =============================================
   CREATOR: INIT
   ============================================= */
async function initCreatorIfNeeded() {
    if (!APP.recitersLoaded) {
        await loadReciters();
    }
    if (!APP.suwarLoaded) {
        await loadSuwar();
    }
}

/* =============================================
   CREATOR: LOAD RECITERS
   ============================================= */
async function loadReciters() {
    const select = document.getElementById('reciterSelect');
    if (!select) return;

    select.innerHTML = '<option value="">-- جاري تحميل القراء... --</option>';

    try {
        const data = await fetchWithFallback(API.RECITERS);
        if (!data || !Array.isArray(data.reciters)) throw new Error('بيانات غير صالحة');

        APP.reciters = data.reciters;
        select.innerHTML = '<option value="">-- اختر القارئ --</option>';

        data.reciters.forEach(reciter => {
            if (!reciter.moshaf || reciter.moshaf.length === 0) return;
            const opt = document.createElement('option');
            opt.value = reciter.id;
            opt.textContent = reciter.name;
            opt.dataset.moshaf = JSON.stringify(reciter.moshaf[0]);
            select.appendChild(opt);
        });

        APP.recitersLoaded = true;
    } catch (err) {
        select.innerHTML = '<option value="">-- فشل تحميل القراء --</option>';
        console.error('Reciters load error:', err);
    }
}

/* =============================================
   CREATOR: LOAD SUWAR
   ============================================= */
async function loadSuwar() {
    const select = document.getElementById('surahSelect');
    if (!select) return;

    select.innerHTML = '<option value="">-- جاري تحميل السور... --</option>';

    try {
        const data = await fetchWithFallback(API.SUWAR);
        if (!data || !Array.isArray(data.suwar)) throw new Error('بيانات غير صالحة');

        APP.suwar = data.suwar;
        select.innerHTML = '<option value="">-- اختر السورة --</option>';

        // Add verse counts (standard count from Quran data)
        const SURAH_VERSE_COUNTS = getSurahVerseCounts();

        data.suwar.forEach(surah => {
            const opt = document.createElement('option');
            opt.value = surah.id;
            opt.textContent = `${surah.id}. ${surah.name}`;
            const verseCount = SURAH_VERSE_COUNTS[surah.id] || 7;
            opt.dataset.verseCount = verseCount;
            select.appendChild(opt);
        });

        // Add change handler
        select.addEventListener('change', onSurahChange);
        APP.suwarLoaded = true;
    } catch (err) {
        select.innerHTML = '<option value="">-- فشل تحميل السور --</option>';
        console.error('Suwar load error:', err);
    }
}

/* =============================================
   SURAH CHANGE HANDLER
   ============================================= */
function onSurahChange() {
    const select = document.getElementById('surahSelect');
    const selectedOpt = select.options[select.selectedIndex];
    const surahId = select.value;
    const versesRange = document.getElementById('versesRange');
    const surahInfo = document.getElementById('surahInfo');

    if (!surahId) {
        versesRange.style.display = 'none';
        surahInfo.style.display = 'none';
        return;
    }

    const verseCount = parseInt(selectedOpt.dataset.verseCount) || 7;
    const fromInput = document.getElementById('verseFrom');
    const toInput = document.getElementById('verseTo');

    fromInput.max = verseCount;
    toInput.max = verseCount;
    fromInput.value = 1;
    toInput.value = Math.min(7, verseCount);

    versesRange.style.display = 'grid';

    // Surah info
    const surah = APP.suwar.find(s => s.id == surahId);
    if (surah) {
        const type = surah.makkia === 1 ? 'مكية' : 'مدنية';
        surahInfo.innerHTML = `
            <i class="fas fa-info-circle" style="color:var(--primary);margin-left:6px;"></i>
            <strong>${surah.name}</strong> — ${type} — عدد آياتها: <strong>${verseCount}</strong>
        `;
        surahInfo.style.display = 'flex';
        surahInfo.style.alignItems = 'center';
    }
}

/* =============================================
   BACKGROUND SELECTOR
   ============================================= */
function selectBackground(type) {
    document.querySelectorAll('.bg-option').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.bg === type);
    });

    document.getElementById('bgUrlInput').style.display = type === 'url' ? 'block' : 'none';
    document.getElementById('bgFileInput').style.display = type === 'file' ? 'block' : 'none';

    window.APP_BG_TYPE = type;
}

// File drag & drop
const fileDropZone = document.getElementById('fileDropZone');
if (fileDropZone) {
    fileDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileDropZone.style.borderColor = 'var(--primary)';
        fileDropZone.style.background = 'rgba(26,107,74,0.05)';
    });

    fileDropZone.addEventListener('dragleave', () => {
        fileDropZone.style.borderColor = '';
        fileDropZone.style.background = '';
    });

    fileDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        fileDropZone.style.borderColor = '';
        fileDropZone.style.background = '';
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelect(file);
    });

    document.getElementById('bgFile').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleFileSelect(file);
    });
}

function handleFileSelect(file) {
    window.APP_BG_FILE = file;
    const fileDropZone = document.getElementById('fileDropZone');
    fileDropZone.innerHTML = `
        <i class="fas fa-check-circle" style="color:var(--primary)"></i>
        <p style="color:var(--primary);font-weight:600">${escapeHtml(file.name)}</p>
        <label for="bgFile" class="btn btn-sm btn-secondary dark">تغيير الملف</label>
        <input type="file" id="bgFile" accept="image/*,video/*" style="display:none;">
    `;
    // Re-attach listener
    fileDropZone.querySelector('#bgFile').addEventListener('change', (e) => {
        const f = e.target.files[0];
        if (f) handleFileSelect(f);
    });
}

/* =============================================
   VALIDATE VERSE RANGE
   ============================================= */
function validateVerseRange() {
    const fromInput = document.getElementById('verseFrom');
    const toInput = document.getElementById('verseTo');
    const surahSelect = document.getElementById('surahSelect');

    if (!surahSelect.value) return false;

    const selectedOpt = surahSelect.options[surahSelect.selectedIndex];
    const maxVerses = parseInt(selectedOpt.dataset.verseCount) || 300;

    let from = parseInt(fromInput.value) || 1;
    let to = parseInt(toInput.value) || 7;

    from = Math.max(1, Math.min(from, maxVerses));
    to = Math.max(from, Math.min(to, maxVerses));

    // Limit to max 20 verses
    if (to - from + 1 > 20) to = from + 19;

    fromInput.value = from;
    toInput.value = to;

    return { from, to };
}

/* =============================================
   GET BACKGROUND SETTING
   ============================================= */
function getBackgroundSetting() {
    const bgType = window.APP_BG_TYPE || 'auto';

    if (bgType === 'url') {
        const url = document.getElementById('bgUrl').value.trim();
        return { type: 'url', value: url || null };
    } else if (bgType === 'file') {
        return { type: 'file', value: window.APP_BG_FILE || null };
    }
    return { type: 'auto', value: null };
}

/* =============================================
   SURAH VERSE COUNTS (complete 114 surahs)
   ============================================= */
function getSurahVerseCounts() {
    return {
        1:7,2:286,3:200,4:176,5:120,6:165,7:206,8:75,9:129,10:109,
        11:123,12:111,13:43,14:52,15:99,16:128,17:111,18:110,19:98,20:135,
        21:112,22:78,23:118,24:64,25:77,26:227,27:93,28:88,29:69,30:60,
        31:34,32:30,33:73,34:54,35:45,36:83,37:182,38:88,39:75,40:85,
        41:54,42:53,43:89,44:59,45:37,46:35,47:38,48:29,49:18,50:45,
        51:60,52:49,53:62,54:55,55:78,56:96,57:29,58:22,59:24,60:13,
        61:14,62:11,63:11,64:18,65:12,66:12,67:30,68:52,69:52,70:44,
        71:28,72:28,73:20,74:56,75:40,76:31,77:50,78:40,79:46,80:42,
        81:29,82:19,83:36,84:25,85:22,86:17,87:19,88:26,89:30,90:20,
        91:15,92:21,93:11,94:8,95:8,96:19,97:5,98:8,99:8,100:11,
        101:11,102:8,103:3,104:9,105:5,106:4,107:7,108:3,109:6,110:3,
        111:5,112:4,113:5,114:6
    };
}

/* =============================================
   UPDATE PROGRESS BAR
   ============================================= */
function updateProgress(text, percent) {
    const container = document.getElementById('progressContainer');
    const textEl = document.getElementById('progressText');
    const percentEl = document.getElementById('progressPercent');
    const fill = document.getElementById('progressFill');

    container.style.display = 'block';
    textEl.textContent = text;
    percentEl.textContent = `${Math.round(percent)}%`;
    fill.style.width = `${percent}%`;
}

function hideProgress() {
    document.getElementById('progressContainer').style.display = 'none';
}

/* =============================================
   SHOW / HIDE CANVAS
   ============================================= */
function showCanvas() {
    document.getElementById('canvasPlaceholder').style.display = 'none';
    document.getElementById('videoCanvas').style.display = 'block';
}

function showPlaceholder() {
    document.getElementById('canvasPlaceholder').style.display = 'flex';
    document.getElementById('videoCanvas').style.display = 'none';
}

/* =============================================
   INIT ON DOM READY
   ============================================= */
document.addEventListener('DOMContentLoaded', () => {
    // Load home videos on start
    loadHomeVideos();
    // Also preload videos & types in background for faster nav
    setTimeout(() => {
        loadVideoTypesData().catch(() => {});
    }, 1000);
});

/* =============================================
   EXPOSE GLOBALS (called from HTML onclick)
   ============================================= */
window.navigateTo = navigateTo;
window.openVideoModal = openVideoModal;
window.closeVideoModal = closeVideoModal;
window.filterVideos = filterVideos;
window.selectBackground = selectBackground;
