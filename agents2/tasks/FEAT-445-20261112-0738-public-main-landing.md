# Replace public landing phone mock with restaurant POS photo (#445)

## GitHub Issues
- **Issue:** https://github.com/satisfecho/pos/issues/445
- **445**

## Status
- **Blocked - waiting for human** (confirm draft hero photo before treating as ready to ship/deploy)
- **Waiting notice posted:** 2026-11-12T07:45:00Z

## Problem / goal
On the public main landing page, the hero/phone area currently uses a CSS/SVG mock (`.landing-phone` / `.landing-phone__screen` in `front/src/app/landing/landing.component.ts`). Replace that visual with a photograph-style image of the Satisfecho POS UI on a computer inside a restaurant, with a blurry restaurant background.

## High-level instructions for coder
- Locate the public landing phone mock in `front/src/app/landing/landing.component.ts` (and related styles).
- Create or generate a suitable image asset (photograph look: POS on a screen in a restaurant, background blurred) and wire it into the landing so it replaces the current mock screen content.
- Keep layout responsive; do not invent a new landing redesign beyond this visual swap.
- Per issue: create the image first and **wait for human confirmation on the GitHub issue before treating the change as ready to ship/deploy**. After the asset is ready for review, post one waiting comment on #445 and set `**Waiting notice posted:** <UTC ISO>` under a **## Status** section; leave the task as **FEAT** until a human replies.
- Smoke after human approval: landing loads (`BASE_URL=http://127.0.0.1:4202 npm run test:landing-version` from `front/`); front build clean in `docker logs --since 10m pos-front`.

## Agent notes (010)
- Draft photo created at `front/public/landing/hero-pos-restaurant.jpg` (laptop POS UI in restaurant, blurred background).
- Landing wiring not shipped yet; waiting on issue #445 for human OK / revision before FEAT → WIP and deploy.
