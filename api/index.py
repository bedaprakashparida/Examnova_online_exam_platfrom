import sys
import os

# Add backend directory to path so FastAPI imports work correctly
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
backend_dir = os.path.join(base_dir, "backend")
sys.path.insert(0, backend_dir)

from app.main import app
