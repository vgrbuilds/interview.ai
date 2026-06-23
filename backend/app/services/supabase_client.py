import logging
import jwt
from typing import Dict, Any, Optional
from supabase import create_client, Client
from app.config.settings import settings

logger = logging.getLogger("supabase-client")

# Attempt to initialize Supabase Client
supabase_client: Optional[Client] = None
is_mock_supabase = False

# We check if keys are placeholders or empty
is_valid_url = settings.SUPABASE_URL and "xxxx" not in settings.SUPABASE_URL and "fake" not in settings.SUPABASE_URL
is_valid_key = settings.SUPABASE_KEY and "fake" not in settings.SUPABASE_KEY and "anon" not in settings.SUPABASE_KEY

if is_valid_url and is_valid_key:
    try:
        supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        logger.info("Supabase client initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {e}. Falling back to Mock Mode.")
        is_mock_supabase = True
else:
    logger.warning("Supabase URL or Key is missing or placeholder. Running in Mock Auth / Storage Mode.")
    is_mock_supabase = True


class MockSupabaseAuth:
    """Mock implementation of Supabase Auth for local development without keys."""
    
    def sign_up(self, credentials: Dict[str, Any]) -> Dict[str, Any]:
        email = credentials.get("email")
        # Generate a fake UUID for user
        import uuid
        user_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, email))
        logger.info(f"[MOCK AUTH] Signed up user: {email} with ID: {user_id}")
        
        # Create a mock token
        token = jwt.encode({"sub": user_id, "email": email, "exp": 9999999999}, settings.JWT_SECRET)
        
        return {
            "user": {
                "id": user_id,
                "email": email,
                "user_metadata": {"name": credentials.get("options", {}).get("data", {}).get("name", "Candidate")}
            },
            "session": {
                "access_token": token,
                "refresh_token": "mock_refresh_token"
            }
        }

    def sign_in_with_password(self, credentials: Dict[str, Any]) -> Dict[str, Any]:
        email = credentials.get("email")
        import uuid
        user_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, email))
        logger.info(f"[MOCK AUTH] Logged in user: {email} with ID: {user_id}")
        
        token = jwt.encode({"sub": user_id, "email": email, "exp": 9999999999}, settings.JWT_SECRET)
        
        return {
            "user": {
                "id": user_id,
                "email": email,
                "user_metadata": {"name": "Mock User"}
            },
            "session": {
                "access_token": token,
                "refresh_token": "mock_refresh_token"
            }
        }

    def get_user(self, token: str) -> Any:
        try:
            payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
            # Return an object that matches Supabase's User response
            class MockUser:
                def __init__(self, id, email, name):
                    self.id = id
                    self.email = email
                    self.user_metadata = {"name": name}
            
            class MockUserResponse:
                def __init__(self, user):
                    self.user = user
                    
            return MockUserResponse(MockUser(payload["sub"], payload["email"], "Mock User"))
        except Exception:
            raise Exception("Invalid session token")


class MockSupabaseStorage:
    """Mock implementation of Supabase Storage for local development."""
    def from_(self, bucket_name: str):
        class MockBucket:
            def upload(self, path: str, file: bytes, file_options: Optional[Dict] = None):
                logger.info(f"[MOCK STORAGE] Uploaded file to bucket '{bucket_name}' at path '{path}'. size={len(file)}")
                return {"path": path}
            
            def get_public_url(self, path: str) -> str:
                # Return a local file simulation url or placeholder
                return f"https://mock-supabase-storage.local/{bucket_name}/{path}"
        return MockBucket()


class MockSupabaseClient:
    """Mock Supabase Client wrapper."""
    def __init__(self):
        self.auth = MockSupabaseAuth()
        self.storage = MockSupabaseStorage()


# Get client helper
def get_supabase() -> Any:
    if is_mock_supabase or supabase_client is None:
        return MockSupabaseClient()
    return supabase_client
