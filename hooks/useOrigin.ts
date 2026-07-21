"use client";

import { useSyncExternalStore } from "react";

// window.location.origin is a browser-only value that must render as "" on
// the server (Next.js server-renders "use client" components once for the
// initial HTML) and the real origin on the client — a plain useState +
// useEffect pair works but forces a synchronous setState inside the effect
// body, flagged by react-hooks/set-state-in-effect. useSyncExternalStore is
// the React-endorsed way to read an external, non-reactive value like this
// with distinct server/client snapshots and no extra post-mount render.
function subscribe() {
  return () => {};
}

function getSnapshot() {
  return window.location.origin;
}

function getServerSnapshot() {
  return "";
}

export function useOrigin(): string {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
