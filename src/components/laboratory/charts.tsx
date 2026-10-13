"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/** Shared chart pieces for the lab (spec 4.3). Every series is passed in from simulation records. */

export const COLOURS: Record<string, string> = {
  rabbit: "#F2C14E",
  cow: "#FFF4D6",
  chicken: "#E88A3C",
  mouse: "#C7B1D6",
  fox: "#D9573B",
  grass: "#9BC45E",
  trees: "#5E9E4A",
  births: "#A8D5BA",
  deaths: "#C44D3A",
  eaten: "#E0A526",
  livability: "#7FD1C0",
  temperatureC: "#E8A07A",
  rainfallMmPerDay: "#6FA8C8",
  pollution: "#9C8F7E",
  waterQuality: "#8FC7E0",
  baseline: "#C9AE7E",
  experiment: "#F2C14E",
  now: "#F2C14E",
  base: "#C9AE7E",
};

export interface Series {
  key: string;
  label: string;
  colour?: string;
  dashed?: boolean;
}

export function Chart({
  title,
  data,
  series,
  yLabel,
  height = "h-56",
}: {
  title: string;
  data: Record<string, number | string>[];
  series: Series[];
  yLabel: string;
  height?: string;
}) {
  return (
    <figure className="rounded border border-brown p-3">
      <figcaption className="mb-2 text-sm font-medium text-cream">
        {title} <span className="text-xs font-normal text-cream-muted">({yLabel})</span>
      </figcaption>
      {data.length === 0 ? (
        <p className="text-xs text-cream-muted">Nothing to show yet.</p>
      ) : (
        <div className={`${height} w-full`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#5A3B20" />
              <XAxis dataKey="day" stroke="#C9AE7E" fontSize={11} label={{ value: "day", position: "insideBottom", offset: -2, fill: "#C9AE7E", fontSize: 11 }} />
              <YAxis stroke="#C9AE7E" fontSize={11} />
              <Tooltip contentStyle={{ background: "#2B1A0E", border: "1px solid #7A4E2D", color: "#FFF4D6", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {series.map((s) => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  stroke={s.colour ?? COLOURS[s.key] ?? "#EAD9B3"}
                  strokeDasharray={s.dashed ? "5 4" : undefined}
                  dot={false}
                  isAnimationActive={false}
                  strokeWidth={2}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </figure>
  );
}
