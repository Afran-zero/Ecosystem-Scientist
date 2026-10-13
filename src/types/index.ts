// Shared contracts for simulation, missions, and persistence.
// Units are in the names: *C = degrees Celsius, *Mm = millimetres, *Percent = 0-100,
// *Hours = simulation hours, Tiles = map cells (floats in simulation state).

export type SpeciesClass = "producer" | "herbivore" | "omnivore" | "carnivore";

export type AnimalState =
  | "idle"
  | "wander"
  | "searchFood"
  | "eat"
  | "hunt"
  | "flee"
  | "rest"
  | "reproduce"
  | "dead";

export interface Animal {
  id: string;
  speciesId: string;
  x: number; // tiles
  y: number; // tiles
  ageHours: number;
  health: number; // 0-100
  energy: number; // 0-100
  hunger: number; // 0-100, equal to 100 - energy in this version
  state: AnimalState;
  targetId?: string;
  reproductionCooldownHours: number;
  alive: boolean;
  heading: number; // radians, used by wandering
}

export interface EnvironmentState {
  temperatureC: number;
  rainfallMmPerDay: number;
  sunlightPercent: number;
  soilQuality: number; // 0-100
  pollution: number; // 0-100
  waterQuality: number; // 0-100
  simulationHour: number;
}

export interface SpeciesDef {
  id: string;
  displayName: string;
  classification: SpeciesClass;
  sprite: number; // frame index in the Tiny Creatures sheet
  speedTilesPerHour: number;
  detectionRadius: number; // tiles
  metabolismPerHour: number;
  grazePerHour: number; // fraction of a region consumed per animal per hour
  huntable: boolean;
  predator: boolean;
  huntSuccessChance?: number;
  preyEnergyGain?: number;
  maxPopulation: number;
  minReproductiveAgeHours: number;
  reproductionProbabilityPerDay: number;
  reproductionCooldownHours: number;
  minHealth: number;
  minEnergy: number;
  mortalityPerDay: number;
  maxAgeHours: number;
  startingPopulationHub: number;
}

export interface FoodWebEdge {
  prey: string;
  predator: string;
  kind: "grazes" | "forages" | "hunts";
}

export interface PlantConfig {
  energyPerGrazeUnit: number;
  regrowthPerDay: number;
  seedRegrowthPerDay: number;
  maxCoverage: number; // fraction, 0-1
  /** Chance per tree per day of dropping one seedling, at full growing conditions. */
  treeSeedPerDay: number;
}

/** A tree's base tile. Its crown covers the 3 x 3 tiles around it for forest cover. */
export interface TreePos {
  x: number;
  y: number;
}

export interface GameConfig {
  species: SpeciesDef[];
  foodWeb: FoodWebEdge[];
  plant: PlantConfig;
}

/** A static map, parsed from Tiled JSON plus the "ecology" block. Never mutated by the simulation. */
export interface WorldMap {
  id: string;
  width: number;
  height: number;
  blocked: Uint8Array; // 1 = solid or water or tree, index = y * width + x
  regionOf: Uint8Array; // region id per tile, 0 = none
  regionNames: Record<number, string>; // id -> name
  grassRegionIds: number[];
  trees: { x: number; y: number }[];
  spawn: { x: number; y: number };
  interactive: { name: string; type: string; x: number; y: number; props: Record<string, string> }[];
  /** Region ids that count as forest for tree growth and forest cover. */
  forestRegionIds: number[];
}

/** Coverage per grass region, 0-1 fraction of that region's area. Keyed by region name. */
export type GrassCoverage = Record<string, number>;

export interface DayRecord {
  day: number;
  counts: Record<string, number>;
  births: Record<string, number>;
  deaths: Record<string, number>;
  huntsSucceeded: number;
  /** Animals of each prey species eaten by predators on this day. Always at most that species' deaths. */
  eaten: Record<string, number>;
  grassCoveragePercent: number;
  /** Grass coverage per grass-capable region, in percent. */
  grassByRegion: Record<string, number>;
  treeCount: number;
  forestCoverPercent: number;
  env: Omit<EnvironmentState, "simulationHour">;
}

export interface SimulationSnapshot {
  version: 1;
  seed: number;
  rngState: number;
  hour: number;
  env: EnvironmentState;
  grass: GrassCoverage;
  trees: TreePos[];
  animals: Animal[];
  nextId: number;
  days: DayRecord[];
}

/** One numeric control in the laboratory. Ranges come from spec section 4.2. */
export interface ControlSpec {
  key: ControlKey;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  group: "environment" | "populations" | "run";
  /** Shown beside the control, for example when it applies to new runs only. */
  note?: string;
}

export type ControlKey =
  | "temperatureC"
  | "rainfallMmPerDay"
  | "sunlightPercent"
  | "soilQuality"
  | "pollution"
  | "grassPercent"
  | "rabbit"
  | "cow"
  | "chicken"
  | "mouse"
  | "fox"
  | "durationDays";

/** Values for every control, as the lab holds them. */
export type ExperimentSettings = Record<ControlKey, number>;

export interface ExperimentRecord {
  id: string;
  missionId: string; // "sandbox" until missions exist (M4)
  seed: number;
  durationDays: number;
  settings: ExperimentSettings;
  startingState: SimulationSnapshot; // state at hour 0, enough to reproduce the run
  interventions: string[]; // none in the sandbox
  finalState: SimulationSnapshot;
  statistics: DayRecord[];
  createdAt: string;
  /** control = default settings, experiment = the player's settings. */
  role?: "control" | "experiment";
  label?: string;
}


// --- Missions (spec section 6) -------------------------------------------------

export type ObjectiveMetric =
  | "grassPercent"
  | "grassRegionPercent"
  | "speciesCount"
  | "speciesPresentCount"
  | "treeCount"
  | "forestCoverPercent"
  | "pollution"
  | "waterQuality";

export interface MissionObjective {
  id: string;
  text: string;
  metric: ObjectiveMetric;
  op: ">=" | "<=";
  value: number;
  /** atEnd: measured on the final day. throughout: must hold on every day of the run. */
  timing: "atEnd" | "throughout";
  species?: string;
  region?: string;
}

export interface MissionStart {
  env: Omit<EnvironmentState, "simulationHour">;
  grassPercent: Record<string, number>;
  populations: Record<string, number>;
}

export interface MissionDef {
  id: string;
  title: string;
  mapId: string;
  durationDays: number;
  minDurationDays: number;
  problem: string;
  briefing: string;
  allowedControls: ControlKey[];
  start: MissionStart;
  objectives: MissionObjective[];
}

export interface ObjectiveResult {
  id: string;
  text: string;
  timing: "atEnd" | "throughout";
  /** The value at the end, or the worst value over the run for 'throughout'. */
  measured: number;
  target: number;
  op: ">=" | "<=";
  passed: boolean;
}

export interface MissionOutcome {
  passed: boolean;
  objectives: ObjectiveResult[];
  durationOk: boolean;
  evidenceOk: boolean;
  settingsOk: boolean;
  problems: string[];
}

export interface MissionSubmission {
  id: string;
  missionId: string;
  recordId: string;
  evidence: string;
  outcome: MissionOutcome;
  createdAt: string;
}

export interface MissionProgress {
  status: "not-started" | "in-progress" | "completed";
  submissions: MissionSubmission[];
}
