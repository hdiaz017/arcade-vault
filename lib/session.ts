"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { SessionUser } from "./types";

const KEY = "av_user";
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb); // cambios desde otras pestañas
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function emit() {
  listeners.forEach((cb) => cb());
}

// El snapshot es el string crudo (estable entre lecturas); se parsea fuera.
const getSnapshot = () => localStorage.getItem(KEY);
const getServerSnapshot = () => null;

export function useSession(): SessionUser | null {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return useMemo(() => {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed?.name === "string" ? (parsed as SessionUser) : null;
    } catch {
      return null;
    }
  }, [raw]);
}

export function login(name: string): void {
  const user: SessionUser = {
    name: (name.trim() || "PLAYER1").toUpperCase().slice(0, 10),
  };
  localStorage.setItem(KEY, JSON.stringify(user));
  emit();
}

export function logout(): void {
  localStorage.removeItem(KEY);
  emit();
}
