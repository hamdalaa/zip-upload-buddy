import { Search, Layers, MapPin } from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "حدّد الحاجة",
    desc: "اكتب اسم المنتج أو اختَر الفئة حتى تبدأ من نتيجة أقرب لطلبك.",
    color: "text-primary bg-primary/10",
  },
  {
    icon: Layers,
    title: "افرز الخيارات",
    desc: "التصنيف، التقييم، وروابط المحلات تظهر بقراءة أسرع من التصفح اليدوي.",
    color: "text-secondary bg-secondary/10",
  },
  {
    icon: MapPin,
    title: "افتح الطريق",
    desc: "كمّل من نفس البطاقة إلى خرائط Google أو صفحة المحل بدون خطوات مشتتة.",
    color: "text-success bg-success/10",
  },
];

export function HowItWorks() {
  return (
    <section className="rounded-[1.75rem] border border-border/70 bg-card/82 p-6 shadow-soft-lg backdrop-blur-sm md:p-8">
      <div className="text-right">
        <span className="eyebrow inline-flex">٣ خطوات واضحة</span>
        <h2 className="font-display mt-3 text-2xl font-bold tracking-tight md:text-3xl">شلون يشتغل تايه؟</h2>
        <p className="mt-3 max-w-md text-sm leading-7 text-muted-foreground">
          يختصر رحلة البحث من فوضى السوق إلى قرار أوضح خلال دقائق.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        {steps.map((s, i) => (
          <article key={s.title} className="rounded-2xl border border-border/60 bg-background/80 p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${s.color} shadow-soft`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div className="font-display text-3xl font-bold leading-none text-foreground/15">
                0{i + 1}
              </div>
            </div>

            <h3 className="mt-5 font-display text-lg font-bold tracking-tight">{s.title}</h3>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">{s.desc}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
