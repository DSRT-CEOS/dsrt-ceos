import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
}

export default function Logo({ size = "md", showText = true, className }: LogoProps) {
  const sizes = {
    sm: { box: "w-7 h-7", icon: 14, title: "text-xs", subtitle: "text-[9px]" },
    md: { box: "w-9 h-9", icon: 18, title: "text-sm", subtitle: "text-[10px]" },
    lg: { box: "w-12 h-12", icon: 24, title: "text-lg", subtitle: "text-xs" },
    xl: { box: "w-16 h-16", icon: 32, title: "text-2xl", subtitle: "text-sm" },
  };
  const s = sizes[size];

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className={cn("rounded-md bg-black border border-white/10 flex items-center justify-center shadow-lg relative overflow-hidden", s.box)}>
        {/* Diamond/Shield Mark - matches your logo */}
        <svg width={s.icon} height={s.icon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2 L21 8 V16 L12 22 L3 16 V8 Z" fill="#0033ff" stroke="#0033ff" strokeWidth="1.5" strokeLinejoin="round"/>
          <path d="M12 2 L21 8 V16 L12 22 L3 16 V8 Z" fill="url(#brandGradient)" />
          <circle cx="12" cy="11" r="2.5" fill="white" />
          <defs>
            <linearGradient id="brandGradient" x1="3" y1="2" x2="21" y2="22" gradientUnits="userSpaceOnUse">
              <stop stopColor="#3060ff"/>
              <stop offset="1" stopColor="#0029cc"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
      {showText && (
        <div>
          <h1 className={cn("font-bold text-white leading-tight tracking-tight", s.title)}>DSRT CEOS</h1>
          <p className={cn("text-muted-foreground uppercase tracking-widest", s.subtitle)}>Construction OS</p>
        </div>
      )}
    </div>
  );
}