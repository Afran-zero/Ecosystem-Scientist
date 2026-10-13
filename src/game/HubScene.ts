import Phaser from "phaser";
import { missionDefaults, parseMissions } from "@/missions/mission";
import { parseEnvironment, parseGameConfig } from "@/simulation/config";
import { Simulation } from "@/simulation/engine";
import { buildRun } from "@/simulation/experiments";
import { isBlocked, parseWorldMap } from "@/simulation/world";
import type { Animal, GameConfig, MissionDef, WorldMap } from "@/types";
import { ISLAND_MAP_IDS } from "@/missions/catalogue";
import { HUB_ID, liveSimulation } from "./liveSimulation";

/**
 * One island scene. The hub and each mission share this scene and differ only by map, starting
 * state and objectives (plan 3.4). Phaser draws and moves the player. The simulation owns every
 * animal: this scene only reads animal positions and states from it (plan section 7.1).
 */

const TILE = 16;
const PLAYER_SPEED = 72; // world px per second
const HOUR_MS_AT_1X = 2000; // one in-game hour per 2 real seconds at 1x (decision D-10)
const SPEED_STEPS = [0, 1, 5, 10] as const; // 0 = paused
const PLAYER_FRAME = 9; // Tiny Creatures #9, green-hatted adventurer (checked 2026-10-12)
const SIM_SEED = 2026;

/** Scene data passed when the scene starts or restarts. */
export interface IslandInit {
  islandId?: string;
}

/** Test hook exposed on window.__ecosystem. Read-only, except for the lab, dialog and island controls. */
export interface EcosystemTestHook {
  player: () => { x: number; y: number; tileX: number; tileY: number; blocked: boolean };
  island: () => string;
  isLabOpen: () => boolean;
  openLab: () => void;
  closeLab: () => void;
  hour: () => number;
  treeSprites: () => number;
  /** Depth of the tree sprite on tile (x, y), or null when there is no tree there. */
  treeDepthAt: (x: number, y: number) => number | null;
  /** Id of the animal the E key would inspect from here, or null. */
  nearestAnimalId: () => string | null;
  /** Runs the same action as pressing E at the player's position. */
  interactNearest: () => void;
  /** Test only: moves the player beside an animal away from buildings, then presses E. Returns the animal id. */
  inspectAnimal: () => string | null;
  /** Test only: moves the player onto an animal without pressing E. Returns the animal id. */
  standNearAnimal: () => string | null;
  /** Test only: runs the island forward by whole days without the clock. */
  advanceDays: (days: number) => void;
  /** Test only: the whole simulation state, as JSON, for exact comparisons. */
  snapshotJson: () => string;
  /** Test only: the live environment values. */
  liveEnvironment: () => Record<string, number>;
  /** Test only: moves the player to the centre of a tile. */
  teleportPlayer: (x: number, y: number) => void;
  walkable: (x: number, y: number) => boolean;
  playerDepth: () => number;
}

const HUB_GRASS_START = { grassland: 90, meadow: 90, forest_edge: 80, forest: 40 };

export class HubScene extends Phaser.Scene {
  private islandId: string = HUB_ID;
  private mission: MissionDef | null = null;
  private mapKey = "";
  private config!: GameConfig;
  private world!: WorldMap;
  private sim!: Simulation;
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private solid!: Phaser.Tilemaps.TilemapLayer;
  private animalSprites = new Map<string, Phaser.GameObjects.Sprite>();
  private prompt!: Phaser.GameObjects.Text;
  private accumulatorMs = 0;
  private speedIndex = 1; // 1x
  private keys!: Record<"W" | "A" | "S" | "D" | "E" | "SPACE" | "ONE" | "TWO" | "THREE", Phaser.Input.Keyboard.Key>;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private treeCount = 0;
  private treeSprites = new Map<string, Phaser.GameObjects.Image>();

  constructor() {
    super("island");
  }

  init(data: IslandInit): void {
    this.islandId = data?.islandId ?? HUB_ID;
    this.animalSprites = new Map();
    this.treeSprites = new Map();
    this.treeCount = 0;
    this.accumulatorMs = 0;
  }

  preload(): void {
    this.load.json("species", "/data/species.json");
    this.load.json("foodweb", "/data/food-web.json");
    this.load.json("env", "/data/environment-hub.json");
    this.load.json("missions", "/data/missions.json");
    for (const id of ISLAND_MAP_IDS) this.load.tilemapTiledJSON(`map-${id}`, `/maps/${id}.json`);
    this.load.image("atlas", "/assets/tilesets/atlas.png");
    // Same image as a frame sheet, so tree tiles can be drawn as sprites and depth-sorted.
    this.load.spritesheet("atlasFrames", "/assets/tilesets/atlas.png", { frameWidth: TILE, frameHeight: TILE });
    this.load.spritesheet("creatures", "/assets/animals/creatures.png", {
      frameWidth: 16,
      frameHeight: 16,
      spacing: 1,
    });
  }

  create(): void {
    this.config = parseGameConfig(this.cache.json.get("species"), this.cache.json.get("foodweb"));
    const missions = parseMissions(this.cache.json.get("missions"), ISLAND_MAP_IDS);
    this.mission = missions.find((m) => m.id === this.islandId) ?? null;
    const mapId = this.mission?.mapId ?? HUB_ID;
    this.mapKey = `map-${mapId}`;
    const mapJson = this.cache.tilemap.get(this.mapKey).data;

    const cached = liveSimulation.cachedIsland(this.islandId);
    const env = this.mission
      ? parseEnvironment(this.mission.start.env)
      : parseEnvironment(this.cache.json.get("env"));
    this.world = cached?.world ?? parseWorldMap(mapJson);

    const map = this.make.tilemap({ key: this.mapKey });
    const tiles = map.addTilesetImage("atlas", "atlas");
    if (!tiles) throw new Error(`${mapId} map: tileset 'atlas' not found`);
    map.createLayer("ground", tiles, 0, 0);
    // Buildings (Tiny Town tiles) for the research lab, and any other solid structures.
    map.createLayer("buildings", tiles, 0, 0);
    // Trees are drawn as sprites below (not in a tile layer) so they sort with the player.
    // The solid layer defines blocked tiles for both Phaser and the simulation. It stays invisible.
    const solid = map.createLayer("solid", tiles, 0, 0) as Phaser.Tilemaps.TilemapLayer | null;
    if (!solid) throw new Error(`${mapId} map: 'solid' layer missing`);
    this.solid = solid;
    this.solid.setCollisionByExclusion([-1]);
    this.solid.setVisible(false);

    this.addTrees();
    this.addLabLabel();

    if (cached) {
      this.sim = cached.sim;
    } else if (this.mission) {
      // A mission starts from its own damaged state, never from a previously restored one (M4.9).
      this.sim = buildRun({
        config: this.config,
        world: this.world,
        env,
        settings: missionDefaults(this.mission),
        seed: SIM_SEED,
        baseGrassPercent: this.mission.start.grassPercent,
      });
    } else {
      const startingPopulation = Object.fromEntries(
        this.config.species.map((s) => [s.id, s.startingPopulationHub]),
      );
      this.sim = Simulation.create({
        config: this.config,
        world: this.world,
        env,
        seed: SIM_SEED,
        grassStartPercent: HUB_GRASS_START,
        startingPopulation,
      });
    }

    liveSimulation.attach({
      islandId: this.islandId,
      mission: this.mission,
      config: this.config,
      world: this.world,
      sim: this.sim,
      env,
      baseGrassPercent: this.mission ? this.mission.start.grassPercent : HUB_GRASS_START,
    });
    liveSimulation.setTravelHandler((id) => this.scene.restart({ islandId: id } satisfies IslandInit));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => liveSimulation.setTravelHandler(null));

    const worldW = map.widthInPixels;
    const worldH = map.heightInPixels;
    this.physics.world.setBounds(0, 0, worldW, worldH);

    const spawnX = (this.world.spawn.x + 0.5) * TILE;
    const spawnY = (this.world.spawn.y + 0.5) * TILE;
    this.player = this.physics.add.sprite(spawnX, spawnY, "creatures", PLAYER_FRAME);
    this.player.setDepth(spawnY);
    this.player.body.setSize(10, 8).setOffset(3, 7);
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.solid);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, worldW, worldH);
    cam.startFollow(this.player, true, 0.12, 0.12);
    cam.setRoundPixels(true);

    this.keys = this.input.keyboard!.addKeys("W,A,S,D,E,SPACE,ONE,TWO,THREE") as typeof this.keys;
    this.cursors = this.input.keyboard!.createCursorKeys();

    // The prompt is screen-fixed and only shows what E would do here.
    this.prompt = this.add
      .text(0, 0, "", textStyle("#fff3c4"))
      .setDepth(10000)
      .setScrollFactor(0)
      .setVisible(false)
      .setOrigin(0.5, 1);

    this.drawAnimals();

    // Hook for end-to-end tests. It exposes read-only state. The lab and dialog controls use the store.
    (window as unknown as { __ecosystem?: EcosystemTestHook }).__ecosystem = {
      player: () => this.playerState(),
      island: () => this.islandId,
      isLabOpen: () => liveSimulation.isLabOpen,
      openLab: () => liveSimulation.openLab(),
      closeLab: () => liveSimulation.closeLab(),
      hour: () => this.sim.currentHour,
      treeSprites: () => this.treeCount,
      treeDepthAt: (x, y) => this.treeSprites.get(`${x},${y}`)?.depth ?? null,
      nearestAnimalId: () => this.nearestAnimal(1.5)?.id ?? null,
      interactNearest: () => this.interact(),
      inspectAnimal: () => this.inspectFirstAnimal(),
      standNearAnimal: () => this.standOnAnimal(),
      advanceDays: (days) => {
        this.sim.runDays(days);
        liveSimulation.notify();
      },
      snapshotJson: () => JSON.stringify(this.sim.snapshot()),
      liveEnvironment: () => ({ ...this.sim.environment }) as unknown as Record<string, number>,
      teleportPlayer: (x, y) => {
        this.player.setVelocity(0, 0);
        this.player.setPosition((x + 0.5) * TILE, (y + 0.5) * TILE);
        this.player.setDepth(this.player.y);
      },
      walkable: (x, y) => !isBlocked(this.world, x + 0.5, y + 0.5),
      playerDepth: () => this.player.depth,
    };
  }

  /** Draws each tree tile as a sprite whose depth is its base, so the player walks behind and in front of it. */
  private addTrees(): void {
    const raw = this.cache.tilemap.get(this.mapKey).data as {
      width: number;
      layers: { name: string; data?: number[] }[];
    };
    const veg = raw.layers.find((l) => l.name === "vegetation")?.data ?? [];
    for (let i = 0; i < veg.length; i++) {
      const gid = veg[i];
      if (gid === 0) continue;
      const tx = i % raw.width;
      const ty = Math.floor(i / raw.width);
      const tree = this.add
        .image((tx + 0.5) * TILE, (ty + 0.5) * TILE, "atlasFrames", gid - 1)
        .setDepth((ty + 1) * TILE);
      this.treeSprites.set(`${tx},${ty}`, tree);
      this.treeCount++;
    }
  }

  /** A small label above the research lab, centred on its five-tile footprint. */
  private addLabLabel(): void {
    const station = this.world.interactive.find((o) => o.type === "lab-entrance");
    if (!station) return;
    const doorX = station.x; // the entrance sits just in front of the door
    const labCentreX = (doorX + 0.5) * TILE;
    const labTopY = (station.y - 4) * TILE;
    this.add
      .text(labCentreX, labTopY - 4, "Research lab", textStyle("#e2f3ff"))
      .setOrigin(0.5, 1)
      .setDepth(9000);
  }

  /** Read-only view of the player, for tests and debugging. */
  playerState(): { x: number; y: number; tileX: number; tileY: number; blocked: boolean } {
    const x = this.player.x;
    const y = this.player.y;
    return {
      x,
      y,
      tileX: Math.floor(x / TILE),
      tileY: Math.floor(y / TILE),
      blocked: isBlocked(this.world, x / TILE, y / TILE),
    };
  }

  update(_time: number, delta: number): void {
    this.handleInput();
    this.advanceSimulation(delta);
    this.drawAnimals();
    this.updatePrompt();
  }

  // --- Input -------------------------------------------------------------

  private handleInput(): void {
    if (liveSimulation.isPaused) {
      // The lab or a dialog has the keyboard. The player stands still and the island is paused.
      this.player.setVelocity(0, 0);
      liveSimulation.takeTouchInteract();
      return;
    }
    const left = this.cursors.left.isDown || this.keys.A.isDown;
    const right = this.cursors.right.isDown || this.keys.D.isDown;
    const up = this.cursors.up.isDown || this.keys.W.isDown;
    const down = this.cursors.down.isDown || this.keys.S.isDown;

    let vx = (right ? 1 : 0) - (left ? 1 : 0);
    let vy = (down ? 1 : 0) - (up ? 1 : 0);
    // Diagonal speed equals cardinal speed.
    if (vx !== 0 && vy !== 0) {
      vx *= Math.SQRT1_2;
      vy *= Math.SQRT1_2;
    }
    // The touch joystick gives an analogue direction, which takes over while it is held.
    const touch = liveSimulation.touchDirection;
    if (touch.x !== 0 || touch.y !== 0) {
      vx = touch.x;
      vy = touch.y;
    }
    this.player.setVelocity(vx * PLAYER_SPEED, vy * PLAYER_SPEED);
    this.player.setDepth(this.player.y);
    if (vx !== 0) this.player.setFlipX(vx < 0);

    if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) this.speedIndex = this.speedIndex === 0 ? 1 : 0;
    if (Phaser.Input.Keyboard.JustDown(this.keys.ONE)) this.speedIndex = 1;
    if (Phaser.Input.Keyboard.JustDown(this.keys.TWO)) this.speedIndex = 2;
    if (Phaser.Input.Keyboard.JustDown(this.keys.THREE)) this.speedIndex = 3;

    // Read both before deciding, so a touch press is always consumed.
    const keyInteract = Phaser.Input.Keyboard.JustDown(this.keys.E);
    const touchInteract = liveSimulation.takeTouchInteract();
    if (keyInteract || touchInteract) this.interact();
  }

  /** Test helper: stands the player on an animal's tile (away from access points). Returns the animal id. */
  private standOnAnimal(): string | null {
    for (const a of this.sim.liveAnimals) {
      const nearPoint = this.world.interactive.some((o) => Math.hypot(o.x + 0.5 - a.x, o.y + 0.5 - a.y) <= 2.5);
      if (nearPoint) continue;
      this.player.setVelocity(0, 0);
      this.player.setPosition(a.x * TILE, a.y * TILE);
      this.player.setDepth(this.player.y);
      return a.id;
    }
    return null;
  }

  /** Test helper: stands on an animal, then presses E. Returns the animal id. */
  private inspectFirstAnimal(): string | null {
    const id = this.standOnAnimal();
    if (id) this.interact();
    return id;
  }

  /** E: a building or access point if one is in range, otherwise the nearest animal. */
  private interact(): void {
    const near = this.nearestInteractive();
    if (near) {
      if (near.type === "lab-entrance") {
        liveSimulation.openLab();
      } else if (near.type === "mission") {
        liveSimulation.openDialog({ kind: "mission", missionId: near.props.missionId });
      } else if (near.type === "exit") {
        liveSimulation.travel(near.props.target || HUB_ID);
      }
      return;
    }
    const animal = this.nearestAnimal(1.5);
    if (animal) liveSimulation.openDialog({ kind: "animal", animalId: animal.id, speciesId: animal.speciesId });
  }

  private advanceSimulation(delta: number): void {
    const speed = SPEED_STEPS[this.speedIndex];
    if (speed === 0 || liveSimulation.isPaused) return;
    const dayBefore = this.sim.currentDay;
    this.accumulatorMs += delta * speed;
    while (this.accumulatorMs >= HOUR_MS_AT_1X) {
      this.accumulatorMs -= HOUR_MS_AT_1X;
      this.sim.step();
    }
    if (this.sim.currentDay !== dayBefore) liveSimulation.notify();
  }

  // --- Drawing the simulation's animals ---------------------------------------

  private drawAnimals(): void {
    const alive = new Set<string>();
    for (const a of this.sim.liveAnimals) {
      alive.add(a.id);
      let spr = this.animalSprites.get(a.id);
      const sp = this.config.species.find((s) => s.id === a.speciesId)!;
      if (!spr) {
        spr = this.add.sprite(0, 0, "creatures", sp.sprite);
        this.animalSprites.set(a.id, spr);
      }
      const px = a.x * TILE;
      const py = a.y * TILE;
      if (spr.x !== px) spr.setFlipX(px < spr.x);
      spr.setPosition(px, py);
      spr.setDepth(py);
    }
    for (const [id, spr] of this.animalSprites) {
      if (!alive.has(id)) {
        spr.destroy();
        this.animalSprites.delete(id);
      }
    }
  }

  private nearestAnimal(maxTiles: number): Animal | undefined {
    const px = this.player.x / TILE;
    const py = this.player.y / TILE;
    let best: Animal | undefined;
    let bestD = maxTiles;
    for (const a of this.sim.liveAnimals) {
      const d = Math.hypot(a.x - px, a.y - py);
      if (d <= bestD) {
        bestD = d;
        best = a;
      }
    }
    return best;
  }

  private nearestInteractive() {
    const px = this.player.x / TILE;
    const py = this.player.y / TILE;
    let best: (typeof this.world.interactive)[number] | undefined;
    let bestD = 2.5;
    for (const o of this.world.interactive) {
      const d = Math.hypot(o.x + 0.5 - px, o.y + 0.5 - py);
      if (d <= bestD) {
        bestD = d;
        best = o;
      }
    }
    return best;
  }

  // --- Prompts ---------------------------------------------------------------

  private updatePrompt(): void {
    const near = liveSimulation.isPaused ? undefined : this.nearestInteractive();
    let text = "";
    let x = this.player.x;
    let y = this.player.y - 14;
    if (near) {
      text = PROMPTS[near.type] ?? "";
      x =(near.x + 0.5) * TILE;
      y = near.y * TILE - 6;
    } else if (!liveSimulation.isPaused) {
      const animal = this.nearestAnimal(1.5);
      if (animal) {
        const sp = this.config.species.find((s) => s.id === animal.speciesId)!;
        text = `E  Inspect ${sp.displayName.toLowerCase()}`;
        x = animal.x * TILE;
        y = animal.y * TILE - 12;
      }
    }
    if (text) {
      this.prompt.setText(text).setVisible(true);
      // Convert world position to screen position, since the prompt is screen-fixed.
      const cam = this.cameras.main;
      this.prompt.setPosition((x - cam.worldView.x) * cam.zoom, (y - cam.worldView.y) * cam.zoom);
    } else {
      this.prompt.setVisible(false);
    }
  }
}

const PROMPTS: Record<string, string> = {
  "lab-entrance": "E  Research lab",
  mission: "E  Mission briefing",
  exit: "E  Back to the hub island",
};

function textStyle(color: string): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: "monospace",
    fontSize: "11px",
    color,
    backgroundColor: "#00000088",
    padding: { x: 4, y: 2 },
  };
}
