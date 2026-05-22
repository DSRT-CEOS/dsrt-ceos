"use client";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Bell, LogOut, User, ChevronDown, Search, FileText, Building2, Receipt, FolderOpen, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Fetch notifications on mount
  useEffect(() => {
    fetch("/api/notifications/check").then(r => r.json()).then(d => {
      if (d.success) {
        setNotifCount(d.totalCount);
        setNotifications(d.notifications);
      }
    });
  }, []);

  // Click outside handler
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowResults(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifs(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Debounced search
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
      else toast.error(d.error);
    } catch { toast.error("Failed to send"); }
    finally { setSendingEmail(false); }
  };

  const goTo = (url: string) => {
    setShowResults(false);
    setSearch("");
    router.push(url);
  };

  const totalResults = searchResults ?
    (searchResults.tenders?.length || 0) + (searchResults.projects?.length || 0) +
    (searchResults.bills?.length || 0) + (searchResults.docs?.length || 0) : 0;

  return (
    <div className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 flex-shrink-0 gap-4">
      {/* Search */}
      <div ref={searchRef} className="flex-1 max-w-xl relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={() => search.length >= 2 && setShowResults(true)}
            placeholder="Search tenders, projects, bills, documents..."
            className="pl-9 pr-10 h-9 text-sm bg-slate-800/50 border-slate-700"
          />
          {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400 animate-spin" />}
        </div>

        {showResults && searchResults && (
          <div className="absolute top-12 left-0 right-0 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-96 overflow-y-auto z-50">
            {totalResults === 0 ? (
              <div className="p-4 text-center text-slate-500 text-sm">No results found</div>
            ) : (
              <>
                {searchResults.tenders?.length > 0 && (
                  <div>
                    <p className="px-3 py-2 text-slate-500 text-xs uppercase bg-slate-900/50">Tenders</p>
                    {searchResults.tenders.map((t: any) => (
                      <button key={t.id} onClick={() => goTo(t.url)} className="w-full px-3 py-2 hover:bg-slate-700 text-left flex items-center gap-2 transition-colors">
                        <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm truncate">{t.workName}</p>
                          <p className="text-slate-500 text-xs">{t.department || ""} {t.nitNumber && `· ${t.nitNumber}`}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {searchResults.projects?.length > 0 && (
                  <div>
                    <p className="px-3 py-2 text-slate-500 text-xs uppercase bg-slate-900/50">Projects</p>
                    {searchResults.projects.map((p: any) => (
                      <button key={p.id} onClick={() => goTo(p.url)} className="w-full px-3 py-2 hover:bg-slate-700 text-left flex items-center gap-2 transition-colors">
                        <Building2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm truncate">{p.name}</p>
                          <p className="text-slate-500 text-xs">{p.department} · {p.status}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {searchResults.bills?.length > 0 && (
                  <div>
                    <p className="px-3 py-2 text-slate-500 text-xs uppercase bg-slate-900/50">Bills</p>
                    {searchResults.bills.map((b: any) => (
                      <button key={b.id} onClick={() => goTo(b.url)} className="w-full px-3 py-2 hover:bg-slate-700 text-left flex items-center gap-2 transition-colors">
                        <Receipt className="w-4 h-4 text-orange-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm truncate">{b.billNumber}</p>
                          <p className="text-slate-500 text-xs">{b.project?.name} · {formatCurrency(b.netPayable)}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {searchResults.docs?.length > 0 && (
                  <div>
                    <p className="px-3 py-2 text-slate-500 text-xs uppercase bg-slate-900/50">Documents</p>
                    {searchResults.docs.map((d: any) => (
                      <button key={d.id} onClick={() => goTo(d.url)} className="w-full px-3 py-2 hover:bg-slate-700 text-left flex items-center gap-2 transition-colors">
                        <FolderOpen className="w-4 h-4 text-purple-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm truncate">{d.name}</p>
                          <p className="text-slate-500 text-xs">{d.category}</p>
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

      <div className="flex items-center gap-2">
        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 relative" onClick={() => setShowNotifs(!showNotifs)}>
            <Bell className="w-4 h-4" />
            {notifCount > 0 && <span className="absolute -top-0.5 -right-0.5 bg-orange-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold text-[10px]">{notifCount > 9 ? "9+" : notifCount}</span>}
          </Button>

          {showNotifs && (
            <div className="absolute top-10 right-0 w-80 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
              <div className="p-3 border-b border-slate-700 flex items-center justify-between">
                <p className="text-white font-semibold text-sm">Notifications</p>
                {notifCount > 0 && (
                  <Button size="sm" variant="ghost" onClick={sendNotificationEmail} disabled={sendingEmail} className="text-xs h-7">
                    {sendingEmail ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Mail className="w-3 h-3 mr-1" />Email Me</>}
                  </Button>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="p-6 text-slate-500 text-sm text-center">All caught up!</p>
                ) : (
                  notifications.map((n: any, i: number) => (
                    <div key={i} className="p-3 border-b border-slate-700/50 hover:bg-slate-700/30">
                      <p className="text-orange-400 text-xs font-semibold uppercase">{n.type.replace(/_/g, " ")}</p>
                      <p className="text-white text-sm mt-1">{n.count} item{n.count > 1 ? "s" : ""}</p>
                      <div className="mt-2 space-y-1">
                        {n.items.slice(0, 3).map((item: any, idx: number) => (
                          <p key={idx} className="text-slate-400 text-xs truncate">
                            • {item.workName || item.name || item.billNumber || item.department}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 h-8">
              <div className="w-6 h-6 bg-orange-500/20 border border-orange-500/30 rounded-full flex items-center justify-center">
                <User className="w-3 h-3 text-orange-400" />
              </div>
              <span className="text-xs max-w-36 truncate text-slate-300 hidden md:inline">{userEmail}</span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href="/dashboard/settings"><User className="w-4 h-4 mr-2" />Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-400 cursor-pointer">
              <LogOut className="w-4 h-4 mr-2" />Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}