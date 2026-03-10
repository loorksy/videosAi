# تشغيل المشروع محلياً - يفتح 3 نوافذ: Backend (FastAPI), Node (Auth), Frontend (Vite)
$root = $PSScriptRoot

# نافذة 1: FastAPI على المنفذ 8000
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root'; python -m uvicorn backend.server:app --host 127.0.0.1 --port 8000"

Start-Sleep -Seconds 2

# نافذة 2: Node (المصادقة) على المنفذ 3001
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root'; npx tsx server/server.ts"

Start-Sleep -Seconds 2

# نافذة 3: Vite على المنفذ 3000
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root'; npm run dev"

Write-Host "3 windows opened. Frontend: http://localhost:3000" -ForegroundColor Green
Write-Host "Ensure MongoDB is running on localhost:27017" -ForegroundColor Yellow
