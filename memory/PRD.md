# PRD - StoryWeaver AI

## المشكلة الأصلية
تطبيق إنشاء قصص وفيديوهات بالذكاء الاصطناعي مخصص للأطفال

## التقنيات
- Frontend: React 19 + TypeScript + Vite 6 + Tailwind CSS
- Backend: FastAPI + MongoDB + PyMongo
- AI: Google Gemini API (text/image) + kie.ai (Veo 3 video)
- Storage: Server filesystem + MongoDB

## الهندسة المعمارية
- Frontend: React SPA (port 3000, vite preview)
- Backend: FastAPI (port 8001, /api prefix)
- MongoDB: metadata for characters, storyboards, media
- File storage: /app/backend/uploads/ served as /api/uploads/

## ما تم تنفيذه
- [x] تسجيل دخول (كلمة مرور: Ahmetlork0009)
- [x] إنشاء شخصيات (خيالية، بشري مضحك، مخلوقات، هجينة)
- [x] منشئ ورقة الشخصية
- [x] أفكار فيروسية
- [x] استوديو المنتجات والإعلانات
- [x] قصص مصورة متقدمة (سيناريو + صور + فيديو)
- [x] ربط kie.ai Veo 3 لتوليد الفيديو
- [x] نقل التخزين من IndexedDB إلى Server (MongoDB + filesystem)
- [x] إصلاح خطأ "Image fetch failed" في kie.ai - رفع الصور لـ CDN قبل التوليد
- [x] إصلاح endpoint حالة المهمة (record-info بدل record-detail)
- [x] إصلاح resultUrls path في response (data.response.resultUrls)
- [x] إصلاح روابط الصور (نسبية بدل كاملة)
- [x] حفظ الفيديوهات مع القصة في قاعدة البيانات
- [x] عرض الفيديوهات في صفحة عرض القصة
- [x] إخفاء أزرار التوليد عند وجود جميع الفيديوهات
- [x] زر "توليد فكرة بالذكاء الاصطناعي" يولد القصة الكاملة مع المشاهد والحوار
- [x] ثبات ملابس وتفاصيل الشخصيات بين المشاهد
- [x] ألوان وبيئات مناسبة للأطفال
- [x] تخزين مؤقت (Cache) للشخصيات والقصص لأداء أسرع
- [x] استراتيجية الإطارات المرجعية المتتالية للفيديو
- [x] حوار مع تحريك الشفاه في كل مشهد

## الملفات الرئيسية
- /app/backend/server.py - FastAPI backend
- /app/src/lib/gemini.ts - Gemini AI service
- /app/src/lib/kie.ts - kie.ai video service
- /app/src/lib/db.ts - Server API client with caching
- /app/src/pages/StoryboardCreate.tsx - أداة إنشاء القصص
- /app/src/pages/StoryboardView.tsx - أداة عرض القصص

## kie.ai API Endpoints
- Upload: POST https://kieai.redpandaai.co/api/file-stream-upload
- Generate: POST https://api.kie.ai/api/v1/veo/generate
- Status: GET https://api.kie.ai/api/v1/veo/record-info?taskId={id}
- successFlag: 0=generating, 1=success, 2=failed, 3=generation_failed
- Video URL in: data.response.resultUrls[0]

## المهام المستقبلية
- [ ] إعادة تقييم أداة تحريك الشخصية المفردة
- [ ] تحسين التعامل مع حظر Google API
- [ ] إضافة pagination للقوائم
- [ ] تحسين أداء تحميل الصور الكبيرة (lazy loading)
