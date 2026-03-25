# Working plan

## GitHub

- **Issue:** https://github.com/satisfecho/pos/issues/88

## Problem / goal

The **working plan** flow (**Workin plan > new shift**) should be **more flexible**: allow assigning the **same schedule to an employee for an entire month** at once (schedules often stay constant), while still supporting **per-day overrides** for shift rotations and exceptions.

## High-level instructions for coder

- Map the current **working plan / shift** UI and APIs (tenant staff scheduling, “new shift”, calendar views).
- Design UX for **bulk month assignment** (select employee, month, default pattern) vs **single-day edit** without blocking exceptions.
- Ensure data model and validation support recurring or copied patterns plus day-level diffs (avoid silent data loss when editing one day vs the month).
- Add tests or smoke coverage for the bulk-assign and override paths if the stack already has patterns for this area.
