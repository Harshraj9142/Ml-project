import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/Icons";

/**
 * A small (i) button with a note card that explains one form item. The card opens on hover,
 * on keyboard focus, or on a click / tap (phones have no hover) - a click keeps it open until
 * you click again, click elsewhere or press Escape. It sits above the button, or below when
 * there is no room above. The card is placed against the nearest positioned parent, so put
 * this inside the `relative` box that holds the item's label.
 */
export default function InfoTip({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [below, setBelow] = useState(false);
  const pinned = useRef(false); // opened by a click or tap: stays open when the pointer leaves
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // a short wait before opening / closing on hover, so the card doesn't flicker as the pointer
  // passes over, and so the pointer can move from the button onto the card
  function later(next: boolean, ms: number) {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(next), ms);
  }

  function close() {
    clearTimeout(timer.current);
    pinned.current = false;
    setOpen(false);
  }

  useLayoutEffect(() => {
    if (!open || !buttonRef.current || !cardRef.current) return;
    setBelow(buttonRef.current.getBoundingClientRect().top < cardRef.current.offsetHeight + 16);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!buttonRef.current?.contains(target) && !cardRef.current?.contains(target)) close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={`About ${label}`}
        aria-describedby={id}
        aria-expanded={open}
        onPointerEnter={(event) => event.pointerType === "mouse" && later(true, 120)}
        onPointerLeave={(event) => event.pointerType === "mouse" && !pinned.current && later(false, 150)}
        // keyboard focus opens it; a mouse click or tap is handled by onClick instead
        onFocus={(event) => event.currentTarget.matches(":focus-visible") && later(true, 0)}
        onBlur={(event) => !cardRef.current?.contains(event.relatedTarget as Node | null) && close()}
        onClick={() => {
          if (pinned.current) {
            close();
          } else {
            pinned.current = true;
            clearTimeout(timer.current);
            setOpen(true);
          }
        }}
        className={`-my-1 inline-flex size-6 shrink-0 items-center justify-center rounded-full transition-colors hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent ${
          open ? "text-brand" : "text-muted/70"
        }`}
      >
        <Icon name="info" className="size-3.5" />
      </button>
      <div
        ref={cardRef}
        id={id}
        role="tooltip"
        onPointerEnter={() => clearTimeout(timer.current)}
        onPointerLeave={(event) => event.pointerType === "mouse" && !pinned.current && later(false, 150)}
        className={`absolute left-0 z-30 w-[min(20rem,calc(100vw-4.5rem))] overflow-hidden rounded-md border border-l-2 border-border-strong border-l-brand bg-surface text-left shadow-[0_16px_36px_-14px_rgb(40_25_10/0.35)] transition-[opacity,translate,visibility] duration-150 ease-out ${
          below ? "top-full mt-2" : "bottom-full mb-2"
        } ${open ? "visible translate-y-0 opacity-100" : `invisible opacity-0 ${below ? "-translate-y-1" : "translate-y-1"}`}`}
      >
        {children}
      </div>
    </>
  );
}
