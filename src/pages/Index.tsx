import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { TopNav } from "@/components/TopNav";
import { HeroBanner } from "@/components/HeroBanner";
import { Skeleton } from "@/components/ui/skeleton";

const DeferredSections = lazy(() => import("@/components/home/IndexDeferredSections"));

function HomeSectionsFallback() {
  return (
    <main className="pb-12 sm:pb-20">
      <section className="container mt-10 space-y-6 sm:mt-20 sm:space-y-10 md:mt-24">
        <Skeleton className="h-72 w-full rounded-3xl" />
        <Skeleton className="h-[28rem] w-full rounded-3xl" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </section>
      <section className="container mt-10 grid gap-6 sm:mt-20 md:mt-24">
        <Skeleton className="h-[26rem] w-full rounded-3xl" />
        <Skeleton className="h-[26rem] w-full rounded-3xl" />
      </section>
    </main>
  );
}

export default function Index() {
  const [showDeferredSections, setShowDeferredSections] = useState(false);
  const triggerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (showDeferredSections) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShowDeferredSections(true);
        }
      },
      { rootMargin: "200px 0px" },
    );

    if (triggerRef.current) observer.observe(triggerRef.current);

    // Only reveal on actual user scroll — don't auto-load on idle to keep initial paint light.
    const onScroll = () => {
      if (window.scrollY > 40) setShowDeferredSections(true);
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [showDeferredSections]);

  return (
    <div className="min-h-screen atlas-shell">
      <TopNav />
      <HeroBanner />
      <div ref={triggerRef}>
        {showDeferredSections ? (
          <Suspense fallback={<HomeSectionsFallback />}>
            <DeferredSections />
          </Suspense>
        ) : (
          <HomeSectionsFallback />
        )}
      </div>
    </div>
  );
}
