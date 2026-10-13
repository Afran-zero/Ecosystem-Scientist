"use client";

import { useEffect, useRef } from "react";

/**
 * Mounts the Phaser game on the client only. Phaser needs `window`, so it never runs on the server.
 * The island to start comes from the URL (?island=hub or ?island=mission-meadow), so a mission can
 * be opened straight from the mission list. Missing or unknown values start the hub.
 */
const KNOWN_ISLANDS = ["hub", "mission-meadow", "mission-forest", "mission-pond"];

export default function PhaserGame() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let game: { destroy: (removeCanvas: boolean) => void } | undefined;

    (async () => {
      const PhaserModule = await import("phaser");
      const Phaser = PhaserModule.default;
      const { HubScene } = await import("@/game/HubScene");
      if (cancelled || !hostRef.current) return;

      const requested = new URLSearchParams(window.location.search).get("island") ?? "hub";
      const islandId = KNOWN_ISLANDS.includes(requested) ? requested : "hub";

      const instance = new Phaser.Game({
        type: Phaser.AUTO,
        parent: hostRef.current,
        width: 960,
        height: 640,
        pixelArt: true,
        backgroundColor: "#1d3b5a",
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        physics: {
          default: "arcade",
          arcade: { debug: false },
        },
        scene: [],
      });
      game = instance;
      // The scene is added without autoStart so it can receive the island it should show.
      instance.scene.add("island", HubScene, false);
      instance.events.once("ready", () => {
        instance.scene.start("island", { islandId });
      });
    })();

    return () => {
      cancelled = true;
      game?.destroy(true);
    };
  }, []);

  return <div ref={hostRef} className="h-full w-full" />;
}
