# PRD - StoryWeaver AI

## المشكلة الأصلية
تطبيق إنشاء قصص وفيديوهات بالذكاء الاصطناعي مخصص للأطفال

## التقنيات
- Frontend: React 19 + TypeScript + Vite 6 + Tailwind CSS
- Backend: FastAPI + MongoDB + PyMongo
- AI: Google Gemini API (text/image) + kie.ai (Veo 3 video)
- Storage: Server filesystem + MongoDB

## ما تم تنفيذه
- [x] تسجيل دخول
- [x] إنشاء شخصيات
- [x] قصص مصورة متقدمة (سيناريو + صور + فيديو)
- [x] ربط kie.ai Veo 3 لتوليد الفيديو
- [x] نقل التخزين من IndexedDB إلى Server
- [x] إصلاح kie.ai - رفع الصور لـ CDN + record-info + resultUrls
- [x] إصلاح روابط الصور (نسبية بدل كاملة)
- [x] حفظ الفيديوهات مع القصة
- [x] عرض الفيديوهات في صفحة عرض القصة
- [x] زر "توليد فكرة" يولد القصة الكاملة + المشاهد + الحوار
- [x] خيار لغة الحوار (عربية، إنجليزية، فرنسية، إلخ)
- [x] عرض الحوار تحت كل مشهد
- [x] إصلاح حرج: تحويل صور الشخصيات من URL إلى base64 قبل إرسالها لـ Gemini
- [x] ثبات ملابس وتفاصيل الشخصيات
- [x] ألوان وبيئات أطفال (باستيل دافئة)
- [x] تخزين مؤقت (Cache) للأداء
- [x] استراتيجية الإطارات المرجعية (صور شخصيات + مشهد سابق)

## استراتيجية توليد المشاهد
- مشهد 1: صور الشخصيات + سكربت المشهد 1 → صورة
- مشهد 2: صور الشخصيات + سكربت المشهد 2 + صورة المشهد 1 → صورة
- مشهد 3: صور الشخصيات + سكربت المشهد 3 + صورة المشهد 2 → صورة
- وهكذا...

## kie.ai API Endpoints
- Upload: POST https://kieai.redpandaai.co/api/file-stream-upload
- Generate: POST https://api.kie.ai/api/v1/veo/generate
- Status: GET https://api.kie.ai/api/v1/veo/record-info?taskId={id}
- Video URL in: data.response.resultUrls[0]

## المهام المستقبلية
- [ ] تحسين التعامل مع حظر Google API
- [ ] تصدير الفيديو النهائي (دمج المقاطع)
- [ ] إضافة صوت/تعليق صوتي
