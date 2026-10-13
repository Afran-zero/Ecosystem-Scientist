import { defaultSettings } from "@/simulation/controls";
import type { MissionSubmission } from "@/types";
import { browserStorage, readSave, writeSave } from "./save";
import type { SaveFileData } from "./schema";

/**
 * Mission progress and the field journal, stored through the save service (spec section 9). The
 * live island is not saved yet (milestone M5), so the live part of the file is written empty here.
 * A save that cannot be read is never overwritten, so the recovery option can still see it.
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
}

export function loadProgress(): SavedProgress {
  const result = readSave(browserStorage());
  if (result.status !== "ok") return { missions: {}, journal: EMPTY_JOURNAL };
  return {
    missions: result.data.progress.missions as ProgressMap,
    journal: result.data.progress.journal as Journal,
  };
}

/** Returns false when the save could not be written, or when an existing save must be kept as it is. */
export function saveProgress(missions: ProgressMap, journal: Journal): boolean {
  const storage = browserStorage();
  const previous = readSave(storage);
  if (previous.status === "corrupt" || previous.status === "unsupported") return false;

  const savedAt = new Date().toISOString();
  const data: SaveFileData =
    previous.status === "ok"
      ? { ...previous.data, savedAt, progress: { ...previous.data.progress, missions, journal } }
      : {
          schemaVersion: 1,
          savedAt,
          progress: {
            missions,
            experiments: [],
            journal,
            labSettings: defaultSettings(),
          },
          live: { mapId: "hub", missionId: null, snapshots: {}, player: null },
        };
  return writeSave(storage, data);
}
