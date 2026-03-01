from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv
import httpx
import os
import uuid
import base64

load_dotenv("/app/.env")

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

KIE_API_KEY = os.environ.get("KIE_API_KEY", "")
KIE_BASE_URL = "https://api.kie.ai/api/v1"
APP_URL = os.environ.get("APP_URL", "")

# Create temp directory for images
UPLOAD_DIR = "/app/backend/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Serve uploaded images as static files
app.mount("/api/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.get("/api/health")
def health():
    return {"status": "ok"}


class UploadImageRequest(BaseModel):
    image_base64: str
    filename: Optional[str] = None


@app.post("/api/kie/upload-image")
async def upload_image(req: UploadImageRequest):
    try:
        data = req.image_base64
        if "," in data:
            data = data.split(",")[1]

        img_bytes = base64.b64decode(data)
        fname = req.filename or f"{uuid.uuid4().hex}.jpg"
        fpath = os.path.join(UPLOAD_DIR, fname)

        with open(fpath, "wb") as f:
            f.write(img_bytes)

        image_url = f"{APP_URL}/api/uploads/{fname}"
        return {"url": image_url, "filename": fname}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class GenerateVideoRequest(BaseModel):
    prompt: str
    image_url: Optional[str] = None
    model: str = "veo3_fast"
    aspect_ratio: str = "16:9"
    generation_mode: str = "TEXT_2_VIDEO"


@app.post("/api/kie/generate-video")
async def generate_video(req: GenerateVideoRequest):
    if not KIE_API_KEY:
        raise HTTPException(status_code=500, detail="KIE_API_KEY not configured")

    payload = {
        "prompt": req.prompt,
        "model": req.model,
        "aspect_ratio": req.aspect_ratio,
    }

    if req.image_url:
        payload["imageUrls"] = [req.image_url]
        if req.generation_mode:
            payload["generation_mode"] = req.generation_mode

    headers = {
        "Authorization": f"Bearer {KIE_API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{KIE_BASE_URL}/veo/generate",
                json=payload,
                headers=headers,
            )
            result = resp.json()

            if resp.status_code == 402:
                raise HTTPException(status_code=402, detail="رصيد kie.ai غير كافٍ. اشحن حسابك.")
            if resp.status_code == 401:
                raise HTTPException(status_code=401, detail="مفتاح kie.ai غير صالح.")
            if resp.status_code != 200:
                raise HTTPException(status_code=resp.status_code, detail=result.get("message", "خطأ غير معروف"))

            return result
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"فشل الاتصال بـ kie.ai: {str(e)}")


@app.get("/api/kie/task-status/{task_id}")
async def task_status(task_id: str):
    if not KIE_API_KEY:
        raise HTTPException(status_code=500, detail="KIE_API_KEY not configured")

    headers = {
        "Authorization": f"Bearer {KIE_API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                f"{KIE_BASE_URL}/veo/record-detail?taskId={task_id}",
                headers=headers,
            )
            return resp.json()
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"فشل التحقق من حالة المهمة: {str(e)}")


class GenerateVideoFromImageRequest(BaseModel):
    prompt: str
    image_base64: str
    model: str = "veo3_fast"
    aspect_ratio: str = "16:9"


@app.post("/api/kie/image-to-video")
async def image_to_video(req: GenerateVideoFromImageRequest):
    """All-in-one: upload image + generate video"""
    # Step 1: Upload image
    data = req.image_base64
    if "," in data:
        data = data.split(",")[1]

    img_bytes = base64.b64decode(data)
    fname = f"{uuid.uuid4().hex}.jpg"
    fpath = os.path.join(UPLOAD_DIR, fname)

    with open(fpath, "wb") as f:
        f.write(img_bytes)

    image_url = f"{APP_URL}/api/uploads/{fname}"

    # Step 2: Call kie.ai
    if not KIE_API_KEY:
        raise HTTPException(status_code=500, detail="KIE_API_KEY not configured")

    payload = {
        "prompt": req.prompt,
        "model": req.model,
        "aspect_ratio": req.aspect_ratio,
        "imageUrls": [image_url],
    }

    headers = {
        "Authorization": f"Bearer {KIE_API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{KIE_BASE_URL}/veo/generate",
                json=payload,
                headers=headers,
            )
            result = resp.json()

            if resp.status_code == 402:
                raise HTTPException(status_code=402, detail="رصيد kie.ai غير كافٍ.")
            if resp.status_code == 401:
                raise HTTPException(status_code=401, detail="مفتاح kie.ai غير صالح.")
            if resp.status_code != 200:
                raise HTTPException(status_code=resp.status_code, detail=result.get("message", str(result)))

            return {"taskId": result.get("data", {}).get("taskId", result.get("taskId")), "imageUrl": image_url}
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"فشل الاتصال بـ kie.ai: {str(e)}")
