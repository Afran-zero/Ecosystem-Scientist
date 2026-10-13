"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import GameDialogs from "@/components/game/GameDialogs";
import IslandHud from "@/components/game/IslandHud";
import TouchControls from "@/components/game/TouchControls";
import LabOverlay from "@/components/laboratory/LabOverlay";
import { liveSimulation } from "@/game/liveSimulation";

const PhaserGame = dynamic(() => import("@/components/game/PhaserGame"), {
  ssr: false,
  loading: () => <p className="p-4 text-sm text-cream-soft">Loading the island…</p>,
});

/** The island (Phaser), its HUD, the lab, and the dialogs. ?island=mission-meadow opens a mission. */
export default function GamePage() {
  useEffect(() => liveSimulation.hydrate(), []);
  return (
    <main className="flex h-dvh flex-col">
      <IslandHud />
      <div className="min-h-0 flex-1">
        <PhaserGame />
      </div>
      <LabOverlay />
      <TouchControls />
      <GameDialogs />
    </main>
  );
}
