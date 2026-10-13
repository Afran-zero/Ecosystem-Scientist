"use client";

import { useMemo, useState } from "react";
import type { FoodWebEdge, SpeciesDef } from "@/types";
import { EDGE_KIND_EXPLAIN, EDGE_KIND_VERB, creatureSpriteStyle, TROPHIC_COLORS } from "./sprite";

const VIEW = 560;
const CENTER = VIEW / 2;
const RADIUS = 200;

const EDGE_STYLE: Record<"grazes" | "forages" | "hunts", { stroke: string; dash: string; width: number }> = {
  grazes: { stroke: "rgba(132, 204, 22, 0.9)", dash: "0", width: 2 },
  forages: { stroke: "rgba(251, 191, 36, 0.9)", dash: "6 4", width: 2 },
  hunts: { stroke: "rgba(244, 63, 94, 0.95)", dash: "0", width: 2.5 },
};

interface PositionedNode {
  id: string;
  name: string;
  classification: string;
  sprite: number;
  x: number;
  y: number;
}

/**
 * Position every species (and a "grass" pseudo-node for the producer) around a circle.
 * Producers sit at the bottom, predators at the top, so the food-web reads bottom-up.
 */
function layoutNodes(species: SpeciesDef[]): PositionedNode[] {
  const producers: PositionedNode[] = [
    { id: "grass", name: "Grass", classification: "producer", sprite: 0, x: 0, y: 0 },
    { id: "tree", name: "Trees", classification: "producer", sprite: 1, x: 0, y: 0 },
  ];
  const animals = species;
  const total = producers.length + animals.length;
  // Lay out so producers are at the bottom (angle range 0 .. 60° measured from the +x axis)
  return [...producers, ...animals].map((n, i) => {
    const t = i / Math.max(1, total - 1);
    // Map t∈[0,1] to angle from -120° (bottom-left) to 120° (bottom-right) via top
    const angle = -120 + t * 240;
    const rad = (angle * Math.PI) / 180;
    return {
      id: n.id,
      name: n.id === "grass" ? "Grass" : n.id === "tree" ? "Trees" : (n as SpeciesDef).displayName,
      classification: n.classification,
      sprite: (n as SpeciesDef).sprite ?? 0,
      x: CENTER + RADIUS * Math.cos(rad),
      y: CENTER + RADIUS * Math.sin(rad),
    };
  });
}

function findNode(nodes: PositionedNode[], id: string): PositionedNode | undefined {
  return nodes.find((n) => n.id === id);
}

/**
 * Interactive food-web explorer for /how-to-play. Nodes are the species plus the
 * plant producers. Edges come from food-web.json. Hovering an edge pins a tooltip
 * explaining the relationship, the energy cost and which species are involved.
 */
export default function FoodWebExplorer({
  edges,
  species,
}: {
  edges: FoodWebEdge[];
  species: SpeciesDef[];
}) {
  const nodes = useMemo(() => layoutNodes(species), [species]);
  const [hoverEdge, setHoverEdge] = useState<FoodWebEdge | null>(null);
  const [pinnedEdge, setPinnedEdge] = useState<FoodWebEdge | null>(null);

  const focused = hoverEdge ?? pinnedEdge;

  return (
    <div className="eco-panel p-6 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl text-amber-100">Food web explorer</h2>
          <p className="mt-1 text-sm text-slate-400">
            Hover an edge to see who eats whom. Click an edge to pin its explanation.
          </p>
        </div>
        <ul className="flex flex-wrap gap-2 text-[11px] text-slate-300">
          <li className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-5 rounded" style={{ background: EDGE_STYLE.grazes.stroke }} />
            Grazes
          </li>
          <li className="flex items-center gap-1.5">
            <span
              className="inline-block h-0.5 w-5 rounded"
              style={{ background: `repeating-linear-gradient(90deg, ${EDGE_STYLE.forages.stroke} 0 6px, transparent 6px 10px)` }}
            />
            Forages
          </li>
          <li className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-5 rounded" style={{ background: EDGE_STYLE.hunts.stroke }} />
            Hunts
          </li>
        </ul>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="relative">
          <svg
            viewBox={`0 0 ${VIEW} ${VIEW}`}
            className="block h-auto w-full"
            role="img"
            aria-label="Food web of the island"
          >
            {/* gentle background ring */}
            <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke="rgba(255,255,255,0.06)" />

            {/* edges */}
            {edges.map((e) => {
              const a = findNode(nodes, e.prey);
              const b = findNode(nodes, e.predator);
              if (!a || !b) return null;
              const style = EDGE_STYLE[e.kind];
              const isFocused = focused && focused.prey === e.prey && focused.predator === e.predator;
              const isDimmed = focused && !isFocused;
              return (
                <g
                  key={`${e.prey}-${e.predator}`}
                  style={{ cursor: "pointer" }}
                  onMouseEnter={() => setHoverEdge(e)}
                  onMouseLeave={() => setHoverEdge(null)}
                  onFocus={() => setHoverEdge(e)}
                  onBlur={() => setHoverEdge(null)}
                  onClick={() => setPinnedEdge(isFocused && pinnedEdge ? null : e)}
                >
                  <line
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={style.stroke}
                    strokeWidth={isFocused ? style.width + 1.5 : style.width}
                    strokeDasharray={style.dash}
                    opacity={isDimmed ? 0.25 : 1}
                    style={{ transition: "opacity 150ms ease, stroke-width 150ms ease" }}
                  />
                </g>
              );
            })}

            {/* nodes */}
            {nodes.map((n) => {
              const colors = TROPHIC_COLORS[n.classification as keyof typeof TROPHIC_COLORS] ?? TROPHIC_COLORS.producer;
              return (
                <g key={n.id} style={{ pointerEvents: "none" }}>
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={26}
                    fill="rgba(11, 22, 34, 0.95)"
                    stroke="rgba(255,255,255,0.18)"
                    strokeWidth={1}
                  />
                  {/* sprite */}
                  <foreignObject x={n.x - 14} y={n.y - 14} width={28} height={28}>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    <div style={{ ...creatureSpriteStyle(n.sprite, 2), borderRadius: 4 }} />
                  </foreignObject>
                  <text
                    x={n.x}
                    y={n.y + 38}
                    textAnchor="middle"
                    className="fill-slate-100"
                    style={{ fontSize: 12, fontWeight: 600 }}
                  >
                    {n.name}
                  </text>
                  <text
                    x={n.x}
                    y={n.y + 52}
                    textAnchor="middle"
                    className={colors.text}
                    style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 }}
                  >
                    {n.classification}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <aside aria-live="polite" className="rounded-lg border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-200">
          {focused ? (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-200/80">Edge · {focused.kind}</p>
              <p className="font-display text-lg text-amber-100">
                {findNode(nodes, focused.predator)?.name} {EDGE_KIND_VERB[focused.kind]} {findNode(nodes, focused.prey)?.name}
              </p>
              <p className="text-slate-300">{EDGE_KIND_EXPLAIN[focused.kind]}</p>
              <p className="text-xs text-slate-500">
                Click another edge to change the focus. Click the same edge again to clear it.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-200/80">How to read this</p>
              <p>
                Each line shows a feeding link. The arrow points from the food to the eater. The dashed amber line shows
                an omnivore that takes a little bit of many things. The red line is a predator hunt.
              </p>
              <p className="text-xs text-slate-500">Hover or click any line for an explanation.</p>
              <ul className="mt-2 space-y-1 text-xs text-slate-400">
                <li>· {edges.filter((e) => e.kind === "grazes").length} grazing links</li>
                <li>· {edges.filter((e) => e.kind === "forages").length} foraging links</li>
                <li>· {edges.filter((e) => e.kind === "hunts").length} hunting links</li>
                <li>· {nodes.length} nodes ({species.length + 2} species, including grass and trees)</li>
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
