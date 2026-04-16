# فيديوهات القرآن الكريم 🕌

موقع عربي احترافي RTL متخصص في عرض وإنشاء فيديوهات القرآن الكريم.

---

## 🌟 المميزات المنجزة

### الصفحات والأقسام
- ✅ **الرئيسية (Hero Section)** – قسم بطل جذاب مع إحصائيات وأزرار تنقل
- ✅ **إنشاء تلاوة** – منشئ الفيديو الكامل
- ✅ **الفيديوهات** – شبكة عرض كاملة مع تصفية وبحث

### التصميم
- ✅ تصميم عربي RTL احترافي بالكامل
- ✅ تصميم متجاوب (Desktop / Tablet / Mobile)
- ✅ هيدر ثابت بتأثير Frosted Glass
- ✅ قائمة هاتف محمول منزلقة
- ✅ فوتر شامل بالروابط والمعلومات
- ✅ خطوط Amiri + Noto Kufi Arabic

### الفيديوهات
- ✅ تحميل الفيديوهات من API mp3quran.net
- ✅ شبكة بطاقات الفيديو مع صور مصغرة
- ✅ تصفية حسب نوع الفيديو
- ✅ بحث عن القراء
- ✅ مشاهدة الفيديوهات في Modal
- ✅ حالات تحميل وأخطاء واضحة مع زر إعادة محاولة

### منشئ الفيديو
- ✅ اختيار القارئ من قائمة API
- ✅ اختيار السورة (114 سورة) مع معلوماتها
- ✅ تحديد نطاق الآيات (من/إلى)
- ✅ ثلاثة أوضاع للخلفية: تلقائي / رابط URL / ملف من الجهاز
- ✅ جلب نصوص الآيات من Quran.com API
- ✅ تحميل الملفات الصوتية من Everyayah.com
- ✅ دمج الصوت بـ Web Audio API + OfflineAudioContext
- ✅ رسم الآيات على Canvas بخط Amiri
- ✅ معاينة حية مع تحكم تشغيل/إيقاف
- ✅ شريط تقدم تفاعلي
- ✅ تسجيل الفيديو بـ MediaRecorder API
- ✅ تحميل الفيديو بصيغة WebM (720p)

---

## 📁 هيكل الملفات

```
index.html          ← الصفحة الرئيسية
css/
  style.css         ← ملف التصميم الكامل (RTL + Responsive)
js/
  app.js            ← التنقل، APIs، عرض الفيديوهات
  creator.js        ← منشئ الفيديو (Canvas + Audio + Recording)
README.md
```

---

## 🔗 APIs المستخدمة

| API | الغرض | الرابط |
|-----|--------|--------|
| mp3quran.net/api/v3/videos | قائمة الفيديوهات | `https://mp3quran.net/api/v3/videos?language=ar` |
| mp3quran.net/api/v3/video_types | أنواع الفيديوهات | `https://mp3quran.net/api/v3/video_types?language=ar` |
| mp3quran.net/api/v3/reciters | قائمة القراء | `https://mp3quran.net/api/v3/reciters?language=ar` |
| mp3quran.net/api/v3/suwar | قائمة السور | `https://mp3quran.net/api/v3/suwar?language=ar` |
| api.quran.com/api/v4 | نصوص الآيات العثمانية | `https://api.quran.com/api/v4/verses/by_chapter/{id}` |
| everyayah.com/data | ملفات صوت الآيات | `https://everyayah.com/data/{reciter}/{surah}{verse}.mp3` |

---

## 🚀 كيفية الاستخدام

1. افتح `index.html` في متصفح حديث
2. من الصفحة الرئيسية شاهد أحدث الفيديوهات
3. انتقل لـ **"إنشاء تلاوة"** لإنشاء فيديو مخصص
4. اختر القارئ → السورة → الآيات → الخلفية
5. اضغط **"إنشاء التلاوة"** وانتظر التحميل
6. استمع للمعاينة وشاهد الفيديو على Canvas
7. اضغط **"تسجيل وتحميل الفيديو"** للحصول على ملف WebM

---

## 🛠️ التقنيات المستخدمة

- HTML5 + CSS3 (RTL, Flexbox, Grid, Custom Properties)
- JavaScript ES6+ (Async/Await, Modules)
- Canvas API (رسم الآيات والزخارف)
- Web Audio API + OfflineAudioContext (دمج الصوت)
- MediaRecorder API (تسجيل الفيديو)
- Font Awesome 6 (الأيقونات)
- Google Fonts: Amiri + Noto Kufi Arabic

---

## ⚠️ ملاحظات مهمة

- يتطلب متصفح حديث يدعم MediaRecorder API (Chrome/Edge/Firefox)
- لتحميل الصوت بشكل صحيح تأكد من اتصال الإنترنت
- بعض القراء قد لا تتوفر لهم ملفات صوتية فردية على Everyayah
- الفيديوهات تُصدَّر بصيغة WebM (مدعومة في Chrome/Firefox)

---

## 📌 ما يمكن تطويره لاحقاً

- [ ] إضافة ترجمات الآيات للغات أخرى
- [ ] دعم تصدير بصيغة MP4 عبر FFmpeg.wasm
- [ ] إضافة تأثيرات انتقالية بين الآيات
- [ ] حفظ الفيديوهات المنشأة في قاعدة البيانات
- [ ] إضافة قسم مفضلات
- [ ] البث المباشر لقنوات القرآن الكريم
