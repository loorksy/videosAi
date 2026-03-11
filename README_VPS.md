# تشغيل المشروع على VPS

هذا الدليل يجهز المشروع ليعمل Production على VPS باستخدام:

- **Nginx** (تقديم الواجهة + reverse proxy)
- **PM2** (تشغيل Node API + Python API)
- **MongoDB** (لبيانات backend)

---

## 1) المتطلبات

- Ubuntu 22.04/24.04 (أو مشابه)
- Node.js 20+
- Python 3.10+
- MongoDB شغال محليًا على `127.0.0.1:27017`
- Nginx
- ffmpeg (مطلوب لمسار دمج الفيديو `/api/merge-videos`)

---

## 2) نسخ المشروع

```bash
sudo mkdir -p /var/www
sudo chown -R "$USER":"$USER" /var/www
cd /var/www
git clone <REPO_URL> videosAi
cd videosAi
```

---

## 3) إعداد متغيرات البيئة

```bash
cp .env.example .env
nano .env
```

حدّث القيم الحساسة خصوصًا:

- `JWT_SECRET`
- `INTERNAL_API_KEY`
- `APP_URL`
- `MONGO_URL`

---

## 4) التشغيل الأول

```bash
chmod +x scripts/setup-vps.sh scripts/update-on-vps.sh
./scripts/setup-vps.sh
```

بعدها تأكد من الخدمات:

```bash
pm2 status
curl http://127.0.0.1:3011/api/health
curl http://127.0.0.1:8000/api/health
```

---

## 5) إعداد Nginx

1. انسخ القالب:

```bash
sudo cp scripts/nginx-videosai.conf /etc/nginx/sites-available/videosai.conf
```

2. عدّل `server_name` داخل الملف إلى دومينك.

3. فعّل الموقع:

```bash
sudo ln -s /etc/nginx/sites-available/videosai.conf /etc/nginx/sites-enabled/videosai.conf
sudo nginx -t
sudo systemctl reload nginx
```

4. (اختياري) أضف SSL عبر Certbot.

---

## 6) التحديثات لاحقًا

```bash
cd /var/www/videosAi
./scripts/update-on-vps.sh
```

---

## ملاحظات

- الواجهة تُخدم من `dist`.
- Node API يعمل على `127.0.0.1:3011`.
- Python API يعمل على `127.0.0.1:8000`.
- Nginx يوجه:
  - `/api/auth` و`/api/settings` و`/api/jobs` و`/api/admin/users*` و`/api/admin/credits*` إلى Node
  - `/api/admin/fal*` و`/api/admin/tenants*` وباقي `/api/*` إلى Python
