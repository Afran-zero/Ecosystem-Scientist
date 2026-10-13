import type {
  Animal,
  DayRecord,
  EnvironmentState,
  GameConfig,
  GrassCoverage,
  SimulationSnapshot,
  SpeciesDef,
  TreePos,
  WorldMap,
} from "@/types";
import { isBlocked } from "./world";

/** A live change to a running island (plan M3.4). Only the fields given are changed. */
export interface Intervention {
  env?: Partial<Pick<EnvironmentState, "temperatureC" | "rainfallMmPerDay" | "sunlightPercent" | "soilQuality" | "pollution">>;
  /** Target number of living animals per species id. */
  population?: Record<string, number>;
}
import { Rng } from "./random";

/**
 * Ecology engine. One call to step() is one in-game hour (spec 5.4). The order is fixed:
 *   1. plant growth (logistic regrowth from a seed reserve, capped at maxCoverage)
 *   2. animal energy, hunger, health, age, starvation
 *   3. movement, target choice, feeding, hunting (prey marked dead at once, so it is eaten once)
 *   4. daily events at hour 0 of each day: water quality, background mortality, reproduction,
 *      and tree seeding
 *   5. end-of-day statistics record
 * The engine has no rendering code. Results depend only on the snapshot and its seed.
 */

export interface SimulationOptions {
  config: GameConfig;
  world: WorldMap;
  env: EnvironmentState;
  seed: number;
  /** Starting grass coverage per region name, in percent (0-100). */
  grassStartPercent: Record<string, number>;
  /** Starting population per species id. */
  startingPopulation: Record<string, number>;
}

const ENERGY_MAX = 100;
/** Prey flee at this multiple of their walking speed. Kept below fox speed so hunts can succeed. */
const FLEE_SPEED_FACTOR = 1.15;
/** Predators hunt only below this energy level (0-100). */
const PREDATOR_HUNGER_THRESHOLD = 60;

export class Simulation {
  readonly config: GameConfig;
  readonly world: WorldMap;

  private rng: Rng;
  private trees: TreePos[];
  /** 1 where a tree stands. Covers trees planted during the run, which the static map does not know about. */
  private readonly treeGrid: Uint8Array;
  private readonly forestTileCount: number;
  private readonly seed: number;
  private hour: number;
  private env: EnvironmentState;
  private grass: GrassCoverage;
  private animals: Animal[];
  private nextId: number;
  private days: DayRecord[];

  private readonly speciesById: Map<string, SpeciesDef>;
  private readonly preysOf: Map<string, string[]>; // predator id -> prey ids (hunts edges)
  private readonly predatorsOf: Map<string, string[]>; // prey id -> predator ids (hunts edges)
  private readonly grazers: Set<string>; // species that eat grass (prey 'grass' edges)
  private readonly regionCells: Map<number, number>;
  private dayBirths: Record<string, number> = {};
  private dayDeaths: Record<string, number> = {};
  private dayHunts = 0;

  private constructor(config: GameConfig, world: WorldMap, snap: SimulationSnapshot) {
    this.config = config;
    this.world = world;
    this.seed = snap.seed;
    this.rng = new Rng(snap.rngState);
    this.hour = snap.hour;
    this.env = { ...snap.env };
    this.grass = { ...snap.grass };
    this.trees = snap.trees.map((t) => ({ ...t }));
    this.treeGrid = new Uint8Array(world.width * world.height);
    for (const t of this.trees) this.treeGrid[t.y * world.width + t.x] = 1;
    this.animals = snap.animals.map((a) => ({ ...a }));
    this.nextId = snap.nextId;
    this.days = snap.days.map((d) => ({ ...d }));

    this.speciesById = new Map(config.species.map((s) => [s.id, s]));
    this.preysOf = new Map();
    this.predatorsOf = new Map();
    this.grazers = new Set();
    for (const e of config.foodWeb) {
      if (e.prey === "grass") {
        this.grazers.add(e.predator);
      } else if (e.kind === "hunts") {
        push(this.preysOf, e.predator, e.prey);
        push(this.predatorsOf, e.prey, e.predator);
      }
    }

    this.regionCells = new Map();
    let forest = 0;
    for (let i = 0; i < world.regionOf.length; i++) {
      const r = world.regionOf[i];
      if (r !== 0) this.regionCells.set(r, (this.regionCells.get(r) ?? 0) + 1);
      if (world.forestRegionIds.includes(r)) forest++;
    }
    this.forestTileCount = forest;
  }

  /** Creates a fresh run. Animals are placed on walkable tiles of the right habitat. */
  static create(opts: SimulationOptions): Simulation {
    const { config, world, env, seed } = opts;
    const grass: GrassCoverage = {};
    for (const id of world.grassRegionIds) {
      const name = world.regionNames[id];
      grass[name] = clamp01((opts.grassStartPercent[name] ?? 0) / 100);
    }

    const rng = new Rng(seed);
    const animals: Animal[] = [];
    let nextId = 1;
    for (const sp of config.species) {
      const n = opts.startingPopulation[sp.id] ?? 0;
      for (let i = 0; i < n; i++) {
        const spot = findSpawnTile(world, rng, sp);
        animals.push({
          id: `${sp.id}-${nextId++}`,
          speciesId: sp.id,
          x: spot.x + 0.5,
          y: spot.y + 0.5,
          ageHours: Math.floor(rng.range(0, sp.maxAgeHours * 0.3)),
          health: 100,
          energy: 80,
          hunger: 20,
          state: "wander",
          reproductionCooldownHours: 0,
          alive: true,
          heading: rng.range(0, Math.PI * 2),
        });
      }
    }

    return new Simulation(config, world, {
      version: 1,
      seed,
      rngState: rng.getState(),
      hour: 0,
      env: { ...env, simulationHour: 0 },
      grass,
      trees: world.trees.map((t) => ({ ...t })),
      animals,
      nextId,
      days: [],
    });
  }

  /** Restores a run exactly from a snapshot. The next step is identical to the original run. */
  static restore(config: GameConfig, world: WorldMap, snap: SimulationSnapshot): Simulation {
    if (snap.version !== 1) throw new Error(`unsupported snapshot version ${snap.version}`);
    return new Simulation(config, world, snap);
  }

  /**
   * Live intervention (spec 4.2, plan M3.4). Changes the running island only: the environment, and
   * the number of living animals of a species. Values outside the allowed range are rejected before
   * anything changes. Lowering a population removes the most recent animals of that species.
   */
  intervene(change: Intervention): void {
    const envRanges: Record<keyof NonNullable<Intervention["env"]>, [number, number]> = {
      temperatureC: [0, 40],
      rainfallMmPerDay: [0, 100],
      sunlightPercent: [0, 100],
      soilQuality: [0, 100],
      pollution: [0, 100],
    };
    for (const [key, value] of Object.entries(change.env ?? {}) as [keyof typeof envRanges, number][]) {
      const [lo, hi] = envRanges[key];
      if (!Number.isFinite(value) || value < lo || value > hi) throw new Error(`${key} must be between ${lo} and ${hi}`);
    }
    for (const [speciesId, target] of Object.entries(change.population ?? {})) {
      const sp = this.speciesById.get(speciesId);
      if (!sp) throw new Error(`unknown species ${speciesId}`);
      if (!Number.isInteger(target) || target < 0 || target > sp.maxPopulation) {
        throw new Error(`${sp.displayName} must be a whole number from 0 to ${sp.maxPopulation}`);
      }
    }

    Object.assign(this.env, change.env ?? {});
    for (const [speciesId, target] of Object.entries(change.population ?? {})) {
      const sp = this.speciesById.get(speciesId)!;
      const live = this.animals.filter((a) => a.alive && a.speciesId === speciesId);
      if (target < live.length) {
        for (const a of live.slice(target)) this.kill(a, sp);
        continue;
      }
      for (let i = live.length; i < target; i++) {
        const spot = findSpawnTile(this.world, this.rng, sp);
        this.animals.push({
          id: `${sp.id}-${this.nextId++}`,
          speciesId: sp.id,
          x: spot.x + 0.5,
          y: spot.y + 0.5,
          ageHours: 0,
          health: 100,
          energy: 80,
          hunger: 20,
          state: "wander",
          reproductionCooldownHours: 0,
          alive: true,
          heading: this.rng.range(0, Math.PI * 2),
        });
      }
    }
  }

  snapshot(): SimulationSnapshot {
    return {
      version: 1,
      seed: this.seed,
      rngState: this.rng.getState(),
      hour: this.hour,
      env: { ...this.env, simulationHour: this.hour },
      grass: { ...this.grass },
      trees: this.trees.map((t) => ({ ...t })),
      animals: this.animals.map((a) => ({ ...a })),
      nextId: this.nextId,
      days: this.days.map((d) => ({ ...d })),
    };
  }

  get currentHour(): number {
    return this.hour;
  }

  get currentDay(): number {
    return Math.floor(this.hour / 24);
  }

  get environment(): EnvironmentState {
    return { ...this.env, simulationHour: this.hour };
  }

  get grassCoverage(): GrassCoverage {
    return { ...this.grass };
  }

  get treeCount(): number {
    return this.trees.length;
  }

  get treePositions(): readonly TreePos[] {
    return this.trees;
  }

  get liveAnimals(): readonly Animal[] {
    return this.animals.filter((a) => a.alive);
  }

  get dayRecords(): readonly DayRecord[] {
    return this.days;
  }

  countBySpecies(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const sp of this.config.species) counts[sp.id] = 0;
    for (const a of this.animals) if (a.alive) counts[a.speciesId]++;
    return counts;
  }

  /** Runs whole hours. The lab uses this to fast-forward without drawing frames. */
  runHours(n: number): void {
    for (let i = 0; i < n; i++) this.step();
  }

  runDays(n: number): void {
    this.runHours(n * 24);
  }

  step(): void {
    this.updatePlants();
    this.updateBodies();
    this.moveAndFeed();
    if (this.hour % 24 === 0) this.dailyEvents();

    this.hour += 1;
    this.env.simulationHour = this.hour;

    if (this.hour % 24 === 0) this.endOfDay();
  }

  // --- Plants --------------------------------------------------------------

  /** 0-1 factor from sunlight, soil, pollution, water (rainfall), and temperature. */
  private environmentFactor(): number {
    const sun = this.env.sunlightPercent / 100;
    const soil = this.env.soilQuality / 100;
    const clean = 1 - this.env.pollution / 100;
    const water = Math.min(1, this.env.rainfallMmPerDay / 45);
    const t = this.env.temperatureC;
    // Growth falls to zero at 0 C and 40 C, and is best between 15 and 28 C.
    const temp = t <= 0 || t >= 40 ? 0 : t < 15 ? t / 15 : t <= 28 ? 1 : (40 - t) / 12;
    return clamp01(sun * soil * clean * water * temp);
  }

  private updatePlants(): void {
    const plant = this.config.plant;
    const f = this.environmentFactor();
    for (const id of this.world.grassRegionIds) {
      const name = this.world.regionNames[id];
      const c = this.grass[name] ?? 0;
      const perDay = plant.regrowthPerDay * f * c * (1 - c) + plant.seedRegrowthPerDay * f * (1 - c);
      this.grass[name] = clamp(c + perDay / 24, 0, plant.maxCoverage);
    }
  }

  // --- Bodies: energy, health, age, starvation -----------------------------

  private updateBodies(): void {
    for (const a of this.animals) {
      if (!a.alive) continue;
      const sp = this.speciesById.get(a.speciesId)!;
      a.ageHours += 1;
      a.reproductionCooldownHours = Math.max(0, a.reproductionCooldownHours - 1);
      a.energy = clamp(a.energy - sp.metabolismPerHour, 0, ENERGY_MAX);
      a.hunger = ENERGY_MAX - a.energy;
      if (a.energy < 20) a.health = clamp(a.health - 1.5, 0, 100);
      else if (a.energy > 60) a.health = clamp(a.health + 0.4, 0, 100);
      if (a.energy <= 0 || a.health <= 0 || a.ageHours >= sp.maxAgeHours) this.kill(a, sp);
    }
  }

  private kill(a: Animal, sp: SpeciesDef): void {
    a.alive = false;
    a.state = "dead";
    this.dayDeaths[sp.id] = (this.dayDeaths[sp.id] ?? 0) + 1;
  }

  // --- Movement, feeding, hunting ------------------------------------------

  private moveAndFeed(): void {
    for (const a of this.animals) {
      if (!a.alive) continue;
      const sp = this.speciesById.get(a.speciesId)!;
      if (sp.predator) this.predatorTurn(a, sp);
      else this.preyTurn(a, sp);
    }
  }

  private predatorTurn(a: Animal, sp: SpeciesDef): void {
    // Satiated predators do not hunt. Without this, foxes kill far more prey than they need.
    if (a.energy >= PREDATOR_HUNGER_THRESHOLD) {
      this.wander(a, sp, 0.5);
      return;
    }
    const preyIds = this.preysOf.get(sp.id) ?? [];
    const target = this.nearestAlive(a, sp.detectionRadius, (o) => preyIds.includes(o.speciesId));
    if (!target) {
      this.wander(a, sp, 0.5);
      return;
    }
    if (distance(a, target) <= 1.2) {
      a.state = "hunt";
      a.targetId = target.id;
      if (this.rng.next() < (sp.huntSuccessChance ?? 0)) {
        // The prey dies now, so no other predator can take it in this step.
        target.alive = false;
        target.state = "dead";
        this.dayDeaths[target.speciesId] = (this.dayDeaths[target.speciesId] ?? 0) + 1;
        a.energy = clamp(a.energy + (sp.preyEnergyGain ?? 0), 0, ENERGY_MAX);
        a.state = "eat";
        this.dayHunts += 1;
      }
      a.targetId = undefined;
      return;
    }
    a.state = "searchFood";
    a.targetId = target.id;
    this.moveToward(a, target.x, target.y, sp.speedTilesPerHour);
  }

  private preyTurn(a: Animal, sp: SpeciesDef): void {
    const predatorIds = this.predatorsOf.get(sp.id) ?? [];
    const threat = this.nearestAlive(a, sp.detectionRadius, (o) => predatorIds.includes(o.speciesId));
    if (threat) {
      a.state = "flee";
      const dx = a.x - threat.x;
      const dy = a.y - threat.y;
      const len = Math.hypot(dx, dy) || 1;
      const speed = sp.speedTilesPerHour * FLEE_SPEED_FACTOR;
      this.moveBy(a, (dx / len) * speed, (dy / len) * speed);
      return;
    }

    if (!this.grazers.has(sp.id)) {
      this.wander(a, sp, 0.5);
      return;
    }

    const regionId = this.grassRegionAt(a.x, a.y);
    const name = regionId ? this.world.regionNames[regionId] : undefined;
    const reserve = name ? this.grass[name] ?? 0 : 0;
    if (a.energy < 70 && reserve >= 0.02 && name) {
      // Feeding takes no more than the reserve holds (spec 5.6).
      const bite = Math.min(sp.grazePerHour, reserve);
      this.grass[name] = reserve - bite;
      a.energy = clamp(a.energy + bite * this.config.plant.energyPerGrazeUnit, 0, ENERGY_MAX);
      a.state = "eat";
      return;
    }
    if (a.energy < 70) {
      const spot = this.nearestGrassTile(a, 8);
      if (spot) {
        a.state = "searchFood";
        this.moveToward(a, spot.x + 0.5, spot.y + 0.5, sp.speedTilesPerHour);
        return;
      }
    }
    this.wander(a, sp, 0.5);
  }

  private wander(a: Animal, sp: SpeciesDef, factor: number): void {
    a.state = "wander";
    a.heading += this.rng.range(-0.6, 0.6);
    const speed = sp.speedTilesPerHour * factor;
    this.moveBy(a, Math.cos(a.heading) * speed, Math.sin(a.heading) * speed);
  }

  /** Moves at most `speed` tiles toward a point. Never teleports. */
  private moveToward(a: Animal, tx: number, ty: number, speed: number): void {
    const dx = tx - a.x;
    const dy = ty - a.y;
    const d = Math.hypot(dx, dy);
    if (d < 1e-9) return;
    const step = Math.min(speed, d);
    this.moveBy(a, (dx / d) * step, (dy / d) * step);
    a.heading = Math.atan2(dy, dx);
  }

  /** Moves by (dx, dy) tiles, sliding along a wall if one axis is blocked. Never enters a solid tile. */
  private moveBy(a: Animal, dx: number, dy: number): void {
    const nx = a.x + dx;
    const ny = a.y + dy;
    if (!this.isSolid(nx, ny)) {
      a.x = nx;
      a.y = ny;
    } else if (!this.isSolid(nx, a.y)) {
      a.x = nx;
    } else if (!this.isSolid(a.x, ny)) {
      a.y = ny;
    }
  }

  /** Solid for animals: the static map (water, buildings, map trees) or a tree planted in this run. */
  private isSolid(x: number, y: number): boolean {
    if (isBlocked(this.world, x, y)) return true;
    const tx = Math.floor(x);
    const ty = Math.floor(y);
    return this.treeGrid[ty * this.world.width + tx] === 1;
  }

  private nearestAlive(a: Animal, radius: number, pred: (o: Animal) => boolean): Animal | undefined {
    let best: Animal | undefined;
    let bestD = radius;
    for (const o of this.animals) {
      if (!o.alive || o.id === a.id || !pred(o)) continue;
      const d = distance(a, o);
      if (d <= bestD) {
        bestD = d;
        best = o;
      }
    }
    return best;
  }

  private nearestGrassTile(a: Animal, radius: number): { x: number; y: number } | undefined {
    const cx = Math.floor(a.x);
    const cy = Math.floor(a.y);
    let best: { x: number; y: number } | undefined;
    let bestD = Infinity;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        const regionId = this.grassRegionAt(x + 0.5, y + 0.5);
        if (!regionId) continue;
        const name = this.world.regionNames[regionId];
        if ((this.grass[name] ?? 0) < 0.05 || this.isSolid(x + 0.5, y + 0.5)) continue;
        const d = Math.hypot(dx, dy);
        if (d < bestD) {
          bestD = d;
          best = { x, y };
        }
      }
    }
    return best;
  }

  /** Region id if the tile belongs to a grass-capable region, else 0. */
  private grassRegionAt(x: number, y: number): number {
    const tx = Math.floor(x);
    const ty = Math.floor(y);
    if (tx < 0 || ty < 0 || tx >= this.world.width || ty >= this.world.height) return 0;
    const r = this.world.regionOf[ty * this.world.width + tx];
    return this.world.grassRegionIds.includes(r) ? r : 0;
  }

  // --- Daily events: background mortality, reproduction ----------------------

  private dailyEvents(): void {
    this.updateWaterQuality();
    for (const a of this.animals) {
      if (!a.alive) continue;
      const sp = this.speciesById.get(a.speciesId)!;
      if (this.rng.next() < sp.mortalityPerDay) this.kill(a, sp);
    }

    for (const a of [...this.animals]) {
      if (!a.alive) continue;
      const sp = this.speciesById.get(a.speciesId)!;
      const eligible =
        a.ageHours >= sp.minReproductiveAgeHours &&
        a.reproductionCooldownHours <= 0 &&
        a.health >= sp.minHealth &&
        a.energy >= sp.minEnergy;
      if (!eligible) continue;
      if (this.rng.next() >= sp.reproductionProbabilityPerDay) continue;
      if (this.liveCount(sp.id) >= sp.maxPopulation) continue; // cap checked before the birth

      a.reproductionCooldownHours = sp.reproductionCooldownHours;
      const nx = a.x + this.rng.range(-1, 1);
      const ny = a.y + this.rng.range(-1, 1);
      if (this.isSolid(nx, ny)) continue;
      this.animals.push({
        id: `${sp.id}-${this.nextId++}`,
        speciesId: sp.id,
        x: nx,
        y: ny,
        ageHours: 0,
        health: 100,
        energy: 70,
        hunger: 30,
        state: "wander",
        reproductionCooldownHours: 0,
        alive: true,
        heading: this.rng.range(0, Math.PI * 2),
      });
      this.dayBirths[sp.id] = (this.dayBirths[sp.id] ?? 0) + 1;
    }

    this.seedTrees();
  }

  /**
   * Water quality moves toward a target set by pollution (100 - 0.9 x pollution). It recovers slowly
   * (2 points a day) and falls faster (4 points a day), so removing pollution takes time.
   */
  private updateWaterQuality(): void {
    const target = clamp(100 - this.env.pollution * 0.9, 0, 100);
    const wq = this.env.waterQuality;
    this.env.waterQuality = wq < target ? Math.min(target, wq + 2) : Math.max(target, wq - 4);
  }

  /** Each tree may drop one seedling within 2 tiles, on forest ground with no tree or solid tile there. */
  private seedTrees(): void {
    const rate = this.config.plant.treeSeedPerDay * this.environmentFactor();
    if (rate <= 0) return;
    const W = this.world.width;
    const H = this.world.height;
    const parents = this.trees.slice();
    for (const p of parents) {
      if (this.rng.next() >= rate) continue;
      const x = p.x + this.rng.int(5) - 2;
      const y = p.y + this.rng.int(5) - 2;
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      if (!this.world.forestRegionIds.includes(this.world.regionOf[y * W + x])) continue;
      if (this.treeGrid[y * W + x] === 1 || isBlocked(this.world, x + 0.5, y + 0.5)) continue;
      this.trees.push({ x, y });
      this.treeGrid[y * W + x] = 1;
    }
  }

  private liveCount(speciesId: string): number {
    let n = 0;
    for (const a of this.animals) if (a.alive && a.speciesId === speciesId) n++;
    return n;
  }

  // --- Statistics ------------------------------------------------------------

  private endOfDay(): void {
    const day = this.hour / 24 - 1;
    this.days.push({
      day,
      counts: this.countBySpecies(),
      births: { ...this.dayBirths },
      deaths: { ...this.dayDeaths },
      huntsSucceeded: this.dayHunts,
      grassCoveragePercent: this.grassCoveragePercent(),
      grassByRegion: this.grassByRegion(),
      treeCount: this.trees.length,
      forestCoverPercent: this.forestCoveragePercent(),
      env: {
        temperatureC: this.env.temperatureC,
        rainfallMmPerDay: this.env.rainfallMmPerDay,
        sunlightPercent: this.env.sunlightPercent,
        soilQuality: this.env.soilQuality,
        pollution: this.env.pollution,
        waterQuality: this.env.waterQuality,
      },
    });
    this.dayBirths = {};
    this.dayDeaths = {};
    this.dayHunts = 0;
    // Dead animals leave the live list after the day is recorded. Their counts are kept in the record.
    this.animals = this.animals.filter((a) => a.alive);
  }

  /**
   * Forest cover: the share of forest tiles under a tree crown (the tree tile and its 8 neighbours).
   * Derived from tree positions, never edited directly (decision D-07).
   */
  forestCoveragePercent(): number {
    if (this.forestTileCount === 0) return 0;
    const W = this.world.width;
    const H = this.world.height;
    const covered = new Uint8Array(W * H);
    for (const t of this.trees) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const x = t.x + dx;
          const y = t.y + dy;
          if (x < 0 || y < 0 || x >= W || y >= H) continue;
          if (this.world.forestRegionIds.includes(this.world.regionOf[y * W + x])) covered[y * W + x] = 1;
        }
      }
    }
    let n = 0;
    for (let i = 0; i < covered.length; i++) n += covered[i];
    return (n / this.forestTileCount) * 100;
  }

  /** Grass coverage per grass-capable region, in percent. */
  grassByRegion(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const id of this.world.grassRegionIds) {
      const name = this.world.regionNames[id];
      out[name] = (this.grass[name] ?? 0) * 100;
    }
    return out;
  }

  /** Area-weighted grass coverage over grass-capable regions, in percent. */
  grassCoveragePercent(): number {
    let area = 0;
    let covered = 0;
    for (const id of this.world.grassRegionIds) {
      const name = this.world.regionNames[id];
      const cells = this.regionCells.get(id) ?? 0;
      area += cells;
      covered += cells * (this.grass[name] ?? 0);
    }
    return area === 0 ? 0 : (covered / area) * 100;
  }
}

// --- helpers ----------------------------------------------------------------

function push(map: Map<string, string[]>, key: string, value: string): void {
  const list = map.get(key) ?? [];
  list.push(value);
  map.set(key, list);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function clamp01(v: number): number {
  return clamp(v, 0, 1);
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function findSpawnTile(world: WorldMap, rng: Rng, sp: SpeciesDef): { x: number; y: number } {
  // Grazers start on grass regions. Predators may start on any walkable tile.
  for (let tries = 0; tries < 20000; tries++) {
    const x = rng.int(world.width);
    const y = rng.int(world.height);
    if (isBlocked(world, x + 0.5, y + 0.5)) continue;
    const r = world.regionOf[y * world.width + x];
    if (sp.predator || world.grassRegionIds.includes(r)) return { x, y };
  }
  throw new Error(`no spawn tile for ${sp.id}`);
}
