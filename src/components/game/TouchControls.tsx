"use client";

import { useEffect, useRef } from "react";
import { liveSimulation } from "@/game/liveSimulation";

/**
 * On-screen controls for touch devices (plan M1.9): a joystick to walk and an E button to interact.
 * They appear only when the primary pointer is coarse, so desktop keeps a clean view. They write to
 * the store, and the island reads them in the same place as the keyboard.
 */

const DEADZONE = 0.2;

export default function TouchControls() {
  const baseRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(false);

  useEffect(() => {
    const query = window.matchMedia("(pointer: coarse)");
    const update = () => {
      if (layerRef.current) layerRef.current.style.display = query.matches ? "flex" : "none";
    };
    update();
    query.addEventListener("change", update);
    return () => {
      query.removeEventListener("change", update);
      liveSimulation.setTouchVector(0, 0);
    };
  }, []);

  const steer = (clientX: number, clientY: number) => {
    const base = baseRef.current;
    const knob = knobRef.current;
    if (!base || !knob) return;
    const rect = base.getBoundingClientRect();
    const max = rect.width / 2;
    const dx = clientX - (rect.left + max);
    const dy = clientY - (rect.top + max);
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, max);
    const ux = dist > 0 ? dx / dist : 0;
    const uy = dist > 0 ? dy / dist : 0;
    knob.style.transform = `translate(${ux * clamped}px, ${uy * clamped}px)`;
    const strength = Math.min(1, dist / max);
    if (strength < DEADZONE) {
      liveSimulation.setTouchVector(0, 0);
    } else {
      const scaled = (strength - DEADZONE) / (1 - DEADZONE);
      liveSimulation.setTouchVector(ux * scaled, uy * scaled);
    }
  };

  const release = () => {
    activeRef.current = false;
    if (knobRef.current) knobRef.current.style.transform = "translate(0px, 0px)";
    liveSimulation.setTouchVector(0, 0);
  };

  return (
    <div ref={layerRef} style={{ display: "none" }} className="pointer-events-none fixed inset-x-0 bottom-6 z-40 items-end justify-between px-6" aria-label="Touch controls">
      <div
        ref={baseRef}
        role="application"
        aria-label="Joystick: drag to walk"
        className="pointer-events-auto relative h-32 w-32 rounded-full border border-cream/25 bg-ink/50 backdrop-blur"
        style={{ touchAction: "none" }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          activeRef.current = true;
          steer(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (activeRef.current) steer(e.clientX, e.clientY);
        }}
        onPointerUp={release}
        onPointerCancel={release}
      >
        <div
          ref={knobRef}
          className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border border-honey/60 bg-parchment/25"
        />
      </div>
      <button
        type="button"
        aria-label="Interact (E)"
        className="pointer-events-auto flex h-16 w-16 items-center justify-center rounded-full border border-moss-light/60 bg-honey/80 text-lg font-semibold text-ink shadow-lg"
        style={{ touchAction: "manipulation" }}
        onPointerDown={(e) => {
          e.preventDefault();
          liveSimulation.pressTouchInteract();
        }}
      >
        E
      </button>
    </div>
  );
}
