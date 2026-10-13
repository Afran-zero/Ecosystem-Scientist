"use client";

import Link from "next/link";
import { useState } from "react";
import { measureOn } from "@/missions/mission";
import { HUB_ID } from "@/game/liveSimulation";
import { useLiveSimulation, useTick } from "./hooks";

/**
 * The top bar over the island: where the player is, the day, the animals alive, and the mission
 * objectives measured on the latest simulated day. Reads the simulation only; it holds no copy.
 */
export default function IslandHud() {
  const store = useLiveSimulation();
  useTick(500);
  const [confirming, setConfirming] = useState(false);
  const live = store.liveWorld;

  if (!live) {
    return (
      <header className="flex items-center justify-between px-4 py-3 text-sm text-cream-soft">
        <Link href="/" className="eco-link">
          Main menu
        </Link>
        <span>Loading the island…</span>
      </header>
    );
  }

  const { sim, config, mission } = live;
  const counts = sim.countBySpecies();
  const day = sim.currentDay + 1;
  const hour = sim.currentHour % 24;
  const lastDay = sim.dayRecords[sim.dayRecords.length - 1];
  const lab = () => store.openLab();

  return (
    <div className="border-b border-cream/10 bg-ink/80 px-4 py-2.5 backdrop-blur">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <div className="mr-auto min-w-0">
          <p className="font-display text-sm text-honey">{mission ? mission.title : "Hub island"}</p>
          <p className="text-xs text-cream-muted">
            Day {day}, {String(hour).padStart(2, "0")}:00 · {store.isPaused ? "paused" : "running"} · WASD move · E interact · SPACE pause · 1 2 3 speed
          </p>
        </div>

        <ul className="flex flex-wrap gap-1.5" aria-label="Animals on the island">
          {config.species.map((s) => (
            <li key={s.id} className="eco-chip tabular-nums">
              {s.displayName} {counts[s.id] ?? 0}
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={lab} className="eco-btn">
            Research lab
          </button>
          {mission ? (
            <>
              <button type="button" onClick={() => store.travel(HUB_ID)} className="eco-btn">
                Back to hub
              </button>
              {confirming ? (
                <button
                  type="button"
                  onClick={() => {
                    setConfirming(false);
                    store.resetIsland(mission.id);
                  }}
                  className="eco-btn border-rust-light/60 text-rust-light"
                >
                  Confirm reset
                </button>
              ) : (
                <button type="button" onClick={() => setConfirming(true)} className="eco-btn">
                  Reset mission
                </button>
              )}
            </>
          ) : null}
          <Link href="/journal" className="eco-link text-sm">
            Field journal
          </Link>
          <Link href="/" className="eco-link text-sm">
            Main menu
          </Link>
        </div>
      </div>

      {mission ? (
        <ul className="mt-2 flex flex-wrap gap-2 text-xs" aria-label="Mission objectives">
          {mission.objectives.map((o) => {
            const value = lastDay ? measureOn(lastDay, o) : NaN;
            const ok = Number.isFinite(value) && (o.op === ">=" ? value >= o.value : value <= o.value);
            return (
              <li
                key={o.id}
                className={`rounded-md border px-2.5 py-1 ${ok ? "border-moss-light/50 bg-honey-hover/10 text-moss-light" : "border-cream/10 bg-cream/5 text-ink"}`}
              >
                <span className="font-medium">{ok ? "✓ " : ""}</span>
                {o.text}
                <span className="ml-2 tabular-nums text-cream-muted">
                  now {Number.isFinite(value) ? Math.round(value * 10) / 10 : "–"}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
