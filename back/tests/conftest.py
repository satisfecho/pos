"""Pytest: env before any test module imports `app`."""
import os

os.environ["RATE_LIMIT_ENABLED"] = "false"
