from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "SIH26264 Institution Conflict Radar"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    SECRET_KEY: str = "sih26264-institution-conflict-radar-master-secret-key-development-mode"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours for hackathon session
    
    DATABASE_URL: str = "sqlite:///./radar.db"
    ORGANIZATION_TIMEZONE: str = "Asia/Kolkata"
    ENVIRONMENT: str = "development"
    
    # Conflict Radar Tuning Weights
    RADAR_WEIGHT_EXACT_ID: int = 45
    RADAR_WEIGHT_NAME_ADDR: int = 15
    RADAR_WEIGHT_CATEGORY: int = 15
    RADAR_WEIGHT_DESCRIPTION: int = 15
    RADAR_WEIGHT_CROSS_BUREAU: int = 10
    RADAR_CANDIDATE_THRESHOLD: int = 40
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

settings = Settings()
