# Nice the landing page

## GitHub
- **Issue:** https://github.com/satisfecho/pos/issues/69

## Problem / goal
The public landing at `http://127.0.0.1:4202/` (and production equivalent) should feel polished and welcoming for both restaurant owners and guests. The issue suggests benchmarking modern landing patterns (example reference in the issue) and upgrading visuals, layout, and overall experience—not a minimal placeholder.

## High-level instructions for coder
- Review the current landing route/components and branding constraints (tenant vs global landing if applicable).
- Research a small set of reference patterns (accessibility, performance, mobile-first) and align with existing Angular/design tokens in the repo rather than one-off CSS sprawl.
- Propose or implement improved hero, value props, and clear paths for owners vs clients; keep load time and SSR/dev build implications in mind.
- Smoke-test locally (e.g. landing Puppeteer script / curl) after changes; document any env-specific assets in README only if behavior changes.
