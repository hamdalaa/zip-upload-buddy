import tailwindcssAnimate from "tailwindcss-animate";
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1.125rem",
        sm: "1.5rem",
        md: "1.75rem",
        lg: "2.25rem",
      },
      screens: { "2xl": "1480px" },
    },
    extend: {
      fontFamily: {
        sans: ['"SF Arabic"', '"SF Pro"', "-apple-system", "BlinkMacSystemFont", "system-ui", "sans-serif"],
        display: ['"SF Arabic"', '"SF Pro"', "-apple-system", "BlinkMacSystemFont", "system-ui", "sans-serif"],
        mono: ['"SF Arabic"', '"SF Pro"', "-apple-system", "BlinkMacSystemFont", "system-ui", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        surface: {
          DEFAULT: "hsl(var(--surface))",
          2: "hsl(var(--surface-2))",
          elevated: "hsl(var(--surface-elevated))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          glow: "hsl(var(--primary-glow))",
          soft: "hsl(var(--primary-soft))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          soft: "hsl(var(--accent-soft))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          soft: "hsl(var(--success-soft))",
        },
        warning: "hsl(var(--warning))",
        violet: {
          DEFAULT: "hsl(var(--accent-violet))",
          soft: "hsl(var(--accent-violet-soft))",
        },
        rose: {
          DEFAULT: "hsl(var(--accent-rose))",
          soft: "hsl(var(--accent-rose-soft))",
        },
        emerald: {
          DEFAULT: "hsl(var(--accent-emerald))",
          soft: "hsl(var(--accent-emerald-soft))",
        },
        cyan: {
          DEFAULT: "hsl(var(--accent-cyan))",
          soft: "hsl(var(--accent-cyan-soft))",
        },
        nav: {
          DEFAULT: "hsl(var(--nav))",
          2: "hsl(var(--nav-2))",
          foreground: "hsl(var(--nav-foreground))",
          hover: "hsl(var(--nav-hover))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      backgroundImage: {
        "gradient-primary": "var(--gradient-primary)",
        "gradient-hero": "var(--gradient-hero)",
        "gradient-mesh": "var(--gradient-mesh)",
        "gradient-aurora": "var(--gradient-aurora)",
        "gradient-rainbow": "var(--gradient-rainbow)",
        "gradient-sunrise": "var(--gradient-sunrise)",
        "gradient-ocean": "var(--gradient-ocean)",
        "gradient-aurora-soft": "var(--gradient-aurora-soft)",
        "gradient-violet-rose": "var(--gradient-violet-rose)",
        "gradient-amber-rose": "var(--gradient-amber-rose)",
        "gradient-iridescent": "var(--gradient-iridescent)",
        "gradient-spotlight": "var(--gradient-spotlight)",
        "gradient-conic-premium": "var(--gradient-conic-premium)",
        "gradient-section-fade": "var(--gradient-section-fade)",
      },
      boxShadow: {
        glow: "var(--shadow-glow)",
        panel: "var(--shadow-panel)",
      },
      borderRadius: {
        /* Unified radius scale — clean, consistent UX
           Base = 0.875rem (14px). Scale follows a perceptual ramp. */
        sm: "calc(var(--radius) - 8px)",   /* ~6px  — badges, pills */
        md: "calc(var(--radius) - 4px)",   /* ~10px — inputs, chips */
        lg: "var(--radius)",               /* ~14px — buttons, default */
        xl: "calc(var(--radius) + 2px)",   /* ~16px — small cards */
        "2xl": "calc(var(--radius) + 6px)", /* ~20px — cards */
        "3xl": "calc(var(--radius) + 14px)", /* ~28px — hero/large surfaces */
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        "fade-in": { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        "fade-in-up": { from: { opacity: "0", transform: "translateY(20px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        "scale-in": { from: { opacity: "0", transform: "scale(0.95)" }, to: { opacity: "1", transform: "scale(1)" } },
        "slide-in-right": { from: { opacity: "0", transform: "translateX(20px)" }, to: { opacity: "1", transform: "translateX(0)" } },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 0 0 hsl(var(--primary) / 0.5)" },
          "50%": { boxShadow: "0 0 0 10px hsl(var(--primary) / 0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "gradient-shift": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "bounce-subtle": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-3px)" },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        "ping-soft": {
          "75%, 100%": { transform: "scale(1.6)", opacity: "0" },
        },
        "drift-1": {
          "0%":   { transform: "translate(0, 0) rotate(0deg)" },
          "25%":  { transform: "translate(30px, -18px) rotate(4deg)" },
          "50%":  { transform: "translate(60px, 10px) rotate(-3deg)" },
          "75%":  { transform: "translate(20px, 24px) rotate(2deg)" },
          "100%": { transform: "translate(0, 0) rotate(0deg)" },
        },
        "drift-2": {
          "0%":   { transform: "translate(0, 0) rotate(0deg)" },
          "25%":  { transform: "translate(-26px, 14px) rotate(-5deg)" },
          "50%":  { transform: "translate(-48px, -16px) rotate(3deg)" },
          "75%":  { transform: "translate(-18px, -28px) rotate(-2deg)" },
          "100%": { transform: "translate(0, 0) rotate(0deg)" },
        },
        "drift-3": {
          "0%":   { transform: "translate(0, 0) rotate(0deg)" },
          "33%":  { transform: "translate(22px, 28px) rotate(6deg)" },
          "66%":  { transform: "translate(-18px, 16px) rotate(-4deg)" },
          "100%": { transform: "translate(0, 0) rotate(0deg)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.4s ease-out",
        "fade-in-up": "fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
        "scale-in": "scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-in-right": "slide-in-right 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        shimmer: "shimmer 2.5s linear infinite",
        float: "float 4s ease-in-out infinite",
        "gradient-shift": "gradient-shift 8s ease infinite",
        marquee: "marquee 30s linear infinite",
        "bounce-subtle": "bounce-subtle 2s ease-in-out infinite",
        "spin-slow": "spin-slow 20s linear infinite",
        "ping-soft": "ping-soft 1.5s cubic-bezier(0, 0, 0.2, 1) infinite",
        "drift-1": "drift-1 18s ease-in-out infinite",
        "drift-2": "drift-2 22s ease-in-out infinite",
        "drift-3": "drift-3 26s ease-in-out infinite",
      },
      transitionTimingFunction: {
        ios: "cubic-bezier(0.32, 0.72, 0, 1)",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
