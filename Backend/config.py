# backend/config.py

from dotenv import load_dotenv
import os

load_dotenv()


class Settings:
    GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "").strip()
    SAFE_BROWSING_API_KEY = os.getenv("SAFE_BROWSING_API_KEY", "")
    PORT = int(os.getenv("PORT", 8000))
    SCREENSHOT_INTERVAL = 30  # 30 seconds = 2 per minute
    DEBUG_MODE = True
    AUTO_START_MONITORING = False  # Don't auto-start on server startup


settings = Settings()

if not settings.GOOGLE_API_KEY:
    print("❌ WARNING: GOOGLE_API_KEY not found in .env file!")
