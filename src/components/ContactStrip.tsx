import { Heart, Star, Instagram, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const SPONSOR_PERKS = [
  "ظهور دائم لشعارك بالصفحة الرئيسية وشريط التنقّل",
  "بطاقة \"موصى به من راعي\" تتصدّر نتائج البحث",
  "أولوية بقوائم الوكلاء الرسميين والمحلّات الموثّقة",
  "تقرير شهري بإحصائيات الظهور والنقرات",
];

export function ContactStrip() {
  return (
    <section className="container mt-16 space-y-6 sm:mt-24 md:mt-28">
      <div className="rounded-[2.35rem] bg-border/40 p-px shadow-[0_18px_50px_-44px_rgba(23,32,23,0.36)]">
        <div className="relative overflow-hidden rounded-[calc(2.35rem-1px)] bg-card p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.86)] md:p-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary ring-1 ring-border">
            <Heart className="h-3.5 w-3.5" />
            الرعاية والشراكات
          </div>

          <h2 className="font-display mt-6 text-4xl font-black leading-tight tracking-normal text-foreground md:text-5xl">
            صير راعي رسمي للمنصّة
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground md:text-base md:leading-8">
            منصّتنا تخدم آلاف المستخدمين شهرياً بكل محافظات العراق. كون شريكنا، ووصّل علامتك التجارية لجمهور حقيقي يدوّر على منتجاتك.
          </p>

          <div className="mt-8">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
              شنو تكسب كراعي؟
            </h3>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {SPONSOR_PERKS.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-3 rounded-2xl bg-white/72 p-3.5 text-sm leading-6 text-foreground ring-1 ring-border transition-[background-color,transform] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:bg-white"
                >
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
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
              className="h-12 w-full rounded-full bg-foreground px-6 text-background shadow-[0_18px_34px_-26px_rgba(23,32,23,0.7)] transition-[transform,background-color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:bg-foreground/90 sm:w-auto"
            >
              <a href="https://instagram.com/hamadalaatech" target="_blank" rel="noreferrer noopener">
                <Instagram className="h-4 w-4" />
                تواصل معنا للرعاية
              </a>
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] bg-card p-6 ring-1 ring-border md:p-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-2xl font-black tracking-normal text-foreground md:text-3xl">
              رعاتنا الحاليين
            </h3>
            <p className="mt-1 text-xs text-muted-foreground md:text-sm">
              شركاء يساندون استمرار المنصّة — مكانك ممكن يكون التالي.
            </p>
          </div>
          <span className="hidden rounded-full bg-primary-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary ring-1 ring-border sm:inline-flex">
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
              className="group/slot relative flex aspect-[3/2] items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border bg-primary-soft/54 transition-[transform,background-color,border-color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:border-primary/45 hover:bg-white"
            >
              <div className="flex flex-col items-center gap-1.5 text-center">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-card text-primary transition-transform group-hover/slot:scale-110">
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
  );
}
