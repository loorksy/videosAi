# Videos AI - منصة إنشاء المحتوى بالذكاء الاصطناعي

تطبيق متكامل لإنشاء فيديوهات وصور احترافية باستخدام الذكاء الاصطناعي.

## المتطلبات

- Node.js 18+
- PostgreSQL 15+
- مفتاح API من Google (Gemini)

## التثبيت على VPS

### 1. تثبيت PostgreSQL

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# بدء الخدمة
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. إنشاء قاعدة البيانات

```bash
# الدخول لـ PostgreSQL
sudo -u postgres psql

# إنشاء قاعدة البيانات والمستخدم
CREATE USER videosai WITH PASSWORD 'your_secure_password';
CREATE DATABASE videosai OWNER videosai;
GRANT ALL PRIVILEGES ON DATABASE videosai TO videosai;
\q
```

### 3. تثبيت المشروع

```bash
# استنساخ المشروع
git clone <your-repo-url>
cd videosai

# تثبيت الاعتماديات
npm install

# نسخ ملف البيئة
cp .env.example .env
```

### 4. إعداد ملف البيئة (.env)

```env
DATABASE_URL="postgresql://videosai:your_secure_password@localhost:5432/videosai"
GEMINI_API_KEY="your-gemini-api-key"
PORT=3001
```

### 5. تهيئة قاعدة البيانات

```bash
# إنشاء الجداول
npx prisma db push

# (اختياري) فتح واجهة إدارة قاعدة البيانات
npx prisma studio
```

### 6. تشغيل التطبيق

```bash
# وضع التطوير (Frontend + Backend)
npm run dev

# أو تشغيل كل جزء على حدة
npm run dev:client  # Frontend على المنفذ 3000
npm run dev:server  # Backend على المنفذ 3001
```

### 7. البناء للإنتاج

```bash
# بناء التطبيق
npm run build

# تشغيل الإنتاج
npm start
```

## استخدام PM2 (موصى به للإنتاج)

```bash
# تثبيت PM2
npm install -g pm2

# تشغيل السيرفر
pm2 start server/index.ts --interpreter tsx --name videosai-api

# تشغيل Frontend (بعد البناء)
pm2 serve dist 3000 --name videosai-frontend

# حفظ الإعدادات
pm2 save
pm2 startup
```

## إعداد Nginx (اختياري)

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 50M;
    }

    # Uploads
    location /uploads {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

## البنية

```
├── src/                  # Frontend (React + Vite)
│   ├── pages/           # الصفحات
│   ├── components/      # المكونات
│   └── lib/             # الأدوات والـ API
├── server/              # Backend (Express)
│   ├── index.ts         # السيرفر الرئيسي
│   └── ai.ts            # دوال الذكاء الاصطناعي
├── prisma/              # قاعدة البيانات
│   └── schema.prisma    # هيكل الجداول
└── uploads/             # الملفات المرفوعة
```

## الميزات

- إنشاء شخصيات متعددة الأنواع (بشرية، خيالية، مخلوقات، هجينة)
- توليد قصص وسيناريوهات بالذكاء الاصطناعي
- توليد صور المشاهد مع الحفاظ على اتساق الشخصيات
- معرض لحفظ الأعمال
- استوديو المنتجات والإعلانات

## استكشاف الأخطاء

### خطأ في الاتصال بقاعدة البيانات
```bash
# تأكد من تشغيل PostgreSQL
sudo systemctl status postgresql

# تحقق من صحة DATABASE_URL في ملف .env
```

### خطأ في توليد الصور
```bash
# تأكد من صحة GEMINI_API_KEY
# تأكد من أن الـ API key يدعم توليد الصور (Nano Banana)
```

### مشكلة في رفع الملفات
```bash
# تأكد من وجود مجلد uploads وصلاحياته
mkdir -p uploads
chmod 755 uploads
```
