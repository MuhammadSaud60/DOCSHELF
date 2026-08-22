import sys
import os

sys.path.insert(0, os.path.abspath("."))
sys.path.insert(0, os.path.abspath("App"))

import uvicorn

try:
    # Try importing from App.main or main
    try:
        from App.main import app
    except ImportError:
        from App.main import app
except Exception as e:
    print(f"🔥 Critical import failure in app.py: {e}")
    raise e

if __name__ == "__main__":
    # Hugging Face requires host 0.0.0.0 and port 7860
    uvicorn.run(app, host="0.0.0.0", port=7860)