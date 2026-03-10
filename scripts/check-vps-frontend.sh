#!/bin/bash
# تشغيل هذا السكربت على الـ VPS للتحقق من تقديم الواجهة
# يوضح من أين يُخدم الموقع وأين يوجد البناء الجديد

echo "=== مجلد البناء الحالي (dist) ==="
ls -la ~/videosAi/dist/ 2>/dev/null | head -5
echo ""
echo "=== إعدادات Nginx التي تذكر videosAi ==="
grep -r "videosAi\|videosai" /etc/nginx/ 2>/dev/null || true
echo ""
echo "=== root / server في Nginx للموقع الافتراضي أو المنفذ 80 ==="
grep -E "root |server_name |listen " /etc/nginx/sites-enabled/* 2>/dev/null || cat /etc/nginx/nginx.conf 2>/dev/null | grep -E "root |server_name |listen " || true
echo ""
echo "=== انتهى. تأكد أن root يشير إلى .../videosAi/dist"
