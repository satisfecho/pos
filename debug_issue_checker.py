#!/usr/bin/env python3
"""Debug and execute issue checker script"""
import sys
import traceback

try:
    exec(open("agents2/issue_checker_agent.py").read())
    print("Script executed successfully!")
except Exception as e:
    print(f"Error: {e}")
    traceback.print_exc()
