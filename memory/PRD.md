# PRD - StoryWeaver AI

## المشكلة الأصلية
تطبيق إنشاء قصص وفيديوهات بالذكاء الاصطناعي

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
- [x] API للشخصيات والقصص والوسائط

## الملفات الرئيسية
- /app/backend/server.py - FastAPI backend
- /app/src/lib/gemini.ts - Gemini AI service
- /app/src/lib/kie.ts - kie.ai video service
- /app/src/lib/db.ts - Server API client
- /app/src/pages/StoryboardCreate.tsx - أداة القصص

## مفاتيح API
- Gemini: في localStorage (يدخلها المستخدم)
- kie.ai: في /app/.env (KIE_API_KEY)
