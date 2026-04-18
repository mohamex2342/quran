document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('main-canvas');
    const ctx = canvas.getContext('2d');
    const renderBtn = document.getElementById('render-btn');
    const loader = document.getElementById('loader');
    const downloadArea = document.getElementById('download-area');

    let particles = [];
    let animationId;
    let versesText = "بسم الله الرحمن الرحيم";
    let audioContext, audioTag; // متغيرات الصوت

    // 1. نظام الجزيئات المتحركة (نفس الكود السابق)
    class Particle {
        constructor() { this.reset(); }
        reset() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2 + 1;
            this.speedX = Math.random() * 0.4 - 0.2;
            this.speedY = Math.random() * 0.4 - 0.2;
            this.opacity = Math.random() * 0.5;
        }
        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            if (this.x > canvas.width || this.x < 0 || this.y > canvas.height || this.y < 0) this.reset();
        }
        draw() {
            ctx.fillStyle = `rgba(16, 185, 129, ${this.opacity})`;
            ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
        }
    }

    function initParticles() {
        particles = [];
        for (let i = 0; i < 150; i++) particles.push(new Particle());
    }

    // 2. جلب رابط الصوت والآيات
    async function getSurahData(reciterId, surahNum) {
        // جلب تفاصيل القارئ للحصول على "السيرفر" الخاص به
        const res = await fetch(`https://mp3quran.net/api/v3/reciters?language=ar&reciter=${reciterId}`);
        const data = await res.json();
        const server = data.reciters[0].moshaf[0].server;
        const formattedSurah = surahNum.toString().padStart(3, '0');
        return `${server}${formattedSurah}.mp3`;
    }

    async function fetchVerses(surah, start, end) {
        const response = await fetch(`https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=${surah}`);
        const data = await response.json();
        return data.verses.filter(v => {
            const num = parseInt(v.verse_key.split(':')[1]);
            return num >= start && num <= end;
        }).map(v => v.text_uthmani).join(' ۞ ');
    }

    // 3. المحرك البصري
    function render() {
        const style = document.getElementById('visual-style').value;
        const grad = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 0, canvas.width/2, canvas.height/2, canvas.width/1.2);
        
        if(style === 'emerald') { grad.addColorStop(0, '#064e3b'); grad.addColorStop(1, '#020617'); }
        else if(style === 'royal') { grad.addColorStop(0, '#4c1d95'); grad.addColorStop(1, '#020617'); }
        else { grad.addColorStop(0, '#0c4a6e'); grad.addColorStop(1, '#020617'); }

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => { p.update(); p.draw(); });

        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(16, 185, 129, 0.4)'; ctx.shadowBlur = 40;
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 75px "Amiri"';
        
        wrapText(ctx, versesText, canvas.width/2, canvas.height/2, 1600, 110);

        ctx.shadowBlur = 0; ctx.font = '35px "Noto Kufi Arabic"';
        ctx.fillStyle = 'rgba(16, 185, 129, 0.9)';
        const reciter = document.getElementById('reciter-select').options[document.getElementById('reciter-select').selectedIndex].text;
        ctx.fillText(`بصوت القارئ: ${reciter}`, canvas.width/2, canvas.height - 120);

        animationId = requestAnimationFrame(render);
    }

    function wrapText(context, text, x, y, maxWidth, lineHeight) {
        const words = text.split(' ');
        let line = ''; let lines = [];
        for(let n = 0; n < words.length; n++) {
            let testLine = line + words[n] + ' ';
            if (context.measureText(testLine).width > maxWidth && n > 0) {
                lines.push(line); line = words[n] + ' ';
            } else { line = testLine; }
        }
        lines.push(line);
        let startY = y - ((lines.length - 1) * lineHeight) / 2;
        lines.forEach((l, i) => context.fillText(l, x, startY + (i * lineHeight)));
    }

    // 4. دمج الصوت مع الفيديو وتسجيل النتيجة
    async function createVideoWithAudio(audioUrl) {
        // تجهيز ملف الصوت
        audioTag = new Audio();
        audioTag.src = audioUrl;
        audioTag.crossOrigin = "anonymous";
        
        // التقاط مسار الفيديو من الـ Canvas
        const videoStream = canvas.captureStream(60);
        
        // تشغيل الصوت والتقاط مساره
        await audioTag.play();
        const audioStream = audioTag.captureStream ? audioTag.captureStream() : audioTag.mozCaptureStream();
        
        // دمج المسارين (فيديو + صوت) في بث واحد
        const combinedStream = new MediaStream([
            ...videoStream.getVideoTracks(),
            ...audioStream.getAudioTracks()
        ]);

        const recorder = new MediaRecorder(combinedStream, { 
            mimeType: 'video/webm; codecs=vp9', 
            audioBitsPerSecond: 128000,
            videoBitsPerSecond: 8000000 
        });

        const chunks = [];
        recorder.ondataavailable = e => chunks.push(e.data);
        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            downloadArea.classList.remove('hidden');
            document.getElementById('download-btn').onclick = () => {
                const a = document.createElement('a');
                a.href = url; a.download = 'Quran_Pro_With_Audio.webm'; a.click();
            };
            audioTag.pause(); // إيقاف الصوت بعد الانتهاء
        };

        recorder.start();
        
        // التوقف تلقائياً عند انتهاء الصوت أو بعد مدة محددة
        audioTag.onended = () => recorder.stop();
        // لإغراض التجربة، سنوقف التسجيل بعد 10 ثوانٍ إذا كان الملف طويلاً جداً
        setTimeout(() => { if(recorder.state === "recording") recorder.stop(); }, 15000); 
    }

    // التهيئة
    async function init() {
        initParticles();
        const rRes = await fetch('https://mp3quran.net/api/v3/reciters?language=ar');
        const rData = await rRes.json();
        document.getElementById('reciter-select').innerHTML = rData.reciters.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
        
        const suras = ["الفاتحة","البقرة","آل عمران","النساء","المائدة","الأنعام","الأعراف","الأنفال","التوبة","يونس","هود","يوسف","الرعد","إبراهيم","الحجر","النحل","الإسراء","الكهف","مريم","طه","الأنبياء","الحج","المؤمنون","النور","الفرقان","الشعراء","النمل","القصص","العنكبوت","الروم","لقمان","السجدة","الأحزاب","سبأ","فاطر","يس","الصافات","ص","الزمر","غافر","فصلت","الشورى","الزخرف","الدخان","الجاثية","الأحقاف","محمد","الفتح","الحجرات","ق","الذاريات","الطور","النجم","القمر","الرحمن","الواقعة","الحديد","المجادلة","الحشر","الممتحنة","الصف","الجمعة","المنافقون","التغابن","الطلاق","التحريم","الملك","القلم","الحاقة","المعارج","نوح","الجن","المزمل","المدثر","القيامة","الإنسان","المرسلات","النبأ","النازعات","عبس","التكوير","الانفطار","المطففين","الانشقاق","البروج","الطارق","الأعلى","الغاشية","الفجر","البلد","الشمس","الليل","الضحى","الشرح","التين","العلق","القدر","البينة","الزلزلة","العاديات","القارعة","التكاثر","العصر","الهمزة","الفيل","قريش","الماعون","الكوثر","الكافرون","النصر","المسد","الإخلاص","الفلق","الناس"];
        document.getElementById('surah-select').innerHTML = suras.map((s, i) => `<option value="${i+1}">${s}</option>`).join('');

        renderBtn.addEventListener('click', async () => {
            loader.classList.remove('hidden');
            const reciterId = document.getElementById('reciter-select').value;
            const surahNum = document.getElementById('surah-select').value;
            
            // جلب البيانات المتزامنة
            const audioUrl = await getSurahData(reciterId, surahNum);
            versesText = await fetchVerses(surahNum, parseInt(document.getElementById('start-ayah').value), parseInt(document.getElementById('end-ayah').value));
            
            loader.classList.add('hidden');
            render();
            createVideoWithAudio(audioUrl); // البدء بدمج الصوت
        });
    }

    init();
});
