"""Build entry point: python3 build.py → index.html

Never hand-edit index.html. Edit src/ (Python + assets) or data/ (question
JSON) and rebuild. Validate with: node --check on the emitted <script>.
"""
from src.page import build

if __name__ == '__main__':
    build()
