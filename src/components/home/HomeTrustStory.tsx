import { useRef } from "react";
import { ClockCounterClockwise, MapTrifold, SealCheck, Storefront } from "@phosphor-icons/react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SectionHeading } from "@/components/layout/SectionHeading";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const storyCards = [
  {
    icon: MapTrifold,
    title: "تبدأ من السوق الحقيقي",
    body: "الواجهة تبني الاتجاه من المدينة والشارع والمحل قبل ما تدخل في فوضى النتائج. الأطلس يبقى واضحاً حتى لما تكبر قاعدة البيانات.",
  },
  {
    icon: SealCheck,
    title: "الثقة تظهر قبل الكلام",
    body: "إشارات التوثيق، عدد العروض، وحالة التحديث لازم تكون مقروءة من أول نظرة، بدل ما تكون مدفونة داخل بطاقات مزدحمة.",
  },
  {
    icon: ClockCounterClockwise,
    title: "القرار أسرع من اللف",
    body: "نحرك المستخدم من نية الشراء إلى المحل المناسب بخطوات أقل: بحث واضح، تصفية أنظف، وقراءة سعرية أسرع.",
  },
];

export function HomeTrustStory() {
  const rootRef = useRef<HTMLElement | null>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      const cards = gsap.utils.toArray<HTMLElement>("[data-story-card]");
      const sticky = rootRef.current?.querySelector<HTMLElement>("[data-story-sticky]");
      if (!cards.length || !sticky) return;

      ScrollTrigger.create({
        trigger: rootRef.current,
        start: "top top+=96",
        end: "bottom bottom",
        pin: sticky,
        pinSpacing: false,
      });

      cards.forEach((card, index) => {
        gsap.fromTo(
          card,
          { opacity: 0.12, y: 36, scale: 0.98 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            ease: "power3.out",
            duration: 0.9,
            scrollTrigger: {
              trigger: card,
              start: "top 82%",
              end: "top 42%",
              scrub: true,
            },
            delay: index * 0.04,
          },
        );
      });
    },
    { scope: rootRef },
  );

  return (
    <section ref={rootRef} className="page-section container mt-16 sm:mt-24 md:mt-32">
      <div className="grid gap-8 lg:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.1fr)] lg:gap-12">
        <div data-story-sticky className="self-start">
          <div className="surface-blur rounded-[calc(var(--radius-xl)+0.125rem)] p-6 sm:p-7">
            <SectionHeading
              eyebrow="السبب"
              title="ليش الواجهة لازم تقرأ مثل أطلس هادئ، مو مثل صفحة خصومات صاخبة"
              description="هذا الفصل يثبت اتجاه التصميم الجديد: وضوح محلي، ثقة أسرع، وإحساس منتج ناضج بدل ازدحام بصري."
            />

            <div className="mt-6 rounded-[calc(var(--radius-lg)+0.125rem)] border border-border/70 bg-background/80 p-5">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                <Storefront className="h-6 w-6" weight="duotone" />
              </div>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                كل قرار بصري في الصفحة الجديدة يرجع لسؤال واحد: هل هذا يساعد الزائر يلقط المحل المناسب بسرعة وهدوء؟
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 sm:space-y-5">
          {storyCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <article
                key={card.title}
                data-story-card
                className="surface-blur rounded-[calc(var(--radius-xl)+0.125rem)] p-6 sm:p-7"
                style={{ transformOrigin: "center top" }}
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                    <Icon className="h-6 w-6" weight="duotone" />
                  </div>
                  <div className="min-w-0 text-right">
                    <div className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      0{index + 1}
                    </div>
                    <h3 className="mt-2 font-display text-2xl font-semibold leading-[1.02] tracking-[-0.045em] text-foreground">
                      {card.title}
                    </h3>
                    <p className="mt-3 max-w-[58ch] text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8">
                      {card.body}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
