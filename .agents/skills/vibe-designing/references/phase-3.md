# Phase 3

Goal: productionize a finished prototype without sanding off what made it good.

- Split reusable UI into `packages/ui/src/components` where reuse is warranted.
- Keep app-local pieces inside the app when they do not need to be shared.
- Before choosing Base UI primitives, check `https://base-ui.com/llms.txt`.
- Use Base UI whenever it is possible and sensible.
- Do not force a Base UI mapping when it does not fit the design or the component.
- Treat accessibility as a first-class part of productionizing the prototype.
- Preserve the prototype's tone, pacing, and hierarchy, not just its structure.
- If the current state suggests the shared design intent and theme system are still missing, recommend Phase 2 first.

This phase should improve reuse, maintainability, and accessibility while preserving the original vibe.
