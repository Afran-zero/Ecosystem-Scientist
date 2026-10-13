"use client";

import { useState } from "react";
import type { GameConfig, SpeciesClass } from "@/types";

/**
 * Food-web diagram (spec 4.3). Nodes are organisms, arrows point from prey to predator.
 * Selecting a node highlights its immediate feeding relationships.
 * Edges come from food-web.json, so the diagram cannot disagree with the simulation.
 */

const CLASS_COLOUR: Record<SpeciesClass | "tree", string> = {
  producer: "#4ade80",
  herbivore: "#facc15",
  omnivore: "#fb923c",
  carnivore: "#f87171",
  tree: "#86efac",
};

const CLASS_LABEL: Record<SpeciesClass | "tree", string> = {
  producer: "producer",
  herbivore: "herbivore",
  omnivore: "omnivore",
  carnivore: "carnivore",
  tree: "producer (habitat)",
};

export default function FoodWebDiagram({ config }: { config: GameConfig }) {
  const [selected, setSelected] = useState<string | null>(null);

  // Node ids: "grass", "trees", then each species. Trees are habitat, with no feeding edges.
  const nodes: { id: string; label: string; kind: SpeciesClass | "tree" }[] = [
    { id: "grass", label: "Grass", kind: "producer" },
    { id: "trees", label: "Trees", kind: "tree" },
    ...config.species.map((s) => ({ id: s.id, label: s.displayName, kind: s.classification })),
  ];

  const W = 420;
  const H = 320;
  const cx = W / 2;
  const cy = H / 2 + 6;
  const ring = 118;
  const pos = new Map<string, { x: number; y: number }>();
  // Place the two producers on the left, and the animals on a ring.
  pos.set("grass", { x: 60, y: 70 });
  pos.set("trees", { x: 60, y: 240 });
  const animals = nodes.slice(2);
  animals.forEach((n, i) => {
    const a = -Math.PI / 2 + (i / animals.length) * Math.PI * 2 + 0.4;
    pos.set(n.id, { x: cx + ring * Math.cos(a) + 40, y: cy + ring * Math.sin(a) });
  });

  const edges = config.foodWeb;
  const isLinked = (e: { prey: string; predator: string }) =>
    selected !== null && (e.prey === selected || e.predator === selected);
  const neighbours = new Set<string>();
  if (selected) {
    neighbours.add(selected);
    for (const e of edges) {
      if (e.prey === selected) neighbours.add(e.predator);
      if (e.predator === selected) neighbours.add(e.prey);
    }
  }

  return (
    <div className="space-y-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-xl rounded bg-slate-900" role="img" aria-label="Food web">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
          </marker>
          <marker id="arrow-hi" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#e2e8f0" />
          </marker>
        </defs>
        {edges.map((e) => {
          const a = pos.get(e.prey);
          const b = pos.get(e.predator);
          if (!a || !b) return null;
          const hi = isLinked(e);
          const dim = selected !== null && !hi;
          return (
            <line
              key={`${e.prey}-${e.predator}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={hi ? "#e2e8f0" : "#94a3b8"}
              strokeWidth={hi ? 2.5 : 1.5}
              opacity={dim ? 0.2 : 1}
              markerEnd={hi ? "url(#arrow-hi)" : "url(#arrow)"}
            />
          );
        })}
        {nodes.map((n) => {
          const p = pos.get(n.id);
          if (!p) return null;
          const isSel = selected === n.id;
          const dim = selected !== null && !neighbours.has(n.id);
          return (
            <g
              key={n.id}
              transform={`translate(${p.x},${p.y})`}
              onClick={() => setSelected(isSel ? null : n.id)}
              className="cursor-pointer"
              opacity={dim ? 0.3 : 1}
              role="button"
              aria-pressed={isSel}
              aria-label={`${n.label}, ${CLASS_LABEL[n.kind]}`}
            >
              <circle r={isSel ? 22 : 18} fill={CLASS_COLOUR[n.kind]} stroke={isSel ? "#fff" : "#0f172a"} strokeWidth={2} />
              <text y={36} textAnchor="middle" fontSize={11} fill="#e2e8f0">
                {n.label}
              </text>
            </g>
          );
        })}
      </svg>
      <ul className="flex flex-wrap gap-3 text-xs text-slate-300">
        {(Object.keys(CLASS_COLOUR) as (SpeciesClass | "tree")[]).map((k) => (
          <li key={k} className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-full" style={{ background: CLASS_COLOUR[k] }} />
            {CLASS_LABEL[k]}
          </li>
        ))}
      </ul>
      <p className="text-sm text-slate-300">
        {selected
          ? `${nodes.find((n) => n.id === selected)?.label}: ${[...neighbours]
              .filter((id) => id !== selected)
              .map((id) => nodes.find((n) => n.id === id)?.label)
              .join(", ") || "no feeding links"}`
          : "Select a node to see its feeding links. An arrow runs from prey to predator. Chickens and mice are omnivores."}
      </p>
    </div>
  );
}
