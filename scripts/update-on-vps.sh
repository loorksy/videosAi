#!/bin/bash
# تشغيل هذا السكربت على الـ VPS بعد الدخول عبر SSH
# أو من جهازك: ssh user@72.60.83.140 'bash -s' < scripts/update-on-vps.sh

set -e
cd /var/www/videosAi 2>/dev/null || cd ~/videosAi 2>/dev/null || cd "$(dirname "$0")/.." || { echo "حدد مسار المشروع على الـ VPS (مثلاً: cd /var/www/videosAi)"; exit 1; }

echo "==> المسار الحالي: $(pwd)"
echo "==> سحب التحديثات من GitHub..."
git fetch origin
git pull origin main

echo "==> تثبيت تبعيات Node (إن وجدت تغييرات)..."
npm install --production=false

echo "==> تثبيت تبعيات Python للـ backend..."
pip install -r backend/requirements.txt -q 2>/dev/null || python3 -m pip install -r backend/requirements.txt -q

echo "==> إعادة بناء الواجهة (إن كنت تخدمها من dist)..."
npm run build 2>/dev/null || true

echo "==> إعادة تشغيل الخدمات (عدّل الأسماء حسب نظامك: systemd أو pm2)..."
# إذا كنت تستخدم systemd:
# sudo systemctl restart videosai-backend videosai-node videosai-frontend 2>/dev/null || true
# إذا كنت تستخدم pm2:
# pm2 restart all 2>/dev/null || true

echo "==> انتهى. تحقق من عمل الموقع."
