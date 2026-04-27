import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Lock, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Seo } from "@/components/Seo";
import { Label } from "@/components/ui/label";
import { getAdminSession, loginAdmin } from "@/lib/adminAuth";
import { useToast } from "@/hooks/use-toast";

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}

export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const nextPath = useMemo(() => safeNextPath(new URLSearchParams(location.search).get("next")), [location.search]);
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    getAdminSession()
      .then((session) => {
        if (!mounted) return;
        if (session.authenticated) navigate(nextPath, { replace: true });
      })
      .catch(() => {
        // Login stays usable even if the session probe fails transiently.
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [navigate, nextPath]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!secret.trim()) {
      setError("أدخل رمز الدخول.");
      return;
    }
    try {
      setSubmitting(true);
      await loginAdmin(secret.trim());
      toast({ title: "تم الدخول", description: "الجلسة محمية من السيرفر." });
      navigate(nextPath, { replace: true });
    } catch {
      setError("رمز الدخول غير صحيح أو تم رفض المحاولة.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-surface text-foreground">
      <Seo
        title="دخول الإدارة"
        description="صفحة دخول الإدارة الخاصة بحاير."
        path="/67"
        noindex
      />
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-10">
        <section className="grid w-full overflow-hidden rounded-[2.25rem] border border-white/70 bg-card/88 shadow-[0_34px_110px_-74px_rgba(23,32,23,0.58),inset_0_1px_0_rgba(255,255,255,0.82)] backdrop-blur-xl md:grid-cols-[0.9fr_1.1fr]">
          <div className="hidden bg-foreground p-10 text-background md:flex md:flex-col md:justify-between">
            <Link to="/" className="inline-flex items-center gap-3 text-3xl font-black">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-background text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">ح</span>
              حاير
            </Link>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-background/55">Admin Control</p>
              <h1 className="mt-4 max-w-sm font-display text-5xl font-black leading-[1.05]">
                دخول خاص لإدارة الموقع.
              </h1>
              <p className="mt-5 max-w-sm text-sm leading-7 text-background/70">
                كل العمليات الحساسة تتم من نفس أصل الموقع وبجلسة HttpOnly محمية من السيرفر.
              </p>
            </div>
          </div>

          <form onSubmit={submit} className="p-6 sm:p-8 md:p-10">
            <div className="mb-8 flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-[1.15rem] bg-primary-soft text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
                <Lock className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-xl font-black">دخول الأدمن</h2>
                <p className="text-xs text-muted-foreground">المسار الخاص: /67</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-secret">رمز الدخول</Label>
              <Input
                id="admin-secret"
                type="password"
                value={secret}
                onChange={(event) => {
                  setSecret(event.target.value);
                  setError("");
                }}
                autoComplete="current-password"
                autoFocus
                disabled={loading || submitting}
                className="h-[52px] rounded-2xl border-border/70 bg-white/76 px-4 text-base shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] focus-visible:ring-primary/24"
              />
              {error && <p className="text-xs font-medium text-destructive">{error}</p>}
            </div>

            <Button
              type="submit"
              disabled={loading || submitting}
              className="mt-5 h-[52px] w-full gap-2 rounded-2xl bg-foreground text-background shadow-[0_18px_42px_-30px_rgba(15,23,42,0.82)] transition-[transform,box-shadow,background-color] hover:-translate-y-0.5 hover:bg-foreground/90"
            >
              <LogIn className="h-4 w-4" />
              {submitting ? "جارِ التحقق..." : "دخول"}
            </Button>

            <Link to="/" className="mt-5 inline-block text-xs font-semibold text-muted-foreground hover:text-foreground">
              رجوع للموقع
            </Link>
          </form>
        </section>
      </div>
    </main>
  );
}
