"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Search, FolderOpen, Building2, Receipt, Shield, BarChart3, Settings, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, label: "Overview" },
  { name: "Tenders", href: "/dashboard/tenders", icon: Search, label: "Upload & analyze" },
  { name: "Documents", href: "/dashboard/documents", icon: FolderOpen, label: "Company vault" },
  { name: "Projects", href: "/dashboard/projects", icon: Building2, label: "Active projects" },
  { name: "Billing", href: "/dashboard/billing", icon: Receipt, label: "RA Bills" },
  { name: "Compliance", href: "/dashboard/compliance", icon: Shield, label: "ESI EPF GST" },
  { name: "Reports", href: "/dashboard/reports", icon: BarChart3, label: "Analytics" },
  { name: "Settings", href: "/dashboard/settings", icon: Settings, label: "Profile & prefs" },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <div className="w-56 bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0">
      <div className="p-4 border-b border-slate-800">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-sm leading-tight">DSRT CEOS</h1>
            <p className="text-slate-600 text-xs">Construction OS</p>
          </div>
        </Link>
      </div>
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {nav.map((item) => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm group",
                active ? "bg-orange-500/10 border border-orange-500/20 text-orange-300" : "text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent"
              )}>
              <item.icon className={cn("w-4 h-4 flex-shrink-0", active ? "text-orange-400" : "text-slate-500 group-hover:text-slate-300")} />
              <div className="min-w-0">
                <p className="font-medium truncate leading-tight">{item.name}</p>
                <p className="text-xs text-slate-600 truncate">{item.label}</p>
              </div>
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-slate-800">
        <div className="bg-orange-500/5 border border-orange-500/10 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Bot className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-white text-xs font-medium">CEOS AI</span>
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse ml-auto" />
          </div>
          <p className="text-slate-600 text-xs">Bengali · Hindi · English</p>
        </div>
      </div>
    </div>
  );
}