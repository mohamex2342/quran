/**
 * app.js — التنقل بين الصفحات + جلب وعرض الفيديوهات
 * فيديوهات القرآن الكريم
 */

'use strict';

/* =============================================
   1. PAGE NAVIGATION
   ============================================= */
const pages = document.querySelectorAll('.page');
const navLinks = document.querySelectorAll('.nav-link');
const hamburgerBtn = document.getElementById('hamburger-btn');
const mobileNav = document.getElementById('mobile-nav');

function showPage(name) {
    pages.forEach(p => p.classList.remove('active'));
    navLinks.forEach(l => l.classList.remove('active'));

    const target = document.getElementById(`page-${name}`);
    if (target) {
        target.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    document.querySelectorAll(`[data-page="${name}"]`).forEach(el => {
        if (el.tagName === 'A' || el.classList.contains('nav-link')) {
            el.classList.add('active');
        }
    });

    // Close mobile menu
    mobileNav.classList.remove('open');

    // Lazy-load sections on first visit
    if (name === 'videos' && !window._videosLoaded) {
        loadAllVideos();
        loadVideoTypes();
    }
    if (name === 'home' && !window._homeVideosLoaded) {
        loadHomeVideos();
    }
}

// Nav link clicks
document.querySelectorAll('[data-page]').forEach(el => {
    el.addEventListener('click', (e) => {
        e.preventDefault();
        showPage(el.dataset.page);
    });
});

// Hamburger
hamburgerBtn.addEventListener('click', () => {
    mobileNav.classList.toggle('open');
});

// Close mobile nav when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.header')) mobileNav.classList.remove('open');
});

/* =============================================
   2. API HELPERS
   ============================================= */
const PROXY = 'https://corsproxy.io/?';

async function fetchApi(url) {
    // Try direct first, then via CORS proxy
    try {
        const res = await fetch(url);
        if (res.ok) return res.json();
    } catch (_) {}
    const res = await fetch(PROXY + encodeURIComponent(url));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

/* =============================================
   3. VIDEO TYPES
   ============================================= */
let videoTypesMap = {};

async function loadVideoTypes() {
    try {
        const data = await fetchApi('https://mp3quran.net/api/v3/video_types?language=ar');
        const types = data.video_types || [];
        videoTypesMap = {};
        types.forEach(t => { videoTypesMap[t.id] = t.video_type; });

        const sel = document.getElementById('type-filter');
        sel.innerHTML = '<option value="">الكل</option>';
        types.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.id;
            opt.textContent = t.video_type;
            sel.appendChild(opt);
        });

        sel.addEventListener('change', filterVideos);
    } catch (e) {
        console.warn('فشل جلب أنواع الفيديوهات:', e.message);
    }
}

/* =============================================
   4. ALL VIDEOS PAGE
   ============================================= */
let allVideosData = [];

async function loadAllVideos() {
    window._videosLoaded = true;
    const grid = document.getElementById('all-videos-grid');
    grid.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i><p>جاري تحميل الفيديوهات...</p></div>';

    try {
        const data = await fetchApi('https://mp3quran.net/api/v3/videos?language=ar');
        allVideosData = flattenVideos(data.videos || []);
        renderVideosGrid(grid, allVideosData);

        // Search listener
        document.getElementById('search-input').addEventListener('input', filterVideos);
    } catch (e) {
        console.error('خطأ في جلب الفيديوهات:', e);
        grid.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>تعذّر تحميل الفيديوهات. تحقق من اتصالك بالإنترنت.</p>
                <button class="btn-retry" id="retry-all">إعادة المحاولة</button>
            </div>`;
        document.getElementById('retry-all')?.addEventListener('click', () => {
            window._videosLoaded = false;
            loadAllVideos();
        });
    }
}

function flattenVideos(reciters) {
    const flat = [];
    reciters.forEach(reciter => {
        (reciter.videos || []).forEach(v => {
            flat.push({
                reciter_name: reciter.reciter_name,
                video_type:   v.video_type,
                video_url:    v.video_url,
                thumb:        v.video_thumb_url,
                id:           v.id,
            });
        });
    });
    return flat;
}

function renderVideosGrid(grid, videos) {
    if (!videos.length) {
        grid.innerHTML = '<div class="loading-state"><i class="fas fa-inbox"></i><p>لا توجد نتائج</p></div>';
        return;
    }
    grid.innerHTML = videos.map(v => buildVideoCard(v)).join('');

    grid.querySelectorAll('.video-card').forEach(card => {
        card.addEventListener('click', () => openModal(card.dataset));
    });
}

function buildVideoCard(v) {
    const typeName = videoTypesMap[v.video_type] || 'تلاوة';
    const safeThumb = v.thumb || '';
    return `
    <article class="video-card"
        data-url="${v.video_url}"
        data-name="${v.reciter_name}"
        data-type="${typeName}">
        <div class="video-thumb">
            ${safeThumb ? `<img src="${safeThumb}" alt="${v.reciter_name}" loading="lazy" onerror="this.style.display='none'">` : ''}
            <div class="play-overlay"><i class="fas fa-play-circle"></i></div>
            <span class="video-type-badge">${typeName}</span>
        </div>
        <div class="video-info">
            <p class="reciter-name">${v.reciter_name}</p>
            <p class="video-meta"><i class="fas fa-tag"></i> ${typeName}</p>
        </div>
    </article>`;
}

function filterVideos() {
    const typeVal   = document.getElementById('type-filter').value;
    const searchVal = document.getElementById('search-input').value.trim().toLowerCase();
    let filtered = allVideosData;
    if (typeVal)    filtered = filtered.filter(v => String(v.video_type) === typeVal);
    if (searchVal)  filtered = filtered.filter(v => v.reciter_name.toLowerCase().includes(searchVal));
    renderVideosGrid(document.getElementById('all-videos-grid'), filtered);
}

/* =============================================
   5. HOME – LATEST VIDEOS (first 6)
   ============================================= */
async function loadHomeVideos() {
    window._homeVideosLoaded = true;
    const grid = document.getElementById('home-videos-grid');
    try {
        let data;
        if (allVideosData.length) {
            data = allVideosData.slice(0, 6);
        } else {
            const json = await fetchApi('https://mp3quran.net/api/v3/videos?language=ar');
            data = flattenVideos(json.videos || []).slice(0, 6);
        }
        // Make sure types are loaded for labels
        if (!Object.keys(videoTypesMap).length) {
            const typesJson = await fetchApi('https://mp3quran.net/api/v3/video_types?language=ar');
            (typesJson.video_types || []).forEach(t => { videoTypesMap[t.id] = t.video_type; });
        }
        renderVideosGrid(grid, data);
        grid.querySelectorAll('.video-card').forEach(card => {
            card.addEventListener('click', () => openModal(card.dataset));
        });
    } catch (e) {
        console.error(e);
        grid.innerHTML = '<div class="error-state"><i class="fas fa-exclamation-circle"></i><p>تعذّر التحميل</p></div>';
    }
}

/* =============================================
   6. VIDEO MODAL
   ============================================= */
const videoModal    = document.getElementById('video-modal');
const modalOverlay  = document.getElementById('modal-overlay');
const modalClose    = document.getElementById('modal-close');
const modalVideo    = document.getElementById('modal-video');
const modalTitle    = document.getElementById('modal-title');

function openModal({ url, name }) {
    modalTitle.textContent = name || 'تلاوة';
    modalVideo.src = url || '';
    modalVideo.load();
    videoModal.classList.add('open');
    document.body.style.overflow = 'hidden';
}
function closeModal() {
    videoModal.classList.remove('open');
    modalVideo.pause();
    modalVideo.src = '';
    document.body.style.overflow = '';
}

modalOverlay.addEventListener('click', closeModal);
modalClose.addEventListener('click', closeModal);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

/* =============================================
   7. INIT
   ============================================= */
window.addEventListener('DOMContentLoaded', () => {
    showPage('home');
    loadHomeVideos();
});
