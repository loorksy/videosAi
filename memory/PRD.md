# PRD - StoryWeaver AI

## المشكلة الأصلية
تطبيق إنشاء قصص وفيديوهات بالذكاء الاصطناعي مخصص للأطفال

## التقنيات
- Frontend: React 19 + TypeScript + Vite 6 + Tailwind CSS
- Backend: FastAPI + MongoDB + PyMongo + ffmpeg
- AI: Google Gemini (text/image) + kie.ai (text/image/video - unified provider option)

## ما تم تنفيذه
- [x] تسجيل دخول
- [x] إنشاء وإدارة شخصيات
- [x] قصص مصورة (سيناريو + صور + فيديو)
- [x] ربط kie.ai Veo 3
- [x] نقل التخزين إلى Server
- [x] إصلاح kie.ai (CDN + record-info + resultUrls)
- [x] حفظ وعرض الفيديوهات
- [x] توليد فكرة كاملة + مشاهد + حوار
- [x] خيار لغة الحوار
- [x] تحويل صور الشخصيات URL→base64
- [x] ثبات الشخصيات + ألوان أطفال
- [x] تصدير الفيديو النهائي (ffmpeg)
- [x] حفظ تلقائي للمسودة
- [x] حفظ task IDs + استئناف تلقائي
- [x] صورة مصغرة من القصة (عنوان + وصف + هاشتاقات + صورة)
- [x] إصلاح حذف الوسائط من المعرض
- [x] حفظ بيانات الوسائط كاملة (عنوان، وصف)
- [x] إضافة مفتاح kie.ai API في صفحة الإعدادات
- [x] اختيار النماذج (نصوص، صور، فيديو) مع خيارات متعددة
- [x] خيار جعل kie.ai المزود الرئيسي لكل شيء
- [x] إعدادات المزود تحفظ في MongoDB + localStorage
- [x] ربط التوليد الفعلي: AIService يوجه الطلبات لـ Gemini أو kie.ai
- [x] جميع المكونات (StoryboardCreate, CharacterCreate, ThumbnailCreate, etc.) تستخدم AIService الموحد
- [x] Backend: 5 endpoints جديدة (settings, kie text gen, kie image gen, image status)
- [x] مفتاح kie.ai ديناميكي من الإعدادات أو .env

## المهام المستقبلية
- [ ] اختبار التوليد الفعلي مع مفتاح kie.ai حقيقي ونماذج مختلفة
- [ ] إعادة تقييم أداة تحريك شخصية واحدة
- [ ] تحسين التعامل مع سياسات حظر المحتوى

## الهيكلية
```
/app/
├── backend/
│   └── server.py        # FastAPI (DB, media, kie.ai proxy, ffmpeg, settings)
├── src/
│   ├── lib/
│   │   ├── aiService.ts  # Unified AI (routes Gemini↔kie.ai)
│   │   ├── aiProvider.ts # kie.ai text/image generation
│   │   ├── db.ts         # Data service with caching
│   │   ├── gemini.ts     # Gemini API service
│   │   └── kie.ts        # kie.ai video service
│   └── pages/
│       ├── Settings.tsx   # Provider toggle + model selection + API keys
│       ├── StoryboardCreate.tsx
│       ├── CharacterCreate.tsx
│       ├── ThumbnailCreate.tsx
│       └── ...
```
