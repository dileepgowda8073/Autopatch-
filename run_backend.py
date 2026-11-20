import sys
from pathlib import Path

# Guarantee root directory is on Python path
ROOT_DIR = Path(__file__).resolve().parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

# Check for required dependencies
MISSING = []
for pkg in ["fastapi", "uvicorn", "sqlalchemy", "aiosqlite", "pydantic", "pydantic_settings"]:
    try:
        __import__(pkg)
    except ImportError:
        MISSING.append(pkg)

if MISSING:
    print("\n" + "=" * 60)
    print("AutoPatch Backend: Missing dependencies detected:")
    print(f"  {', '.join(MISSING)}")
    print("\nPlease install the backend dependencies with:")
    print("  python -m pip install -r backend/requirements.txt")
    print("=" * 60 + "\n")
    sys.exit(1)

import os
import uvicorn

if __name__ == "__main__":
    env_file = ROOT_DIR / ".env"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

    key = os.getenv("GEMINI_API_KEY", "").strip().strip('"').strip("'")
    print("\n" + "=" * 60)
    print(f"AutoPatch Backend Server: {ROOT_DIR}")
    if key:
        masked = key[:6] + "..." + key[-4:] if len(key) > 10 else "***"
        print(f"✨ Gemini API Key: ACTIVE ({masked})")
    else:
        print("⚠ Gemini API Key: NOT CONFIGURED (Running deterministic fallback mode)")
        print("  To enable Gemini, set GEMINI_API_KEY in .env or run:")
        print('  $env:GEMINI_API_KEY="AIzaSy..."')
    print("=" * 60 + "\n")

    uvicorn.run(
        "backend.api.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )

