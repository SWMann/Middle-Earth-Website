"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { markNotificationsRead } from "./actions";

type Props = {
  unreadCount: number;
  /**
   * Server-rendered feed body. The bell handles open/close + mark-read;
   * the actual list is composed server-side and passed in as children so
   * we don't need a client-only audit renderer.
   */
  children: React.ReactNode;
};

/**
 * The nav bell. Click to open; opening fires the mark-read action and
 * optimistically zeroes the badge. The dropdown closes on outside-click
 * or Escape — small bespoke implementation so we don't pull in a popover
 * library for one widget.
 */
export function NotificationsBell({ unreadCount, children }: Props) {
  const [open, setOpen] = useState(false);
  const [optimisticUnread, setOptimisticUnread] = useState(unreadCount);
  const [, startTransition] = useTransition();
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sync prop changes (e.g. after navigation) into local state.
  useEffect(() => {
    setOptimisticUnread(unreadCount);
  }, [unreadCount]);

  // Close on outside click + Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleToggle = () => {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen && optimisticUnread > 0) {
      setOptimisticUnread(0);
      startTransition(() => {
        void markNotificationsRead();
      });
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        aria-label="Notifications"
        aria-expanded={open}
        className="relative text-xs hover:underline px-1"
      >
        <span aria-hidden>🔔</span>
        {optimisticUnread > 0 && (
          <span
            className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-red-600 text-white text-[10px] font-medium tabular-nums leading-none"
            aria-label={`${optimisticUnread} unread`}
          >
            {optimisticUnread > 99 ? "99+" : optimisticUnread}
          </span>
        )}
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Notifications"
          className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 shadow-lg p-4 text-sm z-50"
        >
          <h3 className="text-xs uppercase tracking-widest opacity-60 mb-3">
            Recent events
          </h3>
          {children}
        </div>
      )}
    </div>
  );
}
