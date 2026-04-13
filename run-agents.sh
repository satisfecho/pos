#!/bin/bash

while true; do
	echo "001 --> $(date)"
	if [ -n "$(gh issue list --limit 1)" ]; then
		timeout 15m goose run -i agents/001-gh-reviewer.md
	else
		echo "No open issues found. Skipping 001."
	fi

	echo "010 --> $(date)"
	if ls agents/tasks/'FEAT'* >/dev/null 2>&1; then
		timeout 15m goose run -i agents/010-feature-coder.md
	else
		echo "No FEAT* tasks found in agents/tasks. Skipping 010."
	fi
	if ls agents/tasks/'WIP'* >/dev/null 2>&1; then
		timeout 15m goose run -i agents/010-feature-coder.md
	else
		echo "No WIP* tasks found in agents/tasks. Skipping 010."
	fi

	echo "020 --> $(date)"
	if ls agents/tasks/'UNTESTED'* >/dev/null 2>&1; then
		timeout 15m goose run -i agents/020-test.md
	else
		echo "No UNTESTED* tasks found in agents/tasks. Skipping 020."
	fi
	if ls agents/tasks/'TESTING'* >/dev/null 2>&1; then
		timeout 15m goose run -i agents/020-test.md
	else
		echo "No UNTESTED* tasks found in agents/tasks. Skipping 020."
	fi

	echo "030 --> $(date)"
	if ls agents/tasks/'CLOSED'* >/dev/null 2>&1; then
		timeout 15m goose run -i agents/030-closing-reviewer.md
	else
		echo "No TESTED* tasks found in agents/tasks. Skipping 030."
	fi

	echo "040 --> $(date)"
	timeout 15m goose run -i agents/040-committer.md

	echo "050 --> $(date)"
done
