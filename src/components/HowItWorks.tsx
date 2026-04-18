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
    <section className="border-y border-foreground py-8">
      <div className="text-right">
        <span className="atlas-kicker">كيف يعمل تايه</span>
        <h2 className="font-display mt-4 text-3xl font-bold leading-none text-foreground">ثلاث خطوات واضحة</h2>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-px bg-border md:grid-cols-3">
        {steps.map((s, i) => (
          <article key={s.title} className="bg-background p-5 text-right">
            <div className="flex items-center justify-between">
              <s.icon className="h-5 w-5 text-primary" strokeWidth={1.5} />
              <div className="font-numeric text-2xl font-bold leading-none text-muted-foreground/40">
                0{i + 1}
              </div>
            </div>
            <h3 className="mt-5 font-display text-xl font-bold text-foreground">{s.title}</h3>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">{s.desc}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
