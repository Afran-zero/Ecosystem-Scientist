import { describe, expect, it, beforeEach } from "vitest";
import { liveSimulation } from "@/game/liveSimulation";
import { defaultSettings } from "@/simulation/controls";

// The store is a module-level singleton, so reset what each test changes.
beforeEach(() => {
  liveSimulation.resetSettings();
  liveSimulation.clearExperiments();
  if (liveSimulation.isLabOpen) liveSimulation.closeLab();
});

describe("laboratory store", () => {
  it("accepts a valid setting and keeps it", () => {
    expect(liveSimulation.setSetting("rabbit", 25)).toBe(true);
    expect(liveSimulation.currentSettings.rabbit).toBe(25);
    expect(liveSimulation.currentSettingsErrors.rabbit).toBeUndefined();
  });

  it("rejects an out-of-range setting and keeps the last valid value", () => {
    liveSimulation.setSetting("rabbit", 25);
    expect(liveSimulation.setSetting("rabbit", 500)).toBe(false);
    expect(liveSimulation.currentSettings.rabbit).toBe(25);
    expect(liveSimulation.currentSettingsErrors.rabbit).toMatch(/between 0 and 100/);
  });

  it("clears the error once a valid value arrives", () => {
    liveSimulation.setSetting("fox", 99);
    expect(liveSimulation.currentSettingsErrors.fox).toBeDefined();
    liveSimulation.setSetting("fox", 4);
    expect(liveSimulation.currentSettingsErrors.fox).toBeUndefined();
  });

  it("reset returns every control to its default", () => {
    liveSimulation.setSetting("temperatureC", 35);
    liveSimulation.resetSettings();
    expect(liveSimulation.currentSettings).toEqual(defaultSettings());
  });

  it("keeps the open or closed state of the lab", () => {
    liveSimulation.openLab();
    expect(liveSimulation.isLabOpen).toBe(true);
    liveSimulation.closeLab();
    expect(liveSimulation.isLabOpen).toBe(false);
  });

  it("notifies subscribers when something changes", () => {
    let calls = 0;
    const unsubscribe = liveSimulation.subscribe(() => calls++);
    liveSimulation.setSetting("cow", 5);
    liveSimulation.openLab();
    unsubscribe();
    liveSimulation.closeLab();
    expect(calls).toBe(2);
  });
});
