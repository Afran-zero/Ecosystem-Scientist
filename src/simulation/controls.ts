import type { ControlKey, ControlSpec, ExperimentSettings } from "@/types";

/**
 * Laboratory controls (spec 4.2). Every control maps to one defined parameter.
 * Values outside the range are rejected, never clamped, so the simulation never gets a bad input.
 */
export const CONTROL_SPECS: ControlSpec[] = [
  { key: "temperatureC", label: "Temperature", unit: "°C", min: 0, max: 40, step: 0.5, defaultValue: 24, group: "environment" },
  { key: "rainfallMmPerDay", label: "Rainfall", unit: "mm/day", min: 0, max: 100, step: 1, defaultValue: 45, group: "environment" },
  { key: "sunlightPercent", label: "Sunlight", unit: "%", min: 0, max: 100, step: 1, defaultValue: 70, group: "environment" },
  { key: "soilQuality", label: "Soil quality", unit: "/100", min: 0, max: 100, step: 1, defaultValue: 70, group: "environment" },
  { key: "pollution", label: "Pollution", unit: "/100", min: 0, max: 100, step: 1, defaultValue: 20, group: "environment" },
  {
    key: "grassPercent",
    label: "Grass coverage at start",
    unit: "%",
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 90,
    group: "populations",
    note: "Sets grassland and meadow. Forest keeps its own value.",
  },
  { key: "rabbit", label: "Rabbits", unit: "animals", min: 0, max: 100, step: 1, defaultValue: 30, group: "populations", note: "Starting population of a new run only." },
  { key: "cow", label: "Cows", unit: "animals", min: 0, max: 50, step: 1, defaultValue: 12, group: "populations", note: "Starting population of a new run only." },
  { key: "chicken", label: "Chickens", unit: "animals", min: 0, max: 100, step: 1, defaultValue: 15, group: "populations", note: "Starting population of a new run only." },
  { key: "mouse", label: "Mice", unit: "animals", min: 0, max: 100, step: 1, defaultValue: 20, group: "populations", note: "Starting population of a new run only." },
  { key: "fox", label: "Foxes", unit: "animals", min: 0, max: 30, step: 1, defaultValue: 5, group: "populations", note: "Starting population of a new run only." },
  { key: "durationDays", label: "Duration", unit: "days", min: 1, max: 90, step: 1, defaultValue: 30, group: "run" },
];

export function defaultSettings(): ExperimentSettings {
  const out = {} as ExperimentSettings;
  for (const c of CONTROL_SPECS) out[c.key] = c.defaultValue;
  return out;
}

export type ValidationResult = { ok: true } | { ok: false; errors: Partial<Record<ControlKey, string>> };

/** Validates settings without changing them. Any error means the run must not start. */
export function validateSettings(settings: Partial<Record<ControlKey, unknown>>): ValidationResult {
  const errors: Partial<Record<ControlKey, string>> = {};
  for (const c of CONTROL_SPECS) {
    const v = settings[c.key];
    if (typeof v !== "number" || !Number.isFinite(v)) {
      errors[c.key] = `${c.label} must be a number`;
    } else if (v < c.min || v > c.max) {
      errors[c.key] = `${c.label} must be between ${c.min} and ${c.max} ${c.unit}`;
    } else if (c.step === 1 && !Number.isInteger(v)) {
      errors[c.key] = `${c.label} must be a whole number`;
    }
  }
  return Object.keys(errors).length === 0 ? { ok: true } : { ok: false, errors };
}

export function specFor(key: ControlKey): ControlSpec {
  const spec = CONTROL_SPECS.find((c) => c.key === key);
  if (!spec) throw new Error(`unknown control ${key}`);
  return spec;
}
