#!/usr/bin/env bash
# تشغيل هذا السكربت على الـ VPS للتحقق من تقديم الواجهة
# يوضح من أين يُخدم الموقع وأين يوجد البناء الجديد

set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/var/www/videosAi}"
if [[ ! -d "$PROJECT_DIR" ]]; then
  PROJECT_DIR="$HOME/videosAi"
fi

echo "=== مجلد البناء الحالي (dist) ==="
ls -la "$PROJECT_DIR/dist/" 2>/dev/null || echo "dist غير موجود. شغّل: npm run build"
echo ""

echo "=== فحص ملف nginx المقترح ==="
if [[ -f "$PROJECT_DIR/scripts/nginx-videosai.conf" ]]; then
  sed -n '1,120p' "$PROJECT_DIR/scripts/nginx-videosai.conf"
else
  echo "ملف nginx-videosai.conf غير موجود داخل المشروع."
fi
echo ""

echo "=== اختبار Nginx (إن كان مثبتًا) ==="
if command -v nginx >/dev/null 2>&1; then
  sudo nginx -t || true
else
  echo "Nginx غير مثبت على هذا الخادم."
fi
