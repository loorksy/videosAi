#!/bin/bash
# ============================================================
# StoryWeaver AI – تشغيل محلي (Linux / macOS)
# يشغل 3 عمليات: Python Backend, Node Auth, Vite Dev
# ============================================================
set -e

cd "$(dirname "$0")/.."
ROOT="$(pwd)"

cleanup() {
    echo ""
    echo "==> إيقاف جميع العمليات..."
    kill $PID_PYTHON $PID_NODE $PID_VITE 2>/dev/null || true
    wait 2>/dev/null
    echo "==> تم الإيقاف."
}
trap cleanup EXIT INT TERM

if [ -f "$ROOT/.env" ]; then
    set -a
    source "$ROOT/.env"
    set +a
fi

export PORT="${PORT:-3001}"
export NODE_URL="${NODE_URL:-http://127.0.0.1:$PORT}"

echo "========================================"
echo "  StoryWeaver AI – Local Dev"
echo "========================================"

echo "==> [1/3] تشغيل Python Backend على المنفذ 8000..."
python3 -m uvicorn backend.server:app --host 127.0.0.1 --port 8000 --reload &
PID_PYTHON=$!
sleep 2

echo "==> [2/3] تشغيل Node Auth Server على المنفذ $PORT..."
npx tsx server/server.ts &
PID_NODE=$!
sleep 2

echo "==> [3/3] تشغيل Vite Dev Server على المنفذ 3000..."
npm run dev &
PID_VITE=$!

echo ""
echo "========================================"
echo "  ✅ جميع الخدمات تعمل"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://127.0.0.1:8000"
echo "  Node:     http://127.0.0.1:$PORT"
echo "  اضغط Ctrl+C للإيقاف"
echo "========================================"
echo ""

wait
