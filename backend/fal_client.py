import os
from typing import Optional

from fastapi import HTTPException
from pymongo import MongoClient


MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "storyweaver")
FALLBACK_FAL_KEY = os.environ.get("FAL_API_KEY", "")

client = MongoClient(MONGO_URL)
db = client[DB_NAME]


def get_fal_api_key_for_tenant(tenant_id: str) -> str:
    """
    Return the fal.ai API key for a given tenant.
    Priority:
      1) tenant_settings collection (per-tenant config)
      2) global FAL_API_KEY from environment as a fallback
    """
    settings: Optional[dict] = db.tenant_settings.find_one(
        {"tenant_id": tenant_id}, {"_id": 0, "fal_api_key": 1}
    )
    if settings and settings.get("fal_api_key"):
        return settings["fal_api_key"]

    if FALLBACK_FAL_KEY:
        return FALLBACK_FAL_KEY

    raise HTTPException(
        status_code=500,
        detail="fal.ai API key is not configured for this tenant",
    )

