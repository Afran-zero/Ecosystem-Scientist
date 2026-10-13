/**
 * A small footer for the main menu crediting the project's author.
 * The "Photo" button reveals a passport-size picture on hover and on focus,
 * so keyboard users get the same affordance. Pure CSS — no extra state.
 */
export default function CreditFooter() {
  return (
    <footer className="mx-auto mt-6 max-w-5xl px-6 pb-10">
      <div className="eco-panel flex flex-col items-center gap-3 p-5 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-moss-light">Made by</p>
          <p className="mt-1 font-display text-lg text-honey">Jannateen Tazree Warisa</p>
          <p className="text-xs text-cream-soft">
            Class 12 · Mohammadpur Preparatory School and College
          </p>
        </div>

        <PhotoButton />
      </div>
    </footer>
  );
}

function PhotoButton() {
  return (
    <div className="group relative">
      <button
        type="button"
        aria-label="Show a photo of the author"
        className="eco-btn-ghost text-xs uppercase tracking-wider"
      >
        Photo ↗
      </button>

      {/* Passport-size reveal. Shows on hover or keyboard focus. */}
      <div
        role="img"
        aria-label="Passport-size photo of Jannateen Tazree Warisa"
        className={[
          "pointer-events-none absolute bottom-full right-0 z-30 mb-2",
          "origin-bottom-right transition duration-200 ease-out",
          "opacity-0 scale-95 translate-y-1",
          "group-hover:pointer-events-auto group-hover:opacity-100 group-hover:scale-100 group-hover:translate-y-0",
          "group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-focus-within:scale-100 group-focus-within:translate-y-0",
        ].join(" ")}
      >
        <div className="eco-panel overflow-hidden p-1.5 shadow-2xl ring-1 ring-honey/30">
          <img
            src="/assets/credits/author.jpg"
            alt="Jannateen Tazree Warisa"
            width={180}
            height={210}
            loading="lazy"
            className="block h-[210px] w-[180px] rounded object-cover"
          />
        </div>
        <p className="mt-1 text-right text-[10px] uppercase tracking-wider text-cream-muted">
          Jannateen Tazree Warisa
        </p>
      </div>
    </div>
  );
}
