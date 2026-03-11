#!/bin/bash
# ============================================================
# StoryWeaver AI – تحديث المشروع على VPS
# شغّله من على السيرفر:  bash scripts/update-on-vps.sh
# أو من جهازك:           ssh user@IP 'cd /var/www/videosAi && bash scripts/update-on-vps.sh'
# ============================================================
set -euo pipefail

cd /var/www/videosAi 2>/dev/null \
  || cd ~/videosAi 2>/dev/null \
  || cd "$(dirname "$0")/.." \
  || { echo "❌ حدد مسار المشروع على الـ VPS"; exit 1; }

APP_DIR="$(pwd)"
DIST_DIR="/var/www/videosai"

echo "========================================"
echo "  StoryWeaver AI – تحديث"
echo "  المسار: $APP_DIR"
echo "========================================"

echo ""
echo "==> سحب التحديثات من GitHub..."
git fetch origin
git pull origin main

echo ""
echo "==> تثبيت تبعيات Node..."
npm install

echo ""
echo "==> تثبيت تبعيات Python..."
pip install -r backend/requirements.txt --break-system-packages -q 2>/dev/null \
  || pip install -r backend/requirements.txt -q \
  || python3 -m pip install -r backend/requirements.txt -q

echo ""
echo "==> بناء الواجهة الأمامية..."
npm run build
mkdir -p "$DIST_DIR"
rsync -a --delete dist/ "$DIST_DIR/"

echo ""
echo "==> إعادة تشغيل الخدمات..."
pm2 restart ecosystem.config.cjs --update-env
echo ""
echo "==> إعادة تحميل Nginx..."
sudo nginx -t && sudo systemctl reload nginx

echo ""
echo "========================================"
echo "  ✅ التحديث اكتمل!"
echo "========================================"
echo "  pm2 status   – للتحقق من حالة الخدمات"
echo "  pm2 logs     – لمتابعة السجلات"
echo ""
