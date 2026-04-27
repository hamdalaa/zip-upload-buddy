const CHUNK_RECOVERY_STORAGE_KEY = "hayer:chunk-recovery:v1";
const CHUNK_RECOVERY_OVERLAY_ID = "chunk-recovery-fallback";
const CHUNK_RECOVERY_SETTLE_DELAY_MS = 10_000;
const CHUNK_RECOVERY_REPEAT_WINDOW_MS = 60_000;

const RECOVERABLE_CHUNK_PATTERNS = [
  /Failed to fetch dynamically imported module/i,
  /Importing a module script failed/i,
  /ChunkLoadError/i,
  /Loading chunk [\w-]+ failed/i,
  /error loading dynamically imported module/i,
];

interface ChunkRecoveryState {
  path: string;
  attemptedAt: number;
}

interface ChunkRecoveryContext {
  message: string;
  reload: () => void;
  resetSiteDataAndReload: () => Promise<void>;
}

interface ChunkRecoveryOptions {
  windowObject?: Window;
  documentObject?: Document;
  storage?: Storage;
  reload?: () => void;
  now?: () => number;
  settleDelayMs?: number;
  onFallback?: (context: ChunkRecoveryContext) => void;
}

function extractErrorMessage(input: unknown): string {
  if (typeof input === "string") return input;
  if (input instanceof Error) return input.message;
  if (input && typeof input === "object") {
    const record = input as { message?: unknown; reason?: unknown; error?: unknown };
    if (typeof record.message === "string") return record.message;
    if (record.error instanceof Error) return record.error.message;
    if (record.reason instanceof Error) return record.reason.message;
    if (typeof record.reason === "string") return record.reason;
  }
  return "";
}

function readRecoveryState(storage: Storage): ChunkRecoveryState | null {
  try {
    const raw = storage.getItem(CHUNK_RECOVERY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ChunkRecoveryState>;
    if (!parsed || typeof parsed.path !== "string" || typeof parsed.attemptedAt !== "number") return null;
    return {
      path: parsed.path,
      attemptedAt: parsed.attemptedAt,
    };
  } catch {
    return null;
  }
}

function writeRecoveryState(storage: Storage, state: ChunkRecoveryState) {
  try {
    storage.setItem(CHUNK_RECOVERY_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage failures.
  }
}

function clearRecoveryState(storage: Storage) {
  try {
    storage.removeItem(CHUNK_RECOVERY_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
}

function getCurrentLocationPath(windowObject: Window) {
  return `${windowObject.location.pathname}${windowObject.location.search}${windowObject.location.hash}`;
}

export function isRecoverableChunkError(input: unknown): boolean {
  const message = extractErrorMessage(input);
  if (!message) return false;
  return RECOVERABLE_CHUNK_PATTERNS.some((pattern) => pattern.test(message));
}

async function resetSiteData(windowObject: Window) {
  try {
    const registrations = await windowObject.navigator.serviceWorker?.getRegistrations?.();
    if (registrations?.length) {
      await Promise.allSettled(registrations.map((registration) => registration.unregister()));
    }
  } catch {
    // Ignore service worker reset failures.
  }

  try {
    const cacheKeys = await windowObject.caches?.keys?.();
    if (cacheKeys?.length) {
      await Promise.allSettled(cacheKeys.map((key) => windowObject.caches.delete(key)));
    }
  } catch {
    // Ignore cache reset failures.
  }

  try {
    windowObject.localStorage.clear();
  } catch {
    // Ignore localStorage failures.
  }

  try {
    windowObject.sessionStorage.clear();
  } catch {
    // Ignore sessionStorage failures.
  }

  try {
    const indexedDbWithDatabases = windowObject.indexedDB as IDBFactory & {
      databases?: () => Promise<Array<{ name?: string }>>;
    };
    const databases = await indexedDbWithDatabases.databases?.();
    if (databases?.length) {
      await Promise.allSettled(
        databases
          .map((database) => database.name)
          .filter((name): name is string => Boolean(name))
          .map(
            (name) =>
              new Promise<void>((resolve) => {
                const request = windowObject.indexedDB.deleteDatabase(name);
                request.onsuccess = () => resolve();
                request.onerror = () => resolve();
                request.onblocked = () => resolve();
              }),
          ),
      );
    }
  } catch {
    // Ignore IndexedDB reset failures.
  }
}

function showChunkRecoveryFallback(documentObject: Document, context: ChunkRecoveryContext) {
  const existing = documentObject.getElementById(CHUNK_RECOVERY_OVERLAY_ID);
  if (existing) return;

  const overlay = documentObject.createElement("div");
  overlay.id = CHUNK_RECOVERY_OVERLAY_ID;
  overlay.setAttribute("role", "alert");
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.zIndex = "999999";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.padding = "24px";
  overlay.style.background = "rgba(15, 23, 42, 0.58)";
  overlay.style.backdropFilter = "blur(10px)";

  const panel = documentObject.createElement("div");
  panel.style.width = "min(100%, 460px)";
  panel.style.borderRadius = "24px";
  panel.style.background = "#ffffff";
  panel.style.boxShadow = "0 24px 80px rgba(15, 23, 42, 0.28)";
  panel.style.padding = "24px";
  panel.style.fontFamily = "\"SF Arabic\", \"SF Pro\", system-ui, sans-serif";
  panel.style.textAlign = "right";
  panel.dir = "rtl";

  const title = documentObject.createElement("h2");
  title.textContent = "صار تعارض بين نسخة الصفحة وملفات البناء";
  title.style.margin = "0 0 12px";
  title.style.fontSize = "20px";
  title.style.lineHeight = "1.4";
  title.style.color = "#0f172a";

  const description = documentObject.createElement("p");
  description.textContent =
    "تم تحديث الموقع، والصفحة الحالية ما زالت تحاول تحميل chunk قديم. جرّب إعادة التحميل مرة واحدة. إذا استمر الخطأ محليًا بعد build جديد، امسح بيانات الموقع المحلية ثم أعد التحميل.";
  description.style.margin = "0";
  description.style.fontSize = "14px";
  description.style.lineHeight = "1.8";
  description.style.color = "#475569";

  const errorLine = documentObject.createElement("p");
  errorLine.textContent = context.message;
  errorLine.style.margin = "12px 0 0";
  errorLine.style.fontSize = "12px";
  errorLine.style.lineHeight = "1.6";
  errorLine.style.color = "#64748b";

  const actions = documentObject.createElement("div");
  actions.style.display = "flex";
  actions.style.flexWrap = "wrap";
  actions.style.gap = "10px";
  actions.style.marginTop = "18px";

  const reloadButton = documentObject.createElement("button");
  reloadButton.type = "button";
  reloadButton.textContent = "إعادة التحميل";
  reloadButton.style.border = "0";
  reloadButton.style.borderRadius = "999px";
  reloadButton.style.padding = "10px 16px";
  reloadButton.style.background = "#0f172a";
  reloadButton.style.color = "#ffffff";
  reloadButton.style.cursor = "pointer";
  reloadButton.onclick = () => context.reload();

  const resetButton = documentObject.createElement("button");
  resetButton.type = "button";
  resetButton.textContent = "مسح البيانات المحلية ثم إعادة التحميل";
  resetButton.style.border = "1px solid #cbd5e1";
  resetButton.style.borderRadius = "999px";
  resetButton.style.padding = "10px 16px";
  resetButton.style.background = "#ffffff";
  resetButton.style.color = "#0f172a";
  resetButton.style.cursor = "pointer";
  resetButton.onclick = () => {
    void context.resetSiteDataAndReload();
  };

  actions.append(reloadButton, resetButton);
  panel.append(title, description, errorLine, actions);
  overlay.appendChild(panel);
  documentObject.body.appendChild(overlay);
}

export function registerChunkRecovery(options: ChunkRecoveryOptions = {}) {
  const windowObject = options.windowObject ?? (typeof window !== "undefined" ? window : undefined);
  const documentObject = options.documentObject ?? (typeof document !== "undefined" ? document : undefined);

  if (!windowObject || !documentObject) return () => undefined;

  const storage = options.storage ?? windowObject.sessionStorage;
  const now = options.now ?? (() => Date.now());
  const reload = options.reload ?? (() => windowObject.location.reload());
  const settleDelayMs = options.settleDelayMs ?? CHUNK_RECOVERY_SETTLE_DELAY_MS;
  const onFallback = options.onFallback ?? ((context) => showChunkRecoveryFallback(documentObject, context));

  const initialPath = getCurrentLocationPath(windowObject);
  const initialState = readRecoveryState(storage);
  if (
    initialState &&
    (initialState.path !== initialPath || now() - initialState.attemptedAt > CHUNK_RECOVERY_REPEAT_WINDOW_MS)
  ) {
    clearRecoveryState(storage);
  }

  let settledHandle: number | null = null;
  const activeState = readRecoveryState(storage);
  if (activeState?.path === initialPath) {
    settledHandle = windowObject.setTimeout(() => {
      clearRecoveryState(storage);
    }, settleDelayMs);
  }

  const triggerFallback = (message: string) => {
    if (settledHandle != null) {
      windowObject.clearTimeout(settledHandle);
    }
    onFallback({
      message,
      reload,
      resetSiteDataAndReload: async () => {
        await resetSiteData(windowObject);
        reload();
      },
    });
  };

  const handleRecoverableFailure = (input: unknown, event?: Event) => {
    if (!isRecoverableChunkError(input)) return;
    event?.preventDefault?.();

    const currentPath = getCurrentLocationPath(windowObject);
    const state = readRecoveryState(storage);
    const message = extractErrorMessage(input) || "Chunk load failed";

    if (
      state &&
      state.path === currentPath &&
      now() - state.attemptedAt <= CHUNK_RECOVERY_REPEAT_WINDOW_MS
    ) {
      triggerFallback(message);
      return;
    }

    writeRecoveryState(storage, {
      path: currentPath,
      attemptedAt: now(),
    });
    reload();
  };

  const onPreloadError = (event: Event & { payload?: unknown }) => {
    handleRecoverableFailure(event.payload ?? event, event);
  };
  const onUnhandledRejection = (event: Event & { reason?: unknown }) => {
    handleRecoverableFailure(event.reason ?? event, event);
  };
  const onWindowError = (event: ErrorEvent) => {
    handleRecoverableFailure(event.error ?? event.message ?? event, event);
  };

  windowObject.addEventListener("vite:preloadError", onPreloadError as EventListener);
  windowObject.addEventListener("unhandledrejection", onUnhandledRejection as EventListener);
  windowObject.addEventListener("error", onWindowError);

  return () => {
    if (settledHandle != null) {
      windowObject.clearTimeout(settledHandle);
    }
    windowObject.removeEventListener("vite:preloadError", onPreloadError as EventListener);
    windowObject.removeEventListener("unhandledrejection", onUnhandledRejection as EventListener);
    windowObject.removeEventListener("error", onWindowError);
  };
}
