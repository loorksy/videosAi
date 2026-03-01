# PRD - StoryWeaver AI

## المشكلة الأصلية
تطبيق إنشاء قصص وفيديوهات بالذكاء الاصطناعي مخصص للأطفال

## التقنيات
- Frontend: React 19 + TypeScript + Vite 6 + Tailwind CSS
- Backend: FastAPI + MongoDB + PyMongo + ffmpeg
- AI: Google Gemini API (text/image) + kie.ai (Veo 3 video)
- Storage: Server filesystem + MongoDB

## ما تم تنفيذه
- [x] تسجيل دخول
- [x] إنشاء شخصيات
- [x] قصص مصورة متقدمة (سيناريو + صور + فيديو)
- [x] ربط kie.ai Veo 3 لتوليد الفيديو
- [x] نقل التخزين من IndexedDB إلى Server
- [x] إصلاح kie.ai - رفع الصور لـ CDN + record-info + resultUrls
- [x] إصلاح روابط الصور (نسبية)
- [x] حفظ وعرض الفيديوهات في صفحة القصة
- [x] زر "توليد فكرة" يولد القصة الكاملة + المشاهد + الحوار
- [x] خيار لغة الحوار
- [x] إصلاح: تحويل صور الشخصيات من URL إلى base64 لـ Gemini
- [x] ثبات الشخصيات + ألوان أطفال
- [x] تخزين مؤقت (Cache)
- [x] استراتيجية الإطارات المرجعية
- [x] تصدير الفيديو النهائي (دمج المقاطع بـ ffmpeg)
- [x] إعادة محاولة المشاهد الفاشلة + تأخير بين الطلبات
- [x] فرض عدد المشاهد المطلوب في prompt

## kie.ai API Endpoints
- Upload: POST https://kieai.redpandaai.co/api/file-stream-upload
- Generate: POST https://api.kie.ai/api/v1/veo/generate
- Status: GET https://api.kie.ai/api/v1/veo/record-info?taskId={id}
- Video URL in: data.response.resultUrls[0]

## المهام المستقبلية
- [ ] تحسين التعامل مع حظر Google API
- [ ] lazy loading للصور الكبيرة
