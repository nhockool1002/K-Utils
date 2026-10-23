import { create } from "zustand";
import type { QueueJob, JobStatus } from "../types";
import { cancelJob as apiCancelJob, startVideoJob } from "../lib/api";

interface QueueState {
  jobs: QueueJob[];
  concurrency: number;
  addJobs: (jobs: QueueJob[]) => void;
  removeJob: (id: string) => void;
  updateJob: (id: string, patch: Partial<QueueJob>) => void;
  cancelJob: (id: string) => Promise<void>;
  retryJob: (id: string) => void;
  clearFinished: () => void;
  processQueue: () => void;
}

function runningCount(jobs: QueueJob[]) {
  return jobs.filter((j) => j.status === "running").length;
}

export const useQueueStore = create<QueueState>((set, get) => ({
  jobs: [],
  concurrency: 1,

  addJobs: (newJobs) => {
    set((s) => ({ jobs: [...s.jobs, ...newJobs] }));
    get().processQueue();
  },

  removeJob: (id) => {
    set((s) => ({ jobs: s.jobs.filter((j) => j.id !== id) }));
  },

  updateJob: (id, patch) => {
    set((s) => ({
      jobs: s.jobs.map((j) => (j.id === id ? { ...j, ...patch } : j)),
    }));
  },

  cancelJob: async (id) => {
    const job = get().jobs.find((j) => j.id === id);
    if (!job) return;
    if (job.status === "running") {
      await apiCancelJob(id).catch(() => {});
    }
    get().updateJob(id, { status: "canceled" as JobStatus });
    get().processQueue();
  },

  retryJob: (id) => {
    get().updateJob(id, {
      status: "queued",
      percent: 0,
      errorMessage: undefined,
    });
    get().processQueue();
  },

  clearFinished: () => {
    set((s) => ({
      jobs: s.jobs.filter(
        (j) => j.status === "running" || j.status === "queued",
      ),
    }));
  },

  processQueue: () => {
    const { jobs, concurrency } = get();
    let running = runningCount(jobs);
    if (running >= concurrency) return;

    const next = jobs.find((j) => j.status === "queued");
    if (!next) return;

    get().updateJob(next.id, { status: "running", percent: 0 });

    const launch = async () => {
      try {
        await startVideoJob(
          next.id,
          next.inputPath,
          next.subtitlePath ?? null,
          next.outputPath,
          next.options,
        );
      } catch (err) {
        get().updateJob(next.id, {
          status: "error",
          errorMessage: String(err),
        });
        get().processQueue();
      }
    };
    void launch();

    if (running + 1 < concurrency) {
      queueMicrotask(() => get().processQueue());
    }
  },
}));
