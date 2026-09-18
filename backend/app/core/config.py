import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
SESSIONS_DIR = DATA_DIR / "sessions"
ML_MODELS_DIR = BASE_DIR / "app" / "ml_models"

# Ensure data storage directories exist
DATA_DIR.mkdir(parents=True, exist_ok=True)
SESSIONS_DIR.mkdir(parents=True, exist_ok=True)
ML_MODELS_DIR.mkdir(parents=True, exist_ok=True)

# Mandatory Safety Guardrail Constant
RESEARCH_VALIDATION_REQUIRED: bool = True

class Settings(BaseSettings):
    model_config = SettingsConfigDict(case_sensitive=True)

    PROJECT_NAME: str = "JeevaSwara / KanthaRakshak Backend"
    TAGLINE: str = "Every Swallow Counts"
    TEAM: str = "Team SunForge"
    VERSION: str = "1.0.0-hackathon"
    
    # Environment & CORS
    API_V1_STR: str = "/api"
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "*"
    ]
    
    # Database
    DATABASE_URL: str = f"sqlite:///{DATA_DIR / 'jeevaswara.db'}"
    
    # BLE settings
    BLE_DEVICE_NAME_PREFIX: str = "KanthaRakshak"
    BLE_SERVICE_UUID: str = "0000ffe0-0000-1000-8000-00805f9b34fb"
    BLE_CHAR_UUID: str = "0000ffe1-0000-1000-8000-00805f9b34fb"
    
    # Reference thresholds path
    THRESHOLDS_YAML_PATH: str = str(Path(__file__).resolve().parent / "reference_thresholds.yaml")

settings = Settings()
