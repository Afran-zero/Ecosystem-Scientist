# Ecosystem Scientist — documentation

Start here. This folder holds the plan, the project's "brain" (how the system is designed), and its working memory (where the project stands).

| File | Purpose | Read when |
|---|---|---|
| [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) | Ordered build plan: milestones, tasks, done-when checks, data plan, testing, open questions, risks | Before starting any milestone task |
| [brain/ARCHITECTURE.md](brain/ARCHITECTURE.md) | Layers, ownership, invariants, step order, data contracts, map and persistence model | Before changing code structure |
| [brain/ECOLOGY_MODEL.md](brain/ECOLOGY_MODEL.md) | Ecology assumptions, species rates, vegetation and environment formulas, mission starting values, calibration log | Before changing any simulation number |
| [brain/DECISIONS.md](brain/DECISIONS.md) | Dated decisions, including how open questions were resolved | Before making a choice the plan does not settle |
| [memory/PROJECT_MEMORY.md](memory/PROJECT_MEMORY.md) | Current status, milestone progress, open items, session log, verification evidence | At the start and end of every session |
| [memory/ASSETS.md](memory/ASSETS.md) | Every downloaded art pack: source URL, license, checksum, perspective, status | Before using any sprite or tile |

The product spec is `Product requirements.txt` in the project root. It is the source of truth for scope.

## Project skill

The skill `ecosystem-scientist` at `.claude/skills/ecosystem-scientist/SKILL.md` summarizes these docs for working sessions and points back here.

## Keeping these docs true

- When a decision changes, add an entry to `brain/DECISIONS.md`.
- When a number changes, update `brain/ECOLOGY_MODEL.md` and the matching JSON in `public/data/`.
- When a task is verified, tick it in `IMPLEMENTATION_PLAN.md` and update `memory/PROJECT_MEMORY.md`.
