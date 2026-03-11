#!/usr/bin/env bash
# تشغيل هذا السكربت على الـ VPS بعد الدخول عبر SSH
# أو من جهازك: ssh user@your-vps 'bash -s' < scripts/update-on-vps.sh

set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/var/www/videosAi}"
if [[ ! -d "$PROJECT_DIR" ]]; then
  PROJECT_DIR="$HOME/videosAi"
fi
if [[ ! -d "$PROJECT_DIR" ]]; then
  PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
fi
cd "$PROJECT_DIR"

echo "==> المسار الحالي: $(pwd)"
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
echo "==> الفرع الحالي: $CURRENT_BRANCH"

echo "==> سحب آخر تحديثات Git..."
git fetch --all --prune
git pull --ff-only origin "$CURRENT_BRANCH"

echo "==> تحديث تبعيات Node..."
npm ci || npm install

echo "==> تحديث بيئة Python..."
if [[ ! -d backend/.venv ]]; then
  python3 -m venv backend/.venv
fi
backend/.venv/bin/python -m pip install --upgrade pip setuptools wheel
backend/.venv/bin/pip install -r backend/requirements.txt

echo "==> إعادة بناء الواجهة..."
npm run build

echo "==> إعادة تحميل الخدمات عبر PM2..."
if command -v pm2 >/dev/null 2>&1; then
  pm2 reload ecosystem.config.cjs --update-env || pm2 start ecosystem.config.cjs --update-env
  pm2 save
else
  echo "pm2 غير مثبت. شغّل scripts/setup-vps.sh أولاً."
  exit 1
fi

echo "==> تم التحديث بنجاح."
echo "اختبارات سريعة:"
echo "  curl http://127.0.0.1:3011/api/health"
echo "  curl http://127.0.0.1:8000/api/health"
