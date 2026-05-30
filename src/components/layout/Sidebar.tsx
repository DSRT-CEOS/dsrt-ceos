"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { LayoutDashboard, Search, FolderOpen, Building2, Receipt, Shield, BarChart3, Settings, Bot, Menu, X, Calendar, HardHat, GitCompare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/lib/hooks/useUser";
import { hasPermission } from "@/lib/auth/roles";
import Logo from "@/components/shared/Logo";

interface NavItem {
  name: string; href: string; icon: any; module?: string; action?: string;
}

const allNav: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Calendar", href: "/dashboard/calendar", icon: Calendar },
  { name: "Tenders", href: "/dashboard/tenders", icon: Search, module: "tenders", action: "view" },
  { name: "Documents", href: "/dashboard/documents", icon: FolderOpen, module: "documents", action: "view" },
  { name: "Projects", href: "/dashboard/projects", icon: Building2, module: "projects", action: "view" },
  { name: "Sub-contractors", href: "/dashboard/subcontractors", icon: HardHat, module: "projects", action: "view" },
  { name: "Billing", href: "/dashboard/billing", icon: Receipt, module: "bills", action: "view" },
  { name: "Compliance", href: "/dashboard/compliance", icon: Shield, module: "compliance", action: "view" },
  { name: "Reports", href: "/dashboard/reports", icon: BarChart3, module: "reports", action: "view" },
  { name: "Settings", href: "/dashboard/settings", icon: Settings, module: "settings", action: "view" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { role, loading } = useCurrentUser();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const visibleNav = loading ? allNav : allNav.filter(item => {
    if (!item.module || !item.action) return true;
    return hasPermission(role, item.module as any, item.action);
  });

  const SidebarContent = () => (
    <>
      <div className="p-4 border-b border-border flex items-center justify-between">
        <Link href="/dashboard"><Logo size="sm" /></Link>
        <button onClick={() => setMobileOpen(false)} className="md:hidden text-muted-foreground hover:text-foreground">
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {visibleNav.map((item) => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md transition-all text-sm relative group",
                active ? "bg-primary/10 text-white font-medium" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}>
              {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r" />}
              <item.icon className={cn("w-4 h-4 flex-shrink-0 transition-colors",
                active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} strokeWidth={active ? 2.25 : 2} />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border">
        <div className="bg-secondary/30 border border-border rounded-md p-2.5">
          <div className="flex items-center gap-2 mb-1">
            <Bot className="w-3.5 h-3.5 text-primary" />
            <span className="text-foreground text-xs font-semibold">CEOS Assistant</span>
            <div className="w-1.5 h-1.5 bg-success rounded-full animate-pulse ml-auto" />
          </div>
          <p className="text-muted-foreground text-[11px]">AI · বাংলা · हिंदी · English</p>
        </div>
      </div>
    </>
  );

  return (
    <>
      <button onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 left-3 z-30 w-9 h-9 bg-card border border-border rounded-md flex items-center justify-center text-foreground shadow-md">
        <Menu className="w-4 h-4" />
      </button>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-40" onClick={() => setMobileOpen(false)} />
      )}

      <div className={cn(
        "bg-card border-r border-border flex flex-col flex-shrink-0 transition-transform duration-300 z-50",
        "md:relative md:translate-x-0 md:w-60",
        "fixed top-0 left-0 bottom-0 w-64",
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <SidebarContent />
      </div>
    </>
  );
}