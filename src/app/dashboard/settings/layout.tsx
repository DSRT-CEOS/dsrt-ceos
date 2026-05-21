"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, FileText, SlidersHorizontal, Users, Wrench, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { label: "Company Profile", href: "/dashboard/settings/profile", icon: Building2, desc: "PAN, GST, address" },
  { label: "Registrations", href: "/dashboard/settings/registrations", icon: FileText, desc: "Contractor classes" },
  { label: "Preferences", href: "/dashboard/settings/preferences", icon: SlidersHorizontal, desc: "Sectors, AI notes" },
  { label: "Staff Members", href: "/dashboard/settings/staff", icon: Users, desc: "Engineers, supervisors" },
  { label: "Machinery", href: "/dashboard/settings/machinery", icon: Wrench, desc: "Equipment registry" },
  { label: "Past Works", href: "/dashboard/settings/past-works", icon: Briefcase, desc: "Project experience" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="flex gap-6 max-w-6xl">
      <div className="w-60 flex-shrink-0">
        <h2 className="text-white font-bold text-xl mb-4">Settings</h2>
        <nav className="space-y-1">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}
                className={cn(
                  "flex items-start gap-3 px-3 py-2.5 rounded-lg transition-all text-sm border",
                  active
                    ? "bg-orange-500/10 border-orange-500/20 text-orange-300"
                    : "text-slate-400 hover:text-white hover:bg-slate-800 border-transparent"
                )}>
                <item.icon className={cn("w-4 h-4 mt-0.5 flex-shrink-0", active ? "text-orange-400" : "text-slate-500")} />
                <div>
                  <p className="font-medium leading-tight">{item.label}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{item.desc}</p>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}