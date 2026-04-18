document.addEventListener('DOMContentLoaded', () => {
    
    // العناصر الأساسية
    const reciterSelect = document.getElementById('reciter-select');
    const surahSelect = document.getElementById('surah-select');
    const bgType = document.getElementById('bg-type');
    const bgUrlInput = document.getElementById('bg-url-input');
    const bgFileInput = document.getElementById('bg-file-input');
    const recordBtn = document.getElementById('record-btn');
    const canvas = document.getElementById('video-canvas');
    const ctx = canvas.getContext('2d');
    
    let backgroundImage = new Image();
    let isRecording = false;

    // 1. جلب البيانات من الـ APIs
    async function initData() {
        // تحميل القراء
        try {
            const rRes = await fetch('https://mp3quran.net/api/v3/reciters?language=ar');
            const rData = await rRes.json();
            reciterSelect.innerHTML = rData.reciters.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
        } catch (e) { reciterSelect.innerHTML = '<option>تعذر تحميل القراء</option>'; }

        // تحميل السور (114 سورة)
        const surahs = ["الفاتحة","البقرة","آل عمران","النساء","المائدة","الأنعام","الأعراف","الأنفال","التوبة","يونس","هود","يوسف","الرعد","إبراهيم","الحجر","النحل","الإسراء","الكهف","مريم","طه","الأنبياء","الحج","المؤمنون","النور","الفرقان","الشعراء","النمل","القصص","العنكبوت","الروم","لقمان","السجدة","الأحزاب","سبأ","فاطر","يس","الصافات","ص","الزمر","غافر","فصلت","الشورى","الزخرف","الدخان","الجاثية","الأحقاف","محمد","الفتح","الحجرات","ق","الذاريات","الطور","النجم","القمر","الرحمن","الواقعة","الحديد","المجادلة","الحشر","الممتحنة","الصف","الجمعة","المنافقون","التغابن","الطلاق","التحريم","الملك","القلم","الحاقة","المعارج","نوح","الجن","المزمل","المدثر","القيامة","الإنسان","المرسلات","النبأ","النازعات","عبس","التكوير","الانفطار","المطففين","الانشقاق","البروج","الطارق","الأعلى","الغاشية","الفجر","البلد","الشمس","الليل","الضحى","الشرح","التين","العلق","القدر","البينة","الزلزلة","العاديات","القارعة","التكاثر","العصر","الهمزة","الفيل","قريش","الماعون","الكوثر","الكافرون","النصر","المسد","الإخلاص","الفلق","الناس"];
        surahSelect.innerHTML = surahs.map((s, i) => `<option value="${i+1}">${i+1}. ${s}</option>`).join('');
        
        // تحميل معرض الفيديوهات
        fetchGlobalVideos();
        updateCanvas();
    }

    async function fetchGlobalVideos() {
        const vGrid = document.getElementById('videos-grid');
        try {
            const res = await fetch('https://www.mp3quran.net/api/v3/videos?language=ar');
            const data = await res.json();
            vGrid.innerHTML = '';
            data.videos.slice(0, 12).forEach(reciter => {
                reciter.videos.forEach(v => {
                    vGrid.innerHTML += `
                        <div class="video-card">
                            <img src="${v.video_thumb_url}" class="video-thumb">
                            <div class="video-info font-kufi">
                                <p>${reciter.reciter_name}</p>
                                <a href="${v.video_url}" target="_blank" class="video-link">مشاهدة</a>
                            </div>
                        </div>`;
                });
            });
        } catch (e) { vGrid.innerHTML = 'خطأ في التحميل'; }
    }

    // 2. منطق الرسم على الـ Canvas
    function updateCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // أ. رسم الخلفية
        if (bgType.value === 'color') {
            const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            grad.addColorStop(0, '#064e3b');
            grad.addColorStop(1, '#020617');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else if (backgroundImage.src) {
            ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'rgba(0,0,0,0.6)'; // تعتيم
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // ب. رسم النصوص
        ctx.textAlign = 'center';
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 70px Amiri';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#10b981';
        
        const surah = surahSelect.options[surahSelect.selectedIndex]?.text || '';
        const reciter = reciterSelect.options[reciterSelect.selectedIndex]?.text || '';
        const start = document.getElementById('start-ayah').value;
        const end = document.getElementById('end-ayah').value;

        ctx.fillText(surah, canvas.width / 2, canvas.height / 2 - 40);
        
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#f1f5f9';
        ctx.font = '35px Noto Kufi Arabic';
        ctx.fillText(`بصوت القارئ: ${reciter}`, canvas.width / 2, canvas.height / 2 + 60);
        
        ctx.font = '22px Noto Kufi Arabic';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`الآيات المحددة: من ${start} إلى ${end}`, canvas.width / 2, canvas.height / 2 + 120);

        if (isRecording) requestAnimationFrame(updateCanvas);
    }

    // 3. التعامل مع المدخلات
    bgType.addEventListener('change', () => {
        bgUrlInput.classList.toggle('hidden', bgType.value !== 'url');
        bgFileInput.classList.toggle('hidden', bgType.value !== 'upload');
        updateCanvas();
    });

    bgUrlInput.addEventListener('input', () => {
        backgroundImage.crossOrigin = "anonymous";
        backgroundImage.src = bgUrlInput.value;
        backgroundImage.onload = updateCanvas;
    });

    bgFileInput.addEventListener('change', (e) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
            backgroundImage.src = ev.target.result;
            backgroundImage.onload = updateCanvas;
        };
        reader.readAsDataURL(e.target.files[0]);
    });

    [reciterSelect, surahSelect, document.getElementById('start-ayah'), document.getElementById('end-ayah')].forEach(el => {
        el.addEventListener('change', updateCanvas);
    });

    // 4. منطق تسجيل الفيديو (Export)
    recordBtn.addEventListener('click', () => {
        if (isRecording) return;
        
        isRecording = true;
        recordBtn.disabled = true;
        recordBtn.textContent = 'جاري تسجيل المعاينة...';
        document.getElementById('progress-container').classList.remove('hidden');
        
        const stream = canvas.captureStream(30); 
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        const chunks = [];

        recorder.ondataavailable = e => chunks.push(e.data);
        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Quran_Video_${Date.now()}.webm`;
            a.click();
            
            isRecording = false;
            recordBtn.disabled = false;
            recordBtn.textContent = 'بدء تسجيل الفيديو';
            document.getElementById('progress-container').classList.add('hidden');
        };

        recorder.start();
        updateCanvas(); // التأكد من استمرار الأنيميشن أثناء التسجيل

        // محاكاة وقت التسجيل (مثلاً 5 ثوانٍ للمعاينة)
        let prog = 0;
        const itv = setInterval(() => {
            prog += 2;
            document.getElementById('progress-fill').style.width = prog + '%';
            if (prog >= 100) {
                clearInterval(itv);
                recorder.stop();
            }
        }, 100);
    });

    initData();
});
