"use client";

import { useEffect, useRef } from "react";

// The same squares as the graph paper drawn by .backdrop in globals.css: 12px squares with a
// bolder line every 60px, centred on the page.
const MINOR = 12;
const MAJOR = 60;
const FADE_MS = 400; // how quickly a square lit by the pointer fades (nearly gone after a second)
const PULSE_EVERY_MS = 5000;
const PULSE_SPEED = 0.24; // px per ms: how fast the ring spreads out
const PULSE_MS = 2200; // how long one ring lasts
const RING_EDGE = 8; // the ring's sharp outer edge, in px
const RING_TAIL = 28; // its softer inner side, trailing behind it, in px

// How strongly each kind of square is filled, in kidney red, at its brightest.
const STRENGTH = {
  light: { pointer: 0.3, square: 0.08, pulse: 0.15 },
  dark: { pointer: 0.24, square: 0.07, pulse: 0.15 },
};

/**
 * Brings the graph paper behind the page header to life (adapted from the "Interactive Grid"
 * component on 21st.dev): the small square under the mouse fills in kidney red, its big square
 * glows faintly, and both fade out behind the pointer like a trail. Every few seconds a pulse
 * also ripples out through the squares from behind the kidney drawing (only on wide screens,
 * where the drawing is shown). It is a canvas inside the .backdrop, so it never blocks a click,
 * and it is switched off for people who ask for reduced motion.
 */
export default function HeroGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const dark = window.matchMedia("(prefers-color-scheme: dark)");

    // Each grid is a list of how lit each square is, from 1 (just lit) down to 0.
    const small = makeGrid(MINOR);
    const big = makeGrid(MAJOR);
    let width = 0;
    let height = 0;
    let color = "";
    let pointer: { x: number; y: number } | null = null;
    let pulseStart = performance.now() + 2600 - PULSE_EVERY_MS; // first pulse once the kidney has drawn itself
    let pulseOrigin: { x: number; y: number } | null = null;
    let frame = 0;
    let last = performance.now();

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      small.resize(width, height);
      big.resize(width, height);
    };

    const readColor = () => {
      color = getComputedStyle(document.documentElement).getPropertyValue("--brand").trim();
    };

    // light every square along the pointer's path since the last move, so fast moves leave no gaps
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const bounds = canvas.getBoundingClientRect();
      const next = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
      const from = pointer ?? next;
      const steps = Math.max(1, Math.ceil(Math.hypot(next.x - from.x, next.y - from.y) / (MINOR / 2)));
      for (let i = 1; i <= steps; i++) {
        const x = from.x + ((next.x - from.x) * i) / steps;
        const y = from.y + ((next.y - from.y) * i) / steps;
        small.light(x, y, 1);
        big.light(x, y, 1);
      }
      pointer = next;
    };

    const onPointerLeave = () => {
      pointer = null;
    };

    // the middle of the kidney drawing in canvas pixels, or null when it isn't on screen
    const findPulseOrigin = () => {
      const bounds = canvas.getBoundingClientRect();
      for (const svg of document.querySelectorAll<SVGElement>("[data-pulse-origin]")) {
        const rect = svg.getBoundingClientRect();
        if (rect.width === 0) continue; // hidden: a phone layout, or the other part's page
        const [fx, fy] = (svg.dataset.pulseOrigin ?? "0.5 0.5").split(" ").map(Number);
        return { x: rect.left - bounds.left + rect.width * fx, y: rect.top - bounds.top + rect.height * fy };
      }
      return null;
    };

    const draw = (now: number) => {
      const fade = Math.exp(-Math.max(0, now - last) / FADE_MS);
      last = now;
      small.fade(fade);
      big.fade(fade);
      small.clearRing();

      if (now - pulseStart > PULSE_EVERY_MS) {
        pulseStart = now;
        pulseOrigin = findPulseOrigin();
      }
      const age = now - pulseStart;
      if (pulseOrigin && age < PULSE_MS) {
        small.ring(pulseOrigin.x, pulseOrigin.y, age * PULSE_SPEED, 1 - age / PULSE_MS);
      }

      const strength = dark.matches ? STRENGTH.dark : STRENGTH.light;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = color;
      big.paint(ctx, strength.square);
      small.paint(ctx, strength.pointer, strength.pulse);
      frame = requestAnimationFrame(draw);
    };

    // only animate while the graph paper is on screen
    const visibility = new IntersectionObserver(([entry]) => {
      cancelAnimationFrame(frame);
      if (entry.isIntersecting) {
        last = performance.now();
        frame = requestAnimationFrame(draw);
      }
    });

    const sizeObserver = new ResizeObserver(resize);
    resize();
    readColor();
    sizeObserver.observe(canvas);
    visibility.observe(canvas);
    dark.addEventListener("change", readColor);
    window.addEventListener("pointermove", onPointerMove);
    document.documentElement.addEventListener("pointerleave", onPointerLeave);
    return () => {
      cancelAnimationFrame(frame);
      sizeObserver.disconnect();
      visibility.disconnect();
      dark.removeEventListener("change", readColor);
      window.removeEventListener("pointermove", onPointerMove);
      document.documentElement.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 size-full" />;
}

/**
 * One layer of squares `size` px wide, lined up with the graph paper's lines. Squares lit by
 * the pointer fade out slowly; the pulse ring is drawn afresh every frame, so it stays a thin
 * ring instead of leaving a filled disc behind it.
 */
function makeGrid(size: number) {
  let columns = 0;
  let rows = 0;
  let offsetX = 0; // the paper is centred, so its first vertical line is usually not at x = 0
  let byPointer = new Float32Array(0);
  let byPulse = new Float32Array(0);

  return {
    resize(width: number, height: number) {
      offsetX = ((((width - size) / 2) % size) + size) % size;
      columns = Math.ceil((width - offsetX) / size) + 1;
      rows = Math.ceil(height / size);
      byPointer = new Float32Array(columns * rows);
      byPulse = new Float32Array(columns * rows);
    },

    light(x: number, y: number, amount: number) {
      const column = Math.floor((x - offsetX) / size) + 1;
      const row = Math.floor(y / size);
      if (column < 0 || column >= columns || row < 0 || row >= rows) return;
      byPointer[row * columns + column] = amount;
    },

    clearRing() {
      byPulse.fill(0);
    },

    // light the squares whose middle lies on a ring of `radius` around (cx, cy): brightest at
    // the ring's outer edge, fading towards the middle
    ring(cx: number, cy: number, radius: number, amount: number) {
      const reach = radius + RING_EDGE;
      const firstRow = Math.max(0, Math.floor((cy - reach) / size));
      const lastRow = Math.min(rows - 1, Math.ceil((cy + reach) / size));
      const firstColumn = Math.max(0, Math.floor((cx - reach - offsetX) / size) + 1);
      const lastColumn = Math.min(columns - 1, Math.ceil((cx + reach - offsetX) / size) + 1);
      for (let row = firstRow; row <= lastRow; row++) {
        for (let column = firstColumn; column <= lastColumn; column++) {
          const x = offsetX + (column - 1) * size + size / 2;
          const y = row * size + size / 2;
          const past = Math.hypot(x - cx, y - cy) - radius; // > 0: outside the ring
          if (past > RING_EDGE || past < -RING_TAIL) continue;
          byPulse[row * columns + column] = amount * (past > 0 ? 1 - past / RING_EDGE : 1 + past / RING_TAIL);
        }
      }
    },

    fade(factor: number) {
      for (let i = 0; i < byPointer.length; i++) {
        byPointer[i] = byPointer[i] < 0.01 ? 0 : byPointer[i] * factor;
      }
    },

    // fill each lit square inside its lines, so the paper's lines stay visible
    paint(ctx: CanvasRenderingContext2D, pointerStrength: number, pulseStrength = 0) {
      for (let i = 0; i < byPointer.length; i++) {
        const alpha = byPointer[i] * pointerStrength + byPulse[i] * pulseStrength;
        if (alpha === 0) continue;
        const x = offsetX + ((i % columns) - 1) * size;
        const y = Math.floor(i / columns) * size;
        ctx.globalAlpha = Math.min(alpha, 1);
        ctx.fillRect(x + 1, y + 1, size - 1, size - 1);
      }
      ctx.globalAlpha = 1;
    },
  };
}
