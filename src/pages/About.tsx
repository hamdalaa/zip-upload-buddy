import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Code2,
  Github,
  Globe,
  Heart,
  Home,
  Instagram,
  Mail,
  MessageCircle,
  Send,
  Sparkles,
  Star,
} from "lucide-react";
import { TopNav } from "@/components/TopNav";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import developerPortrait from "@/assets/developer-portrait.jpg";

export default function About() {
  return (
    <div className="min-h-screen flex flex-col bg-[linear-gradient(180deg,hsl(var(--surface))_0%,hsl(var(--background))_14%,hsl(var(--surface))_100%)]">
      <TopNav />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-background via-surface to-background">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-20" />
        <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-violet/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-1/4 h-64 w-[36rem] rounded-full bg-rose/15 blur-3xl" />

        <div className="container relative py-8 md:py-12">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link to="/" className="inline-flex items-center gap-1 hover:text-primary transition-colors">
              <Home className="h-3 w-3" />
              الرئيسية
            </Link>
            <ArrowLeft className="h-3 w-3 rotate-180" />
            <span className="text-foreground">المطوّر والرعاية</span>
          </div>

          <div className="mt-6 max-w-3xl text-right">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet/30 bg-violet/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-violet">
              <Sparkles className="h-3.5 w-3.5" />
              قصّة المشروع
            </div>
            <h1 className="font-display mt-4 text-3xl font-bold tracking-tight md:text-5xl">
              من <span className="text-gradient">صنع</span> ولِمن؟
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
              منصّة عراقية تجمع محلّات التقنية من كل المحافظات بمكان واحد — تكدر تقارن الأسعار، تشوف تقييمات المحلّات، وتوصل لأقرب محل ثقة بدون لفّ ودوران.
            </p>
          </div>
        </div>
      </section>

      <main className="flex-1 container py-8 md:py-12 grid gap-6 lg:grid-cols-2">
        {/* Developer card */}
        <section className="group relative overflow-hidden rounded-[2rem] border border-border/70 bg-card/90 p-6 shadow-soft-lg backdrop-blur-md md:p-8">
          <div className="pointer-events-none absolute -top-16 -left-12 h-44 w-44 rounded-full bg-primary/15 blur-3xl transition-opacity group-hover:opacity-80" />
          <div className="pointer-events-none absolute -bottom-20 -right-10 h-44 w-44 rounded-full bg-cyan/15 blur-3xl" />

          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
              <Code2 className="h-3.5 w-3.5" />
              المطوّر
            </div>

            <div className="mt-6 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
              <div className="relative shrink-0">
                <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-primary via-cyan to-violet opacity-90" />
                <img
                  src={developerPortrait}
                  alt="محمد علاء"
                  className="relative h-24 w-24 rounded-full object-cover ring-4 ring-background"
                />
              </div>
              <div className="text-right">
                <h2 className="font-display text-2xl font-bold tracking-tight">محمد علاء</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  خبير ذكاء اصطناعي — مبرمج مواقع — صانع محتوى تقني
                </p>
              </div>
            </div>

            <p className="mt-5 rounded-2xl border border-border/60 bg-background/70 p-4 text-sm leading-7 text-foreground/85">
              هدفي أوصّل المستخدم لأقرب محل ثقة بأقل وقت — بدون إعلانات مزعجة، بدون كلام زائد، بس معلومة مفيدة وروابط مباشرة.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <ContactPill icon={<Mail className="h-4 w-4" />} label="إيميل" href="mailto:hamadalaat@gmail.com" tone="primary" />
              <ContactPill icon={<Github className="h-4 w-4" />} label="GitHub" href="https://github.com" tone="foreground" />
              <ContactPill icon={<Globe className="h-4 w-4" />} label="الموقع" href="https://example.com" tone="cyan" />
              <ContactPill icon={<Send className="h-4 w-4" />} label="تيليغرام" href="https://t.me/" tone="primary" />
            </div>
          </div>
        </section>

        {/* Sponsorship card */}
        <section className="group relative overflow-hidden rounded-[2rem] border border-violet/25 bg-gradient-to-br from-violet/12 via-card/90 to-rose/10 p-6 shadow-soft-lg backdrop-blur-md md:p-8">
          <div className="pointer-events-none absolute -top-16 -right-12 h-44 w-44 rounded-full bg-violet/25 blur-3xl transition-opacity group-hover:opacity-80" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-rose/20 blur-3xl" />

          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet/30 bg-violet/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-violet">
              <Heart className="h-3.5 w-3.5" />
              الرعاية والشراكات
            </div>

            <h2 className="font-display mt-6 text-2xl font-bold tracking-tight md:text-3xl">
              صير <span className="bg-gradient-to-r from-violet to-rose bg-clip-text text-transparent">راعي رسمي</span> للمنصّة
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              المنصّة تخدم آلاف المستخدمين شهرياً يدوّرون على محلات الأجهزة بكل العراق. الرعاية تعطيك ظهور دائم بأماكن مميّزة وتدعم استمرار التطوير.
            </p>

            <ul className="mt-5 space-y-2.5">
              {[
                "شعار راعي ثابت بصفحة الرئيسية والـTopNav",
                "بطاقة \"موصى به من راعي\" على نتائج البحث",
                "إحصائيات شهرية بظهور علامتك التجارية",
                "أولوية بقوائم الوكلاء والمحلات الموثّقة",
              ].map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-sm text-foreground/90">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet/15 text-violet">
                    <Star className="h-3 w-3 fill-current" />
                  </span>
                  {feature}
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-11 flex-1 rounded-full bg-gradient-to-r from-violet to-rose text-white shadow-soft-md hover:opacity-95"
              >
                <a href="mailto:hamadalaat@gmail.com">
                  <Heart className="h-4 w-4" />
                  راسلنا للرعاية
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-11 rounded-full border-violet/30 bg-background/70 text-violet hover:border-violet hover:bg-violet/10"
              >
                <a href="https://wa.me/" target="_blank" rel="noreferrer noopener">
                  <MessageCircle className="h-4 w-4" />
                  واتساب
                </a>
              </Button>
            </div>

            <p className="mt-4 text-[11px] text-muted-foreground">
              <Instagram className="me-1 inline h-3 w-3" />
              متوفّر تعاون مع المتاجر، الوكلاء الرسميين، والشركات التقنية.
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function ContactPill({
  icon,
  label,
  href,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
  tone: "primary" | "cyan" | "foreground";
}) {
  const toneClass =
    tone === "primary"
      ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground"
      : tone === "cyan"
        ? "border-cyan/30 bg-cyan/10 text-cyan hover:bg-cyan hover:text-white"
        : "border-border/70 bg-background text-foreground hover:bg-foreground hover:text-background";
  return (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noreferrer noopener" : undefined}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-xs font-bold transition-all hover:-translate-y-0.5 active:scale-95 ${toneClass}`}
    >
      {icon}
      {label}
    </a>
  );
}
