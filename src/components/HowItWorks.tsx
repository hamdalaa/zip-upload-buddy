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
    <section className="rounded-[2rem] bg-border/40 p-px shadow-[0_18px_50px_-44px_rgba(23,32,23,0.36)]">
      <div className="rounded-[calc(2rem-1px)] bg-card p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.86)] sm:p-6 md:p-8">
      <div className="text-right">
        <span className="atlas-kicker text-primary">كيف يعمل حاير</span>
        <h2 className="font-display mt-3 text-3xl font-black leading-tight tracking-normal text-foreground sm:text-4xl">
          ثلاث خطوات واضحة
        </h2>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((s, i) => (
          <article
            key={s.title}
            className="rounded-[1.35rem] bg-white/72 p-4 text-right ring-1 ring-border transition-[transform,background-color,box-shadow] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_18px_42px_-34px_rgba(23,32,23,0.4)] sm:p-5"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-primary sm:h-11 sm:w-11">
                <s.icon className="h-4 w-4" strokeWidth={1.8} />
              </div>
              <div className="font-numeric text-xl font-semibold leading-none tabular-stable text-muted-foreground/45 sm:text-2xl">
                0{i + 1}
              </div>
            </div>
            <h3 className="font-display mt-4 text-[1.35rem] font-black leading-tight tracking-normal text-foreground">
              {s.title}
            </h3>
            <p className="mt-2 text-[12px] leading-7 text-muted-foreground">
              {s.desc}
            </p>
          </article>
        ))}
      </div>
      </div>
    </section>
  );
}
