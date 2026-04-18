document.addEventListener('DOMContentLoaded', () => {
    
    // 1. جلب الفيديوهات من API مباشرة
    const API_URL = 'https://www.mp3quran.net/api/v3/videos?language=ar';
    const videosGrid = document.getElementById('videos-grid');

    async function fetchVideos() {
        try {
            const response = await fetch(API_URL);
            if (!response.ok) throw new Error('Network response was not ok');
            
            const data = await response.json();
            renderVideos(data.videos);
        } catch (error) {
            console.error('Error fetching videos:', error);
            videosGrid.innerHTML = '<div class="loading font-kufi text-red">عذراً، حدث خطأ أثناء جلب البيانات. الرجاء المحاولة لاحقاً.</div>';
        }
    }

    function renderVideos(recitersList) {
        videosGrid.innerHTML = ''; // تفريغ حالة التحميل

        // المرور على مصفوفة القراء والفيديوهات الخاصة بهم
        recitersList.forEach(reciter => {
            reciter.videos.forEach(video => {
                const card = document.createElement('div');
                card.className = 'video-card';
                card.innerHTML = `
                    <img src="${video.video_thumb_url}" alt="${reciter.reciter_name}" class="video-thumb" onerror="this.src='https://via.placeholder.com/300x200/0f172a/0df5d4?text=فيديو+قرآن'">
                    <div class="video-info font-kufi">
                        <h3>${reciter.reciter_name}</h3>
                        <a href="${video.video_url}" target="_blank" class="video-link">مشاهدة المقطع</a>
                    </div>
                `;
                videosGrid.appendChild(card);
            });
        });
    }

    // استدعاء الدالة عند تحميل الصفحة
    fetchVideos();

    // ==========================================
    // 2. منطق Canvas ومنشئ الفيديو
    // ==========================================
    const canvas = document.getElementById('video-canvas');
    const ctx = canvas.getContext('2d');
    const generateBtn = document.getElementById('generate-btn');
    const progressContainer = document.getElementById('progress-container');
    const progressFill = document.getElementById('progress-fill');

    // رسم مبدئي على الـ Canvas
    function initCanvas() {
        // خلفية ذات تدرج داكن لتناسب التصميم
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#0f172a');
        gradient.addColorStop(1, '#020617');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // إطار نيون حول الـ Canvas من الداخل
        ctx.strokeStyle = '#0df5d4';
        ctx.lineWidth = 5;
        ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

        // نص المعاينة
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 50px Amiri';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ', canvas.width / 2, canvas.height / 2);
    }

    initCanvas();

    // محاكاة تسجيل الفيديو بشكل مباشر
    generateBtn.addEventListener('click', () => {
        if (generateBtn.disabled) return;

        generateBtn.disabled = true;
        generateBtn.textContent = 'جاري المعالجة...';
        progressContainer.classList.remove('hidden');
        progressFill.style.width = '0%';

        // التقاط الـ Stream من Canvas
        const stream = canvas.captureStream(30); // 30 FPS كافية لتسجيل الشاشة
        const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        const chunks = [];

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            
            // إنشاء رابط التحميل
            const a = document.createElement('a');
            a.href = url;
            a.download = 'quran_video_export.webm';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            // إعادة ضبط الواجهة
            generateBtn.disabled = false;
            generateBtn.textContent = 'إنشاء وتصدير الفيديو';
            progressContainer.classList.add('hidden');
            progressFill.style.width = '0%';
        };

        // بدء التسجيل
        mediaRecorder.start();

        // محاكاة شريط التقدم وإيقاف التسجيل بعد 4 ثوانٍ
        let progress = 0;
        const interval = setInterval(() => {
            progress += 10;
            progressFill.style.width = `${progress}%`;
            
            if (progress >= 100) {
                clearInterval(interval);
                mediaRecorder.stop(); // إيقاف التصدير
            }
        }, 400); 
    });
});
