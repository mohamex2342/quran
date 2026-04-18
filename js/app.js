document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('main-canvas');
    const ctx = canvas.getContext('2d');
    const renderBtn = document.getElementById('render-btn');
    const loader = document.getElementById('loader');
    const downloadArea = document.getElementById('download-area');

    let particles = [];
    let animationId;
    let versesText = "بسم الله الرحمن الرحيم";
    
    // متغيرات الصوت والمحلل
    let audioContext, analyser, dataArray, source;
    let audioTag = new Audio();
    audioTag.crossOrigin = "anonymous";

    // 1. نظام الجزيئات الخلفية
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
            this.x += this.speedX; this.y += this.speedY;
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

    // 2. إعداد محلل الصوت (Visualizer Engine)
    function setupVisualizer() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            source = audioContext.createMediaElementSource(audioTag);
            source.connect(analyser);
            analyser.connect(audioContext.destination);
            analyser.fftSize = 256; // عدد الأعمدة
            const bufferLength = analyser.frequencyBinCount;
            dataArray = new Uint8Array(bufferLength);
        }
    }

    function drawVisualizer() {
        if (!analyser) return;
        analyser.getByteFrequencyData(dataArray);

        const barWidth = (canvas.width / dataArray.length) * 2.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < dataArray.length; i++) {
            barHeight = dataArray[i] * 1.5; // قوة التفاعل

            // لون النيون للأعمدة
            ctx.fillStyle = `rgba(16, 185, 129, ${barHeight / 255})`;
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#10b981';
            
            // رسم الأعمدة في أسفل الشاشة
            ctx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);
            
            x += barWidth + 1;
        }
        ctx.shadowBlur = 0; // تنظيف التوهج لعدم التأثير على النص
    }

    // 3. وظائف جلب البيانات
    async function getSurahData(reciterId, surahNum) {
        const res = await fetch(`https://mp3quran.net/api/v3/reciters?language=ar&reciter=${reciterId}`);
        const data = await res.json();
        const server = data.reciters[0].moshaf[0].server;
        return `${server}${surahNum.toString().padStart(3, '0')}.mp3`;
    }

    async function fetchVerses(surah, start, end) {
        const response = await fetch(`https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=${surah}`);
        const data = await response.json();
        return data.verses.filter(v => {
            const num = parseInt(v.verse_key.split(':')[1]);
            return num >= start && num <= end;
        }).map(v => v.text_uthmani).join(' ۞ ');
    }

    // 4. حلقة الرندر المركزية
    function render() {
        const style = document.getElementById('visual-style').value;
        const grad = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 0, canvas.width/2, canvas.height/2, canvas.width/1.2);
        
        if(style === 'emerald') { grad.addColorStop(0, '#064e3b'); grad.addColorStop(1, '#020617'); }
        else if(style === 'royal') { grad.addColorStop(0, '#4c1d95'); grad.addColorStop(1, '#020617'); }
        else { grad.addColorStop(0, '#0c4a6e'); grad.addColorStop(1, '#020617'); }

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        particles.forEach(p => { p.update(); p.draw(); });

        // رسم المحلل الصوتي
        drawVisualizer();

        // رسم النص
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(255, 255, 255, 0.2)'; ctx.shadowBlur = 30;
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 75px "Amiri"';
        wrapText(ctx, versesText, canvas.width/2, canvas.height/2 - 50, 1600, 110);

        // معلومات القارئ
        ctx.shadowBlur = 0; ctx.font = '35px "Noto Kufi Arabic"';
        ctx.fillStyle = '#10b981';
        const reciter = document.getElementById('reciter-select').options[document.getElementById('reciter-select').selectedIndex].text;
        ctx.fillText(`تلاوة القارئ: ${reciter}`, canvas.width/2, canvas.height - 200);

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

    // 5. التسجيل والدمج
    async function startAction() {
        loader.classList.remove('hidden');
        const reciterId = document.getElementById('reciter-select').value;
        const surahNum = document.getElementById('surah-select').value;
        
        const audioUrl = await getSurahData(reciterId, surahNum);
        versesText = await fetchVerses(surahNum, parseInt(document.getElementById('start-ayah').value), parseInt(document.getElementById('end-ayah').value));
        
        audioTag.src = audioUrl;
        setupVisualizer();
        
        await audioTag.play();
        loader.classList.add('hidden');
        render();

        // تسجيل الفيديو
        const videoStream = canvas.captureStream(60);
        const audioStream = audioTag.captureStream ? audioTag.captureStream() : audioTag.mozCaptureStream();
        const combined = new MediaStream([...videoStream.getVideoTracks(), ...audioStream.getAudioTracks()]);
        
        const recorder = new MediaRecorder(combined, { mimeType: 'video/webm; codecs=vp9', videoBitsPerSecond: 8000000 });
        const chunks = [];
        recorder.ondataavailable = e => chunks.push(e.data);
        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            downloadArea.classList.remove('hidden');
            document.getElementById('download-btn').onclick = () => {
                const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
                a.download = 'Professional_Quran_Edit.webm'; a.click();
            };
        };
        recorder.start();
        setTimeout(() => recorder.stop(), 15000); // تسجيل 15 ثانية للتجربة
    }

    // البداية
    async function init() {
        initParticles();
        const rRes = await fetch('https://mp3quran.net/api/v3/reciters?language=ar');
        const rData = await rRes.json();
        document.getElementById('reciter-select').innerHTML = rData.reciters.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
        
        const suras = ["الفاتحة","البقرة","آل عمران","النساء","المائدة","الأنعام","الأعراف","الأنفال","التوبة","يونس","هود","يوسف","الرعد","إبراهيم","الحجر","النحل","الإسراء","الكهف","مريم","طه","الأنبياء","الحج","المؤمنون","النور","الفرقان","الشعراء","النمل","القصص","العنكبوت","الروم","لقمان","السجدة","الأحزاب","سبأ","فاطر","يس","الصافات","ص","الزمر","غافر","فصلت","الشورى","الزخرف","الدخان","الجاثية","الأحقاف","محمد","الفتح","الحجرات","ق","الذاريات","الطور","النجم","القمر","الرحمن","الواقعة","الحديد","المجادلة","الحشر","الممتحنة","الصف","الجمعة","المنافقون","التغابن","الطلاق","التحريم","الملك","القلم","الحاقة","المعارج","نوح","الجن","المزمل","المدثر","القيامة","الإنسان","المرسلات","النبأ","النازعات","عبس","التكوير","الانفطار","المطففين","الانشقاق","البروج","الطارق","الأعلى","الغاشية","الفجر","البلد","الشمس","الليل","الضحى","الشرح","التين","العلق","القدر","البينة","الزلزلة","العاديات","القارعة","التكاثر","العصر","الهمزة","الفيل","قريش","الماعون","الكوثر","الكافرون","النصر","المسد","الإخلاص","الفلق","الناس"];
        document.getElementById('surah-select').innerHTML = suras.map((s, i) => `<option value="${i+1}">${s}</option>`).join('');

        renderBtn.addEventListener('click', startAction);
    }
    init();
});
