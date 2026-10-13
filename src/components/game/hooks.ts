"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { ISLAND_MAP_IDS } from "@/missions/catalogue";
import { parseMissions } from "@/missions/mission";
import { liveSimulation } from "@/game/liveSimulation";
import type { MissionDef } from "@/types";

/** The store, re-rendering the component whenever it changes. */
export function useLiveSimulation() {
  useSyncExternalStore(liveSimulation.subscribe, liveSimulation.getVersion, liveSimulation.getVersion);
  return liveSimulation;
}

const jsonCache = new Map<string, unknown>();

/** Fetches a file from public/ once per page session. Returns null until it arrives. */
export function useJson<T>(url: string): T | null {
  const [data, setData] = useState<T | null>(() => (jsonCache.has(url) ? (jsonCache.get(url) as T) : null));
  useEffect(() => {
    if (jsonCache.has(url)) {
      setData(jsonCache.get(url) as T);
      return;
    }
    let alive = true;
    fetch(url)
      .then((r) => r.json())
      .then((json: T) => {
        jsonCache.set(url, json);
        if (alive) setData(json);
      })
      .catch(() => {
        // A missing file leaves the panel empty; the rest of the page still works.
      });
    return () => {
      alive = false;
    };
  }, [url]);
  return data;
}

/** The three validated missions from public/data/missions.json. */
export function useMissions(): MissionDef[] {
  const raw = useJson<unknown>("/data/missions.json");
  return useMemo(() => (raw ? parseMissions(raw, ISLAND_MAP_IDS) : []), [raw]);
}

/** Runs a callback every half second, so live readings (day, animal counts) stay current. */
export function useTick(ms = 500): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), ms);
    return () => window.clearInterval(id);
  }, [ms]);
  return tick;
}
