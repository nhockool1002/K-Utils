import { create } from "zustand";
import type { LogEntry } from "../types";
import { getLogs, clearLogs as apiClearLogs } from "../lib/api";

const FIFTEEN_MIN_MS = 15 * 60 * 1000;

interface LogState {
  entries: LogEntry[];
  addEntry: (e: LogEntry) => void;
  loadInitial: () => Promise<void>;
  clear: () => Promise<void>;
  recent: () => LogEntry[];
}

export const useLogStore = create<LogState>((set, get) => ({
  entries: [],

  addEntry: (e) => {
    set((s) => {
      const next = [...s.entries, e];
      return { entries: next.length > 5000 ? next.slice(-5000) : next };
    });
  },

  loadInitial: async () => {
    try {
      const logs = await getLogs();
      set({ entries: logs });
    } catch {
      // ignore
    }
  },

  clear: async () => {
    await apiClearLogs().catch(() => {});
    set({ entries: [] });
  },

  recent: () => {
    const cutoff = Date.now() - FIFTEEN_MIN_MS;
    return get().entries.filter((e) => e.timestamp_ms >= cutoff);
  },
}));
