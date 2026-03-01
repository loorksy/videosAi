from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from dotenv import load_dotenv
from pymongo import MongoClient
from datetime import datetime, timezone
import httpx
import os
import uuid
import base64
import json

load_dotenv("/app/.env")

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

KIE_API_KEY_ENV = os.environ.get("KIE_API_KEY", "")
KIE_BASE_URL = "https://api.kie.ai/api/v1"
APP_URL = os.environ.get("APP_URL", "")
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "storyweaver")


def get_kie_api_key() -> str:
    """Get kie.ai API key from DB settings first, fallback to .env."""
    settings = db.settings.find_one({"key": "app_settings"}, {"_id": 0})
    if settings and settings.get("kie_api_key"):
        return settings["kie_api_key"]
    return KIE_API_KEY_ENV

# MongoDB
client = MongoClient(MONGO_URL)
db = client[DB_NAME]

# Upload directory
UPLOAD_DIR = "/app/backend/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/api/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


# ============ HELPERS ============

def save_base64_file(data: str, ext: str = "jpg") -> str:
    if "," in data:
        data = data.split(",")[1]
    img_bytes = base64.b64decode(data)
    fname = f"{uuid.uuid4().hex}.{ext}"
    with open(os.path.join(UPLOAD_DIR, fname), "wb") as f:
        f.write(img_bytes)
    return f"/api/uploads/{fname}"


def now_iso():
    return datetime.now(timezone.utc).isoformat()


# ============ HEALTH ============

@app.get("/api/health")
def health():
    return {"status": "ok"}


# ============ MEDIA UPLOAD ============

class MediaUploadRequest(BaseModel):
    data: str  # base64
    type: str = "image"
    source: str = ""
    id: Optional[str] = None
    title: str = ""
    description: str = ""
    aspectRatio: str = "16:9"


@app.post("/api/media/upload")
async def upload_media(req: MediaUploadRequest):
    ext = "mp4" if req.type == "video" else "jpg"
    url = save_base64_file(req.data, ext)
    doc = {
        "id": req.id or uuid.uuid4().hex,
        "url": url,
        "type": req.type,
        "source": req.source,
        "title": req.title,
        "description": req.description,
        "aspectRatio": req.aspectRatio,
        "createdAt": now_iso(),
    }
    db.media.update_one({"id": doc["id"]}, {"$set": doc}, upsert=True)
    return {"id": doc["id"], "url": url}


@app.get("/api/media/list")
async def list_media(type: Optional[str] = None, source: Optional[str] = None):
    query = {}
    if type:
        query["type"] = type
    if source:
        query["source"] = source
    items = list(db.media.find(query, {"_id": 0}).sort("createdAt", -1).limit(100))
    return items


# ============ CHARACTERS ============

class CharacterSaveRequest(BaseModel):
    id: Optional[str] = None
    name: str
    description: str
    visualTraits: str = ""
    images: Dict[str, str] = {}  # key -> base64


@app.post("/api/characters/save")
async def save_character(req: CharacterSaveRequest):
    char_id = req.id or uuid.uuid4().hex

    # Upload images and convert base64 to URLs
    image_urls = {}
    for key, val in req.images.items():
        if val and len(val) > 200:
            if val.startswith("http"):
                image_urls[key] = val
            else:
                image_urls[key] = save_base64_file(val)

    doc = {
        "id": char_id,
        "name": req.name,
        "description": req.description,
        "visualTraits": req.visualTraits,
        "images": image_urls,
        "createdAt": now_iso(),
    }

    db.characters.update_one({"id": char_id}, {"$set": doc}, upsert=True)
    return doc


@app.get("/api/characters/list")
async def list_characters():
    chars = list(db.characters.find({}, {"_id": 0}).sort("createdAt", -1))
    return chars


@app.delete("/api/characters/{char_id}")
async def delete_character(char_id: str):
    db.characters.delete_one({"id": char_id})
    return {"ok": True}


@app.get("/api/characters/{char_id}")
async def get_character(char_id: str):
    char = db.characters.find_one({"id": char_id}, {"_id": 0})
    if not char:
        raise HTTPException(status_code=404, detail="Character not found")
    return char


# ============ STORYBOARDS ============

class SceneSave(BaseModel):
    description: str
    characterIds: List[str] = []
    dialogue: str = ""
    frameImage: str = ""  # base64 or url
    videoUrl: str = ""


class StoryboardSaveRequest(BaseModel):
    id: Optional[str] = None
    title: str = ""
    script: str = ""
    style: str = ""
    aspectRatio: str = "16:9"
    scenes: List[SceneSave] = []
    videoTasks: Optional[List[Dict[str, Any]]] = None


@app.post("/api/storyboards/save")
async def save_storyboard(req: StoryboardSaveRequest):
    sb_id = req.id or uuid.uuid4().hex

    saved_scenes = []
    for scene in req.scenes:
        frame_url = ""
        if scene.frameImage and len(scene.frameImage) > 200:
            if scene.frameImage.startswith("http"):
                frame_url = scene.frameImage
            else:
                frame_url = save_base64_file(scene.frameImage)

        saved_scenes.append({
            "description": scene.description,
            "characterIds": scene.characterIds,
            "dialogue": scene.dialogue,
            "frameImage": frame_url,
            "videoUrl": scene.videoUrl,
        })

    doc = {
        "id": sb_id,
        "title": req.title,
        "script": req.script,
        "style": req.style,
        "aspectRatio": req.aspectRatio,
        "scenes": saved_scenes,
        "createdAt": now_iso(),
    }
    if req.videoTasks is not None:
        doc["videoTasks"] = req.videoTasks

    db.storyboards.update_one({"id": sb_id}, {"$set": doc}, upsert=True)
    return doc


@app.get("/api/storyboards/list")
async def list_storyboards():
    items = list(db.storyboards.find({}, {"_id": 0}).sort("createdAt", -1))
    return items


@app.get("/api/storyboards/{sb_id}")
async def get_storyboard(sb_id: str):
    sb = db.storyboards.find_one({"id": sb_id}, {"_id": 0})
    if not sb:
        raise HTTPException(status_code=404, detail="Storyboard not found")
    return sb


@app.delete("/api/storyboards/{sb_id}")
async def delete_storyboard(sb_id: str):
    db.storyboards.delete_one({"id": sb_id})
    return {"ok": True}


@app.delete("/api/media/{media_id}")
async def delete_media(media_id: str):
    db.media.delete_one({"id": media_id})
    return {"ok": True}



# ============ KIE.AI VIDEO ============

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
        image_url = req.image_url
        # If image is hosted on our preview URL, upload to kie.ai first
        if "preview.emergentagent.com" in image_url or "localhost" in image_url:
            async with httpx.AsyncClient(timeout=30) as dl:
                img_resp = await dl.get(image_url)
                if img_resp.status_code == 200:
                    fname = f"{uuid.uuid4().hex}.jpg"
                    image_url = await upload_image_to_kie(img_resp.content, fname)
        payload["imageUrls"] = [image_url]
        payload["generation_mode"] = req.generation_mode

    headers = {"Authorization": f"Bearer {KIE_API_KEY}", "Content-Type": "application/json"}

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(f"{KIE_BASE_URL}/veo/generate", json=payload, headers=headers)
        result = resp.json()
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail=result.get("message", str(result)))
        return result


@app.get("/api/kie/task-status/{task_id}")
async def task_status(task_id: str):
    if not KIE_API_KEY:
        raise HTTPException(status_code=500, detail="KIE_API_KEY not configured")

    headers = {"Authorization": f"Bearer {KIE_API_KEY}", "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(f"{KIE_BASE_URL}/veo/record-info?taskId={task_id}", headers=headers)
        result = resp.json()
        
        # Normalize response for frontend
        data = result.get("data") or {}
        success_flag = data.get("successFlag", 0)
        
        status = "processing"
        video_url = ""
        if success_flag == 1:
            status = "completed"
            # resultUrls is inside data.response.resultUrls (as a list)
            response_obj = data.get("response") or {}
            urls = response_obj.get("resultUrls") or []
            video_url = urls[0] if urls else ""
        elif success_flag in (2, 3):
            status = "failed"
        
        return {
            "status": status,
            "videoUrl": video_url,
            "successFlag": success_flag,
            "raw": result,
        }


class BatchTaskRequest(BaseModel):
    task_ids: List[str]
    storyboard_id: Optional[str] = None


@app.post("/api/kie/batch-task-status")
async def batch_task_status(req: BatchTaskRequest):
    """Check status of multiple tasks at once. Auto-update storyboard if provided."""
    if not KIE_API_KEY:
        raise HTTPException(status_code=500, detail="KIE_API_KEY not configured")

    results = {}
    headers = {"Authorization": f"Bearer {KIE_API_KEY}", "Content-Type": "application/json"}

    async with httpx.AsyncClient(timeout=30) as client:
        for tid in req.task_ids:
            try:
                resp = await client.get(f"{KIE_BASE_URL}/veo/record-info?taskId={tid}", headers=headers)
                result = resp.json()
                data = result.get("data") or {}
                sf = data.get("successFlag", 0)
                video_url = ""
                if sf == 1:
                    response_obj = data.get("response") or {}
                    urls = response_obj.get("resultUrls") or []
                    video_url = urls[0] if urls else ""
                results[tid] = {
                    "status": "completed" if sf == 1 else "failed" if sf in (2, 3) else "processing",
                    "videoUrl": video_url,
                }
            except Exception:
                results[tid] = {"status": "processing", "videoUrl": ""}

    # Auto-update storyboard scenes with completed video URLs
    if req.storyboard_id:
        sb = db.storyboards.find_one({"id": req.storyboard_id}, {"_id": 0})
        if sb and sb.get("videoTasks"):
            updated = False
            scenes = sb.get("scenes", [])
            for task in sb["videoTasks"]:
                tid = task.get("taskId")
                idx = task.get("sceneIndex", -1)
                if tid in results and results[tid]["status"] == "completed" and results[tid]["videoUrl"]:
                    if 0 <= idx < len(scenes) and not scenes[idx].get("videoUrl"):
                        scenes[idx]["videoUrl"] = results[tid]["videoUrl"]
                        updated = True
            if updated:
                db.storyboards.update_one({"id": req.storyboard_id}, {"$set": {"scenes": scenes}})

    return results



class ImageToVideoRequest(BaseModel):
    prompt: str
    image_base64: str
    model: str = "veo3_fast"
    aspect_ratio: str = "16:9"


async def upload_image_to_kie(image_bytes: bytes, filename: str) -> str:
    """Upload image to kie.ai's File Upload API and return the CDN URL."""
    headers = {"Authorization": f"Bearer {KIE_API_KEY}"}
    async with httpx.AsyncClient(timeout=60) as c:
        resp = await c.post(
            "https://kieai.redpandaai.co/api/file-stream-upload",
            headers=headers,
            files={"file": (filename, image_bytes, "image/jpeg")},
            data={"uploadPath": "storyweaver/images", "fileName": filename},
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail=f"kie.ai upload failed: {resp.text}")
        result = resp.json()
        url = result.get("data", {}).get("downloadUrl", "")
        if not url:
            raise HTTPException(status_code=500, detail=f"kie.ai upload returned no URL: {result}")
        return url


@app.post("/api/kie/image-to-video")
async def image_to_video(req: ImageToVideoRequest):
    if not KIE_API_KEY:
        raise HTTPException(status_code=500, detail="KIE_API_KEY not configured")

    # Decode base64 image
    img_data = req.image_base64
    if "," in img_data:
        img_data = img_data.split(",")[1]
    image_bytes = base64.b64decode(img_data)
    filename = f"{uuid.uuid4().hex}.jpg"

    # Save locally for reference
    local_path = os.path.join(UPLOAD_DIR, filename)
    with open(local_path, "wb") as f:
        f.write(image_bytes)
    local_url = f"/api/uploads/{filename}"

    # Upload to kie.ai CDN so their service can access the image
    kie_image_url = await upload_image_to_kie(image_bytes, filename)

    payload = {
        "prompt": req.prompt,
        "model": req.model,
        "aspect_ratio": req.aspect_ratio,
        "imageUrls": [kie_image_url],
    }
    headers = {"Authorization": f"Bearer {KIE_API_KEY}", "Content-Type": "application/json"}

    async with httpx.AsyncClient(timeout=30) as c:
        resp = await c.post(f"{KIE_BASE_URL}/veo/generate", json=payload, headers=headers)
        result = resp.json()
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail=result.get("message", str(result)))
        return {"taskId": (result.get("data") or {}).get("taskId", result.get("taskId")), "imageUrl": local_url}



class UploadImageRequest(BaseModel):
    image_base64: str


@app.post("/api/kie/upload-image")
async def kie_upload_image(req: UploadImageRequest):
    if not KIE_API_KEY:
        raise HTTPException(status_code=500, detail="KIE_API_KEY not configured")

    img_data = req.image_base64
    if "," in img_data:
        img_data = img_data.split(",")[1]
    image_bytes = base64.b64decode(img_data)
    filename = f"{uuid.uuid4().hex}.jpg"

    kie_url = await upload_image_to_kie(image_bytes, filename)
    return {"url": kie_url}


class MergeVideosRequest(BaseModel):
    video_urls: List[str]


@app.post("/api/merge-videos")
async def merge_videos(req: MergeVideosRequest):
    """Download all video clips and merge them into one final video using ffmpeg."""
    import subprocess
    import tempfile

    if not req.video_urls:
        raise HTTPException(status_code=400, detail="No video URLs provided")

    tmpdir = tempfile.mkdtemp()
    downloaded = []

    try:
        async with httpx.AsyncClient(timeout=120) as client:
            for i, url in enumerate(req.video_urls):
                if not url:
                    continue
                # Download video
                resp = await client.get(url)
                if resp.status_code != 200:
                    continue
                path = os.path.join(tmpdir, f"clip_{i:03d}.mp4")
                with open(path, "wb") as f:
                    f.write(resp.content)
                downloaded.append(path)

        if len(downloaded) < 1:
            raise HTTPException(status_code=400, detail="No videos could be downloaded")

        # Create ffmpeg concat file
        concat_path = os.path.join(tmpdir, "list.txt")
        with open(concat_path, "w") as f:
            for p in downloaded:
                f.write(f"file '{p}'\n")

        # Merge with ffmpeg
        output_name = f"{uuid.uuid4().hex}_final.mp4"
        output_path = os.path.join(UPLOAD_DIR, output_name)

        result = subprocess.run(
            ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", concat_path,
             "-c", "copy", "-movflags", "+faststart", output_path],
            capture_output=True, text=True, timeout=300
        )

        if result.returncode != 0:
            # Try with re-encoding if concat copy fails
            result = subprocess.run(
                ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", concat_path,
                 "-c:v", "libx264", "-c:a", "aac", "-movflags", "+faststart", output_path],
                capture_output=True, text=True, timeout=300
            )

        if result.returncode != 0:
            raise HTTPException(status_code=500, detail=f"ffmpeg error: {result.stderr[:500]}")

        return {"url": f"/api/uploads/{output_name}", "clips_count": len(downloaded)}

    finally:
        # Cleanup temp files
        import shutil
        shutil.rmtree(tmpdir, ignore_errors=True)
