# Backend API Tests for Arabic Story & Video Creation App
# Tests: Health, Characters CRUD, Storyboards CRUD, Kie.ai integration

import pytest
import requests
import os
import uuid

# Use preview URL for external testing
BASE_URL = os.environ.get('preview_endpoint', 'http://localhost:8001')

class TestHealth:
    """Health endpoint tests"""
    
    def test_health_check(self):
        """GET /api/health should return {status: ok}"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        print(f"✓ Health check passed: {data}")


class TestCharacters:
    """Character CRUD endpoint tests"""
    
    @pytest.fixture
    def test_character_id(self):
        """Create a test character and return its ID for cleanup"""
        char_id = f"TEST_{uuid.uuid4().hex[:8]}"
        return char_id
    
    def test_create_character(self, test_character_id):
        """POST /api/characters/save should create a character and return it"""
        char_id = test_character_id
        payload = {
            "id": char_id,
            "name": "TEST_Character",
            "description": "A test character for automated testing",
            "visualTraits": "Brown hair, blue eyes",
            "images": {}
        }
        response = requests.post(f"{BASE_URL}/api/characters/save", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        # Verify response data
        assert data.get("id") == char_id
        assert data.get("name") == "TEST_Character"
        assert data.get("description") == "A test character for automated testing"
        assert "createdAt" in data
        print(f"✓ Character created: {data.get('id')}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/characters/{char_id}")
    
    def test_list_characters(self):
        """GET /api/characters/list should return array of characters"""
        response = requests.get(f"{BASE_URL}/api/characters/list")
        assert response.status_code == 200
        data = response.json()
        
        # Should be a list
        assert isinstance(data, list)
        print(f"✓ Characters list returned {len(data)} characters")
    
    def test_get_character(self):
        """GET /api/characters/{id} should return a character"""
        # First create a character
        char_id = f"TEST_{uuid.uuid4().hex[:8]}"
        payload = {
            "id": char_id,
            "name": "TEST_GetCharacter",
            "description": "Test get character",
            "visualTraits": "",
            "images": {}
        }
        create_resp = requests.post(f"{BASE_URL}/api/characters/save", json=payload)
        assert create_resp.status_code == 200
        
        # Then get it
        response = requests.get(f"{BASE_URL}/api/characters/{char_id}")
        assert response.status_code == 200
        data = response.json()
        assert data.get("id") == char_id
        assert data.get("name") == "TEST_GetCharacter"
        print(f"✓ Character retrieved: {data.get('id')}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/characters/{char_id}")
    
    def test_delete_character(self):
        """DELETE /api/characters/{id} should delete a character"""
        # First create a character
        char_id = f"TEST_{uuid.uuid4().hex[:8]}"
        payload = {
            "id": char_id,
            "name": "TEST_DeleteCharacter",
            "description": "Test delete",
            "visualTraits": "",
            "images": {}
        }
        create_resp = requests.post(f"{BASE_URL}/api/characters/save", json=payload)
        assert create_resp.status_code == 200
        
        # Delete it
        response = requests.delete(f"{BASE_URL}/api/characters/{char_id}")
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") == True
        print(f"✓ Character deleted: {char_id}")
        
        # Verify it's gone
        get_resp = requests.get(f"{BASE_URL}/api/characters/{char_id}")
        assert get_resp.status_code == 404


class TestStoryboards:
    """Storyboard CRUD endpoint tests"""
    
    def test_create_storyboard(self):
        """POST /api/storyboards/save should create a storyboard and return it"""
        sb_id = f"TEST_{uuid.uuid4().hex[:8]}"
        payload = {
            "id": sb_id,
            "title": "TEST_Storyboard",
            "script": "A test script for automated testing",
            "style": "Cinematic",
            "aspectRatio": "16:9",
            "scenes": [
                {
                    "description": "Scene 1 description",
                    "characterIds": [],
                    "dialogue": "Hello world",
                    "frameImage": "",
                    "videoUrl": ""
                }
            ]
        }
        response = requests.post(f"{BASE_URL}/api/storyboards/save", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        # Verify response data
        assert data.get("id") == sb_id
        assert data.get("title") == "TEST_Storyboard"
        assert data.get("script") == "A test script for automated testing"
        assert "scenes" in data
        assert len(data.get("scenes", [])) == 1
        assert "createdAt" in data
        print(f"✓ Storyboard created: {data.get('id')}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/storyboards/{sb_id}")
    
    def test_list_storyboards(self):
        """GET /api/storyboards/list should return array of storyboards"""
        response = requests.get(f"{BASE_URL}/api/storyboards/list")
        assert response.status_code == 200
        data = response.json()
        
        # Should be a list
        assert isinstance(data, list)
        print(f"✓ Storyboards list returned {len(data)} storyboards")
    
    def test_get_storyboard(self):
        """GET /api/storyboards/{id} should return a storyboard"""
        # First create a storyboard
        sb_id = f"TEST_{uuid.uuid4().hex[:8]}"
        payload = {
            "id": sb_id,
            "title": "TEST_GetStoryboard",
            "script": "Test script",
            "style": "Anime",
            "aspectRatio": "9:16",
            "scenes": []
        }
        create_resp = requests.post(f"{BASE_URL}/api/storyboards/save", json=payload)
        assert create_resp.status_code == 200
        
        # Then get it
        response = requests.get(f"{BASE_URL}/api/storyboards/{sb_id}")
        assert response.status_code == 200
        data = response.json()
        assert data.get("id") == sb_id
        assert data.get("title") == "TEST_GetStoryboard"
        print(f"✓ Storyboard retrieved: {data.get('id')}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/storyboards/{sb_id}")
    
    def test_delete_storyboard(self):
        """DELETE /api/storyboards/{id} should delete a storyboard"""
        # First create a storyboard
        sb_id = f"TEST_{uuid.uuid4().hex[:8]}"
        payload = {
            "id": sb_id,
            "title": "TEST_DeleteStoryboard",
            "script": "To be deleted",
            "style": "",
            "aspectRatio": "16:9",
            "scenes": []
        }
        create_resp = requests.post(f"{BASE_URL}/api/storyboards/save", json=payload)
        assert create_resp.status_code == 200
        
        # Delete it
        response = requests.delete(f"{BASE_URL}/api/storyboards/{sb_id}")
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") == True
        print(f"✓ Storyboard deleted: {sb_id}")
        
        # Verify it's gone
        get_resp = requests.get(f"{BASE_URL}/api/storyboards/{sb_id}")
        assert get_resp.status_code == 404


class TestKieIntegration:
    """Kie.ai integration endpoint tests"""
    
    # Small 1x1 red pixel PNG in base64
    TEST_IMAGE_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="
    
    def test_upload_image_to_kie(self):
        """POST /api/kie/upload-image should upload base64 image to kie.ai CDN"""
        payload = {
            "image_base64": self.TEST_IMAGE_BASE64
        }
        response = requests.post(f"{BASE_URL}/api/kie/upload-image", json=payload)
        
        # Should return 200 with URL
        assert response.status_code == 200
        data = response.json()
        assert "url" in data
        url = data.get("url", "")
        # URL should be from kie.ai CDN (tempfile.redpandaai.co)
        assert "redpandaai" in url.lower() or "tempfile" in url.lower()
        print(f"✓ Image uploaded to kie.ai CDN: {url[:60]}...")
    
    def test_image_to_video(self):
        """POST /api/kie/image-to-video should accept base64 image + prompt and return taskId"""
        payload = {
            "image_base64": self.TEST_IMAGE_BASE64,
            "prompt": "A simple test animation",
            "model": "veo3_fast",
            "aspect_ratio": "16:9"
        }
        response = requests.post(f"{BASE_URL}/api/kie/image-to-video", json=payload)
        
        # Should return 200 with taskId
        assert response.status_code == 200
        data = response.json()
        assert "taskId" in data
        assert "imageUrl" in data
        task_id = data.get("taskId")
        print(f"✓ Video generation started with taskId: {task_id}")
        return task_id
    
    def test_task_status(self):
        """GET /api/kie/task-status/{taskId} should return normalized status format"""
        # First start a video generation
        payload = {
            "image_base64": self.TEST_IMAGE_BASE64,
            "prompt": "Test status check",
            "model": "veo3_fast",
            "aspect_ratio": "16:9"
        }
        gen_response = requests.post(f"{BASE_URL}/api/kie/image-to-video", json=payload)
        
        if gen_response.status_code != 200:
            pytest.skip("Could not start video generation to test status")
        
        task_id = gen_response.json().get("taskId")
        
        # Now check status
        response = requests.get(f"{BASE_URL}/api/kie/task-status/{task_id}")
        assert response.status_code == 200
        data = response.json()
        
        # Verify normalized response format
        assert "status" in data
        assert data.get("status") in ["pending", "processing", "completed", "failed"]
        assert "videoUrl" in data
        assert "successFlag" in data
        print(f"✓ Task status returned: status={data.get('status')}, successFlag={data.get('successFlag')}")


class TestMediaUpload:
    """Media upload endpoint tests"""
    
    TEST_IMAGE_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="
    
    def test_upload_media(self):
        """POST /api/media/upload should upload media and return URL"""
        payload = {
            "data": self.TEST_IMAGE_BASE64,
            "type": "image",
            "source": "test"
        }
        response = requests.post(f"{BASE_URL}/api/media/upload", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert "url" in data
        print(f"✓ Media uploaded: {data.get('id')}")
    
    def test_list_media(self):
        """GET /api/media/list should return array of media items"""
        response = requests.get(f"{BASE_URL}/api/media/list")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"✓ Media list returned {len(data)} items")


class TestSettings:
    """Settings endpoint tests - provider selection, API keys, models"""
    
    def test_get_settings_returns_defaults(self):
        """GET /api/settings should return default settings"""
        response = requests.get(f"{BASE_URL}/api/settings")
        assert response.status_code == 200
        data = response.json()
        
        # Should have required fields
        assert "provider" in data
        assert "text_model" in data
        assert "image_model" in data
        assert "video_model" in data
        assert "has_kie_key" in data
        print(f"✓ Settings returned: provider={data.get('provider')}, has_kie_key={data.get('has_kie_key')}")
    
    def test_save_settings_with_kie_provider(self):
        """POST /api/settings should save provider settings"""
        # Save kie.ai as provider
        payload = {
            "kie_api_key": "test_api_key_123",
            "provider": "kie",
            "text_model": "deepseek-chat",
            "image_model": "gpt-image-1",
            "video_model": "veo3_fast"
        }
        response = requests.post(f"{BASE_URL}/api/settings", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") == True
        print(f"✓ Settings saved with kie provider")
        
        # Verify saved settings via GET
        get_response = requests.get(f"{BASE_URL}/api/settings")
        assert get_response.status_code == 200
        saved = get_response.json()
        assert saved.get("provider") == "kie"
        assert saved.get("text_model") == "deepseek-chat"
        assert saved.get("image_model") == "gpt-image-1"
        assert saved.get("video_model") == "veo3_fast"
        assert saved.get("has_kie_key") == True
        print(f"✓ Settings verified: provider={saved.get('provider')}, text_model={saved.get('text_model')}")
    
    def test_save_settings_with_gemini_provider(self):
        """POST /api/settings should save Gemini provider settings"""
        payload = {
            "provider": "gemini",
            "text_model": "gemini-2.5-flash",
            "image_model": "gemini-3-pro-image-preview",
            "video_model": "veo3_fast"
        }
        response = requests.post(f"{BASE_URL}/api/settings", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") == True
        
        # Verify settings
        get_response = requests.get(f"{BASE_URL}/api/settings")
        saved = get_response.json()
        assert saved.get("provider") == "gemini"
        assert saved.get("text_model") == "gemini-2.5-flash"
        print(f"✓ Settings verified for Gemini provider")


class TestKieTextAndImage:
    """Kie.ai Text and Image generation endpoint tests (new endpoints)"""
    
    def test_kie_generate_text_endpoint_exists(self):
        """POST /api/kie/generate-text endpoint should exist and accept requests"""
        payload = {
            "prompt": "Test prompt",
            "model": "deepseek-chat"
        }
        response = requests.post(f"{BASE_URL}/api/kie/generate-text", json=payload)
        # Endpoint exists - may fail due to auth but should not be 404
        assert response.status_code != 404
        print(f"✓ /api/kie/generate-text endpoint exists, status: {response.status_code}")
    
    def test_kie_generate_image_endpoint_exists(self):
        """POST /api/kie/generate-image endpoint should exist and accept requests"""
        payload = {
            "prompt": "Test image prompt",
            "model": "gpt-image-1",
            "size": "1:1"
        }
        response = requests.post(f"{BASE_URL}/api/kie/generate-image", json=payload)
        # Endpoint exists - may fail due to auth but should not be 404
        assert response.status_code != 404
        print(f"✓ /api/kie/generate-image endpoint exists, status: {response.status_code}")
    
    def test_kie_image_status_endpoint_exists(self):
        """GET /api/kie/image-status/{task_id} endpoint should exist"""
        response = requests.get(f"{BASE_URL}/api/kie/image-status/fake-task-id")
        # Endpoint exists - returns status info for any task_id
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "imageUrl" in data
        print(f"✓ /api/kie/image-status endpoint exists, status: {data.get('status')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
