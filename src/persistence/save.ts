import { saveFileSchema, type SaveFileData } from "./schema";

/**
 * Local save service (spec section 9). One key, one versioned JSON document.
 * Reading never throws. A bad save becomes a status the UI can show as a recovery screen.
 */

export const SAVE_KEY = "ecosystem-scientist.save";
export const SAVE_SCHEMA_VERSION = 1;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type LoadResult =
  | { status: "none" }
  | { status: "ok"; data: SaveFileData }
  | { status: "corrupt"; reason: string; raw: string }
  | { status: "unsupported"; version: unknown; raw: string };

/** The browser's localStorage, or null when storage is blocked (private windows, disabled site data). */
export function browserStorage(): StorageLike | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    const probe = "__ecosystem_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Reads and validates the save. Never throws. */
export function readSave(storage: StorageLike | null): LoadResult {
  if (!storage) return { status: "none" };
  let raw: string | null;
  try {
    raw = storage.getItem(SAVE_KEY);
  } catch (err) {
    return { status: "corrupt", reason: `storage could not be read: ${String(err)}`, raw: "" };
  }
  if (raw === null) return { status: "none" };

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { status: "corrupt", reason: "the save is not valid JSON", raw };
  }

  const version = (json as { schemaVersion?: unknown })?.schemaVersion;
  if (version !== SAVE_SCHEMA_VERSION) {
    return { status: "unsupported", version, raw };
  }

  const parsed = saveFileSchema.safeParse(json);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const where = first?.path.join(".") || "(root)";
    return { status: "corrupt", reason: `${where}: ${first?.message ?? "does not match the save format"}`, raw };
  }
  return { status: "ok", data: parsed.data };
}

/** Writes the save. Returns false when storage is full or blocked, so the game can carry on. */
export function writeSave(storage: StorageLike | null, data: SaveFileData): boolean {
  if (!storage) return false;
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function clearSave(storage: StorageLike | null): void {
  try {
    storage?.removeItem(SAVE_KEY);
  } catch {
    // Nothing to clear if storage is blocked.
  }
}
