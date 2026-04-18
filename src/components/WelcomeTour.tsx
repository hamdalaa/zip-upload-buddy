import { useEffect, useState } from "react";
import { Search, Scale, MapPin, Sparkles, ArrowLeft, ArrowRight, Instagram, Code2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useUserPrefs } from "@/lib/userPrefs";

const steps = [
  {
    icon: Search,
    title: "ابحث بسهولة",
    body: "اكتب اسم المنتج (مثلاً: RTX 4060 أو iPhone 15) وراح نعرض لك كل المحلات اللي عندها.",
  },
  {
    icon: Scale,
    title: "قارن بين المحلات",
    body: "اضغط على زر «قارن» على أي منتج، واختر 2-4 منتجات، وراح نعرضهم جنب بعض بالأسعار والتفاصيل.",
  },
  {
    icon: MapPin,
    title: "روح المحل مباشرة",
    body: "كل محل يجي معاه رابط Google Maps + رقم تلفون + واتساب. ما تحتاج تدور بالشارع.",
  },
  {
    icon: Code2,
    title: "صفحة المطور",
    body: "تايه من تطوير فردي — لأي تعاون، اقتراح، أو استفسار، تواصل معي مباشرة عبر إنستغرام وراح أرد بأقرب وقت.",
    instagram: "https://instagram.com/",
  },
];

export function WelcomeTour() {
  const { onboarded, setOnboarded, tourTrigger } = useUserPrefs();
  const [open, setOpen] = useState(!onboarded);
  const [step, setStep] = useState(0);

  // Re-open when "?" button is pressed (tourTrigger increments).
  useEffect(() => {
    if (tourTrigger > 0) {
      setStep(0);
      setOpen(true);
    }
  }, [tourTrigger]);

  const close = () => {
    setOpen(false);
    setOnboarded(true);
  };

  const Icon = steps[step].icon;
  const isLast = step === steps.length - 1;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) close(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
            <Sparkles className="h-7 w-7" />
          </div>
          <DialogTitle className="text-center text-xl">أهلاً بك في تايه</DialogTitle>
          <DialogDescription className="text-center">
            دليل إلكترونيات بغداد — جولة سريعة بثلاث خطوات
          </DialogDescription>
        </DialogHeader>

        <div className="my-4 rounded-xl border border-border bg-muted/40 p-5 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold">{steps[step].title}</h3>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{steps[step].body}</p>
          {isLast && (steps[step] as any).instagram && (
            <a
              href={(steps[step] as any).instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 px-4 py-2 text-sm font-bold text-white shadow-md hover:opacity-90 transition-opacity"
            >
              <Instagram className="h-4 w-4" />
              تواصل عبر إنستغرام
            </a>
          )}
        </div>

        <div className="flex items-center justify-center gap-1.5">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "w-6 bg-primary" : "w-1.5 bg-muted"
              }`}
              aria-label={`خطوة ${i + 1}`}
            />
          ))}
        </div>

        <DialogFooter className="flex-row justify-end gap-2 sm:justify-end">
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep((s) => s - 1)} className="gap-1">
                <ArrowRight className="h-4 w-4" />
                السابق
              </Button>
            )}
            {!isLast ? (
              <Button onClick={() => setStep((s) => s + 1)} className="gap-1 bg-primary text-primary-foreground hover:bg-primary/90">
                التالي
                <ArrowLeft className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={close} className="gap-1 bg-primary text-primary-foreground hover:bg-primary/90">
                ابدأ التصفح
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
