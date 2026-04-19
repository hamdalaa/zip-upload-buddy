import { Search, Layers, MapPin } from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "حدّد الحاجة",
    desc: "اكتب اسم المنتج أو اختَر الفئة لتبدأ من نتيجة أقرب لطلبك.",
  },
  {
    icon: Layers,
    title: "افرز الخيارات",
    desc: "التصنيف، التقييم، وروابط المحلات بقراءة أسرع من التصفح اليدوي.",
  },
  {
    icon: MapPin,
    title: "افتح الطريق",
    desc: "كمّل من نفس البطاقة إلى خرائط Google أو صفحة المحل بدون خطوات مشتتة.",
  },
];

export function HowItWorks() {
  return (
    <section className="atlas-panel p-6 md:p-8">
      <div className="text-right">
        <span className="atlas-kicker">كيف يعمل حاير</span>
        <h2 className="font-display mt-3 text-2xl font-semibold leading-tight text-foreground">ثلاث خطوات واضحة</h2>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {steps.map((s, i) => (
          <article key={s.title} className="rounded-xl border border-border bg-surface p-4 text-right transition-all hover:border-primary/30 hover:bg-primary-soft/40">
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
                <s.icon className="h-4 w-4" strokeWidth={2} />
              </div>
              <div className="font-numeric text-xl font-semibold leading-none text-muted-foreground/40">
                0{i + 1}
              </div>
            </div>
            <h3 className="mt-4 font-display text-base font-semibold text-foreground">{s.title}</h3>
            <p className="mt-1.5 text-xs leading-6 text-muted-foreground">{s.desc}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
