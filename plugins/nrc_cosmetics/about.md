# NoRisk Client Cosmetics

Author NoRisk Client emotes directly in Blockbench.

## Workflow

1. **File → New NRC Emote** — creates a project pre-loaded with the player rig
   (`bipedRig`, `bipedHead`, `bipedBody`, arms and legs). Animate the bones to build your
   emote.
2. **Animation → Edit Emote Settings** — set emote metadata: disable-on-move /
   disable-on-hit, first-person options, immersive camera, and per-bone vanilla locking.
   Loop behaviour comes from Blockbench's own animation loop mode (once / loop / hold).
3. **File → Export → Export NRC Emote** — writes `<name>.animation.json` (NRC emote format)
   and `<name>.norisk.json` (cosmetic metadata).

The cubes in the rig are a visual reference for posing only; emotes export animation data,
not geometry.
