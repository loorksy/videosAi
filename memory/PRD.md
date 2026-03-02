# PRD - StoryWeaver AI

## المشكلة الأصلية
تطبيق إنشاء قصص وفيديوهات بالذكاء الاصطناعي مخصص للأطفال

## التقنيات
- Frontend: React 19 + TypeScript + Vite 6 + Tailwind CSS
- Backend: FastAPI + MongoDB + PyMongo + ffmpeg
- AI: Google Gemini (text/image) + kie.ai (unified provider: text/image/video/motion)

## ما تم تنفيذه
- [x] تسجيل دخول
- [x] إنشاء وإدارة شخصيات
- [x] قصص مصورة (سيناريو + صور + فيديو)
- [x] ربط kie.ai Veo 3
- [x] نقل التخزين إلى Server
- [x] توليد فكرة كاملة + مشاهد + حوار
- [x] خيار لغة الحوار
- [x] ثبات الشخصيات + ألوان أطفال
- [x] تصدير الفيديو النهائي (ffmpeg)
- [x] حفظ تلقائي للمسودة
- [x] حفظ task IDs + استئناف تلقائي
- [x] صورة مصغرة من القصة
- [x] إضافة مفتاح kie.ai API في صفحة الإعدادات
- [x] اختيار النماذج (نصوص، صور، فيديو)
- [x] خيار جعل kie.ai المزود الرئيسي لكل شيء
- [x] ربط التوليد الفعلي: AIService يوجه الطلبات لـ Gemini أو kie.ai
- [x] جميع المكونات تستخدم AIService الموحد
- [x] توليد النصوص عبر kie.ai (OpenAI-compatible chat completions)
- [x] ربط Motion Control (Kling 2.6) بـ kie.ai بدل fal.ai
- [x] فحص اتصال kie.ai يعرض الرصيد المتبقي
- [x] Vite preview proxy لـ /api requests
- [x] Backend: upload-file, kling-motion, kling-status, test-connection endpoints

## المهام المستقبلية
- [ ] اختبار التوليد الفعلي للصور عبر kie.ai (GPT-Image-1)
- [ ] إعادة تقييم أداة تحريك شخصية واحدة
- [ ] تحسين التعامل مع سياسات حظر المحتوى

## الهيكلية
```
/app/
├── backend/
│   └── server.py        # FastAPI (DB, media, kie.ai proxy, ffmpeg, settings, kling motion)
├── src/
│   ├── lib/
│   │   ├── aiService.ts  # Unified AI (routes Gemini↔kie.ai)
│   │   ├── aiProvider.ts # kie.ai text/image generation via backend
│   │   ├── db.ts         # Data service with caching
│   │   ├── gemini.ts     # Gemini API service (direct)
│   │   └── kie.ts        # kie.ai video service
│   └── pages/
│       ├── Settings.tsx   # Provider toggle + model selection + test connection
│       ├── KlingMotionControl.tsx  # Kling 2.6 via kie.ai
│       └── ...
```

## API Endpoints (kie.ai)
- POST /api/kie/test-connection → فحص المفتاح + عرض الرصيد
- POST /api/kie/generate-text → توليد نصوص (chat completions)
- POST /api/kie/generate-image → توليد صور (task-based)
- POST /api/kie/kling-motion → Kling 2.6 Motion Control
- GET /api/kie/kling-status/{id} → حالة مهمة Kling
- POST /api/kie/upload-file → رفع ملفات لـ kie.ai CDN
- GET/POST /api/settings → إعدادات المزود والنماذج
