# تشغيل المشروع محلياً - يفتح 3 نوافذ: Backend (FastAPI), Node (Auth), Frontend (Vite)
# AI: fal.ai فقط. الرصيد والاستهلاك من لوحة الأدمن. لا حاجة لـ KIE أو GEMINI.
$root = $PSScriptRoot

# نافذة 1: FastAPI على المنفذ 8000 (يتصل بـ Node على 3001 للكريدت)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root'; python -m uvicorn backend.server:app --host 127.0.0.1 --port 8000"

Start-Sleep -Seconds 2

# نافذة 2: Node (المصادقة + الكريدت) على المنفذ 3001
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root'; npx tsx server/server.ts"

Start-Sleep -Seconds 2

# نافذة 3: Vite على المنفذ 3000
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root'; npm run dev"

Write-Host "3 windows opened. Frontend: http://localhost:3000  Backend: http://127.0.0.1:8000  Node: http://127.0.0.1:3001" -ForegroundColor Green
Write-Host "MongoDB required for backend (localhost:27017). FAL key per-tenant from Admin > Fal settings." -ForegroundColor Yellow
