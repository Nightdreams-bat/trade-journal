# Warm floating-glass redesign — status (branch `redesign/glass-warm`)

Transforms the dark neon-green "terminal glass" dashboard into a warm, bright,
floating three-panel visionOS-style glass concept (reference: a "FitnessUp" mockup —
warm taupe room, center hero slab + slim left nav rail + slim right profile/utility
panel, blue used only as the selected/active accent).

## Done (commits on this branch)

- `75fcf47` **Foundation** — warm-light token system in `theme.css`, `colors.ts` +
  `chartTheme.ts` synced, ambient "room" background, custom cursor follower removed,
  SVG displacement filters retuned.
- `0256302` **Spatial shell** — `App.tsx` rebuilt to a `SpatialStage` tree; new
  components `SpatialStage / NavRail / UtilityPanel / CenterPanel / HeroHeader /
  EdgeHandle / Scrim / MiniCalendar / ChallengeRing / Timeline`; `TopNav` + `Ornament`
  deleted; side panels hidden by default (left edge handle + hero-header
  calendar/profile buttons open them).
- `340ca5c` + `61f9e0e` **Hero + motion** — `HomePage` rebuilt to a `.hero-grid`
  (full-bleed equity chart with P&L overlay, support rings, Timeline strip); hero
  eases + scales + blur-pulses when a panel opens (guarded to fire only on real
  shifts); `prefers-reduced-motion` branch (no transform, visible scrim, frozen
  ambient); nav/utility panels restyled as distinct floating slabs; wide-screen
  overlap retuned.

Gate at `61f9e0e`: `tsc -b`, `npm run build`, `npm run lint` (0 errors) all clean.

## TODO — remaining work

1. **Critic / QA pass (not done).** Compare the running build against the reference
   at 1440x900 and 1024x768: warm room + slow ambient drift, zero green, believable
   frost (thin pale border, faint specular, angle <= 6deg, no gloss), blue only on
   active/selected/hover/focus, open/close motion never snaps, chart + text contrast
   AA on light glass, every tab renders in the center panel, modals reachable.
2. **`PlaybooksPage.tsx` crash** — throws `TypeError: Cannot read 'toFixed' of
   undefined` on the Playbooks tab under the `dev-preview.html` stub. Pre-dates this
   branch (stub `strategies.getPerformance` shape) but should be guarded.
3. **Vertical dead space below the Timeline** inside the hero at tall viewports —
   `.center-panel` is a fixed height; content doesn't fill it.
4. **NavRail is slightly taller than the hero slab** vs the reference — minor.
5. **`public/favicon.svg`** is still the old purple template mark — replace with a
   warm/blue one.
6. Verify at a true 1440 / 1024 viewport (the dev machine capped the browser at
   ~1371 CSS px).

## Run it

```
npm install
npm run dev        # then open http://localhost:5173/dev-preview.html (no Electron needed)
npm run build      # tsc -b && vite build
```

Not merged. Do not `git reset` this branch — another working copy shares history.
