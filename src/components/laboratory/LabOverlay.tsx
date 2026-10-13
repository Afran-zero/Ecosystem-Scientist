"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { liveSimulation } from "@/game/liveSimulation";
import ControlPanel from "./ControlPanel";
import ExperimentsPanel from "./ExperimentsPanel";
import FoodChainLesson from "./FoodChainLesson";
import InterventionPanel from "./InterventionPanel";
import ProjectionCharts from "./ProjectionCharts";
import FoodWebDiagram from "./FoodWebDiagram";
import ResultsPanel from "./ResultsPanel";

/**
 * The research laboratory (spec 4). A large overlay over the island. The island pauses while it is
 * open. Closing it returns to the island with nothing lost: settings, saved runs, and the live world.
 */

type Tab = "overview" | "environment" | "populations" | "food" | "experiments" | "results";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "environment", label: "Environment" },
  { id: "populations", label: "Populations" },
  { id: "food", label: "Food web" },
  { id: "experiments", label: "Experiments" },
  { id: "results", label: "Results" },
];

export default function LabOverlay() {
  useSyncExternalStore(liveSimulation.subscribe, liveSimulation.getVersion, liveSimulation.getVersion);
  const [tab, setTab] = useState<Tab>("overview");
  const open = liveSimulation.isLabOpen;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") liveSimulation.closeLab();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const live = liveSimulation.liveWorld;
  if (!open || !live) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label="Research laboratory" className="fixed inset-0 z-50 flex flex-col bg-ink/97 text-cream">
      <header className="flex items-center justify-between border-b border-brown px-4 py-3">
        <div>
          <h2 className="text-base font-semibold">Research Laboratory</h2>
          <p className="text-xs text-cream-muted">
            {live.mission ? `Mission: ${live.mission.title}.` : "Sandbox on the hub island."} The island is paused while the lab is open.
          </p>
        </div>
        <button
          type="button"
          onClick={() => liveSimulation.closeLab()}
          className="rounded border border-soil px-3 py-1.5 text-sm hover:bg-walnut"
        >
          Back to island (Esc)
        </button>
      </header>

      <nav className="flex gap-1 overflow-x-auto border-b border-brown px-3" aria-label="Laboratory sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm ${tab === t.id ? "border-moss-light text-cream" : "border-transparent text-cream-muted hover:text-cream"}`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4 xl:p-6">
        {tab === "overview" ? <Overview /> : null}
        {tab === "environment" ? <EnvironmentTab /> : null}
        {tab === "populations" ? <PopulationsTab /> : null}
        {tab === "food" ? (
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div>
              <FoodWebDiagram config={live.config} />
            </div>
            <FoodChainLesson config={live.config} />
          </div>
        ) : null}
        {tab === "experiments" ? <ExperimentsPanel /> : null}
        {tab === "results" ? <ResultsPanel config={live.config} /> : null}
      </main>
    </div>
  );
}

function Overview() {
  const live = liveSimulation.liveWorld!;
  const sim = live.sim;
  const counts = sim.countBySpecies();
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const grass = sim.grassCoveragePercent();
  const present = live.config.species.filter((s) => counts[s.id] > 0).length;
  // Composite of grass coverage and species presence. Stated in the label, not a hidden formula.
  const health = Math.round(0.5 * grass + 0.5 * (present / live.config.species.length) * 100);
  const env = sim.environment;
  return (
    <div className="eco-grid">
      <section className="rounded border border-brown p-4">
        <h3 className="text-sm font-semibold">Simulation day</h3>
        <p className="mt-1 text-3xl font-bold">Day {sim.currentDay + 1}</p>
        <p className="text-xs text-cream-muted">Hour {sim.currentHour % 24} of 24</p>
      </section>
      <section className="rounded border border-brown p-4">
        <h3 className="text-sm font-semibold">Ecosystem health</h3>
        <p className="mt-1 text-3xl font-bold">{health} / 100</p>
        <p className="text-xs text-cream-muted">Composite: half grass coverage ({grass.toFixed(1)}%), half species present ({present} of {live.config.species.length}).</p>
      </section>
      <section className="rounded border border-brown p-4">
        <h3 className="text-sm font-semibold">Population totals</h3>
        <p className="mt-1 text-2xl font-bold">{total} animals</p>
        <ul className="mt-2 grid grid-cols-2 gap-1 text-sm text-cream-soft">
          {live.config.species.map((s) => (
            <li key={s.id}>
              {s.displayName}: {counts[s.id]}
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded border border-brown p-4">
        <h3 className="text-sm font-semibold">Active mission</h3>
        <p className="mt-1 text-sm font-medium text-cream">{live.mission ? live.mission.title : "None. Sandbox on the hub island."}</p>
        <p className="mt-1 text-xs text-cream-muted">
          {live.mission ? live.mission.problem : "Open a mission from its briefing point on the island to start a restoration task."}
        </p>
        <h3 className="mt-4 text-sm font-semibold">Current world state</h3>
        <ul className="mt-1 grid grid-cols-2 gap-1 text-sm text-cream-soft">
          <li>Temperature: {env.temperatureC} °C</li>
          <li>Rainfall: {env.rainfallMmPerDay} mm/day</li>
          <li>Sunlight: {env.sunlightPercent}%</li>
          <li>Soil quality: {env.soilQuality}</li>
          <li>Pollution: {env.pollution}</li>
          <li>Water quality: {env.waterQuality}</li>
        </ul>
      </section>
    </div>
  );
}

function EnvironmentTab() {
  return (
    <div className="eco-split">
      <div className="eco-split-side min-w-0 space-y-5">
        <p className="text-sm text-cream-soft">
          These sliders set the conditions for experiments. The live island keeps its own environment. A labelled intervention on the live island is not built yet (plan M3.4).
        </p>
        <ControlPanel group="environment" />
        <InterventionPanel />
      </div>
      <div className="min-w-0">
        <ProjectionCharts />
      </div>
    </div>
  );
}

function PopulationsTab() {
  const live = liveSimulation.liveWorld!;
  const sim = live.sim;
  const counts = sim.countBySpecies();
  const days = sim.dayRecords;
  const last = days[days.length - 1];
  return (
    <div className="eco-split">
      <section className="eco-split-side min-w-0">
        <h3 className="mb-2 text-sm font-semibold">Starting populations and grass (for experiments)</h3>
        <p className="mb-3 text-sm text-cream-soft">
          These change the starting state of a new experiment only. They never add or remove animals from the live island.
        </p>
        <ControlPanel group="populations" />
      </section>
      <div className="min-w-0 space-y-6">
      <section>
        <h3 className="mb-2 text-sm font-semibold">Live island now</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-cream">
            <thead className="text-xs text-cream-muted">
              <tr>
                <th className="py-1 pr-4">Species</th>
                <th className="py-1 pr-4">Class</th>
                <th className="py-1 pr-4">Count</th>
                <th className="py-1 pr-4">Born (last day)</th>
                <th className="py-1 pr-4">Died (last day)</th>
                <th className="py-1 pr-4">Growth (last day)</th>
              </tr>
            </thead>
            <tbody>
              {live.config.species.map((s) => {
                const born = last?.births[s.id] ?? 0;
                const died = last?.deaths[s.id] ?? 0;
                const prev = days.length > 1 ? days[days.length - 2].counts[s.id] : undefined;
                const growth = prev && prev > 0 ? ((counts[s.id] - prev) / prev) * 100 : null;
                return (
                  <tr key={s.id} className="border-t border-brown">
                    <td className="py-1 pr-4">{s.displayName}</td>
                    <td className="py-1 pr-4 capitalize">{s.classification}</td>
                    <td className="py-1 pr-4">{counts[s.id]}</td>
                    <td className="py-1 pr-4">{born}</td>
                    <td className="py-1 pr-4">{died}</td>
                    <td className="py-1 pr-4">{growth === null ? "–" : `${growth >= 0 ? "+" : ""}${growth.toFixed(1)}%`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-cream-muted">Birth and death columns refer to the last completed in-game day.</p>
      </section>
      <ProjectionCharts />
      </div>
    </div>
  );
}
