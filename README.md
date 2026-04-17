# فيديوهات القرآن الكريم

موقع عربي متكامل لعرض وإنشاء فيديوهات تلاوة القرآن الكريم.

## ✅ الميزات المنجزة

### الصفحة الرئيسية
- Hero Section مع البسملة وإحصائيات (+100 فيديو، +50 قارئ، 114 سورة)
- أحدث 6 فيديوهات من API
- قسم مميزات الموقع

### منشئ الفيديو (creator.js) — الميزة الرئيسية
- **إصلاح دمج الصوت**: يستخدم `AudioContext + MediaStreamDestination + canvas.captureStream()` لدمج الصوت والصورة في ملف WebM واحد
- اختيار القارئ والرواية من mp3quran API
- قائمة 114 سورة مع عدد الآيات
- تحديد نطاق الآيات (من - إلى)
- 3 خيارات خلفية: تدرج إسلامي / رابط URL / رفع ملف
- جلب نصوص الآيات العثمانية من Quran.com API (مع fallback لـ alquran.cloud)
- تحميل الصوت من mp3quran server الخاص بالقارئ (مع fallback لـ EveryAyah)
- معاينة Canvas حية أثناء التشغيل
- تصدير WebM بدقة 1280×720 مع صوت مدمج فعليًا

### صفحة الفيديوهات
- شبكة كاملة لجميع الفيديوهات من mp3quran API
- فلترة بنوع الفيديو + بحث بالاسم
- مشغل فيديو في Modal

### عام
- هيدر ثابت Frosted Glass مع قائمة هاتف منزلقة
- تصميم RTL عربي متجاوب (Desktop / Tablet / Mobile)
- خطي Amiri + Noto Kufi Arabic
- تذييل مع روابط سريعة

## 📁 هيكل الملفات
```
index.html          الهيكل الكامل للموقع
css/style.css       التصميم الكامل RTL
js/app.js           التنقل + عرض الفيديوهات
js/creator.js       منشئ الفيديو (Canvas + Audio + Recording)
README.md
```

## 🔌 APIs المستخدمة
| API | الغرض | الرابط |
|-----|--------|--------|
| mp3quran v3 | القراء، السور، الفيديوهات | `https://mp3quran.net/api/v3/` |
| Quran.com v4 | نصوص الآيات العثمانية | `https://api.quran.com/api/v4/` |
| alquran.cloud | fallback للنصوص | `https://api.alquran.cloud/v1/` |
| EveryAyah | fallback للصوت | `https://everyayah.com/data/` |

## 🔧 المنطق التقني لدمج الصوت

المشكلة السابقة كانت أن الصوت يُشغَّل عبر عنصر `<audio>` منفصل لا يُلتقط بـ MediaRecorder.

**الحل المُطبَّق:**
```
AudioContext ─── createMediaStreamDestination() ──┐
                                                   ├── MediaStream ──► MediaRecorder ──► WebM
canvas.captureStream(30fps) ─────────────────────┘
```

1. `new AudioContext()` + `createMediaStreamDestination()` لالتقاط الصوت
2. تحميل كل آية كـ `ArrayBuffer` ثم فكّها بـ `decodeAudioData`  
3. `AudioBufferSourceNode` يوصّل إلى `destination` (سماع) **و** `MediaStreamDestination` (تسجيل)
4. دمج مسار canvas + مسار الصوت في `MediaStream` واحد يُمرَّر لـ `MediaRecorder`

## 🚀 نشر الموقع
انتقل لتبويب **Publish** لنشر الموقع ومشاركته.

## 📌 تحسينات مقترحة
- إضافة دعم MP4 عبر FFmpeg.wasm
- تحسين جودة الفيديو بمعدل أعلى
- إضافة خيار اختيار خط النص على Canvas
- إضافة نغمة افتتاحية/ختامية
