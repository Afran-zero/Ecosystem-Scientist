import type { ExperimentRecord, ExperimentSettings, MissionSubmission } from "@/types";
import { defaultSettings } from "@/simulation/controls";
import { browserStorage, readSave, writeSave, type StorageLike } from "./save";
import type { SaveFileData } from "./schema";

/**
 * Progress kept in this browser (spec section 9): mission status, the field journal, the experiment
 * runs and the island's base. The live island is not saved yet (milestone M5), so the live part of
 * the file is written empty here. A save that cannot be read is never overwritten.
 */

export type MissionStatus = "not-started" | "in-progress" | "completed";

export interface MissionProgress {
  status: MissionStatus;
  submissions: MissionSubmission[];
}

export type ProgressMap = Record<string, MissionProgress>;

export interface JournalObservation {
  id: string;
  speciesId: string;
  /** The island (hub or mission id) where the animal was seen. */
  mapId: string;
  /** Simulated day, counting from 1. */
  day: number;
  text: string;
}

export interface Journal {
  /** Species ids the player has inspected, plus "research-lab" once the lab has been opened. */
  discovered: string[];
  observations: JournalObservation[];
}

export const EMPTY_JOURNAL: Journal = { discovered: [], observations: [] };

export interface SavedProgress {
  missions: ProgressMap;
  journal: Journal;
  experiments: ExperimentRecord[];
  /** The hub's base settings when a player has made an experiment its new base. Null for the original base. */
  hubBase: ExperimentSettings | null;
}

/** Runs kept in the save. The newest are kept when storage is short. */
export const MAX_SAVED_RUNS = 20;

export function loadProgress(storage: StorageLike | null = browserStorage()): SavedProgress {
  const empty: SavedProgress = { missions: {}, journal: EMPTY_JOURNAL, experiments: [], hubBase: null };
  const result = readSave(storage);
  if (result.status !== "ok") return empty;
  const p = result.data.progress;
  return {
    missions: p.missions as ProgressMap,
    journal: p.journal as Journal,
    experiments: p.experiments as ExperimentRecord[],
    hubBase: (p.hubBase as ExperimentSettings | undefined) ?? null,
  };
}

export interface ProgressToSave {
  missions: ProgressMap;
  journal: Journal;
  experiments: ExperimentRecord[];
  hubBase: ExperimentSettings | null;
}

/**
 * Writes progress to this browser. Returns how many runs were kept, or -1 when nothing could be
 * written. When storage is full, the oldest runs are dropped first, and the caller can say so.
 */
export function saveProgress(progress: ProgressToSave, storage: StorageLike | null = browserStorage()): number {
  const previous = readSave(storage);
  if (previous.status === "corrupt" || previous.status === "unsupported") return -1;

  const runs = progress.experiments.slice(-MAX_SAVED_RUNS);
  for (let keep = runs.length; keep >= 0; keep--) {
    const subset = runs.slice(runs.length - keep);
    const data = buildFile(previous.status === "ok" ? previous.data : null, { ...progress, experiments: subset });
    if (writeSave(storage, data)) return keep;
  }
  return -1;
}

function buildFile(previous: SaveFileData | null, p: ProgressToSave): SaveFileData {
  const savedAt = new Date().toISOString();
  if (previous) {
    return {
      ...previous,
      savedAt,
      progress: {
        ...previous.progress,
        missions: p.missions,
        journal: p.journal,
        experiments: p.experiments,
        hubBase: p.hubBase ?? undefined,
      },
    };
  }
  return {
    schemaVersion: 1,
    savedAt,
    progress: {
      missions: p.missions,
      experiments: p.experiments,
      journal: p.journal,
      labSettings: defaultSettings(),
      hubBase: p.hubBase ?? undefined,
    },
    live: { mapId: "hub", missionId: null, snapshots: {}, player: null },
  };
}
