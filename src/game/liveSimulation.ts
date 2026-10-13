import { startMetrics, type StartMetrics } from "@/missions/explain";
import { evaluateMission, missionDefaults } from "@/missions/mission";
import {
  EMPTY_JOURNAL,
  loadProgress,
  saveProgress,
  type Journal,
  type JournalObservation,
  type MissionProgress,
  type ProgressMap,
} from "@/persistence/progress";
import { defaultSettings, validateSettings } from "@/simulation/controls";
import type { Intervention, Simulation } from "@/simulation/engine";
import type {
  ControlKey,
  EnvironmentState,
  ExperimentRecord,
  ExperimentSettings,
  GameConfig,
  MissionDef,
  MissionOutcome,
  MissionSubmission,
  WorldMap,
} from "@/types";

/**
 * Shared store between the Phaser islands and the React screens (plan section 7.1).
 * Each island (the hub and each mission) keeps its own live simulation for the page session, so
 * leaving an island and coming back does not rebuild it. The lab, dialogs and mission progress
 * all read from here. Nothing in this file owns ecology: the simulation engine does.
 */

export const HUB_ID = "hub";
/** Key for runs made on the hub, which has no mission. */
const SANDBOX = "sandbox";

/** What an island hands over once its simulation exists. */
export interface LiveWorld {
  islandId: string;
  mission: MissionDef | null;
  config: GameConfig;
  world: WorldMap;
  sim: Simulation;
  env: EnvironmentState;
  /** Starting grass per region for regions that the lab's grass control does not set. */
  baseGrassPercent: Record<string, number>;
}

export type SavedRun = ExperimentRecord & { role?: "control" | "experiment"; label?: string };

export type Dialog =
  | { kind: "animal"; animalId: string; speciesId: string }
  | { kind: "mission"; missionId: string }
  | { kind: "result" }
  | null;

export interface LastResult {
  missionId: string;
  record: SavedRun;
  evidence: string;
  outcome: MissionOutcome;
  /** The state the run started from, measured before any day ran. */
  start: StartMetrics;
}

type Listener = () => void;
type Errors = Partial<Record<ControlKey, string>>;

class LiveSimulationStore {
  private islands = new Map<string, LiveWorld>();
  private active: LiveWorld | null = null;
  private settings: ExperimentSettings = defaultSettings();
  private errors: Errors = {};
  private runs: SavedRun[] = [];
  private labOpen = false;
  private dialogState: Dialog = null;
  private progressState: ProgressMap = {};
  private hydrated = false;
  private result: LastResult | null = null;
  private journalState: Journal = EMPTY_JOURNAL;
  private hubBaseState: ExperimentSettings | null = null;
  /** Set when the browser could not keep every saved run. Shown in the lab. */
  private droppedRuns = 0;
  private interventionLog: string[] = [];
  private touchVector = { x: 0, y: 0 };
  private touchInteractPending = false;
  private travelHandler: ((islandId: string) => void) | null = null;
  private version = 0;
  private listeners = new Set<Listener>();

  // --- Islands -----------------------------------------------------------

  /** The settings an island starts from: the mission's start, the hub base, or the original hub defaults. */
  private defaultsFor(mission: MissionDef | null): ExperimentSettings {
    if (mission) return missionDefaults(mission);
    return this.hubBaseState ?? defaultSettings();
  }

  /** Called by an island scene once its simulation exists. Settings reset when the island changes. */
  attach = (world: LiveWorld): void => {
    this.islands.set(world.islandId, world);
    if (!this.active || this.active.islandId !== world.islandId) {
      this.settings = this.defaultsFor(world.mission);
      this.errors = {};
    }
    this.active = world;
    this.bump();
  };

  cachedIsland = (islandId: string): LiveWorld | undefined => this.islands.get(islandId);

  get liveWorld(): LiveWorld | null {
    return this.active;
  }

  get islandId(): string {
    return this.active?.islandId ?? HUB_ID;
  }

  get mission(): MissionDef | null {
    return this.active?.mission ?? null;
  }

  /** Registers the scene's function that moves the player to another island. */
  setTravelHandler = (handler: ((islandId: string) => void) | null): void => {
    this.travelHandler = handler;
  };

  /** Moves to another island (the hub or a mission). Closes the lab and any dialog first. */
  travel = (islandId: string): void => {
    this.labOpen = false;
    this.dialogState = null;
    this.bump();
    this.travelHandler?.(islandId);
  };

  /**
   * Discards a mission's live island, so its next visit starts from the defined damaged state
   * (plan M4.9). Mission progress and submissions are kept.
   */
  resetIsland = (islandId: string): void => {
    this.islands.delete(islandId);
    this.runs = this.runs.filter((r) => r.missionId !== islandId);
    this.persist();
    if (this.active?.islandId === islandId) this.active = null;
    this.settings = this.defaultsFor(this.mission);
    this.errors = {};
    this.bump();
    this.travel(islandId);
  };

  // --- Settings ------------------------------------------------------------

  get currentSettings(): ExperimentSettings {
    return this.settings;
  }

  get currentSettingsErrors(): Errors {
    return this.errors;
  }

  /** The defaults the active island starts from. Reset buttons go back to these. */
  get islandDefaultSettings(): ExperimentSettings {
    return this.defaultsFor(this.mission);
  }

  // --- Island base (experiments that become the new base) ----------------------

  /** The hub's custom base, or null while the original base is in use. */
  get hubBase(): ExperimentSettings | null {
    return this.hubBaseState;
  }

  /** Number of saved runs dropped because the browser's storage was full. */
  get droppedRunCount(): number {
    return this.droppedRuns;
  }

  /**
   * Makes these settings the hub's base. The live hub is rebuilt from them, so the caller must have
   * confirmed it. Missions never change: their start is the defined damaged state (plan M4.9).
   */
  setHubBase = (settings: ExperimentSettings): void => {
    this.hubBaseState = { ...settings };
    this.persist();
    this.rebuildHub();
  };

  /** Returns the hub to its original base and rebuilds it. */
  clearHubBase = (): void => {
    this.hubBaseState = null;
    this.persist();
    this.rebuildHub();
  };

  /**
   * Rebuilds the hub in place, keeping the lab open so the player stays where they were. Unlike
   * travel, it does not close the lab or a dialog.
   */
  private rebuildHub(): void {
    this.islands.delete(HUB_ID);
    this.active = null;
    this.settings = this.defaultsFor(null);
    this.errors = {};
    this.bump();
    this.travelHandler?.(HUB_ID);
  }

  /**
   * Accepts a value only if it passes validation. An invalid value is rejected, never clamped,
   * and the last accepted value stays in place (decision D-26).
   */
  setSetting = (key: ControlKey, value: number): boolean => {
    const candidate = { ...this.settings, [key]: value };
    const check = validateSettings(candidate);
    if (!check.ok && check.errors[key]) {
      this.errors = { ...this.errors, [key]: check.errors[key] };
      this.bump();
      return false;
    }
    const { [key]: _cleared, ...rest } = this.errors;
    this.errors = rest;
    this.settings = candidate;
    this.bump();
    return true;
  };

  resetSettings = (): void => {
    this.settings = this.defaultsFor(this.mission);
    this.errors = {};
    this.bump();
  };

  // --- Experiment runs -------------------------------------------------------

  /** Runs saved for the island the player is on. */
  get savedExperiments(): readonly SavedRun[] {
    const key = this.mission?.id ?? SANDBOX;
    return this.runs.filter((r) => r.missionId === key);
  }

  saveExperiment = (run: SavedRun): void => {
    this.runs = [...this.runs, run];
    this.persist();
    this.bump();
  };

  /** Removes one saved run from this island's list and from the browser. */
  deleteExperiment = (id: string): void => {
    this.runs = this.runs.filter((r) => r.id !== id);
    this.persist();
    this.bump();
  };

  clearExperiments = (): void => {
    const key = this.mission?.id ?? SANDBOX;
    this.runs = this.runs.filter((r) => r.missionId !== key);
    this.persist();
    this.bump();
  };

  // --- Mission progress --------------------------------------------------------

  /** Loads saved progress once, in the browser. Call from an effect so server and client render alike. */
  hydrate = (): void => {
    if (this.hydrated) return;
    this.hydrated = true;
    const saved = loadProgress();
    this.progressState = saved.missions;
    this.journalState = saved.journal;
    this.runs = saved.experiments.map((r) => ({ ...r, role: r.role, label: r.label }));
    this.hubBaseState = saved.hubBase;
    this.bump();
  };

  get progress(): ProgressMap {
    return this.progressState;
  }

  progressFor(missionId: string): MissionProgress {
    return this.progressState[missionId] ?? { status: "not-started", submissions: [] };
  }

  get lastResult(): LastResult | null {
    return this.result;
  }

  /**
   * Scores an experiment against the active mission. Completion comes from the criteria, never
   * from a button (plan M4.3). The outcome is stored and the results screen opens.
   */
  submitEvidence = (record: SavedRun, evidence: string): MissionOutcome | null => {
    const live = this.active;
    const mission = live?.mission;
    if (!live || !mission) return null;
    const outcome = evaluateMission(mission, record, evidence);
    const previous = this.progressFor(mission.id);
    const submission: MissionSubmission = {
      id: `${mission.id}-sub-${previous.submissions.length + 1}`,
      missionId: mission.id,
      recordId: record.id,
      evidence: evidence.trim(),
      outcome,
      createdAt: new Date().toISOString(),
    };
    const status = previous.status === "completed" || outcome.passed ? "completed" : "in-progress";
    this.progressState = {
      ...this.progressState,
      [mission.id]: { status, submissions: [...previous.submissions, submission] },
    };
    this.persist();
    const start = startMetrics(live.config, live.world, record);
    this.result = { missionId: mission.id, record, evidence: evidence.trim(), outcome, start };
    this.dialogState = { kind: "result" };
    this.bump();
    return outcome;
  };

  // --- Lab and dialogs ---------------------------------------------------------

  get isLabOpen(): boolean {
    return this.labOpen;
  }

  openLab = (): void => {
    if (this.labOpen) return;
    this.labOpen = true;
    this.discover("research-lab");
    this.bump();
  };

  closeLab = (): void => {
    if (!this.labOpen) return;
    this.labOpen = false;
    this.bump();
  };

  get dialog(): Dialog {
    return this.dialogState;
  }

  openDialog = (dialog: Exclude<Dialog, null>): void => {
    this.dialogState = dialog;
    if (dialog.kind === "animal") this.recordObservation(dialog.animalId, dialog.speciesId);
    this.bump();
  };

  // --- Field journal (plan M4.11) ----------------------------------------------

  get journal(): Journal {
    return this.journalState;
  }

  /** Adds a topic to the journal the first time it is met. */
  private discover(topic: string): void {
    if (this.journalState.discovered.includes(topic)) return;
    this.journalState = { ...this.journalState, discovered: [...this.journalState.discovered, topic] };
    this.persist();
  }

  /** Records what the player saw when they inspected an animal: its state and where it was. */
  private recordObservation(animalId: string, speciesId: string): void {
    const live = this.active;
    if (!live) return;
    this.discover(speciesId);
    const animal = live.sim.liveAnimals.find((a) => a.id === animalId);
    const name = live.config.species.find((x) => x.id === speciesId)?.displayName ?? speciesId;
    const where = live.mission ? live.mission.title : "the hub island";
    const day = live.sim.currentDay + 1;
    const text = animal
      ? `${name} ${animal.state === "wander" ? "wandering" : animal.state} on ${where}, day ${day}, energy ${Math.round(animal.energy)}.`
      : `${name} on ${where}, day ${day}. This animal is no longer alive.`;
    const observation: JournalObservation = {
      id: `obs-${this.journalState.observations.length + 1}`,
      speciesId,
      mapId: live.islandId,
      day,
      text,
    };
    // Keep the most recent 200 observations so the save stays small.
    const observations = [...this.journalState.observations, observation].slice(-200);
    this.journalState = { ...this.journalState, observations };
    this.persist();
  }

  // --- Live intervention (plan M3.4) ---------------------------------------------

  /** Labels of the changes made to the live island, in order. */
  get interventions(): readonly string[] {
    return this.interventionLog;
  }

  /**
   * Applies a change to the running island. Only the controls the active mission allows may change,
   * and the simulation rejects bad values before anything changes. Returns false when refused.
   */
  applyIntervention = (change: Intervention, label: string): boolean => {
    const live = this.active;
    if (!live || !live.mission) return false;
    const allowed = new Set<string>(live.mission.allowedControls);
    const keys = [...Object.keys(change.env ?? {}), ...Object.keys(change.population ?? {})];
    if (keys.some((k) => !allowed.has(k))) return false;
    try {
      live.sim.intervene(change);
    } catch {
      return false;
    }
    this.interventionLog = [...this.interventionLog, label];
    this.bump();
    return true;
  };

  // --- Touch input (plan M1.9) ----------------------------------------------------

  /** Joystick direction, each axis from -1 to 1. (0, 0) when the thumb is off the stick. */
  setTouchVector = (x: number, y: number): void => {
    this.touchVector = { x, y };
  };

  get touchDirection(): { x: number; y: number } {
    return this.touchVector;
  }

  /** The interact button. The scene reads it once per press. */
  pressTouchInteract = (): void => {
    this.touchInteractPending = true;
  };

  takeTouchInteract = (): boolean => {
    const pending = this.touchInteractPending;
    this.touchInteractPending = false;
    return pending;
  };


  closeDialog = (): void => {
    if (!this.dialogState) return;
    this.dialogState = null;
    this.bump();
  };

  /** The island pauses while the lab or a dialog is open (plan M1.10). */
  get isPaused(): boolean {
    return this.labOpen || this.dialogState !== null;
  }

  /** The island calls this when its state changes outside the store (a new in-game day). */
  notify = (): void => {
    this.bump();
  };

  // --- Subscription ----------------------------------------------------------------

  /** Snapshot counter for useSyncExternalStore. It changes on every store change. */
  getVersion = (): number => this.version;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /**
   * Writes progress and the journal. Nothing is written before the saved state has been loaded,
   * so an early action cannot overwrite a save that has not been read yet.
   */
  private persist(): void {
    if (!this.hydrated) return;
    const kept = saveProgress({
      missions: this.progressState,
      journal: this.journalState,
      experiments: this.runs,
      hubBase: this.hubBaseState,
    });
    this.droppedRuns = kept >= 0 ? this.runs.length - kept : 0;
  }

  private bump(): void {
    this.version += 1;
    for (const l of this.listeners) l();
  }
}

export const liveSimulation = new LiveSimulationStore();
