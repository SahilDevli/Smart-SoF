import os
from dotenv import load_dotenv

load_dotenv() # Load environment variables from .env file (optional now, but good habit)

class Settings:
    # For local file storage
    UPLOAD_DIR: str = "uploaded_files"

settings = Settings()

# Create the upload directory if it doesn't exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)