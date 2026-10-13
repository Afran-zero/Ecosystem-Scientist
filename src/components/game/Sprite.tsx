/**
 * One animal from the Tiny Creatures sheet (170 × 306 px: 10 columns of 16 px frames with 1 px
 * spacing). Drawn with CSS so it stays crisp at any scale.
 */
const SHEET_COLUMNS = 10;
const CELL = 17;
const SHEET_W = 170;
const SHEET_H = 306;

export default function Sprite({ frame, scale = 4 }: { frame: number; scale?: number }) {
  const col = frame % SHEET_COLUMNS;
  const row = Math.floor(frame / SHEET_COLUMNS);
  return (
    <span
      aria-hidden="true"
      className="inline-block shrink-0 rounded bg-slate-900/60 ring-1 ring-white/10"
      style={{
        width: 16 * scale,
        height: 16 * scale,
        backgroundImage: "url(/assets/animals/creatures.png)",
        backgroundSize: `${SHEET_W * scale}px ${SHEET_H * scale}px`,
        backgroundPosition: `-${col * CELL * scale}px -${row * CELL * scale}px`,
        imageRendering: "pixelated",
      }}
    />
  );
}
