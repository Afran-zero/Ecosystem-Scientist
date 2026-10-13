# Ecology model — assumptions and starting values

This file records the educational model the game uses, its assumptions, and the starting numbers. The spec (§5.7) requires that assumptions are documented and shown to the player when relevant. All values here are **configurable starting values**, not biological estimates. They change in `public/data/*.json` after calibration (plan M2.15). Update this file whenever a value changes.

---

## 1. Model assumptions (say these to the player where relevant)

- The model is educational. It captures carrying capacity, competition, plant regrowth, resource limits, and predator-prey dynamics. It does not model genetics, gestation animations, or every real-world process.
- Births are discrete events. A new individual appears after a reproduction event.
- Grass and trees are abstract biomass and cover values, not individual plants.
- Pollution affects plant growth, animal health, and water quality. Water quality recovers slowly. Reducing pollution does not restore organisms instantly; each responds at its own rate.
- Forest cover is a spatial footprint derived from tree positions (see DECISIONS.md, D-07, which resolves plan Q1).

---

## 2. Organisms

| Species | Class | Resource | Notes |
|---|---|---|---|
| Grass | Producer | Sunlight, water, soil | Per-region coverage 0–100. Grazed; regrows. |
| Trees | Producer | Sunlight, water, soil | Count + growth state. Not grazed. Habitat. |
| Rabbit | Herbivore | Grass | Flees foxes. Prefers shelter near forest edge. |
| Cow | Herbivore | Grass | Needs grass and water access. |
| Chicken | Omnivore | Seeds and small food | Forages. Labeled omnivore everywhere. |
| Mouse | Omnivore | Seeds and vegetation-derived food | Forages, hides, reproduces quickly. Labeled omnivore. |
| Fox | Carnivore | Rabbits and mice | Hunts. |

---

## 3. Starting values per species (proposed; calibrate in M2.15)

| Species | Max pop | Min repro age (h) | Repro prob / day | Cooldown (h) | Min health | Min energy | Mortality / day | Max age (h) |
|---|---|---|---|---|---|---|---|---|
| Rabbit | 100 | 24 × 30 | 0.08 | 24 × 14 | 40 | 40 | 0.004 | 24 × 365 × 2 |
| Cow | 50 | 24 × 365 | 0.02 | 24 × 180 | 50 | 50 | 0.002 | 24 × 365 × 20 |
| Chicken | 100 | 24 × 60 | 0.06 | 24 × 20 | 40 | 40 | 0.005 | 24 × 365 × 6 |
| Mouse | 100 (proposed, Q5) | 24 × 20 | 0.12 | 24 × 10 | 30 | 30 | 0.006 | 24 × 365 × 2 |
| Fox | 30 | 24 × 180 | 0.03 | 24 × 60 | 50 | 50 | 0.003 | 24 × 365 × 8 |

**Adopted fox values (D-20):** metabolism 0.5/h, detection radius 12 tiles, speed 2.6 tiles/h, hunt success 0.5, energy per prey 50, starting population 5.

**Adopted rules (D-19):** predators hunt only below energy 60. Prey flee at 1.15 × walking speed. Grazing species eat only below energy 70, and only from a reserve of at least 2%.

Rules:
- Reproduction only when age ≥ minimum, cooldown is zero, health and energy meet minimums, and the species is below its cap. Roll the probability once per day, not per step.
- Cap is enforced before births are committed. A birth that would exceed the cap is dropped and counted as a rejected birth in statistics.

Populations in the mission and lab sliders are clamped to these caps. The caps are software limits, not ecological recommendations (spec §4.2).

---

## 4. Vegetation

- Grass growth per day = `baseGrowth × f(sunlight) × f(water) × f(soil) × f(pollution) × (1 − coverage/maxCoverage)`.
- Each factor is in `[0, 1]`. Start with linear factors: `f(sunlight) = sunlight/100`, `f(soil) = soil/100`, `f(pollution) = 1 − pollution/100`, `f(water)` from rainfall relative to a 45 mm/day reference, capped at 1.
- Temperature has an optimum band (proposed 15–28 °C); outside it growth falls off linearly to zero at 0 °C and 40 °C.
- Grazing removes biomass equal to `grazingDemand × animalCount`, but never more than the coverage present.
- Grass coverage never exceeds `maxCoverage` (100 by default). Negative values are clamped and the clamp is logged in tests.
- Trees: slow growth, with the same environment factors. Tree loss only comes from the mission or a logged intervention, never from grazing.

---

## 5. Environment

| Variable | Range | Hub baseline (assumed) | Source |
|---|---|---|---|
| Temperature | 0–40 °C | 24 | Spec lab mock data |
| Rainfall | 0–100 mm/day | 45 | Spec lab mock data |
| Sunlight | 0–100 % | 70 | Spec lab mock data |
| Soil quality | 0–100 | 70 | Assumed (Q3) |
| Pollution | 0–100 | 20 | Spec lab mock data |
| Water quality | 0–100 | 80 | Assumed (Q3). Falls with pollution, recovers slowly. |

Water quality update per day: `waterQuality += recoveryRate × (100 − waterQuality) × cleanFactor − pollutionDamage × pollution/100`, clamped to 0–100. Recovery is slower than pollution's effect, so pollution removal takes time.

---

## 6. Mission starting values (from spec §6)

| Parameter | Meadow (M1) | Forest (M2) | Pond (M3) |
|---|---|---|---|
| Grass coverage | 25 % | 45 % | 30 % near pond |
| Trees | 18 | 8 | 12 |
| Forest cover | — | 20 % | — |
| Rabbits | 24 | 12 | 8 |
| Cows | 12 | — | — |
| Chickens | — | — | — |
| Mice | — | 18 | 10 |
| Foxes | 4 | 6 | 3 |
| Rainfall | Below hub baseline (proposed 30) | Hub baseline (45) | Hub baseline (45) |
| Soil quality | Moderately degraded (proposed 45) | Moderately degraded (proposed 45) | Degraded near pond (proposed 30) |
| Pollution | 20 (hub) | 20 (hub) | 75 |
| Water quality | 80 (hub) | 80 (hub) | 25 |

These values come from the spec unless marked "proposed". Proposed values are configuration, not facts.

---

## 7. Food web (edges in `food-web.json`)

- grass → rabbit (grazes)
- grass → cow (grazes)
- seeds → chicken (consumes)
- seeds → mouse (consumes)
- rabbit → fox (consumes)
- mouse → fox (consumes)

Feeding rules: a hungry predator (energy below 60) selects the nearest prey within detection radius, moves toward it, and attempts a hunt once within 1.2 tiles. Success probability comes from the species file. A success gives energy from the species file. Chickens and mice forage on the grass reserve (D-21). A prey is consumed at most once per step. Competition: when several grazers share a patch, they split available biomass in proportion to demand.

---

## 8. Calibration targets (M2.15)

- Hub island, default settings: no species goes extinct over 90 days across 20 seeds.
- Each mission's reference experiment reaches its criteria; its control configuration does not.
- Mission 1 criteria are achievable within 30 days. Mission 2 within 45. Mission 3 within 30.
- No population hits its cap for more than 30% of simulated days at default settings, so the cap does not dominate the outcome.

If a target fails, adjust the numbers here and in the data files, then record the change in the calibration log below.

### Calibration log

| Date | Change | Result |
|---|---|---|
| 2026-10-12 | First hub run, proposed values, no satiation | Foxes and chickens collapsed by day 30. Foxes killed about 2 prey per day. |
| 2026-10-12 | Fox speed 2.6, detection 10, huntSuccess 0.5, prey flee factor 1.15 | Prey stable, foxes still fell. Hunts were too rare to sustain foxes. |
| 2026-10-12 | Predator satiation: predators hunt only below energy 60 | Prey stable. Foxes still declined. |
| 2026-10-12 | Target settled (D-24) at 30 days, 20 seeds. Prey: 0 extinctions, lowest grass 65.2%. Fox: 1 of 20 runs extinct, deferred. | Prey target met. |
| 2026-10-12 | Fox metabolism 0.5, detection 12, huntSuccess 0.5, energy per prey 50 (adopted) | Foxes survive 90 days in 2 of 3 seeds (seed 3 extinct). Grass falls to 37% in one seed. **Calibration target not yet met.** Open for M2.15. |
Calibration target settled in D-24 (30 days, 20 seeds, prey must not die out, grass above 15%). **Met for prey:** 0 prey extinctions, lowest grass 65.2%, lowest fox 0 (1 of 20 runs, deferred). Reproduce with `npx tsx tools/calibrate-summary.ts 30 20`.
