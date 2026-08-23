# UI / UX Rules

## Experience principles
1. World-first: the player should feel located in a place, not navigating an app.
2. One dominant action at a time during onboarding.
3. Detail on demand: bust → summary → full detail.
4. Camera movement communicates navigation between systems.
5. Every 3D drag interaction has a tap/select fallback.
6. No hidden destructive actions. Merge and steal require explicit contextual confirmation outside scripted tutorial beats.
7. Mobile landscape is first-class, not a shrunken desktop.

## Responsive targets
- Desktop: 1280x720 and above.
- Mobile landscape baseline: 844x390.
- Tablet landscape: 1024x768.
- Portrait gameplay: rotate-device gate, with settings/account still accessible later.

## Layout zones
- Safe inset-aware top HUD: 56-72 px.
- Bottom interaction zone: 84-112 px.
- Details panel desktop: min(520px, 40vw).
- Summon tray: maximum 45vh; horizontally scrollable on short landscape devices.

## Interaction hierarchy
Primary actions use verbs: START BATTLE, DROP BALL, RAID, CONFIRM STEAL.
Secondary actions never visually compete with the primary CTA.
Tutorial CTA copy mirrors the required action.

## 3D selection feedback
- Hover/pointer: subtle outline/ring.
- Selected: stronger world ring + DOM detail chip.
- Valid placement cell: elevated/illuminated.
- Invalid placement: no drop + short shake/error hint; never silently fail.

## Camera language
- Campaign overview: tactical top-down ~45°.
- Base overview: slightly wider/lower to sell place and buildings.
- Building focus: eased dolly, not teleport.
- Summon inspection: optional contained model viewer; never hijack world camera.
- Combat: mostly stable tactical camera. Avoid cinematic cuts that hide information during alpha.

## Tutorial pacing
- First battle gets the most handholding.
- After player demonstrates an interaction once, prompts become shorter.
- Never explain Shield/Tier Bonus blobs during Spawn Machine intro.
- Never explain future buildings during tutorial; their silhouettes can imply expansion.
