# PSYBLR V2 Architecture

## 1. Purpose & Strategy

PSYBLR V2 is rebuilt as a native-feeling, high-performance PlayCanvas game application (`apps/game`).

Target feel: tactile, responsive physical game experience (comparable to polished auto-battlers like Dota Underlords) rather than a web/DOM application containing an embedded 3D canvas.

### Coexistence with Legacy Application
- `apps/web` (React 19 + `@playcanvas/react` + Zustand) is preserved untouched as a reference and fallback during the V2 rollout.
- `apps/game` is the standalone V2 runtime powered directly by Vite + TypeScript + PlayCanvas Engine (`playcanvas`).
- Zero React, Zero React DOM, Zero `@playcanvas/react` in `apps/game`.
- Both apps share pure domain packages without duplication:
  - `@psyblr/contracts`
  - `@psyblr/game-content`
  - `@psyblr/game-rules`
  - `@psyblr/combat-core`
  - `@psyblr/raid-core`
  - `@psyblr/tutorial-core`

---

## 2. Rendering & Layer Architecture

All rendering is managed via explicit PlayCanvas layers to guarantee correct depth sorting and visual hierarchy:

| Layer Name | Layer ID | Role & Contents |
|---|---|---|
| `WORLD` | `0` (`LAYERID_WORLD`) | Primary 3D environment geometry, terrain plinths, Summon meshes, building sockets, directional shadows |
| `WORLD_FX` | `1001` | In-world additive VFX (landing shockwaves, spark particle bursts, pickup aura flashes) |
| `WORLD_UI` | `1002` | In-world projectors, target cell hover highlights, ghost landing indicators |
| `HUD` | `1003` | 2D Screen-space UI (branding header, scene title, status badges, contextual prompts) |
| `HUD_FX` | `1004` | Screen-space transition glows and notification flourishes |
| `TRANSITION` | `1005` | Screen fades, curtain wipes, scene transition overlays |
| `DEBUG` | `1006` | Developer HUD, real-time FPS/frame metrics, magnetic grid coordinate readout |

---

## 3. Subsystems & Directors

The V2 runtime is decomposed into single-responsibility directors:

```
apps/game/src/
├── main.ts                    # Application bootstrap & window exposure
├── app/
│   ├── GameApp.ts             # PlayCanvas Application setup, layer registration, update loop
│   ├── CameraDirector.ts      # Crafted isometric camera framing, resize handling, impact impulse
│   ├── InputManager.ts        # Screen-to-ground raycasting & pointer gesture routing
│   ├── SceneManager.ts        # Scene lifecycle, summon instances & placement tracking
│   └── GameClock.ts           # Stable delta timing and frame management
├── world/
│   ├── BaseWorld.ts           # 3D Base diorama, lighting, camp platform, building sockets
│   └── CampCoordinateMapper.ts # Canonical pure 6x6 camp cell <-> world position mapper
├── summons/
│   ├── SummonEntity.ts        # Summon physical entity, idle life loop, grab/land/return states
│   └── SummonPresenter.ts     # Character silhouette assembly, palette materials, contact shadow
├── interaction/
│   ├── DragController.ts      # Pointer drag state machine & placement commit/cancel
│   ├── CampDropTargetResolver.ts # Forgiving magnetic cell snapping & legality validation
│   └── InteractionFeedback.ts # World-space ghost tile indicator and hover pulse
├── presentation/
│   ├── MotionDirector.ts      # Zero-alloc frame-based tween & spring manager
│   ├── PresentationTokens.ts  # Standard durations (MICRO..HERO) & easings (SNAP, LAND, SPRING)
│   ├── PresentationEvents.ts  # Decoupled semantic interaction event bus
│   ├── AudioDirector.ts       # Procedural Web Audio synthesizer for tactile sound feedback
│   └── VFXDirector.ts         # Shockwaves, particle bursts, and energy rings
├── ui/
│   └── HUDRoot.ts             # PlayCanvas ScreenComponent HUD with dynamic CanvasFont
└── debug/
    └── DebugOverlay.ts        # PlayCanvas native debug stats overlay (Toggle: ~ / D)
```

---

## 4. Canonical Camp Coordinate Mapping

All Camp cell coordinates `(x, y)` (`x: 0..5`, `y: 0..5`) and world 3D positions `[x, y, z]` map bidirectionally through `CampCoordinateMapper.ts`:

- **Cell Size**: `1.25` world units
- **Origin**: `[0, 0, 0]`
- **Coordinate Formula**:
  $$\text{worldX} = \text{originX} + (x - 2.5) \times \text{cellSize}$$
  $$\text{worldZ} = \text{originZ} + (y - 2.5) \times \text{cellSize}$$
- Row `0` represents the protected **Illuminati row**.
- Rows `1..5` represent exposed Camp cells.

---

## 5. Direct Manipulation & State Machine

PSYBLR V2 rejects multi-step "select -> target -> confirm" modal placement. Direct tactile manipulation is the sole interaction paradigm:

```
[IDLE]
  │  (Pointer Down on Summon hit volume)
  ▼
[GRABBED] ── (100–140ms lift to Y=0.38, 1.08x scale, ring brighten, grab sound)
  │  (Pointer Move)
  ▼
[DRAGGING] ── (Smooth ground tracking, magnetic snap to nearest legal Camp cell, hover tick)
  │
  ├──► [Pointer Up over Valid Cell] ──► [LANDING] ──► [IDLE]
  │       (Snap to cell, downward drop, landing squash, shockwave, camera impulse)
  │
  └──► [Pointer Up over Invalid Area] ──► [RETURNING] ──► [IDLE]
          (Elastic spring interpolation back to origin cell, settle)
```

---

## 6. Motion Tokens & Easings

Timing and curve consistency are governed by `PresentationTokens.ts`:

- `DURATION.MICRO` (`110ms`): Hover ring flashes, cell hover switches
- `DURATION.QUICK` (`200ms`): Pickup lift, squash recovery
- `DURATION.STANDARD` (`320ms`): Drop landing drop, primary actions
- `DURATION.FOCUS` (`520ms`): Elastic spring return
- `DURATION.REWARD` (`850ms`): Celebration flourishes
- `DURATION.HERO` (`1600ms`): Major camera transitions

### Easing Functions
- `EASING.SNAP`: Snappy start with smooth cubic deceleration ($1 - (1-t)^3$)
- `EASING.LAND`: Damped harmonic overshoot for authoritative physical impacts
- `EASING.SPRING`: Elastic oscillation for invalid release recovery
- `EASING.FLOAT`: Sine-based breathing oscillation
- `EASING.CINEMATIC`: Smooth cubic in-out curve
