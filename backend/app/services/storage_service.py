import os
import logging
from typing import Tuple
from app.services.supabase_client import get_supabase, is_mock_supabase

logger = logging.getLogger("storage-service")

class StorageService:
    def __init__(self):
        self.supabase = get_supabase()
        # Local uploads dir for mock mode fallback/local archiving
        self.local_upload_dir = "uploads"
        if not os.path.exists(self.local_upload_dir):
            os.makedirs(self.local_upload_dir)

    async def upload_resume(self, file_name: str, file_bytes: bytes) -> str:
        """Upload resume to Supabase Storage bucket or local fallback directory.
        
        Returns:
            str: Publicly accessible URL or mock local URL.
        """
        # Ensure unique file name to avoid overwrite issues
        import uuid
        unique_name = f"{uuid.uuid4()}_{file_name}"
        
        # Save to local file system anyway for local validation
        local_path = os.path.join(self.local_upload_dir, unique_name)
        try:
            with open(local_path, "wb") as f:
                f.write(file_bytes)
            logger.info("Saved copy of file locally to %s", local_path)
        except Exception as e:
            logger.warning("Failed to save local copy of file: %s", str(e))
            
        if is_mock_supabase:
            logger.info("[STORAGE] Mock uploading %s", file_name)
            # Use mock storage client
            bucket = self.supabase.storage.from_("resumes")
            bucket.upload(unique_name, file_bytes)
            return bucket.get_public_url(unique_name)
            
        try:
            # Upload to real Supabase Storage bucket 'resumes'
            bucket = self.supabase.storage.from_("resumes")
            # Supabase upload expects path, file bytes
            bucket.upload(unique_name, file_bytes, {"content-type": "application/pdf"})
            public_url = bucket.get_public_url(unique_name)
            logger.info("Successfully uploaded %s to Supabase. URL: %s", file_name, public_url)
            return public_url
        except Exception as e:
            logger.error("Failed to upload to Supabase storage: %s. Falling back to local mock URL.", str(e), exc_info=True)
            # Fallback to serving as a local mock URL
            return f"http://localhost:8000/static/{unique_name}"

storage_service = StorageService()
