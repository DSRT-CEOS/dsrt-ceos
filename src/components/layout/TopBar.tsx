"use client";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Bell, LogOut, User, ChevronDown, Search, FileText, Building2, Receipt, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import RoleBadge from "@/components/shared/RoleBadge";
import toast from "react-hot-toast";
import { formatCurrency } from "@/lib/utils";

export default function TopBar({ userEmail }: { userEmail: string }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/notifications/check").then(r => r.json()).then(d => {
      if (d.success) { setNotifCount(d.totalCount); setNotifications(d.notifications); }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowResults(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifs(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (search.length < 2) { setSearchResults(null); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(search)}`);
        const d = await r.json();
        if (d.success) { setSearchResults(d.results); setShowResults(true); }
      } finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success("Logged out");
    router.push("/auth/login");
    router.refresh();
  };

  const sendNotificationEmail = async () => {
    setSendingEmail(true);
    try {
      const r = await fetch("/api/notifications/send", { method: "POST" });
      const d = await r.json();
      if (d.success) toast.success(d.message);
    } finally { setSendingEmail(false); }
  };

  const goTo = (url: string) => { setShowResults(false); setShowMobileSearch(false); setSearch(""); router.push(url); };

  return (
    <div className="h-12 bg-card border-b border-border flex items-center justify-between px-3 md:px-5 flex-shrink-0 gap-2 md:gap-4">
      <div className="md:hidden w-9" />

      <div ref={searchRef} className={`flex-1 max-w-xl relative ${showMobileSearch ? "fixed inset-x-0 top-0 z-50 bg-card p-2 max-w-full border-b border-border" : "hidden md:block"}`}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            onFocus={() => search.length >= 2 && setShowResults(true)}
            placeholder="Search tenders, projects, bills..." className="pl-9 h-8 text-xs bg-secondary border-border" />
          {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary animate-spin" />}
        </div>

        {showResults && searchResults && (
          <div className="absolute top-10 left-0 right-0 bg-popover border border-border rounded-md shadow-lg max-h-96 overflow-y-auto z-50">
            {(searchResults.tenders?.length + searchResults.projects?.length + searchResults.bills?.length + searchResults.docs?.length) === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">No results</div>
            ) : (
              <>
                {searchResults.tenders?.length > 0 && (
                  <div>
                    <p className="px-3 py-2 text-muted-foreground text-[10px] uppercase tracking-wider bg-secondary/50">Tenders</p>
                    {searchResults.tenders.map((t: any) => (
                      <button key={t.id} onClick={() => goTo(t.url)} className="w-full px-3 py-2 hover:bg-secondary text-left flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground text-sm truncate">{t.workName}</p>
                          <p className="text-muted-foreground text-xs">{t.department || ""}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {searchResults.projects?.length > 0 && (
                  <div>
                    <p className="px-3 py-2 text-muted-foreground text-[10px] uppercase tracking-wider bg-secondary/50">Projects</p>
                    {searchResults.projects.map((p: any) => (
                      <button key={p.id} onClick={() => goTo(p.url)} className="w-full px-3 py-2 hover:bg-secondary text-left flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-primary flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground text-sm truncate">{p.name}</p>
                          <p className="text-muted-foreground text-xs">{p.status}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {searchResults.bills?.length > 0 && (
                  <div>
                    <p className="px-3 py-2 text-muted-foreground text-[10px] uppercase tracking-wider bg-secondary/50">Bills</p>
                    {searchResults.bills.map((b: any) => (
                      <button key={b.id} onClick={() => goTo(b.url)} className="w-full px-3 py-2 hover:bg-secondary text-left flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-primary flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground text-sm truncate">{b.billNumber}</p>
                          <p className="text-muted-foreground text-xs">{formatCurrency(b.netPayable)}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 md:gap-2 ml-auto">
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 md:hidden" onClick={() => setShowMobileSearch(true)}>
          <Search className="w-4 h-4" />
        </Button>

        <RoleBadge />

        <div ref={notifRef} className="relative">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 relative" onClick={() => setShowNotifs(!showNotifs)}>
            <Bell className="w-4 h-4" />
            {notifCount > 0 && (
              <span className="absolute top-0.5 right-0.5 bg-destructive text-white text-[9px] rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold border border-card">
                {notifCount > 9 ? "9+" : notifCount}
              </span>
            )}
          </Button>

          {showNotifs && (
            <div className="absolute top-10 right-0 w-80 max-w-[calc(100vw-1rem)] bg-popover border border-border rounded-md shadow-lg z-50 overflow-hidden">
              <div className="p-3 border-b border-border flex items-center justify-between">
                <p className="text-foreground font-semibold text-sm">Notifications</p>
                {notifCount > 0 && (
                  <Button size="sm" variant="ghost" onClick={sendNotificationEmail} disabled={sendingEmail} className="text-xs h-7">
                    {sendingEmail ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Mail className="w-3 h-3 mr-1" />Email</>}
                  </Button>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="p-6 text-muted-foreground text-sm text-center">All caught up</p>
                ) : (
                  notifications.map((n: any, i: number) => (
                    <div key={i} className="p-3 border-b border-border/50 hover:bg-secondary/30">
                      <p className="text-primary text-[10px] font-semibold uppercase tracking-wider">{n.type.replace(/_/g, " ")}</p>
                      <p className="text-foreground text-sm mt-1">{n.count} item{n.count > 1 ? "s" : ""}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 h-8 px-2">
              <div className="w-6 h-6 bg-primary/15 border border-primary/30 rounded-full flex items-center justify-center">
                <User className="w-3 h-3 text-primary" />
              </div>
              <span className="text-xs max-w-24 lg:max-w-36 truncate hidden md:inline">{userEmail}</span>
              <ChevronDown className="w-3 h-3 text-muted-foreground hidden md:inline" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href="/dashboard/settings"><User className="w-4 h-4 mr-2" />Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
              <LogOut className="w-4 h-4 mr-2" />Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}