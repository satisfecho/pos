# Enhacements / reservation needs improvements

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/64

## Problem / goal
Public/staff reservation flow should rely on a **calendar-first** experience instead of separate date/time inputs. The calendar should default to **today**, show each day as a column with **time slots**, and visually distinguish **booked/reserved** vs **free** slots (e.g. red vs green) so users can pick an available slot and complete a reservation. Reference screenshot in the issue.

## High-level instructions for coder
- Map current reservation booking UI (public `/book` and any staff paths) and API that exposes availability or slot rules.
- Design a single calendar view that replaces or hides redundant date/time fields while preserving validation, timezone, and tenant rules.
- Implement clear visual states for unavailable vs selectable slots; keep accessibility (contrast, labels, keyboard) in mind.
- Align with existing docs under `docs/` for reservations if present; add **`CHANGELOG.md`** **`[Unreleased]`** notes for user-visible behaviour changes.
- Smoke-test booking flow end-to-end after changes.
