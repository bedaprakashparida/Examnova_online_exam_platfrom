import sys
import os

# Add the current directory to sys.path to ensure absolute imports within the app folder work on Vercel
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.main import app
