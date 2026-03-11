#!/usr/bin/env bash

set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
cd "$PROJECT_DIR"

echo "==> Project directory: $PROJECT_DIR"

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "==> Created .env from .env.example (please edit secrets before production traffic)."
fi

echo "==> Installing Node dependencies..."
if command -v npm >/dev/null 2>&1; then
  npm ci || npm install
else
  echo "npm is not installed. Install Node.js 20+ first."
  exit 1
fi

echo "==> Preparing Python virtual environment..."
if [[ ! -d backend/.venv ]]; then
  python3 -m venv backend/.venv
fi
backend/.venv/bin/python -m pip install --upgrade pip setuptools wheel
backend/.venv/bin/pip install -r backend/requirements.txt

echo "==> Building frontend..."
npm run build

echo "==> Checking required system tools..."
if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "WARNING: ffmpeg is not installed. /api/merge-videos will fail until you install it."
fi
if ! command -v mongod >/dev/null 2>&1; then
  echo "WARNING: MongoDB service binary was not found. Ensure MongoDB is installed and running."
fi

echo "==> Installing PM2 (if missing)..."
if ! command -v pm2 >/dev/null 2>&1; then
  npm install -g pm2
fi

echo "==> Starting/reloading PM2 apps..."
if pm2 describe videosai-node >/dev/null 2>&1; then
  pm2 reload ecosystem.config.cjs --update-env
else
  pm2 start ecosystem.config.cjs --update-env
fi

pm2 save

echo "==> Trying to enable PM2 autostart..."
pm2 startup systemd -u "$USER" --hp "$HOME" >/tmp/pm2-startup.out 2>&1 || true
if grep -q "sudo" /tmp/pm2-startup.out; then
  echo "Run the following command once as root to enable PM2 on reboot:"
  grep -oE "sudo .+" /tmp/pm2-startup.out || true
fi
rm -f /tmp/pm2-startup.out

echo "==> Done. Health checks:"
echo "    Node API   : curl http://127.0.0.1:3011/api/health"
echo "    Python API : curl http://127.0.0.1:8000/api/health"
