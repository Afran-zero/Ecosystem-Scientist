"use client";

import { useState } from "react";
import type { SpeciesDef } from "@/types";
import { TROPHIC_COLORS, type TrophicLevel } from "./sprite";

interface Tier {
  level: TrophicLevel;
  title: string;
  blurb: string;
}

const TIERS: Tier[] = [
  { level: "producer", title: "Producers", blurb: "Make their own food from sunlight. The base of every food chain." },
  { level: "herbivore", title: "Primary consumers", blurb: "Eat only plants. Convert plant energy into animal tissue." },
  { level: "omnivore", title: "Secondary consumers", blurb: "Eat both plants and animals. Flexible links in the web." },
  { level: "carnivore", title: "Apex predators", blurb: "Eat only other animals. Few in number, big effect on the web." },
];

const TIER_FILL: Record<TrophicLevel, string> = {
  producer: "rgba(34, 197, 94, 0.85)", // --eco-moss
  herbivore: "rgba(132, 204, 22, 0.75)",
  omnivore: "rgba(251, 191, 36, 0.8)", // near amber
  carnivore: "rgba(244, 63, 94, 0.75)", // near rose
};

const VIEW_W = 800;
const VIEW_H = 460;
const TOP_Y = 20;
const BOTTOM_Y = 420;
const TOP_HALF = 90;
const BOTTOM_HALF = 280;

/** Returns the polygon points for one trapezoid tier. Top tier is a triangle. */
function tierPath(level: TrophicLevel): { d: string; cx: number; cy: number; labelW: number } {
  const order = TIERS.findIndex((t) => t.level === level);
  const yTop = TOP_Y + ((BOTTOM_Y - TOP_Y) * order) / TIERS.length;
  const yBottom = TOP_Y + ((BOTTOM_Y - TOP_Y) * (order + 1)) / TIERS.length;
  const halfTop = TOP_HALF + ((BOTTOM_HALF - TOP_HALF) * order) / TIERS.length;
  const halfBottom = TOP_HALF + ((BOTTOM_HALF - TOP_HALF) * (order + 1)) / TIERS.length;
  const cx = VIEW_W / 2;

  // Top tier (producers) is a triangle so the pyramid tapers cleanly
  if (order === 0) {
    const d = `M ${cx} ${yTop} L ${cx + halfBottom} ${yBottom} L ${cx - halfBottom} ${yBottom} Z`;
    return { d, cx, cy: (yTop + yBottom) / 2, labelW: halfBottom * 2 };
  }
  const d = `M ${cx - halfTop} ${yTop} L ${cx + halfTop} ${yTop} L ${cx + halfBottom} ${yBottom} L ${cx - halfBottom} ${yBottom} Z`;
  return { d, cx, cy: (yTop + yBottom) / 2, labelW: halfBottom * 2 };
}

/**
 * The trophic pyramid on /about. Each tier is clickable: clicking it calls
 * onSelectFilter(level) so the page can also drive the species explorer.
 */
export default function TrophicPyramid({
  species,
  selectedFilter,
  onSelectFilter,
}: {
  species: SpeciesDef[];
  selectedFilter?: TrophicLevel | "all";
  onSelectFilter?: (level: TrophicLevel | "all") => void;
}) {
  const [hover, setHover] = useState<TrophicLevel | null>(null);

  return (
    <div className="eco-panel p-6 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl text-amber-100">Trophic levels</h2>
          <p className="mt-1 text-sm text-slate-400">
            Energy flows up the pyramid. Each level holds fewer individuals than the one below it,
            because most energy is lost as heat at every step.
          </p>
        </div>
        {onSelectFilter ? (
          <button
            type="button"
            onClick={() => onSelectFilter("all")}
            className={["eco-chip", selectedFilter === "all" ? "eco-chip-good" : ""].join(" ")}
          >
            Show all
          </button>
        ) : null}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="relative">
          <svg
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            className="block h-auto w-full"
            role="img"
            aria-label="Trophic pyramid with producers at the base and apex predators at the top"
          >
            {/* subtle vertical guides */}
            <line x1={VIEW_W / 2} y1={TOP_Y - 6} x2={VIEW_W / 2} y2={BOTTOM_Y + 6} stroke="rgba(255,255,255,0.05)" />
            {TIERS.map((t) => {
              const path = tierPath(t.level);
              const isActive = hover === t.level || selectedFilter === t.level;
              const occupants = species
                .filter((s) => s.classification === t.level)
                .map((s) => s.displayName);
              return (
                <g key={t.level}>
                  <path
                    d={path.d}
                    fill={TIER_FILL[t.level]}
                    stroke="rgba(255,255,255,0.5)"
                    strokeWidth={1.5}
                    style={{
                      cursor: onSelectFilter ? "pointer" : "default",
                      opacity: hover && !isActive ? 0.55 : 1,
                      transition: "opacity 150ms ease",
                    }}
                    onMouseEnter={() => setHover(t.level)}
                    onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover(t.level)}
                    onBlur={() => setHover(null)}
                    onClick={() => onSelectFilter?.(isActive && selectedFilter === t.level ? "all" : t.level)}
                  />
                  <text
                    x={path.cx}
                    y={path.cy - 8}
                    textAnchor="middle"
                    className="fill-slate-950"
                    style={{ fontWeight: 700, fontSize: 18, pointerEvents: "none" }}
                  >
                    {t.title}
                  </text>
                  <text
                    x={path.cx}
                    y={path.cy + 14}
                    textAnchor="middle"
                    className="fill-slate-950/80"
                    style={{ fontSize: 13, pointerEvents: "none" }}
                  >
                    {occupants.length} species · {occupants.length === 0 ? "—" : occupants.join(", ")}
                  </text>
                </g>
              );
            })}

            {/* Energy axis on the right */}
            <text x={VIEW_W - 12} y={TOP_Y - 4} textAnchor="end" className="fill-amber-200/80" style={{ fontSize: 11 }}>
              ↑ Energy lost as heat at each step
            </text>
            <text x={VIEW_W - 12} y={BOTTOM_Y + 28} textAnchor="end" className="fill-emerald-300/80" style={{ fontSize: 11 }}>
              Energy stored in biomass →
            </text>
          </svg>
        </div>

        <ul className="space-y-2 text-sm text-slate-300">
          {TIERS.map((t) => {
            const colors = TROPHIC_COLORS[t.level];
            const occupants = species.filter((s) => s.classification === t.level);
            const isActive = (selectedFilter ?? "all") === t.level;
            return (
              <li
                key={t.level}
                className={[
                  "rounded-lg border border-white/10 p-3 transition",
                  isActive ? "ring-2 ring-amber-300/60" : "",
                  "hover:border-white/30",
                ].join(" ")}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-xs font-semibold uppercase tracking-wider ${colors.text}`}>
                    {colors.label}
                  </span>
                  <span className="text-[11px] text-slate-500">{occupants.length} species</span>
                </div>
                <p className="mt-1 text-sm text-slate-200">{t.blurb}</p>
                {onSelectFilter ? (
                  <button
                    type="button"
                    onClick={() => onSelectFilter(isActive ? "all" : t.level)}
                    className="eco-btn-ghost mt-2 text-[11px] uppercase tracking-wider"
                  >
                    {isActive ? "Clear filter" : "Filter species by this level"}
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
