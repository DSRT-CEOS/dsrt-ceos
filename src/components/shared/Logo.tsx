"use client";
import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  variant?: "full" | "mark";
  className?: string;
}

export default function Logo({ size = "md", className }: LogoProps) {
  const [src, setSrc] = useState("/logo.png");

  const sizes = {
    sm: { width: 90, height: 36 },
    md: { width: 120, height: 48 },
    lg: { width: 180, height: 72 },
    xl: { width: 260, height: 104 },
  };
  const s = sizes[size];

  return (
    <div className={cn("flex items-center", className)}>
      <Image
        src={src}
        alt="DSRT CEOS"
        width={s.width}
        height={s.height}
        className="object-contain"
        priority
        onError={() => setSrc("/logo.svg")}
        unoptimized
      />
    </div>
  );
}