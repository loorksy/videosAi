#!/bin/bash
# ============================================================
# StoryWeaver AI – إعداد VPS من الصفر
# يعمل على Ubuntu 22.04 / 24.04
# شغّله مرة واحدة: sudo bash scripts/setup-vps.sh
# ============================================================
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DIST_DIR="/var/www/videosai"

echo "========================================"
echo "  StoryWeaver AI – VPS Setup"
echo "  مسار المشروع: $APP_DIR"
echo "========================================"

# ---------- 1. تحديث النظام ----------
echo ""
echo "==> [1/8] تحديث النظام..."
apt-get update -y
apt-get upgrade -y

# ---------- 2. تثبيت الأساسيات ----------
echo ""
echo "==> [2/8] تثبيت الأدوات الأساسية..."
apt-get install -y curl wget git build-essential software-properties-common \
  nginx certbot python3-certbot-nginx ffmpeg

# ---------- 3. تثبيت Node.js 20 ----------
echo ""
echo "==> [3/8] تثبيت Node.js..."
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo "  Node: $(node -v), npm: $(npm -v)"

# PM2 عالمياً
if ! command -v pm2 &>/dev/null; then
  npm install -g pm2
fi

# ---------- 4. تثبيت Python 3.11+ ----------
echo ""
echo "==> [4/8] تثبيت Python..."
if ! command -v python3 &>/dev/null; then
  apt-get install -y python3 python3-pip python3-venv
fi
echo "  Python: $(python3 --version)"

# ---------- 5. تثبيت MongoDB ----------
echo ""
echo "==> [5/8] تثبيت MongoDB..."
if ! command -v mongod &>/dev/null; then
  curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
    gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
  echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse" | \
    tee /etc/apt/sources.list.d/mongodb-org-7.0.list
  apt-get update -y
  apt-get install -y mongodb-org
  systemctl enable mongod
  systemctl start mongod
  echo "  MongoDB مثبت ومشغل"
else
  echo "  MongoDB مثبت مسبقاً"
  systemctl enable mongod 2>/dev/null || true
  systemctl start mongod 2>/dev/null || true
fi

# ---------- 6. تثبيت تبعيات المشروع ----------
echo ""
echo "==> [6/8] تثبيت تبعيات المشروع..."
cd "$APP_DIR"

echo "  → npm install..."
npm install

echo "  → pip install..."
pip install -r backend/requirements.txt --break-system-packages 2>/dev/null \
  || pip install -r backend/requirements.txt \
  || python3 -m pip install -r backend/requirements.txt

# ---------- 7. بناء الفرونت ----------
echo ""
echo "==> [7/8] بناء الواجهة الأمامية..."
npm run build
mkdir -p "$DIST_DIR"
rsync -a --delete dist/ "$DIST_DIR/"
echo "  الملفات في: $DIST_DIR"

# ---------- 8. إعداد Nginx ----------
echo ""
echo "==> [8/8] إعداد Nginx..."
cp "$APP_DIR/scripts/nginx-videosai.conf" /etc/nginx/sites-available/videosai.conf
ln -sf /etc/nginx/sites-available/videosai.conf /etc/nginx/sites-enabled/videosai.conf
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
echo "  Nginx مُعاد تحميله"

# ---------- إعداد .env ----------
if [ ! -f "$APP_DIR/.env" ]; then
  cp "$APP_DIR/.env.example" "$APP_DIR/.env"
  echo ""
  echo "  ⚠  تم إنشاء .env من .env.example"
  echo "  عدّل الملف الآن:  nano $APP_DIR/.env"
fi

# ---------- إعداد PM2 ----------
echo ""
echo "==> تشغيل الخدمات عبر PM2..."
cd "$APP_DIR"
pm2 delete all 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || pm2 startup

echo ""
echo "========================================"
echo "  ✅ الإعداد اكتمل!"
echo "========================================"
echo ""
echo "  الخطوات التالية:"
echo "  1. عدّل ملف .env:       nano $APP_DIR/.env"
echo "  2. أعد تشغيل الخدمات:   pm2 restart all"
echo "  3. SSL (اختياري):        sudo certbot --nginx -d yourdomain.com"
echo "  4. راقب السجلات:         pm2 logs"
echo ""
echo "  أوامر مفيدة:"
echo "    pm2 status          – حالة الخدمات"
echo "    pm2 logs            – سجلات الخدمات"
echo "    pm2 restart all     – إعادة تشغيل الكل"
echo "    pm2 monit           – مراقبة مباشرة"
echo ""
