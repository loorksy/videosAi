import time
from typing import List, Optional, Dict

import httpx
from pydantic import BaseModel

FAL_MODELS_CACHE_TTL = 600  # seconds


class FalModel(BaseModel):
    id: str
    kind: str  # "text" | "image" | "video"
    description: Optional[str] = None


_models_cache: Dict[str, object] = {
    "items": [],
    "fetched_at": 0.0,
}


def _classify_kind(endpoint_id: str) -> str:
    """Best-effort classification of model kind from its endpoint id."""
    lid = endpoint_id.lower()
    if "video" in lid or "animation" in lid or "minimax" in lid:
        return "video"
    if "image" in lid or "sdxl" in lid or "flux" in lid or "sd3" in lid:
        return "image"
    # Default to text for other endpoints
    return "text"


async def _fetch_fal_models_from_api(api_key: Optional[str] = None) -> List[FalModel]:
    """Call fal Platform API to list available models."""
    headers: Dict[str, str] = {}
    if api_key:
        headers["Authorization"] = f"Key {api_key}"

    async with httpx.AsyncClient(timeout=20.0) as client:
        # See https://docs.fal.ai/platform-apis/v1/models
        resp = await client.get("https://fal.run/models", headers=headers)
        resp.raise_for_status()
        data = resp.json()

    # API may return a plain list or an object with 'data'
    raw_items = data.get("data") if isinstance(data, dict) else data
    if not isinstance(raw_items, list):
        raw_items = []

    models: List[FalModel] = []
    for item in raw_items:
        endpoint_id = item.get("endpoint_id") or item.get("id")
        if not endpoint_id:
            continue
        description = (
            item.get("description")
            or item.get("summary")
            or item.get("title")
        )
        kind = _classify_kind(endpoint_id)
        models.append(FalModel(id=endpoint_id, kind=kind, description=description))

    return models


async def list_fal_models(
    *,
    kind: Optional[str] = None,
    force_refresh: bool = False,
    api_key: Optional[str] = None,
) -> List[FalModel]:
    """
    Return cached list of FalModel, optionally filtered by kind.

    - kind: 'text' | 'image' | 'video' | None
    - force_refresh: when True, always hit fal API.
    """
    now = time.time()
    if not force_refresh and _models_cache["items"] and now - _models_cache["fetched_at"] < FAL_MODELS_CACHE_TTL:
        items: List[FalModel] = _models_cache["items"]  # type: ignore[assignment]
    else:
        items = await _fetch_fal_models_from_api(api_key)
        _models_cache["items"] = items
        _models_cache["fetched_at"] = now

    if kind:
        k = kind.lower()
        return [m for m in items if m.kind == k]
    return items

