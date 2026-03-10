from fastapi import FastAPI, HTTPException, UploadFile, File, Depends, Header
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
import asyncio
import jwt

try:
    from backend.fal_models import list_fal_models, FalModel
except ImportError:
    from .fal_models import list_fal_models, FalModel

# محلياً: .env من جذر المشروع
_env_local = os.path.join(os.path.dirname(__file__), "..", ".env")
if os.path.isfile(_env_local):
    load_dotenv(_env_local)
load_dotenv("/app/.env")

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

APP_URL = os.environ.get("APP_URL", "")
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "storyweaver")
JWT_SECRET = os.environ.get("JWT_SECRET", "super-secret-key-change-in-prod")
NODE_URL = os.environ.get("NODE_URL", "http://127.0.0.1:3001").rstrip("/")
INTERNAL_API_KEY = os.environ.get("INTERNAL_API_KEY", "internal-change-in-prod")
FAL_API_KEY = os.environ.get("FAL_API_KEY", "")

# MongoDB
client = MongoClient(MONGO_URL)
db = client[DB_NAME]

try:
    from backend.fal_client import get_fal_api_key_for_tenant
except ImportError:
    from .fal_client import get_fal_api_key_for_tenant

FAL_RUN_BASE = "https://fal.run"

FAL_MODEL_MAPPINGS_KEY = "fal_model_mappings"

FEATURE_DEFS: List[Dict[str, Any]] = [
    {"key": "text_thinking", "kind": "text", "label": "تحليل / تفكير عام"},
    {"key": "text_script", "kind": "text", "label": "سكربت القصة"},
    {"key": "text_metadata", "kind": "text", "label": "بيانات الفيديو (عنوان/وصف/هاشتاقات)"},
    {"key": "image_storyboard", "kind": "image", "label": "إطارات الستوري بورد"},
    {"key": "image_character", "kind": "image", "label": "تصميم الشخصيات"},
    {"key": "image_thumbnail", "kind": "image", "label": "صور الثمبنيل"},
    {"key": "image_wallpaper", "kind": "image", "label": "الخلفيات / Wallpapers"},
    {"key": "image_product", "kind": "image", "label": "صور المنتجات / الإعلانات"},
    {"key": "video_transition", "kind": "video", "label": "لقطات الفيديو بين المشاهد"},
]

# Upload directory
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
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


class AuthedUser(BaseModel):
    id: str
    username: str
    role: str
    tenantId: str


def get_current_user(authorization: str = Header(...)) -> AuthedUser:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    tenant_id = payload.get("tenantId")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Missing tenant in token")

    return AuthedUser(
        id=str(payload.get("id")),
        username=str(payload.get("username") or ""),
        role=str(payload.get("role") or "user"),
        tenantId=str(tenant_id),
    )


def _get_fal_model_mappings() -> Dict[str, str]:
    """Read fal model mappings from Mongo (global_settings collection)."""
    doc = db.global_settings.find_one({"key": FAL_MODEL_MAPPINGS_KEY}, {"_id": 0, "mappings": 1}) or {}
    mappings = doc.get("mappings") or {}
    if not isinstance(mappings, dict):
        return {}
    # Ensure all values are strings
    return {str(k): str(v) for k, v in mappings.items()}


def get_model_for_feature(feature_key: str, default_fallback: str) -> str:
    """
    Resolve the fal endpoint id for a logical feature key.
    Falls back to default_fallback if not configured.
    """
    mappings = _get_fal_model_mappings()
    model_id = mappings.get(feature_key)
    if isinstance(model_id, str) and model_id:
        return model_id
    return default_fallback

# ============ HEALTH ============

@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/admin/fal/models")
async def admin_list_fal_models(
    kind: Optional[str] = None,
    force: bool = False,
    user: AuthedUser = Depends(get_current_user),
):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    items = await list_fal_models(
        kind=kind,
        force_refresh=force,
        api_key=FAL_API_KEY or None,
    )
    return [m.dict() for m in items]


@app.get("/api/admin/fal/model-mappings")
async def admin_get_fal_model_mappings(user: AuthedUser = Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    mappings = _get_fal_model_mappings()

    # Fetch models once (no force) and group by kind
    models = await list_fal_models(api_key=FAL_API_KEY or None)
    available_by_kind: Dict[str, List[Dict[str, Any]]] = {"text": [], "image": [], "video": []}
    for m in models:
        if m.kind not in available_by_kind:
            available_by_kind[m.kind] = []
        available_by_kind[m.kind].append(m.dict())

    return {
        "features": FEATURE_DEFS,
        "mappings": mappings,
        "availableModelsByKind": available_by_kind,
    }


class FalModelMappingsUpdate(BaseModel):
    mappings: Dict[str, str]


@app.put("/api/admin/fal/model-mappings")
async def admin_update_fal_model_mappings(
    req: FalModelMappingsUpdate,
    user: AuthedUser = Depends(get_current_user),
):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    # Only keep known feature keys
    valid_keys = {f["key"] for f in FEATURE_DEFS}
    cleaned: Dict[str, str] = {}
    for k, v in (req.mappings or {}).items():
        if k in valid_keys and isinstance(v, str) and v:
            cleaned[k] = v

    db.global_settings.update_one(
        {"key": FAL_MODEL_MAPPINGS_KEY},
        {"$set": {"key": FAL_MODEL_MAPPINGS_KEY, "mappings": cleaned}},
        upsert=True,
    )
    return {"key": FAL_MODEL_MAPPINGS_KEY, "mappings": cleaned}


# ============ INTERNAL NODE CREDITS (for /api/ai) ============

async def _node_check_credits(user_id: str, usage_type: str) -> tuple[bool, int]:
    """Returns (ok, cost). ok=False if insufficient balance or error."""
    async with httpx.AsyncClient() as c:
        r = await c.get(
            f"{NODE_URL}/api/internal/credits/check",
            params={"user_id": user_id, "type": usage_type},
            headers={"X-Internal-Key": INTERNAL_API_KEY},
            timeout=10.0,
        )
    if r.status_code != 200:
        return False, 0
    data = r.json()
    if not data.get("ok"):
        return False, data.get("cost", 0)
    return True, data.get("cost", 0)


async def _node_deduct_usage(user_id: str, usage_type: str, cost: int) -> bool:
    """Deduct credits and log usage. Returns True on success, False on 402."""
    async with httpx.AsyncClient() as c:
        r = await c.post(
            f"{NODE_URL}/api/internal/credits/deduct",
            json={"user_id": user_id, "type": usage_type, "cost": cost},
            headers={"X-Internal-Key": INTERNAL_API_KEY},
            timeout=10.0,
        )
    return r.status_code == 200


# ============ AI GENERATION (fal.ai + credits) ============

class GenerateTextRequest(BaseModel):
    system: Optional[str] = None
    user: str
    featureKey: Optional[str] = None


class GenerateImageRequest(BaseModel):
    prompt: str
    image_size: Optional[str] = "landscape_16_9"
    num_inference_steps: Optional[int] = 28
    num_images: Optional[int] = 1
    featureKey: Optional[str] = None


class GenerateVideoRequest(BaseModel):
    prompt: Optional[str] = None
    image_url: Optional[str] = None  # for image-to-video
    duration: Optional[int] = 5
    featureKey: Optional[str] = None


@app.post("/api/ai/generate-text")
async def api_ai_generate_text(req: GenerateTextRequest, user: AuthedUser = Depends(get_current_user)):
    ok, cost = await _node_check_credits(user.id, "text")
    if not ok:
        raise HTTPException(status_code=402, detail="Insufficient credits for text generation")
    fal_key = get_fal_api_key_for_tenant(user.tenantId)
    if not fal_key:
        raise HTTPException(status_code=503, detail="FAL API key not configured for tenant")
    # fal text model: resolved from admin mappings (featureKey) or default
    feature_key = req.featureKey or "text_script"
    model_id = get_model_for_feature(feature_key, "fal-ai/llama-3.2-3b-instruct")
    payload = {"prompt": req.user}
    if req.system:
        payload["system_prompt"] = req.system
    async with httpx.AsyncClient() as c:
        r = await c.post(
            f"{FAL_RUN_BASE}/{model_id}",
            json=payload,
            headers={"Authorization": f"Key {fal_key}"},
            timeout=60.0,
        )
    if r.status_code != 200:
        raise HTTPException(status_code=502, detail="FAL text generation failed")
    data = r.json()
    success = await _node_deduct_usage(user.id, "text", cost)
    if not success:
        raise HTTPException(status_code=500, detail="Credits deduction failed")
    return {"text": data.get("response", data.get("output", data.get("text", "")))}


@app.post("/api/ai/generate-image")
async def api_ai_generate_image(req: GenerateImageRequest, user: AuthedUser = Depends(get_current_user)):
    ok, cost = await _node_check_credits(user.id, "image")
    if not ok:
        raise HTTPException(status_code=402, detail="Insufficient credits for image generation")
    fal_key = get_fal_api_key_for_tenant(user.tenantId)
    if not fal_key:
        raise HTTPException(status_code=503, detail="FAL API key not configured for tenant")
    feature_key = req.featureKey or "image_storyboard"
    model_id = get_model_for_feature(feature_key, "fal-ai/fast-sdxl")
    payload = {
        "prompt": req.prompt,
        "image_size": req.image_size,
        "num_inference_steps": req.num_inference_steps,
        "num_images": req.num_images,
    }
    async with httpx.AsyncClient() as c:
        r = await c.post(
            f"{FAL_RUN_BASE}/{model_id}",
            json=payload,
            headers={"Authorization": f"Key {fal_key}"},
            timeout=120.0,
        )
    if r.status_code != 200:
        raise HTTPException(status_code=502, detail="FAL image generation failed")
    data = r.json()
    success = await _node_deduct_usage(user.id, "image", cost)
    if not success:
        raise HTTPException(status_code=500, detail="Credits deduction failed")
    images = data.get("images", [])
    if isinstance(images, list) and images and isinstance(images[0], dict):
        return {"images": [img.get("url") for img in images if img.get("url")]}
    if isinstance(images, list):
        return {"images": images}
    return {"images": [data.get("image", {}).get("url")] if data.get("image") else []}


@app.post("/api/ai/generate-video")
async def api_ai_generate_video(req: GenerateVideoRequest, user: AuthedUser = Depends(get_current_user)):
    ok, cost = await _node_check_credits(user.id, "video")
    if not ok:
        raise HTTPException(status_code=402, detail="Insufficient credits for video generation")
    fal_key = get_fal_api_key_for_tenant(user.tenantId)
    if not fal_key:
        raise HTTPException(status_code=503, detail="FAL API key not configured for tenant")
    payload = {}
    if req.prompt:
        payload["prompt"] = req.prompt
    if req.image_url:
        payload["image_url"] = req.image_url
    if req.duration is not None:
        payload["duration"] = req.duration
    feature_key = req.featureKey or "video_transition"
    model_id = get_model_for_feature(feature_key, "fal-ai/minimax-video-01")
    if not payload:
        payload["prompt"] = "A calm scene"
    async with httpx.AsyncClient() as c:
        r = await c.post(
            f"{FAL_RUN_BASE}/{model_id}",
            json=payload,
            headers={"Authorization": f"Key {fal_key}"},
            timeout=300.0,
        )
    if r.status_code != 200:
        raise HTTPException(status_code=502, detail="FAL video generation failed")
    data = r.json()
    success = await _node_deduct_usage(user.id, "video", cost)
    if not success:
        raise HTTPException(status_code=500, detail="Credits deduction failed")
    video_url = data.get("video", {}).get("url") if isinstance(data.get("video"), dict) else data.get("video_url")
    return {"video_url": video_url, "data": data}


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
async def upload_media(req: MediaUploadRequest, user: AuthedUser = Depends(get_current_user)):
    ext = "mp4" if req.type == "video" else "jpg"
    url = save_base64_file(req.data, ext)
    doc = {
        "id": req.id or uuid.uuid4().hex,
        "tenant_id": user.tenantId,
        "url": url,
        "type": req.type,
        "source": req.source,
        "title": req.title,
        "description": req.description,
        "aspectRatio": req.aspectRatio,
        "createdAt": now_iso(),
    }
    db.media.update_one(
        {"id": doc["id"], "tenant_id": user.tenantId}, {"$set": doc}, upsert=True
    )
    return {"id": doc["id"], "url": url}


@app.get("/api/media/list")
async def list_media(
    type: Optional[str] = None,
    source: Optional[str] = None,
    user: AuthedUser = Depends(get_current_user),
):
    query: Dict[str, Any] = {"tenant_id": user.tenantId}
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
async def save_character(req: CharacterSaveRequest, user: AuthedUser = Depends(get_current_user)):
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
        "tenant_id": user.tenantId,
        "name": req.name,
        "description": req.description,
        "visualTraits": req.visualTraits,
        "images": image_urls,
        "createdAt": now_iso(),
    }

    db.characters.update_one(
        {"id": char_id, "tenant_id": user.tenantId}, {"$set": doc}, upsert=True
    )
    return doc


@app.get("/api/characters/list")
async def list_characters(user: AuthedUser = Depends(get_current_user)):
    chars = list(
        db.characters.find({"tenant_id": user.tenantId}, {"_id": 0}).sort(
            "createdAt", -1
        )
    )
    return chars


@app.delete("/api/characters/{char_id}")
async def delete_character(char_id: str, user: AuthedUser = Depends(get_current_user)):
    db.characters.delete_one({"id": char_id, "tenant_id": user.tenantId})
    return {"ok": True}


@app.get("/api/characters/{char_id}")
async def get_character(char_id: str, user: AuthedUser = Depends(get_current_user)):
    char = db.characters.find_one(
        {"id": char_id, "tenant_id": user.tenantId}, {"_id": 0}
    )
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
async def save_storyboard(
    req: StoryboardSaveRequest, user: AuthedUser = Depends(get_current_user)
):
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
        "tenant_id": user.tenantId,
        "title": req.title,
        "script": req.script,
        "style": req.style,
        "aspectRatio": req.aspectRatio,
        "scenes": saved_scenes,
        "createdAt": now_iso(),
    }
    if req.videoTasks is not None:
        doc["videoTasks"] = req.videoTasks

    db.storyboards.update_one(
        {"id": sb_id, "tenant_id": user.tenantId}, {"$set": doc}, upsert=True
    )
    return doc


@app.get("/api/storyboards/list")
async def list_storyboards(user: AuthedUser = Depends(get_current_user)):
    items = list(
        db.storyboards.find({"tenant_id": user.tenantId}, {"_id": 0}).sort(
            "createdAt", -1
        )
    )
    return items


@app.get("/api/storyboards/{sb_id}")
async def get_storyboard(
    sb_id: str, user: AuthedUser = Depends(get_current_user)
):
    sb = db.storyboards.find_one(
        {"id": sb_id, "tenant_id": user.tenantId}, {"_id": 0}
    )
    if not sb:
        raise HTTPException(status_code=404, detail="Storyboard not found")
    return sb


@app.delete("/api/storyboards/{sb_id}")
async def delete_storyboard(
    sb_id: str, user: AuthedUser = Depends(get_current_user)
):
    db.storyboards.delete_one({"id": sb_id, "tenant_id": user.tenantId})
    return {"ok": True}


@app.delete("/api/media/{media_id}")
async def delete_media(media_id: str, user: AuthedUser = Depends(get_current_user)):
    db.media.delete_one({"id": media_id, "tenant_id": user.tenantId})
    return {"ok": True}



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



# ============ SETTINGS (fal-only; no provider/keys) ============

@app.get("/api/settings")
async def get_settings():
    """Return minimal settings; AI is fal-only from backend."""
    return {"provider": "fal"}


# ============ TENANT & FAL.AI ADMIN ============


class TenantAISettings(BaseModel):
    fal_api_key: Optional[str] = None


@app.get("/api/tenant/ai-settings")
async def get_tenant_ai_settings(user: AuthedUser = Depends(get_current_user)):
    doc = db.tenant_settings.find_one(
        {"tenant_id": user.tenantId}, {"_id": 0, "fal_api_key": 1, "updatedAt": 1}
    )
    return {
        "tenant_id": user.tenantId,
        "has_fal_key": bool(doc and doc.get("fal_api_key")),
        "updatedAt": doc.get("updatedAt"),
    }


@app.put("/api/tenant/ai-settings")
async def update_tenant_ai_settings(
    req: TenantAISettings, user: AuthedUser = Depends(get_current_user)
):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    update: Dict[str, Any] = {
        "tenant_id": user.tenantId,
        "updatedAt": now_iso(),
    }
    if req.fal_api_key is not None:
        update["fal_api_key"] = req.fal_api_key

    db.tenant_settings.update_one(
        {"tenant_id": user.tenantId},
        {"$set": update},
        upsert=True,
    )
    return {"ok": True}


@app.get("/api/admin/tenants")
async def list_tenants(user: AuthedUser = Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    items = list(
        db.tenant_settings.find({}, {"_id": 0, "tenant_id": 1, "updatedAt": 1})
    )
    if not items:
        items = [{"tenant_id": user.tenantId, "updatedAt": None}]
    return items


