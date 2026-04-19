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
    <div className="min-h-screen flex flex-col bg-background">
      <TopNav />

      {/* Hero — calmer, single focal point */}
      <section className="relative overflow-hidden border-b border-border/60 bg-gradient-to-b from-surface via-background to-background">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-[0.04]" />
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[52rem] -translate-x-1/2 rounded-full bg-primary/12 blur-[140px]" />
        <div className="pointer-events-none absolute -bottom-32 left-1/4 h-60 w-[32rem] rounded-full bg-cyan/10 blur-[120px]" />

        <div className="container relative py-10 md:py-16">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link to="/" className="inline-flex items-center gap-1 hover:text-primary transition-colors">
              <Home className="h-3 w-3" />
              الرئيسية
            </Link>
            <ArrowLeft className="h-3 w-3 rotate-180" />
            <span className="text-foreground">المطوّر والرعاية</span>
          </div>

          {/* Headline block */}
          <div className="mt-8 mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet/25 bg-violet/8 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-violet">
              <Sparkles className="h-3.5 w-3.5" />
              قصّة المشروع
            </div>
            <h1 className="font-display mt-5 text-4xl font-bold tracking-tight md:text-6xl">
              ليش <span className="text-gradient">حاير</span>؟
            </h1>
            <p className="mt-5 mx-auto max-w-2xl text-base leading-8 text-muted-foreground">
              تشتري موبايل أو لابتوب بالعراق؟ تفتح كروبات، تسأل صديق، تلف على عشر محلات — وبالآخر ما تدري <span className="font-semibold text-foreground">منو الصدك ومنو يبالغ</span>.
            </p>
            <p className="mt-3 mx-auto max-w-2xl text-base leading-8 text-muted-foreground">
              <span className="font-semibold text-foreground">حاير</span> منصّة عراقية تجمع محلّات التقنية من كل المحافظات بمكان واحد — تقارن، تشوف تقييمات Google الحقيقية، وتوصل لأقرب نقطة بيع موثوقة. بدون إعلانات، بدون تحيّز.
            </p>
          </div>

          {/* Stats — refined inline strip */}
          <div className="mt-10 mx-auto max-w-3xl">
            <div className="grid grid-cols-3 divide-x divide-x-reverse divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-card/60 backdrop-blur">
              {[
                { label: "محافظات مغطّاة", value: "10+" },
                { label: "محلات موثّقة", value: "+3100" },
                { label: "بحث مجاني للأبد", value: "100%" },
              ].map((stat) => (
                <div key={stat.label} className="px-4 py-4 text-center">
                  <div className="font-display text-2xl font-bold text-foreground md:text-3xl">{stat.value}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground md:text-xs">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Body — asymmetric grid: developer (sticky) + sponsorship */}
      <main className="flex-1 container py-10 md:py-16">
        <div className="grid gap-6 lg:grid-cols-5 lg:gap-8">
          {/* Developer card — narrower, sticky on desktop */}
          <section className="lg:col-span-2">
            <div className="lg:sticky lg:top-24">
              <div className="group relative overflow-hidden rounded-3xl border border-border/70 bg-card p-6 shadow-soft-lg md:p-8">
                <div className="pointer-events-none absolute -top-16 -left-12 h-44 w-44 rounded-full bg-primary/12 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-20 -right-10 h-44 w-44 rounded-full bg-cyan/12 blur-3xl" />

                <div className="relative">
                  <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                    <Code2 className="h-3.5 w-3.5" />
                    المطوّر
                  </div>

                  <div className="mt-6 flex flex-col items-center gap-4 text-center">
                    <div className="relative shrink-0">
                      <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-primary via-cyan to-violet opacity-90" />
                      <img
                        src={developerPortrait}
                        alt="محمد علاء"
                        className="relative h-28 w-28 rounded-full object-cover ring-4 ring-background"
                      />
                    </div>
                    <div>
                      <h2 className="font-display text-2xl font-bold tracking-tight">محمد علاء</h2>
                      <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                        خبير ذكاء اصطناعي — مبرمج مواقع — صانع محتوى تقني
                      </p>
                    </div>
                  </div>

                  <p className="mt-6 rounded-2xl border border-border/60 bg-surface/60 p-4 text-sm leading-7 text-foreground/85">
                    هدفي أوصّل المستخدم لأقرب محل ثقة بأقل وقت — بدون إعلانات مزعجة، بس معلومة مفيدة وروابط مباشرة.
                  </p>

                  <div className="mt-5 grid grid-cols-2 gap-2.5">
                    <ContactPill icon={<GmailIcon className="h-4 w-4" />} label="إيميل" href="mailto:hamadalaat@gmail.com" tone="gmail" />
                    <ContactPill icon={<Instagram className="h-4 w-4" />} label="إنستغرام" href="https://instagram.com/hamadalaatech" tone="instagram" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Sponsorship column */}
          <section className="lg:col-span-3 space-y-6">
            <div className="group relative overflow-hidden rounded-3xl border border-violet/25 bg-gradient-to-br from-violet/12 via-card to-rose/8 p-6 shadow-soft-lg md:p-10">
              <div className="pointer-events-none absolute -top-20 -right-16 h-56 w-56 rounded-full bg-violet/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -left-12 h-56 w-56 rounded-full bg-rose/15 blur-3xl" />

              <div className="relative">
                <div className="inline-flex items-center gap-2 rounded-full border border-violet/30 bg-violet/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-violet">
                  <Heart className="h-3.5 w-3.5" />
                  الرعاية والشراكات
                </div>

                <h2 className="font-display mt-6 text-3xl font-bold tracking-tight md:text-4xl">
                  صير <span className="bg-gradient-to-r from-violet to-rose bg-clip-text text-transparent">راعي رسمي</span> للمنصّة
                </h2>
                <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground md:text-base">
                  منصّتنا تخدم آلاف المستخدمين شهرياً بكل محافظات العراق. كون شريكنا، ووصّل علامتك التجارية لجمهور حقيقي يدوّر على منتجاتك.
                </p>

                <div className="mt-8">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet/90">
                    شنو تكسب كراعي؟
                  </h3>
                  <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                    {[
                      "ظهور دائم لشعارك بالصفحة الرئيسية وشريط التنقّل",
                      "بطاقة \"موصى به من راعي\" تتصدّر نتائج البحث",
                      "أولوية بقوائم الوكلاء الرسميين والمحلّات الموثّقة",
                      "تقرير شهري بإحصائيات الظهور والنقرات",
                    ].map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-3 rounded-2xl border border-border/50 bg-card/70 p-3.5 text-sm leading-6 text-foreground/90 backdrop-blur transition-colors hover:border-violet/30"
                      >
                        <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet/15 text-violet">
                          <Star className="h-3 w-3 fill-current" />
                        </span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8 flex flex-col items-center gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[11px] text-muted-foreground sm:text-xs">
                    مفتوحين للتعاون مع المتاجر، الوكلاء الرسميين، والشركات التقنية.
                  </p>
                  <Button
                    asChild
                    size="lg"
                    className="h-12 w-full rounded-full bg-gradient-to-r from-violet to-rose px-6 text-white shadow-soft-md hover:opacity-95 sm:w-auto"
                  >
                    <a href="https://instagram.com/hamadalaatech" target="_blank" rel="noreferrer noopener">
                      <Instagram className="h-4 w-4" />
                      تواصل معنا للرعاية
                    </a>
                  </Button>
                </div>
              </div>
            </div>

            {/* Current sponsors / placeholder slots */}
            <div className="rounded-3xl border border-border/60 bg-card/60 p-6 shadow-soft-md backdrop-blur md:p-8">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg font-bold tracking-tight md:text-xl">
                    رعاتنا الحاليون
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground md:text-sm">
                    شركاء يساندون استمرار المنصّة — مكانك ممكن يكون التالي.
                  </p>
                </div>
                <span className="hidden rounded-full border border-violet/25 bg-violet/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-violet sm:inline-flex">
                  متاح
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <a
                    key={i}
                    href="https://instagram.com/hamadalaatech"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="group/slot relative flex aspect-[3/2] items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border/70 bg-surface/40 transition-all hover:-translate-y-0.5 hover:border-violet/40 hover:bg-violet/5"
                  >
                    <div className="flex flex-col items-center gap-1.5 text-center">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-violet/10 text-violet transition-transform group-hover/slot:scale-110">
                        <Sparkles className="h-4 w-4" />
                      </span>
                      <span className="text-xs font-bold text-foreground">مكانك هنا</span>
                      <span className="text-[10px] text-muted-foreground">اضغط للتواصل</span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </section>
        </div>
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
  tone: "primary" | "cyan" | "foreground" | "instagram" | "gmail";
}) {
  const toneClass =
    tone === "primary"
      ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground"
      : tone === "cyan"
        ? "border-cyan/30 bg-cyan/10 text-cyan hover:bg-cyan hover:text-white"
          : tone === "instagram"
            ? "border-transparent bg-[linear-gradient(45deg,#F58529,#DD2A7B,#8134AF,#515BD4)] text-white hover:opacity-90 hover:brightness-110"
            : tone === "gmail"
              ? "border-border/70 bg-white text-foreground hover:bg-neutral-100"
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

function GmailIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 49.4 512 399.42" className={className} aria-hidden="true">
      <g fill="none" fillRule="evenodd">
        <g fillRule="nonzero">
          <path fill="#4285f4" d="M34.91 448.818h81.454V251L0 163.727V413.91c0 19.287 15.622 34.91 34.91 34.91z" />
          <path fill="#34a853" d="M395.636 448.818h81.455c19.287 0 34.909-15.622 34.909-34.909V163.727L395.636 251z" />
          <path fill="#fbbc04" d="M395.636 99.727V251L512 163.727v-46.545c0-43.142-49.25-67.782-83.782-41.891z" />
        </g>
        <path fill="#ea4335" d="M116.364 251V99.727L256 204.455 395.636 99.727V251L256 355.727z" />
        <path fill="#c5221f" fillRule="nonzero" d="M0 117.182v46.545L116.364 251V99.727L83.782 75.291C49.25 49.4 0 74.04 0 117.18z" />
      </g>
    </svg>
  );
}
