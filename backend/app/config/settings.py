import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    # App Settings
    APP_NAME: str = "interview.ai"
    ENV: str = "development"
    DEBUG: bool = True
    
    # API Configurations
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Security / Auth
    JWT_SECRET: str = Field(default="change_me_to_a_secure_random_string")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    
    # Supabase (Auth and Storage)
    SUPABASE_URL: str = Field(default="https://xxxx.supabase.co")
    SUPABASE_KEY: str = Field(default="fake_key")
    
    # Database
    DATABASE_URL: str = Field(default="postgresql+asyncpg://postgres:postgres@localhost:5432/postgres")
    
    # AI Layer
    GEMINI_API_KEY: str = Field(default="fake_key")

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
