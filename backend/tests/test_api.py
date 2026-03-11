"""Fal-only backend smoke tests.

These tests intentionally avoid deprecated KIE/Gemini flows and focus on
the currently supported API behavior.
"""

import os
import requests

BASE_URL = os.environ.get("preview_endpoint", "http://localhost:8000")


def test_health_check():
    """GET /api/health should return {status: ok}."""
    response = requests.get(f"{BASE_URL}/api/health", timeout=10)
    assert response.status_code == 200
    assert response.json().get("status") == "ok"


def test_settings_provider_is_fal():
    """GET /api/settings should always expose fal provider."""
    response = requests.get(f"{BASE_URL}/api/settings", timeout=10)
    assert response.status_code == 200
    assert response.json().get("provider") == "fal"


def test_removed_kie_routes_return_404():
    """Legacy /api/kie/* routes should not exist anymore."""
    response = requests.post(f"{BASE_URL}/api/kie/generate-text", json={"prompt": "test"}, timeout=10)
    assert response.status_code == 404


def test_ai_generate_text_requires_auth():
    """Fal generation route should exist and require auth header."""
    response = requests.post(f"{BASE_URL}/api/ai/generate-text", json={"user": "hello"}, timeout=10)
    # Missing Authorization header may yield 401 or 422 depending parser path.
    assert response.status_code in (401, 422)
