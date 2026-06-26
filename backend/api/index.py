import sys
import os

# Add backend directory to path so FastAPI imports work correctly
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

from app.main import app
