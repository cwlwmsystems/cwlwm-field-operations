# Phase 15.4 — Animated Cwlwm Systems Splash Screen

This phase adds the branded initial app-load experience.

## Animation

On a full app load:

1. The complete Cwlwm Systems logo appears in grayscale.
2. The original green/red logo fills upward from the bottom.
3. A luminous scan line travels upward with the fill.
4. `FIELD INTELLIGENCE` appears beneath the existing logo/company name.
5. The green/red loading bar progresses during the animation.
6. The splash fades smoothly into the application.

The background is a light Cwlwm brand gradient rather than black.

## Timing

The splash is intentionally held for approximately 2.8 seconds. This creates
the short branded loading friction requested without slowing client-side route
changes.

The providers and authentication checks load behind the splash so the time is
not entirely cosmetic.

## Asset

The existing transparent PNG logo is used directly:

`public/brand/cwlwm-systems-full.png`

No SVG is required. The exact same PNG is stacked twice:
- grayscale base
- full-color layer animated with CSS `clip-path`

This keeps the fill perfectly aligned with the original logo.

## Behavior

The splash runs on a full browser/app load because `BrandSplashGate` is mounted
once at the root layout.

Normal in-app navigation does not replay the full splash.

## Files

- `components/BrandSplashGate.tsx`
- `public/brand/cwlwm-systems-full.png`
- `app/layout.tsx`
- `app/loading.tsx`
- `app/globals.css`

No Supabase migration is required.

## Test

```powershell
npm run build
npm run dev
```

Then perform a full browser refresh. Test both desktop and a narrow/mobile
viewport.
