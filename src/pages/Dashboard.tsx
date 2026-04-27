import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  Database,
  ExternalLink,
  Layers,
  LogOut,
  Palette,
  Play,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Store,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  getAdminCatalogStats,
  getAdminHealth,
  getAdminSession,
  getAuditLogs,
  getCoverageBacklog,
  getCoverageSummary,
  getIndexedStores,
  getMissingProductStores,
  getCatalogJob,
  getSiteSettings,
  internalSearch,
  logoutAdmin,
  probeStore,
  registerDomainSession,
  syncStore,
  triggerPullStoreUrl,
  triggerProductPull,
  triggerRetryFailed,
  triggerStoreIntake,
  triggerStoreByStoreUpdate,
  updateSiteSettings,
  updateStore,
} from "@/lib/adminApi";
import type {
  AdminAuditLog,
  AdminCatalogStats,
  AdminCoverageSummary,
  AdminDomainEvidence,
  AdminHealth,
  AdminPullProductsJob,
  AdminSiteSettingsPayload,
  AdminStoreListItem,
  AdminStoreListResponse,
} from "@/lib/adminTypes";

type AdminTab = "overview" | "stores" | "products" | "jobs" | "connectors" | "content" | "audit";

const tabs: Array<{ id: AdminTab; label: string; icon: typeof Activity }> = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "stores", label: "Stores", icon: Store },
  { id: "products", label: "Products", icon: Database },
  { id: "jobs", label: "Jobs", icon: Play },
  { id: "connectors", label: "Connectors", icon: Wrench },
  { id: "content", label: "Content & Design", icon: Palette },
  { id: "audit", label: "Audit", icon: ShieldCheck },
];

function Panel({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-[0_18px_60px_-48px_rgba(23,32,23,0.45)]">
      <header className="mb-4 border-b border-border pb-3">
        <h2 className="text-base font-black">{title}</h2>
        {description && <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>}
      </header>
      {children}
    </section>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: ReactNode; icon: typeof Activity }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/60 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className="mt-2 font-numeric text-2xl font-black text-foreground">{value}</div>
    </div>
  );
}

function compactDate(value?: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ar-IQ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function textValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function jsonPreview(value: unknown) {
  try {
    return JSON.stringify(value ?? {}, null, 2).slice(0, 800);
  } catch {
    return "{}";
  }
}

function isRunningJob(job: AdminPullProductsJob | null) {
  return Boolean(job && job.status !== "completed" && job.status !== "failed");
}

function JobStatus({ job }: { job: AdminPullProductsJob | null }) {
  if (!job) return null;
  const progress = job.progress;
  return (
    <div className="rounded-xl border border-border bg-surface/60 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-mono text-muted-foreground">{job.id}</span>
        <span className={`rounded-full px-2 py-1 font-bold ${job.status === "failed" ? "bg-destructive/10 text-destructive" : "bg-primary-soft text-primary"}`}>
          {job.status}
        </span>
      </div>
      {progress && (
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span>{progress.lastStoreName ?? progress.lastStoreId ?? "جارِ الفحص..."}</span>
            <span className="tabular-nums">{progress.completedStores}/{progress.totalStores}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
              style={{ width: `${Math.min(100, Math.round((progress.completedStores / Math.max(1, progress.totalStores)) * 100))}%` }}
            />
          </div>
        </div>
      )}
      {job.error && <p className="mt-2 text-xs font-semibold text-destructive">{job.error}</p>}
      {(job.status === "completed" || job.status === "failed") && (
        <pre className="mt-3 max-h-[260px] overflow-auto rounded-lg bg-foreground p-3 text-xs leading-5 text-background">
          {jsonPreview(job.result ?? { error: job.error })}
        </pre>
      )}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [checkingSession, setCheckingSession] = useState(true);
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [loading, setLoading] = useState(false);
  const [health, setHealth] = useState<AdminHealth | null>(null);
  const [stats, setStats] = useState<AdminCatalogStats | null>(null);
  const [coverage, setCoverage] = useState<AdminCoverageSummary | null>(null);
  const [indexedStores, setIndexedStores] = useState<AdminStoreListResponse | null>(null);
  const [missingStores, setMissingStores] = useState<AdminStoreListResponse | null>(null);
  const [backlog, setBacklog] = useState<AdminDomainEvidence[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [settingsDraft, setSettingsDraft] = useState<AdminSiteSettingsPayload | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [storePatch, setStorePatch] = useState<Record<string, unknown>>({});
  const [storeSearch, setStoreSearch] = useState("");
  const [productQuery, setProductQuery] = useState("iphone");
  const [productResults, setProductResults] = useState<Array<Record<string, unknown>>>([]);
  const [includeZeroProducts, setIncludeZeroProducts] = useState(true);
  const [includeUnofficial, setIncludeUnofficial] = useState(false);
  const [productPullJob, setProductPullJob] = useState<AdminPullProductsJob | null>(null);
  const [storeUrlPullJob, setStoreUrlPullJob] = useState<AdminPullProductsJob | null>(null);
  const [storeByStoreJob, setStoreByStoreJob] = useState<AdminPullProductsJob | null>(null);
  const [storeUrlPullForm, setStoreUrlPullForm] = useState({
    website: "",
    name: "",
    cityAr: "بغداد",
    area: "",
    primaryCategory: "Electronics",
    highPriority: true,
  });
  const [storeUpdateOptions, setStoreUpdateOptions] = useState({
    limit: 80,
    concurrency: 1,
    officialOnly: true,
    includeZeroProducts: false,
    zeroLimit: 40,
  });
  const [sessionWorkflowStoreId, setSessionWorkflowStoreId] = useState("");
  const [sessionWorkflowCookies, setSessionWorkflowCookies] = useState("");
  const [intakeForm, setIntakeForm] = useState({
    website: "",
    name: "",
    city: "Baghdad",
    cityAr: "بغداد",
    area: "",
    primaryCategory: "",
    highPriority: true,
    syncNow: true,
  });

  const stores = useMemo(() => {
    const map = new Map<string, AdminStoreListItem>();
    for (const item of indexedStores?.items ?? []) map.set(item.store.id, item);
    for (const item of missingStores?.items ?? []) map.set(item.store.id, item);
    const query = storeSearch.trim().toLowerCase();
    return [...map.values()].filter((item) => {
      if (!query) return true;
      return [item.store.name, item.store.website, item.store.area, item.store.primaryCategory]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [indexedStores?.items, missingStores?.items, storeSearch]);

  const selectedStore = stores.find((item) => item.store.id === selectedStoreId)?.store;

  async function loadDashboard() {
    setLoading(true);
    try {
      const [nextHealth, nextStats, nextCoverage, nextIndexed, nextMissing, nextBacklog, nextSettings, nextAudit] =
        await Promise.all([
          getAdminHealth(),
          getAdminCatalogStats(),
          getCoverageSummary(),
          getIndexedStores({ limit: 60 }),
          getMissingProductStores({ limit: 60 }),
          getCoverageBacklog(),
          getSiteSettings(),
          getAuditLogs({ limit: 40 }),
        ]);
      setHealth(nextHealth);
      setStats(nextStats);
      setCoverage(nextCoverage);
      setIndexedStores(nextIndexed);
      setMissingStores(nextMissing);
      setBacklog(nextBacklog);
      setSettingsDraft(nextSettings.payload);
      setAuditLogs(nextAudit.items);
      if (!selectedStoreId) {
        const firstStore = nextIndexed.items[0]?.store.id ?? nextMissing.items[0]?.store.id ?? "";
        setSelectedStoreId(firstStore);
      }
    } catch (error) {
      toast({
        title: "تعذر تحميل لوحة الأدمن",
        description: error instanceof Error ? error.message : "فشل الاتصال بالسيرفر.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    getAdminSession()
      .then((session) => {
        if (!mounted) return;
        if (!session.authenticated) {
          navigate("/67?next=/dashboard", { replace: true });
          return;
        }
        setCheckingSession(false);
        void loadDashboard();
      })
      .catch(() => navigate("/67?next=/dashboard", { replace: true }));
    return () => {
      mounted = false;
    };
    // loadDashboard intentionally reads live state and is triggered only after session probe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  useEffect(() => {
    if (!selectedStore) return;
    setStorePatch({
      name: selectedStore.name,
      website: selectedStore.website ?? "",
      googleMapsUrl: textValue((selectedStore as Record<string, unknown>).googleMapsUrl),
      phone: textValue((selectedStore as Record<string, unknown>).phone),
      whatsapp: textValue((selectedStore as Record<string, unknown>).whatsapp),
      area: selectedStore.area ?? "",
      primaryCategory: selectedStore.primaryCategory ?? "",
      status: selectedStore.status,
      highPriority: Boolean((selectedStore as Record<string, unknown>).highPriority),
    });
  }, [selectedStore]);

  useEffect(() => {
    const activeJobs = [
      { job: productPullJob, setJob: setProductPullJob },
      { job: storeUrlPullJob, setJob: setStoreUrlPullJob },
      { job: storeByStoreJob, setJob: setStoreByStoreJob },
    ].filter((entry) => isRunningJob(entry.job));
    if (activeJobs.length === 0) return;

    const interval = window.setInterval(() => {
      for (const entry of activeJobs) {
        if (!entry.job) continue;
        void getCatalogJob(entry.job.id)
          .then(entry.setJob)
          .catch(() => {
            // Keep the last status if polling has a transient failure.
          });
      }
    }, 2000);
    return () => window.clearInterval(interval);
  }, [productPullJob, storeUrlPullJob, storeByStoreJob]);

  async function handleLogout() {
    await logoutAdmin();
    navigate("/67", { replace: true });
  }

  async function handleStoreSave() {
    if (!selectedStoreId) return;
    try {
      await updateStore(selectedStoreId, storePatch);
      toast({ title: "تم حفظ المتجر" });
      await loadDashboard();
    } catch (error) {
      toast({ title: "فشل حفظ المتجر", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    }
  }

  async function handleProductSearch() {
    try {
      const result = await internalSearch({ q: productQuery, limit: 30 });
      setProductResults(result.hits);
    } catch (error) {
      toast({ title: "فشل البحث الداخلي", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    }
  }

  async function handleProductPull() {
    try {
      const accepted = await triggerProductPull({
        concurrency: 4,
        currentLimit: 300,
        zeroLimit: includeZeroProducts ? 200 : 0,
        includeZeroProducts,
        includeUnofficial,
      });
      setProductPullJob({ id: accepted.jobId, status: accepted.status, createdAt: accepted.createdAt, args: {} });
      toast({ title: "بدأ سحب المنتجات" });
    } catch (error) {
      toast({ title: "فشل تشغيل المهمة", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    }
  }

  async function handleStoreUrlPull() {
    if (!storeUrlPullForm.website.trim()) {
      toast({ title: "أدخل رابط المتجر أولاً", variant: "destructive" });
      return;
    }
    try {
      const accepted = await triggerPullStoreUrl({
        website: storeUrlPullForm.website.trim(),
        name: storeUrlPullForm.name.trim() || undefined,
        cityAr: storeUrlPullForm.cityAr.trim() || undefined,
        area: storeUrlPullForm.area.trim() || undefined,
        primaryCategory: storeUrlPullForm.primaryCategory.trim() || undefined,
        highPriority: storeUrlPullForm.highPriority,
      });
      setStoreUrlPullJob({ id: accepted.jobId, status: accepted.status, createdAt: accepted.createdAt, args: { website: storeUrlPullForm.website } });
      toast({ title: "بدأ سحب متجر من الرابط", description: storeUrlPullForm.website });
    } catch (error) {
      toast({ title: "فشل سحب المتجر", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    }
  }

  async function handleStoreByStoreUpdate() {
    try {
      const accepted = await triggerStoreByStoreUpdate({
        limit: storeUpdateOptions.limit,
        concurrency: storeUpdateOptions.concurrency,
        officialOnly: storeUpdateOptions.officialOnly,
        dedupeByDomain: true,
        includeZeroProducts: storeUpdateOptions.includeZeroProducts,
        zeroLimit: storeUpdateOptions.zeroLimit,
      });
      setStoreByStoreJob({
        id: accepted.jobId,
        status: accepted.status,
        createdAt: accepted.createdAt,
        args: storeUpdateOptions,
      });
      toast({ title: "بدأ تحديث المتاجر متجر متجر" });
    } catch (error) {
      toast({ title: "فشل تشغيل تحديث المتاجر", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    }
  }

  async function handleSettingsSave() {
    if (!settingsDraft) return;
    try {
      const saved = await updateSiteSettings(settingsDraft);
      setSettingsDraft(saved.payload);
      toast({ title: "تم حفظ المحتوى والتصميم" });
    } catch (error) {
      toast({ title: "فشل حفظ الإعدادات", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    }
  }

  async function handleStoreIntake() {
    try {
      await triggerStoreIntake(intakeForm);
      toast({ title: "تم إدخال المتجر", description: intakeForm.website });
      setIntakeForm({ ...intakeForm, website: "", name: "" });
      await loadDashboard();
    } catch (error) {
      toast({ title: "فشل إدخال المتجر", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    }
  }

  async function handleDomainSessionSave() {
    if (!sessionWorkflowStoreId || !sessionWorkflowCookies.trim()) return;
    try {
      await registerDomainSession(sessionWorkflowStoreId, {
        cookiesJson: sessionWorkflowCookies,
        notes: "admin dashboard session",
      });
      toast({ title: "تم حفظ جلسة المتجر" });
      setSessionWorkflowCookies("");
      await loadDashboard();
    } catch (error) {
      toast({ title: "فشل حفظ الجلسة", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    }
  }

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface">
        <div className="rounded-2xl border border-border bg-card px-5 py-4 text-sm font-semibold text-muted-foreground">
          جارِ التحقق من الجلسة...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Hayr Admin</p>
            <h1 className="font-display text-2xl font-black">لوحة التحكم</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => void loadDashboard()} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              تحديث
            </Button>
            <Button variant="ghost" size="sm" className="gap-2" onClick={() => void handleLogout()}>
              <LogOut className="h-4 w-4" />
              خروج
            </Button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-[1500px] gap-2 overflow-x-auto px-4 pb-3">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={
                  activeTab === tab.id
                    ? "inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-foreground px-4 text-sm font-bold text-background"
                    : "inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-bold text-muted-foreground hover:text-foreground"
                }
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </header>

      <div className="mx-auto max-w-[1500px] px-4 py-6">
        {activeTab === "overview" && (
          <div className="space-y-5">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Stat icon={Store} label="المتاجر" value={stats?.totalStores?.toLocaleString("en-US") ?? "-"} />
              <Stat icon={Database} label="المنتجات" value={stats?.totalProducts?.toLocaleString("en-US") ?? "-"} />
              <Stat icon={Layers} label="متاجر مفهرسة" value={stats?.indexedStores?.toLocaleString("en-US") ?? "-"} />
              <Stat icon={Activity} label="صفر منتجات" value={stats?.zeroProductStores?.toLocaleString("en-US") ?? "-"} />
            </div>
            <div className="grid gap-5 xl:grid-cols-2">
              <Panel title="صحة النظام" description="قراءة مباشرة من /internal/health.">
                <pre className="max-h-[360px] overflow-auto rounded-xl bg-foreground p-4 text-xs leading-6 text-background">
                  {jsonPreview(health)}
                </pre>
              </Panel>
              <Panel title="Coverage" description="حالة تغطية المتاجر وموانع الفهرسة.">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Stat icon={ShieldCheck} label="محجوبة" value={coverage?.blockedStores ?? "-"} />
                  <Stat icon={Database} label="Feeds" value={coverage?.partnerFeedRequiredStores ?? "-"} />
                  <Stat icon={Store} label="مكررة" value={coverage?.duplicateStores ?? "-"} />
                </div>
              </Panel>
            </div>
          </div>
        )}

        {activeTab === "stores" && (
          <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
            <Panel title="المتاجر" description="بحث وتحديد متجر للتعديل أو تشغيل probe/sync.">
              <Input value={storeSearch} onChange={(event) => setStoreSearch(event.target.value)} placeholder="ابحث عن متجر..." />
              <div className="mt-3 max-h-[560px] space-y-2 overflow-auto">
                {stores.map((item) => (
                  <button
                    key={item.store.id}
                    type="button"
                    onClick={() => setSelectedStoreId(item.store.id)}
                    className={`w-full rounded-xl border p-3 text-right transition-colors ${
                      selectedStoreId === item.store.id ? "border-primary bg-primary-soft" : "border-border bg-surface/60 hover:bg-surface"
                    }`}
                  >
                    <div className="font-bold">{item.store.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{item.store.website ?? item.store.area ?? item.store.status}</div>
                  </button>
                ))}
              </div>
            </Panel>

            <Panel title="تعديل المتجر" description="حقول آمنة فقط؛ كل حفظ يسجل في audit log.">
              {selectedStore ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <Label>الاسم</Label>
                    <Input value={textValue(storePatch.name)} onChange={(e) => setStorePatch({ ...storePatch, name: e.target.value })} />
                  </div>
                  <div className="md:col-span-2">
                    <Label>الموقع</Label>
                    <Input value={textValue(storePatch.website)} onChange={(e) => setStorePatch({ ...storePatch, website: e.target.value })} />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Google Maps</Label>
                    <Input value={textValue(storePatch.googleMapsUrl)} onChange={(e) => setStorePatch({ ...storePatch, googleMapsUrl: e.target.value })} />
                  </div>
                  <div>
                    <Label>الهاتف</Label>
                    <Input value={textValue(storePatch.phone)} onChange={(e) => setStorePatch({ ...storePatch, phone: e.target.value })} />
                  </div>
                  <div>
                    <Label>واتساب</Label>
                    <Input value={textValue(storePatch.whatsapp)} onChange={(e) => setStorePatch({ ...storePatch, whatsapp: e.target.value })} />
                  </div>
                  <div>
                    <Label>المنطقة</Label>
                    <Input value={textValue(storePatch.area)} onChange={(e) => setStorePatch({ ...storePatch, area: e.target.value })} />
                  </div>
                  <div>
                    <Label>الفئة</Label>
                    <Input value={textValue(storePatch.primaryCategory)} onChange={(e) => setStorePatch({ ...storePatch, primaryCategory: e.target.value })} />
                  </div>
                  <div>
                    <Label>الحالة</Label>
                    <Select value={textValue(storePatch.status)} onValueChange={(status) => setStorePatch({ ...storePatch, status })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["discovered", "probe_pending", "indexable", "indexed", "social_only", "blocked", "failed"].map((status) => (
                          <SelectItem key={status} value={status}>{status}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <label className="mt-6 flex items-center gap-2 text-sm font-semibold">
                    <Checkbox checked={Boolean(storePatch.highPriority)} onCheckedChange={(checked) => setStorePatch({ ...storePatch, highPriority: Boolean(checked) })} />
                    featured / high priority
                  </label>
                  <div className="md:col-span-2 flex flex-wrap gap-2">
                    <Button className="gap-2 bg-foreground text-background" onClick={() => void handleStoreSave()}>
                      <Save className="h-4 w-4" />
                      حفظ
                    </Button>
                    <Button variant="outline" className="gap-2" onClick={() => void probeStore(selectedStore.id).then(() => toast({ title: "تم تشغيل probe" }))}>
                      <Play className="h-4 w-4" />
                      Probe
                    </Button>
                    <Button variant="outline" className="gap-2" onClick={() => void syncStore(selectedStore.id).then(() => toast({ title: "تم تشغيل sync" }))}>
                      <RefreshCw className="h-4 w-4" />
                      Sync
                    </Button>
                    {selectedStore.website && (
                      <a href={selectedStore.website} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-4 text-sm font-bold">
                        <ExternalLink className="h-4 w-4" />
                        فتح الموقع
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">اختر متجر من القائمة.</p>
              )}
            </Panel>

            <Panel title="إضافة متجر" description="يدخل متجر جديد ويشغل sync إذا اخترت ذلك.">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Label>Website</Label>
                  <Input value={intakeForm.website} onChange={(e) => setIntakeForm({ ...intakeForm, website: e.target.value })} placeholder="https://..." />
                </div>
                <div>
                  <Label>الاسم</Label>
                  <Input value={intakeForm.name} onChange={(e) => setIntakeForm({ ...intakeForm, name: e.target.value })} />
                </div>
                <div>
                  <Label>المدينة</Label>
                  <Input value={intakeForm.cityAr} onChange={(e) => setIntakeForm({ ...intakeForm, cityAr: e.target.value })} />
                </div>
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <Checkbox checked={intakeForm.highPriority} onCheckedChange={(checked) => setIntakeForm({ ...intakeForm, highPriority: Boolean(checked) })} />
                  أولوية عالية
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <Checkbox checked={intakeForm.syncNow} onCheckedChange={(checked) => setIntakeForm({ ...intakeForm, syncNow: Boolean(checked) })} />
                  Sync now
                </label>
                <div className="md:col-span-2">
                  <Button onClick={() => void handleStoreIntake()} className="bg-foreground text-background">إضافة</Button>
                </div>
              </div>
            </Panel>
          </div>
        )}

        {activeTab === "products" && (
          <Panel title="البحث الداخلي بالمنتجات" description="يفيد لمراجعة المنتجات بدون سعر/صورة ومعرفة مصدرها.">
            <div className="flex flex-col gap-2 md:flex-row">
              <Input value={productQuery} onChange={(event) => setProductQuery(event.target.value)} placeholder="iphone, rtx, mac..." />
              <Button className="gap-2" onClick={() => void handleProductSearch()}>
                <Search className="h-4 w-4" />
                بحث
              </Button>
            </div>
            <div className="mt-4 overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-surface text-xs text-muted-foreground">
                  <tr>
                    <th className="p-3 text-right">المنتج</th>
                    <th className="p-3 text-right">المتجر</th>
                    <th className="p-3 text-right">السعر</th>
                    <th className="p-3 text-right">الصورة</th>
                  </tr>
                </thead>
                <tbody>
                  {productResults.map((item) => (
                    <tr key={String(item.id)} className="border-t border-border">
                      <td className="p-3 font-semibold">{String(item.title ?? item.name ?? "-")}</td>
                      <td className="p-3 text-muted-foreground">{String(item.storeName ?? item.sellerName ?? "-")}</td>
                      <td className="p-3 font-numeric">{String(item.livePrice ?? "-")}</td>
                      <td className="p-3 text-xs">{item.imageUrl ? "OK" : "missing"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        {activeTab === "jobs" && (
          <div className="grid gap-5 xl:grid-cols-2">
            <Panel title="سحب منتجات متجر من رابط" description="ضع رابط متجر واحد؛ النظام يضيفه أو يحدثه ثم يرسل sync آمن للـ queue.">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Label>رابط المتجر</Label>
                  <Input
                    value={storeUrlPullForm.website}
                    onChange={(event) => setStoreUrlPullForm({ ...storeUrlPullForm, website: event.target.value })}
                    placeholder="https://store.example.com"
                  />
                </div>
                <div>
                  <Label>اسم اختياري</Label>
                  <Input value={storeUrlPullForm.name} onChange={(event) => setStoreUrlPullForm({ ...storeUrlPullForm, name: event.target.value })} />
                </div>
                <div>
                  <Label>المدينة</Label>
                  <Input value={storeUrlPullForm.cityAr} onChange={(event) => setStoreUrlPullForm({ ...storeUrlPullForm, cityAr: event.target.value })} />
                </div>
                <div>
                  <Label>المنطقة</Label>
                  <Input value={storeUrlPullForm.area} onChange={(event) => setStoreUrlPullForm({ ...storeUrlPullForm, area: event.target.value })} />
                </div>
                <div>
                  <Label>الفئة</Label>
                  <Input value={storeUrlPullForm.primaryCategory} onChange={(event) => setStoreUrlPullForm({ ...storeUrlPullForm, primaryCategory: event.target.value })} />
                </div>
                <label className="flex items-center gap-2 text-sm font-semibold md:col-span-2">
                  <Checkbox
                    checked={storeUrlPullForm.highPriority}
                    onCheckedChange={(checked) => setStoreUrlPullForm({ ...storeUrlPullForm, highPriority: Boolean(checked) })}
                  />
                  أولوية عالية
                </label>
                <div className="md:col-span-2 space-y-3">
                  <Button onClick={() => void handleStoreUrlPull()} disabled={isRunningJob(storeUrlPullJob)} className="gap-2 bg-foreground text-background">
                    <Play className="h-4 w-4" />
                    سحب هذا المتجر
                  </Button>
                  <JobStatus job={storeUrlPullJob} />
                </div>
              </div>
            </Panel>

            <Panel title="تحديث متجر متجر" description="يرسل sync jobs للمتاجر المفهرسة واحداً واحداً حتى يلتقط المنتجات الجديدة بدون إسقاط الـ API.">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label>عدد المتاجر</Label>
                  <Input
                    type="number"
                    min={1}
                    max={1000}
                    value={storeUpdateOptions.limit}
                    onChange={(event) => setStoreUpdateOptions({ ...storeUpdateOptions, limit: Number(event.target.value) })}
                  />
                </div>
                <div>
                  <Label>التوازي</Label>
                  <Input
                    type="number"
                    min={1}
                    max={4}
                    value={storeUpdateOptions.concurrency}
                    onChange={(event) => setStoreUpdateOptions({ ...storeUpdateOptions, concurrency: Number(event.target.value) })}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <Checkbox
                    checked={storeUpdateOptions.officialOnly}
                    onCheckedChange={(checked) => setStoreUpdateOptions({ ...storeUpdateOptions, officialOnly: Boolean(checked) })}
                  />
                  الرسمية فقط
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <Checkbox
                    checked={storeUpdateOptions.includeZeroProducts}
                    onCheckedChange={(checked) => setStoreUpdateOptions({ ...storeUpdateOptions, includeZeroProducts: Boolean(checked) })}
                  />
                  ضم متاجر صفر منتجات
                </label>
                {storeUpdateOptions.includeZeroProducts && (
                  <div>
                    <Label>حد صفر منتجات</Label>
                    <Input
                      type="number"
                      min={1}
                      max={500}
                      value={storeUpdateOptions.zeroLimit}
                      onChange={(event) => setStoreUpdateOptions({ ...storeUpdateOptions, zeroLimit: Number(event.target.value) })}
                    />
                  </div>
                )}
                <div className="md:col-span-2 space-y-3">
                  <Button onClick={() => void handleStoreByStoreUpdate()} disabled={isRunningJob(storeByStoreJob)} className="gap-2 bg-foreground text-background">
                    <RefreshCw className={`h-4 w-4 ${isRunningJob(storeByStoreJob) ? "animate-spin" : ""}`} />
                    تشغيل تحديث متجر متجر
                  </Button>
                  <JobStatus job={storeByStoreJob} />
                </div>
              </div>
            </Panel>

            <Panel title="سحب المنتجات" description="workflow شامل يرسل jobs للمتاجر الحالية وصفر المنتجات عبر الـ queue.">
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <Checkbox checked={includeZeroProducts} onCheckedChange={(checked) => setIncludeZeroProducts(Boolean(checked))} />
                  ضم المتاجر صفر منتجات
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <Checkbox checked={includeUnofficial} onCheckedChange={(checked) => setIncludeUnofficial(Boolean(checked))} />
                  ضم غير الرسمية
                </label>
                <Button onClick={() => void handleProductPull()} className="gap-2 bg-foreground text-background">
                  <RefreshCw className="h-4 w-4" />
                  تشغيل pull products
                </Button>
                <JobStatus job={productPullJob} />
              </div>
            </Panel>
            <Panel title="مهام سريعة">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => void handleStoreByStoreUpdate()}>Sync current آمن</Button>
                <Button variant="outline" onClick={() => void triggerRetryFailed({ includeZeroProducts: true, limit: 200, concurrency: 4 }).then(() => toast({ title: "تم تشغيل retry failed" }))}>Retry failed</Button>
              </div>
            </Panel>
          </div>
        )}

        {activeTab === "connectors" && (
          <Panel title="Connectors & anti-bot sessions" description="المتاجر التي تحتاج session أو feed.">
            <div className="grid gap-4 xl:grid-cols-[1fr_0.85fr]">
              <div className="max-h-[560px] space-y-2 overflow-auto">
                {backlog.map((item) => (
                  <button
                    key={item.store.id}
                    type="button"
                    onClick={() => setSessionWorkflowStoreId(item.store.id)}
                    className="w-full rounded-xl border border-border bg-surface/60 p-3 text-right hover:bg-surface"
                  >
                    <div className="font-bold">{item.store.name}</div>
                    <div className="text-xs text-muted-foreground">{item.acquisitionProfile.lifecycleState}</div>
                  </button>
                ))}
              </div>
              <div className="space-y-3">
                <Label>Store ID</Label>
                <Input value={sessionWorkflowStoreId} onChange={(e) => setSessionWorkflowStoreId(e.target.value)} />
                <Label>Cookies JSON / raw cookie header</Label>
                <Textarea rows={8} value={sessionWorkflowCookies} onChange={(e) => setSessionWorkflowCookies(e.target.value)} />
                <Button onClick={() => void handleDomainSessionSave()} className="bg-foreground text-background">حفظ session</Button>
              </div>
            </div>
          </Panel>
        )}

        {activeTab === "content" && settingsDraft && (
          <Panel title="Content & Design" description="إعدادات منظمة فقط، بدون HTML أو JavaScript حر.">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3">
                <Label>Hero badge</Label>
                <Input value={settingsDraft.hero.badgeText} onChange={(e) => setSettingsDraft({ ...settingsDraft, hero: { ...settingsDraft.hero, badgeText: e.target.value } })} />
                <Label>Hero title</Label>
                <Textarea rows={3} value={settingsDraft.hero.title} onChange={(e) => setSettingsDraft({ ...settingsDraft, hero: { ...settingsDraft.hero, title: e.target.value } })} />
                <Label>Hero subtitle</Label>
                <Textarea rows={3} value={settingsDraft.hero.subtitle} onChange={(e) => setSettingsDraft({ ...settingsDraft, hero: { ...settingsDraft.hero, subtitle: e.target.value } })} />
                <Label>SEO title</Label>
                <Input value={settingsDraft.seo.title} onChange={(e) => setSettingsDraft({ ...settingsDraft, seo: { ...settingsDraft.seo, title: e.target.value } })} />
                <Label>SEO description</Label>
                <Textarea rows={3} value={settingsDraft.seo.description} onChange={(e) => setSettingsDraft({ ...settingsDraft, seo: { ...settingsDraft.seo, description: e.target.value } })} />
              </div>
              <div className="space-y-3">
                <Label>Store metric label</Label>
                <Input value={settingsDraft.hero.storeMetricLabel} onChange={(e) => setSettingsDraft({ ...settingsDraft, hero: { ...settingsDraft.hero, storeMetricLabel: e.target.value } })} />
                <Label>Product metric label</Label>
                <Input value={settingsDraft.hero.productMetricLabel} onChange={(e) => setSettingsDraft({ ...settingsDraft, hero: { ...settingsDraft.hero, productMetricLabel: e.target.value } })} />
                <Label>Coverage metric value</Label>
                <Input value={settingsDraft.hero.coverageMetricValue} onChange={(e) => setSettingsDraft({ ...settingsDraft, hero: { ...settingsDraft.hero, coverageMetricValue: e.target.value } })} />
                <Label>Coverage metric label</Label>
                <Input value={settingsDraft.hero.coverageMetricLabel} onChange={(e) => setSettingsDraft({ ...settingsDraft, hero: { ...settingsDraft.hero, coverageMetricLabel: e.target.value } })} />
                <Label>Primary hue</Label>
                <Input type="number" min={0} max={360} value={settingsDraft.theme.primaryHue} onChange={(e) => setSettingsDraft({ ...settingsDraft, theme: { ...settingsDraft.theme, primaryHue: Number(e.target.value) } })} />
                <Label>Surface tone</Label>
                <Select value={settingsDraft.theme.surfaceTone} onValueChange={(surfaceTone: "light" | "warm" | "cool") => setSettingsDraft({ ...settingsDraft, theme: { ...settingsDraft.theme, surfaceTone } })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cool">cool</SelectItem>
                    <SelectItem value="light">light</SelectItem>
                    <SelectItem value="warm">warm</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={() => void handleSettingsSave()} className="mt-2 gap-2 bg-foreground text-background">
                  <Save className="h-4 w-4" />
                  حفظ الإعدادات
                </Button>
              </div>
            </div>
          </Panel>
        )}

        {activeTab === "audit" && (
          <Panel title="Audit log" description="آخر عمليات التعديل والتشغيل من لوحة الأدمن والخدمات.">
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-surface text-xs text-muted-foreground">
                  <tr>
                    <th className="p-3 text-right">الوقت</th>
                    <th className="p-3 text-right">actor</th>
                    <th className="p-3 text-right">action</th>
                    <th className="p-3 text-right">target</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="border-t border-border">
                      <td className="p-3 text-xs">{compactDate(log.createdAt)}</td>
                      <td className="p-3">{log.actor}</td>
                      <td className="p-3 font-semibold">{log.action}</td>
                      <td className="p-3 text-xs text-muted-foreground">{log.storeId ?? log.syncRunId ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}
      </div>
    </main>
  );
}
