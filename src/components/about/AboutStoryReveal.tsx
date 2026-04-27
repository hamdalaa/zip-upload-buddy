import { useRef } from "react";
import { ArrowLeft, HeartStraight, Pulse, Sparkle } from "@phosphor-icons/react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const lines = [
  "المشروع بدأ من تعب السؤال المتكرر: وين ألقى محل مضمون؟",
  "الهدف مو بيع منتج، الهدف تقليل الضياع قبل ما يطلع المستخدم من البيت.",
  "لهذا السبب الواجهة الجديدة تنحاز للهدوء والوضوح والثقة المقروءة بسرعة.",
];

export function AboutStoryReveal() {
  const rootRef = useRef<HTMLElement | null>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const items = gsap.utils.toArray<HTMLElement>("[data-about-line]");
      if (!items.length) return;

      gsap.fromTo(
        items,
        { opacity: 0.18, y: 24 },
        {
          opacity: 1,
          y: 0,
          stagger: 0.14,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: rootRef.current,
            start: "top 75%",
          },
        },
      );
    },
    { scope: rootRef },
  );

  return (
    <section ref={rootRef} className="surface-blur rounded-[calc(var(--radius-xl)+0.125rem)] p-6 sm:p-8">
      <div className="flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-primary">
        <Pulse className="h-4 w-4" weight="duotone" />
        النية وراء التصميم
      </div>

      <div className="mt-5 space-y-4">
        {lines.map((line) => (
          <p
            key={line}
            data-about-line
            className="font-display max-w-[28ch] text-2xl font-semibold leading-[1.08] tracking-[-0.045em] text-foreground sm:text-3xl"
          >
            {line}
          </p>
        ))}
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[calc(var(--radius-lg)+0.125rem)] border border-border/70 bg-background/82 p-5">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <HeartStraight className="h-5 w-5" weight="duotone" />
          </div>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            الرعاية هنا تُعرض كدعم لاستمرار منصة مفيدة، لا كعنصر يسرق الانتباه من وظيفة البحث الأساسية.
          </p>
        </div>
        <div className="rounded-[calc(var(--radius-lg)+0.125rem)] border border-border/70 bg-background/82 p-5">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <Sparkle className="h-5 w-5" weight="duotone" />
          </div>
          <a
            href="https://instagram.com/hamadalaatech"
            target="_blank"
            rel="noreferrer noopener"
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-foreground transition-colors hover:text-primary"
          >
            افتح باب التعاون
            <ArrowLeft className="h-4 w-4" weight="bold" />
          </a>
        </div>
      </div>
    </section>
  );
}
