import os
import sys

# Make the package importable without an install step, so `pytest` works from a
# bare checkout the way `vitest` does for the TS packages.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
