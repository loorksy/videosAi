# PRD - تطبيق إنشاء القصص بالذكاء الاصطناعي (StoryWeaver AI)

## المشكلة الأصلية
تشغيل الموقع وإضافة واجهة تسجيل دخول وأدوات إنشاء شخصيات وفيديوهات بالذكاء الاصطناعي

## تاريخ البدء
26 يناير 2026

## التقنيات المستخدمة
- React 19 + TypeScript + Vite 6
- Tailwind CSS 4 + Framer Motion
- React Router DOM 7 + Lucide React Icons
- Google Gemini AI (@google/genai SDK)
- Google Veo 3.1 API (video generation)
- IndexedDB (idb library) for in-browser storage
- react-hot-toast for notifications

## الهندسة المعمارية
- تطبيق client-side بالكامل (لا يوجد backend مخصص)
- واجهات API مباشرة إلى Google Gemini/Veo
- تخزين محلي عبر IndexedDB
- يعمل بوضع الإنتاج: yarn build → vite preview
- مفتاح API يُحفظ في localStorage

## ما تم تنفيذه
- [x] تشغيل الموقع على المنفذ 3000
- [x] واجهة تسجيل دخول شخصية (كلمة مرور: Ahmetlork0009)
- [x] زر تسجيل الخروج في الإعدادات
- [x] نظام Toast (react-hot-toast)
- [x] إنشاء شخصيات متنوعة (خيالية، بشري مضحك، مخلوقات، هجينة)
- [x] منشئ ورقة الشخصية (Character Sheet Generator)
- [x] أفكار فيروسية (Viral Ideas Generator)
- [x] استوديو تحريك الشخصيات (Veo 3.1)
- [x] استوديو المنتجات والهوية البصرية
- [x] استوديو الإعلانات
- [x] إنشاء صور مصغرة (Thumbnails)
- [x] القصص المصورة (Storyboards) مع retry logic
- [x] معرض الفيديوهات (Video Gallery)
- [x] **إصلاح خلل توليد الفيديو P0** (27 فبراير 2026)
  - تصحيح صيغة referenceImages من inlineData إلى image.imageBytes + referenceType
  - إضافة ضغط تلقائي للصور (1024px max, JPEG)
  - إستراتيجية ذكية: referenceImages لـ 16:9، Start Frame لـ 9:16
  - Fallback تلقائي من referenceImages إلى Start Frame عند فشل INVALID_ARGUMENT
  - إزالة safetySettings غير المدعومة من Veo config
  - تحسين مجمّع الصور المرجعية (يقبل أي مفتاح)
  - إصلاح HybridCharacterCreate (visualTraits + مفتاح side → left)

## الملفات الرئيسية
- `src/lib/gemini.ts` - جميع واجهات Gemini/Veo API
- `src/lib/db.ts` - مخطط IndexedDB والعمليات
- `src/pages/CharacterAnimation.tsx` - استوديو التحريك
- `src/pages/StoryboardCreate.tsx` - أداة القصص المصورة

## المتطلبات المعلقة
- P1: التحقق من تحسينات أداة Storyboard
- P2: حل مشكلة حظر سياسة المحتوى من Google (خاصة الشخصيات الطفولية)

## ملاحظات مهمة
- التطبيق عربي RTL
- يجب استخدام yarn build ثم supervisorctl restart frontend بعد كل تغيير
- لا تستخدم yarn dev (غير مستقر)
- مفتاح Gemini API: يُدخل من صفحة الإعدادات
- referenceImages تدعم فقط 16:9 حالياً (قيد Google)
- الصور يجب أن تكون أقل من 1MB لكل صورة
