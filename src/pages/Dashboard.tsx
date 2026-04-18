import { useState, type ReactNode } from "react";
import { TopNav } from "@/components/TopNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useDataStore } from "@/lib/dataStore";
import { isAdminUnlocked, lockAdmin, tryUnlockAdmin } from "@/lib/adminAuth";
import {
  ALL_AREAS,
  ALL_CATEGORIES,
  RABEE_CATEGORIES,
  SINAA_CATEGORIES,
  type Area,
  type Category,
} from "@/lib/types";
import { relativeArabicTime, compact } from "@/lib/search";
import { Activity, BadgeCheck, Database, Lock, LogOut, Merge, Play, Plus, RefreshCw, Store, Zap } from "lucide-react";

function AdminBlock({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="glass-panel rounded-xl p-5">
      <header className="mb-4 border-b border-border/40 pb-3">
        <h2 className="text-base font-semibold">{title}</h2>
        {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      </header>
      {children}
    </section>
  );
}

function PasscodeGate({ onUnlock }: { onUnlock: () => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const { toast } = useToast();
  return (
    <div className="container flex min-h-[70vh] items-center justify-center">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (tryUnlockAdmin(code.trim())) {
            toast({ title: "تم الدخول", description: "أهلاً بك في لوحة التحكم." });
            onUnlock();
          } else {
            setError(true);
          }
        }}
        className="glass-panel w-full max-w-md rounded-2xl p-6 shadow-panel"
      >
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Lock className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-lg font-semibold">دخول الأدمن</h1>
            <p className="text-xs text-muted-foreground">كلمة عبور مشتركة — حماية تجريبية فقط (MVP)</p>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="passcode">الرمز</Label>
          <Input
            id="passcode"
            type="password"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setError(false);
            }}
            autoFocus
            placeholder="أدخل الرمز…"
          />
          {error && <p className="text-xs text-destructive">رمز خاطئ، حاول مرة ثانية.</p>}
        </div>
        <Button type="submit" className="mt-4 w-full bg-gradient-primary text-primary-foreground">
          دخول
        </Button>
        <p className="mt-3 text-[11px] text-muted-foreground">
          ملاحظة: الرمز التجريبي <code className="rounded bg-muted px-1">teeh-2025</code> — غيّره بكود الإنتاج لاحقاً.
        </p>
      </form>
    </div>
  );
}

function categoriesFor(area: Area | "all"): Category[] {
  if (area === "شارع الصناعة") return SINAA_CATEGORIES;
  if (area === "شارع الربيعي") return RABEE_CATEGORIES;
  return ALL_CATEGORIES;
}

const Dashboard = () => {
  const [unlocked, setUnlocked] = useState<boolean>(() => isAdminUnlocked());
  const { toast } = useToast();
  const { shops, products, shopSources, crawlRuns, addShop, toggleVerify, mergeShops, runAreaScan, recrawlShop } =
    useDataStore();

  // form state
  const [form, setForm] = useState({
    name: "",
    area: "شارع الصناعة" as Area,
    category: "Computing" as Category,
    googleMapsUrl: "",
    website: "",
    phone: "",
    whatsapp: "",
    notes: "",
  });

  const [selectedShops, setSelectedShops] = useState<Set<string>>(new Set());
  const [mergePrimary, setMergePrimary] = useState<string>("");
  const [mergeSecondary, setMergeSecondary] = useState<string>("");

  if (!unlocked) return (
    <div className="min-h-screen">
      <TopNav />
      <PasscodeGate onUnlock={() => setUnlocked(true)} />
    </div>
  );

  // telemetry
  const activeShops = shops.filter((s) => !s.archivedAt);
  const indexedShopIds = new Set(products.map((p) => p.shopId));
  const okRuns = crawlRuns.filter((r) => r.status === "ok").length;
  const totalRuns = crawlRuns.length;
  const successRate = totalRuns ? Math.round((okRuns / totalRuns) * 100) : 0;
  const lastSeed = crawlRuns.find((r) => r.scope === "area");
  const lastCrawl = crawlRuns.find((r) => r.scope === "shop");

  // duplicate candidates
  const candidates: Array<{ a: typeof shops[number]; b: typeof shops[number]; reason: string }> = [];
  for (let i = 0; i < activeShops.length; i++) {
    for (let j = i + 1; j < activeShops.length; j++) {
      const a = activeShops[i], b = activeShops[j];
      if (a.googleMapsUrl && b.googleMapsUrl && a.googleMapsUrl === b.googleMapsUrl) {
        candidates.push({ a, b, reason: "نفس رابط خرائط Google" });
        continue;
      }
      if (a.area === b.area && compact(a.name) === compact(b.name)) {
        candidates.push({ a, b, reason: "اسم متطابق بنفس المنطقة" });
      }
    }
  }

  function toggleSelect(id: string) {
    setSelectedShops((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleAreaScan(area: Area) {
    const run = runAreaScan(area);
    toast({ title: "تم تشغيل المسح", description: `${area} — حالة: ${run.status} (محاكاة)` });
  }

  function handleRecrawl(ids: string[]) {
    if (ids.length === 0) {
      toast({ title: "لم تختر أي محل", variant: "destructive" });
      return;
    }
    let ok = 0, fail = 0;
    ids.forEach((id) => {
      const run = recrawlShop(id);
      if (run.status === "ok") ok++; else fail++;
    });
    toast({ title: "تم تشغيل Recrawl", description: `${ok} ناجحة · ${fail} فشلت (محاكاة)` });
  }

  function handleAddShop(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast({ title: "أدخل اسم المحل", variant: "destructive" });
      return;
    }
    const shop = addShop({
      name: form.name.trim(),
      area: form.area,
      category: form.category,
      googleMapsUrl: form.googleMapsUrl || undefined,
      website: form.website || undefined,
      phone: form.phone || undefined,
      whatsapp: form.whatsapp || undefined,
      notes: form.notes || undefined,
    });
    toast({ title: "أُضيف المحل", description: shop.name });
    setForm({ ...form, name: "", googleMapsUrl: "", website: "", phone: "", whatsapp: "", notes: "" });
  }

  function handleMerge() {
    if (!mergePrimary || !mergeSecondary || mergePrimary === mergeSecondary) {
      toast({ title: "اختر محلَين مختلفَين", variant: "destructive" });
      return;
    }
    mergeShops(mergePrimary, mergeSecondary);
    toast({ title: "تم الدمج", description: "نُقلت منتجات الثاني إلى الأول وأُرشف الثاني." });
    setMergePrimary("");
    setMergeSecondary("");
  }

  return (
    <div className="min-h-screen">
      <TopNav />
      <div className="container py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">لوحة الأدمن</h1>
            <p className="text-sm text-muted-foreground">عمليات داخلية: مسح، فهرسة، تحقق، دمج.</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              lockAdmin();
              setUnlocked(false);
            }}
          >
            <LogOut className="h-4 w-4" />
            خروج
          </Button>
        </div>

        {/* Telemetry */}
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-6">
          {[
            { icon: Store, label: "محلات", value: activeShops.length },
            { icon: Zap, label: "منتجات مفهرسة", value: products.length },
            { icon: Database, label: "محلات بفهرس", value: indexedShopIds.size },
            { icon: Activity, label: "نجاح الفهرسة", value: `${successRate}%` },
            { icon: Play, label: "آخر مسح منطقة", value: lastSeed ? relativeArabicTime(lastSeed.startedAt) : "—" },
            { icon: RefreshCw, label: "آخر recrawl", value: lastCrawl ? relativeArabicTime(lastCrawl.startedAt) : "—" },
          ].map((m) => (
            <div key={m.label} className="glass-panel rounded-xl p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <m.icon className="h-3.5 w-3.5" />
                {m.label}
              </div>
              <div className="mt-1 font-display text-xl font-bold">{m.value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <AdminBlock
            title="مسح المناطق (Discovery)"
            description="محاكاة لاكتشاف محلات جديدة عبر خرائط Google. (في الإنتاج الحقيقي يكون مقيداً تقنياً.)"
          >
            <div className="flex flex-wrap gap-2">
              {ALL_AREAS.map((a) => (
                <Button key={a} onClick={() => handleAreaScan(a)} className="gap-1.5">
                  <Play className="h-4 w-4" />
                  مسح: {a}
                </Button>
              ))}
            </div>
          </AdminBlock>

          <AdminBlock
            title="إضافة محل يدوياً"
            description="استخدم هذا للمحلات بدون موقع، أو لإدخال جديد قبل التحقق."
          >
            <form onSubmit={handleAddShop} className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label>اسم المحل</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <Label>المنطقة</Label>
                <Select
                  value={form.area}
                  onValueChange={(v) => {
                    const area = v as Area;
                    const cats = categoriesFor(area);
                    setForm({ ...form, area, category: cats[0] });
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ALL_AREAS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>الفئة</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as Category })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categoriesFor(form.area).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>رابط خرائط Google</Label>
                <Input value={form.googleMapsUrl} onChange={(e) => setForm({ ...form, googleMapsUrl: e.target.value })} placeholder="https://maps.google.com/?q=…" />
              </div>
              <div className="md:col-span-2">
                <Label>الموقع</Label>
                <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://…" />
              </div>
              <div>
                <Label>هاتف</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+9647…" />
              </div>
              <div>
                <Label>واتساب</Label>
                <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="+9647…" />
              </div>
              <div className="md:col-span-2">
                <Label>ملاحظات</Label>
                <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div className="md:col-span-2 flex justify-end">
                <Button type="submit" className="gap-1.5 bg-gradient-primary text-primary-foreground">
                  <Plus className="h-4 w-4" />
                  إضافة المحل
                </Button>
              </div>
            </form>
          </AdminBlock>
        </div>

        <div className="mt-5">
          <AdminBlock
            title="إعادة الفهرسة (Recrawl) + التحقق"
            description="اختر محلات وشغّل recrawl. التحقق يدوي."
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-muted-foreground">{selectedShops.size} محل مختار</div>
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => handleRecrawl(Array.from(selectedShops))}
                disabled={selectedShops.size === 0}
              >
                <RefreshCw className="h-4 w-4" />
                Recrawl للمختارة
              </Button>
            </div>
            <div className="overflow-hidden rounded-lg border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>المحل</TableHead>
                    <TableHead>المنطقة</TableHead>
                    <TableHead>الفئة</TableHead>
                    <TableHead>التحقق</TableHead>
                    <TableHead className="text-left">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeShops.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <Checkbox checked={selectedShops.has(s.id)} onCheckedChange={() => toggleSelect(s.id)} />
                      </TableCell>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{s.area}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{s.category}</TableCell>
                      <TableCell>
                        <span className={s.verified ? "rounded-full bg-secondary/15 px-2 py-0.5 text-[11px] text-secondary" : "rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"}>
                          {s.verified ? "موثّق" : "غير موثّق"}
                        </span>
                      </TableCell>
                      <TableCell className="text-left">
                        <div className="inline-flex gap-1.5">
                          <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => handleRecrawl([s.id])}>
                            <RefreshCw className="h-3 w-3" />
                            Recrawl
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 gap-1" onClick={() => { toggleVerify(s.id); toast({ title: s.verified ? "تم إلغاء التوثيق" : "تم التوثيق" }); }}>
                            <BadgeCheck className="h-3 w-3" />
                            {s.verified ? "إلغاء" : "توثيق"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </AdminBlock>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <AdminBlock
            title="إدارة المكررات"
            description="مرشحات مبنية على نفس رابط خرائط Google أو اسم متطابق بنفس المنطقة."
          >
            {candidates.length === 0 ? (
              <p className="text-sm text-muted-foreground">ماكو محلات مكررة مرشّحة حالياً.</p>
            ) : (
              <div className="space-y-2">
                {candidates.map((c, i) => (
                  <div key={i} className="rounded-lg border border-border/60 bg-surface/40 p-3 text-sm">
                    <div className="text-xs text-muted-foreground">{c.reason}</div>
                    <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-medium">{c.a.name} ↔ {c.b.name}</div>
                        <div className="text-xs text-muted-foreground">{c.a.area}</div>
                      </div>
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => mergeShops(c.a.id, c.b.id)}>
                        <Merge className="h-3.5 w-3.5" />
                        دمج (الأول هو الأساسي)
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 border-t border-border/40 pt-4">
              <h4 className="mb-2 text-xs font-semibold text-muted-foreground">دمج يدوي</h4>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <Select value={mergePrimary} onValueChange={setMergePrimary}>
                  <SelectTrigger><SelectValue placeholder="المحل الأساسي" /></SelectTrigger>
                  <SelectContent>
                    {activeShops.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={mergeSecondary} onValueChange={setMergeSecondary}>
                  <SelectTrigger><SelectValue placeholder="المحل المكرر (سيُؤرشف)" /></SelectTrigger>
                  <SelectContent>
                    {activeShops.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" className="mt-2 gap-1.5" onClick={handleMerge}>
                <Merge className="h-4 w-4" />
                نفّذ الدمج
              </Button>
            </div>
          </AdminBlock>

          <AdminBlock title="سجل عمليات الفهرسة" description="آخر runs (مسح المناطق + recrawl).">
            <div className="overflow-hidden rounded-lg border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>النوع</TableHead>
                    <TableHead>الهدف</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>منتجات</TableHead>
                    <TableHead>متى</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {crawlRuns.slice(0, 12).map((r) => {
                    const target = r.scope === "area" ? r.area : shops.find((s) => s.id === r.shopId)?.name ?? r.shopId;
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs">{r.scope}</TableCell>
                        <TableCell className="text-xs">{target}</TableCell>
                        <TableCell>
                          <span className={
                            r.status === "ok" ? "rounded-full bg-success/15 px-2 py-0.5 text-[11px] text-success" :
                            r.status === "failed" ? "rounded-full bg-destructive/15 px-2 py-0.5 text-[11px] text-destructive" :
                            "rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                          }>{r.status}</span>
                        </TableCell>
                        <TableCell className="font-display">{r.productsFound}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{relativeArabicTime(r.startedAt)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </AdminBlock>
        </div>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          البيانات في هذه النسخة محلية بالذاكرة (Mock). أي إضافة أو دمج تختفي عند تحديث الصفحة — هذا متوقع لـ MVP.
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
