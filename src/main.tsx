import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerServiceWorkerOnIdle } from "./lib/serviceWorker";
import {
  hydrateCriticalQueryCache,
  primeNetworkHints,
  scheduleAppWarmup,
} from "./lib/performance";
import { registerChunkRecovery } from "./lib/chunkRecovery";

hydrateCriticalQueryCache();
primeNetworkHints();
registerChunkRecovery();

createRoot(document.getElementById("root")!).render(<App />);
registerServiceWorkerOnIdle();
scheduleAppWarmup();
