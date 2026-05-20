"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Search, FolderOpen, Building2, Receipt, Shield, BarChart3, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, label: "Overview" },
  { name: "Tenders", href: "/dashboard/tenders", icon: Search, label: "Upload & analyze" },
  { name: "Documents", href: "/dashboard/documents", icon: FolderOpen, label: "Company vault" },
  { name: "Projects", href: "/dashboard/projects", icon: Building2, label: "Active projects" },
  { name: "Billing", href: "/dashboard/billing", icon: Receipt, label: "RA Bills" },
  { name: "Compliance", href: "/dashboard/compliance", icon: Shield, label: "ESI EPF GST" },
  { name: "Reports", href: "/dashboard/reports", icon: BarChart3, label: "Analytics" },
  { name: "Settings", href: "/dashboard/settings", icon: Settings, label: "Preferences" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="w-60 bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0">
      <div className="p-5 border-b border-slate-800">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-sm leading-tight">DSRT CEOS</h1>
            <p className="text-slate-500 text-xs">Construction OS</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link key={item.name} href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group",
                isActive
                  ? "bg-orange-500/10 border border-orange-500/20 text-orange-400"
                  : "text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent"
              )}>
              <item.icon className={cn("w-4 h-4 flex-shrink-0", isActive ? "text-orange-400" : "text-slate-500 group-hover:text-slate-300")} />
              <div className="min-w-0">
                <p className={cn("text-sm font-medium truncate", isActive ? "text-orange-300" : "")}>{item.name}</p>
                <p className="text-xs text-slate-600 truncate">{item.label}</p>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-800">
        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            <span className="text-white text-xs font-medium">CEOS Online</span>
          </div>
          <p className="text-slate-500 text-xs">Bengali / Hindi / English</p>
        </div>
      </div>
    </div>
  );
}