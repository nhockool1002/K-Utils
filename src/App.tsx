import { useEffect, useState } from "react";
import { Sidebar, type View } from "./components/Sidebar";
import { VideoPanel } from "./components/VideoPanel";
import { BlendVideoPanel } from "./components/BlendVideoPanel";
import { PhotoPanel } from "./components/PhotoPanel";
import { ConvertPanel } from "./components/ConvertPanel";
import { QueueView } from "./components/QueueView";
import { LogView } from "./components/LogView";
import { onJobProgress, onJobDone, onJobError, onAppLog } from "./lib/api";
import { useQueueStore } from "./store/queue";
import { useLogStore } from "./store/logs";

export default function App() {
  const [view, setView] = useState<View>("video");
  const updateJob = useQueueStore((s) => s.updateJob);
  const processQueue = useQueueStore((s) => s.processQueue);

  useEffect(() => {
    const unlistenProgress = onJobProgress((e) => {
      const job = useQueueStore.getState().jobs.find((j) => j.id === e.job_id);
      if (!job || job.status === "canceled") return;
      updateJob(e.job_id, {
        percent: e.percent,
        speed: e.speed,
        fps: e.fps,
        etaSeconds: e.eta_seconds,
      });
    });
    const unlistenDone = onJobDone((e) => {
      const job = useQueueStore.getState().jobs.find((j) => j.id === e.job_id);
      if (job && job.status === "canceled") {
        processQueue();
        return;
      }
      updateJob(e.job_id, { status: "done", percent: 100 });
      processQueue();
    });
    const unlistenError = onJobError((e) => {
      const job = useQueueStore.getState().jobs.find((j) => j.id === e.job_id);
      if (job && job.status === "canceled") {
        processQueue();
        return;
      }
      updateJob(e.job_id, { status: "error", errorMessage: e.message });
      processQueue();
    });
    const unlistenLog = onAppLog((e) => {
      useLogStore.getState().addEntry(e);
    });
    return () => {
      unlistenProgress.then((f) => f());
      unlistenDone.then((f) => f());
      unlistenError.then((f) => f());
      unlistenLog.then((f) => f());
    };
  }, [updateJob, processQueue]);

  return (
    <div className="app-shell flex h-screen w-screen overflow-hidden text-[var(--text)]">
      <Sidebar view={view} onChange={setView} />
      <main className="min-w-0 flex-1">
        {view === "video" && <VideoPanel />}
        {view === "blend_video" && <BlendVideoPanel />}
        {view === "photo" && <PhotoPanel />}
        {view === "convert" && <ConvertPanel />}
        {view === "queue" && <QueueView />}
        {view === "logs" && <LogView />}
      </main>
    </div>
  );
}
