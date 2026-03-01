# PRD - StoryWeaver AI

## المشكلة الأصلية
تطبيق إنشاء قصص وفيديوهات بالذكاء الاصطناعي مخصص للأطفال

## التقنيات
- Frontend: React 19 + TypeScript + Vite 6 + Tailwind CSS
- Backend: FastAPI + MongoDB + PyMongo + ffmpeg
- AI: Google Gemini (text/image) + kie.ai (video + optional text/image)

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
- [x] إخفاء أسلوب التصميم والإعدادات المتقدمة في وضع "من القصة"
- [x] إضافة مفتاح kie.ai API في صفحة الإعدادات
- [x] اختيار النماذج (نصوص، صور، فيديو)
- [x] خيار جعل kie.ai المزود الرئيسي لكل شيء
- [x] إعدادات المزود تحفظ في MongoDB + localStorage

## المهام المستقبلية
- [ ] ربط توليد النصوص/الصور فعلياً مع kie.ai في مكونات StoryboardCreate و CharacterCreate
- [ ] نقل kie.ai ليكون المزود الرئيسي (استبدال Gemini بالكامل)
- [ ] إعادة تقييم أداة تحريك شخصية واحدة
- [ ] تحسين التعامل مع سياسات حظر المحتوى

## الهيكلية
```
/app/
├── backend/
│   └── server.py        # FastAPI (DB, media, kie.ai proxy, ffmpeg, settings)
├── src/
│   ├── lib/
│   │   ├── aiProvider.ts # Provider abstraction (Gemini/kie.ai routing)
│   │   ├── db.ts         # Data service with caching
│   │   ├── gemini.ts     # Gemini API service
│   │   └── kie.ts        # kie.ai service (video + text + image)
│   └── pages/
│       ├── Settings.tsx   # Settings with provider toggle + model selection
│       └── ...
```
