"use client";
import { cn } from "@/lib/utils";

export default function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <div className={cn("flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
        <rect width="48" height="48" rx="8" fill="black"/>
        <g transform="translate(24, 24)">
          <path d="M 0 -16 L 14 -6 L 14 8 L 0 18 L -14 8 L -14 -6 Z" fill="#0033ff" stroke="#0033ff" strokeWidth="2" strokeLinejoin="round"/>
          <circle cx="0" cy="-2" r="5" fill="white"/>
        </g>
      </svg>
    </div>
  );
}