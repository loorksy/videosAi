"""
Test suite for kie.ai integration endpoints in StoryWeaver app
Tests: test-connection, kling-motion, kling-status, upload-file, generate-text, settings
"""
import pytest
import requests
import os
import tempfile

# Use localhost for direct backend testing
BASE_URL = "http://localhost:8001"


class TestKieTestConnection:
    """Tests for /api/kie/test-connection endpoint"""

    def test_test_connection_returns_credits(self):
        """Test connection should return credits balance"""
        response = requests.post(f"{BASE_URL}/api/kie/test-connection")
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True
        assert "credits" in data.get("message", "").lower() or "الرصيد" in data.get("message", "")
        print(f"✓ Test connection success: {data['message']}")


class TestKlingMotion:
    """Tests for /api/kie/kling-motion endpoint"""

    def test_kling_motion_endpoint_exists(self):
        """Verify kling-motion endpoint accepts requests"""
        payload = {
            "prompt": "Test motion animation",
            "image_url": "https://example.com/test-image.png",
            "video_url": "https://example.com/test-video.mp4",
            "mode": "720p",
            "character_orientation": "video"
        }
        response = requests.post(
            f"{BASE_URL}/api/kie/kling-motion",
            json=payload
        )
        # Should return 200 with taskId (real kie.ai call)
        assert response.status_code == 200
        data = response.json()
        assert "taskId" in data
        assert len(data["taskId"]) > 0
        print(f"✓ Kling motion task created: {data['taskId']}")

    def test_kling_motion_with_1080p_mode(self):
        """Test kling-motion with pro (1080p) mode"""
        payload = {
            "prompt": "Professional quality test",
            "image_url": "https://example.com/image.png",
            "video_url": "https://example.com/video.mp4",
            "mode": "1080p",
            "character_orientation": "image"
        }
        response = requests.post(
            f"{BASE_URL}/api/kie/kling-motion",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        assert "taskId" in data
        print(f"✓ Kling motion (1080p) task created: {data['taskId']}")


class TestKlingStatus:
    """Tests for /api/kie/kling-status/{task_id} endpoint"""

    def test_kling_status_endpoint_exists(self):
        """Verify kling-status endpoint returns proper response"""
        response = requests.get(f"{BASE_URL}/api/kie/kling-status/test-task-id-123")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "videoUrl" in data
        assert data["status"] in ["processing", "completed", "failed"]
        print(f"✓ Kling status endpoint works: status={data['status']}")


class TestKieUploadFile:
    """Tests for /api/kie/upload-file endpoint"""

    def test_upload_image_file(self):
        """Test uploading an image file to kie.ai CDN"""
        # Create a 1x1 PNG image
        import base64
        png_data = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==")
        
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
            f.write(png_data)
            temp_path = f.name

        try:
            with open(temp_path, "rb") as f:
                response = requests.post(
                    f"{BASE_URL}/api/kie/upload-file",
                    files={"file": ("test-image.png", f, "image/png")}
                )
            assert response.status_code == 200
            data = response.json()
            assert "url" in data
            assert data["url"].startswith("http")
            print(f"✓ Image uploaded successfully: {data['url']}")
        finally:
            os.unlink(temp_path)


class TestKieGenerateText:
    """Tests for /api/kie/generate-text endpoint"""

    def test_generate_text_with_gemini_flash(self):
        """Test text generation with gemini-2.5-flash model"""
        payload = {
            "prompt": "Say hello in one word",
            "model": "gemini-2.5-flash"
        }
        response = requests.post(
            f"{BASE_URL}/api/kie/generate-text",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        assert "text" in data
        assert len(data["text"]) > 0
        print(f"✓ Text generation works: '{data['text']}'")

    def test_generate_text_with_system_prompt(self):
        """Test text generation with system prompt"""
        payload = {
            "prompt": "What is 2+2?",
            "system_prompt": "You are a math tutor. Answer briefly.",
            "model": "gemini-2.5-flash"
        }
        response = requests.post(
            f"{BASE_URL}/api/kie/generate-text",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        assert "text" in data
        assert "4" in data["text"]
        print(f"✓ Text generation with system prompt works: '{data['text']}'")


class TestSettings:
    """Tests for settings endpoints"""

    def test_get_settings(self):
        """Test getting settings"""
        response = requests.get(f"{BASE_URL}/api/settings")
        assert response.status_code == 200
        data = response.json()
        assert "provider" in data
        assert "text_model" in data
        assert "image_model" in data
        assert "video_model" in data
        assert "has_kie_key" in data
        print(f"✓ Settings retrieved: provider={data['provider']}, has_kie_key={data['has_kie_key']}")

    def test_save_settings_with_kie_provider(self):
        """Test saving settings with kie provider"""
        payload = {
            "provider": "kie",
            "text_model": "gemini-2.5-flash",
            "image_model": "gpt-image-1",
            "video_model": "veo3_fast"
        }
        response = requests.post(
            f"{BASE_URL}/api/settings",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") is True
        
        # Verify settings were saved
        get_response = requests.get(f"{BASE_URL}/api/settings")
        saved = get_response.json()
        assert saved["provider"] == "kie"
        assert saved["text_model"] == "gemini-2.5-flash"
        assert saved["image_model"] == "gpt-image-1"
        print("✓ Settings saved and verified with kie provider")

    def test_save_settings_with_gemini_provider(self):
        """Test saving settings with gemini provider"""
        payload = {
            "provider": "gemini",
            "text_model": "gemini-2.5-flash",
            "image_model": "gemini-3-pro-image-preview",
            "video_model": "veo3_fast"
        }
        response = requests.post(
            f"{BASE_URL}/api/settings",
            json=payload
        )
        assert response.status_code == 200
        print("✓ Settings saved with gemini provider")


class TestHealthAndBasicEndpoints:
    """Basic health and API tests"""

    def test_health_endpoint(self):
        """Test health check"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        print("✓ Health check passed")

    def test_characters_list(self):
        """Test characters list endpoint"""
        response = requests.get(f"{BASE_URL}/api/characters/list")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Characters list works: {len(data)} characters")

    def test_storyboards_list(self):
        """Test storyboards list endpoint"""
        response = requests.get(f"{BASE_URL}/api/storyboards/list")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Storyboards list works: {len(data)} storyboards")

    def test_media_list(self):
        """Test media list endpoint"""
        response = requests.get(f"{BASE_URL}/api/media/list")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Media list works: {len(data)} items")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
