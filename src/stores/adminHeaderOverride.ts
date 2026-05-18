import { useSyncExternalStore } from "react";

export interface AdminHeaderOverride {
  title: string;
  subtitle?: string;
  onBack?: () => void;
}

let state: AdminHeaderOverride | null = null;
const listeners = new Set<() => void>();

export function setAdminHeaderOverride(next: AdminHeaderOverride | null) {
  state = next;
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useAdminHeaderOverride(): AdminHeaderOverride | null {
  return useSyncExternalStore(subscribe, () => state, () => null);
}
