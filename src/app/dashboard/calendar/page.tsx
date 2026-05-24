"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, ChevronLeft, ChevronRight, Loader2, Clock, FileText, Shield, FolderOpen, Building2 } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

const COLOR_MAP: Record<string, string> = {
  red: "bg-red-500/15 text-red-300 border-red-500/30",
  blue: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  yellow: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  orange: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  green: "bg-green-500/15 text-green-300 border-green-500/30",
  purple: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  cyan: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
};

const CATEGORY_ICONS: Record<string, any> = {
  tender: FileText, document: FolderOpen, registration: FileText,
  project: Building2, compliance: Shield,
};

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"month" | "list">("month");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    const month = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;
    setLoading(true);
    fetch(`/api/calendar?month=${month}`)
      .then(r => r.json())
      .then(d => { if (d.success) setEvents(d.events); })
      .finally(() => setLoading(false));
  }, [currentDate]);

  const navigate = (delta: number) => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + delta);
    setCurrentDate(d);
    setSelectedDate(null);
  };

  const goToday = () => { setCurrentDate(new Date()); setSelectedDate(null); };

  // Build calendar grid
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const days: Array<{ date: Date | null; events: any[] }> = [];
  for (let i = 0; i < firstDay; i++) days.push({ date: null, events: [] });
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const dayEvents = events.filter(e => {
      const ed = new Date(e.date);
      return ed.getFullYear() === year && ed.getMonth() === month && ed.getDate() === d;
    });
    days.push({ date, events: dayEvents });
  }

  const isToday = (d: Date | null) => d && d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
  const isSelected = (d: Date | null) => d && selectedDate && d.toDateString() === selectedDate.toDateString();
  const isPast = (d: Date | null) => d && d < new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const selectedEvents = selectedDate ? events.filter(e => {
    const ed = new Date(e.date);
    return ed.toDateString() === selectedDate.toDateString();
  }) : [];

  // Stats by category
  const stats = {
    total: events.length,
    tenders: events.filter(e => e.category === "tender").length,
    documents: events.filter(e => e.category === "document").length,
    compliance: events.filter(e => e.category === "compliance").length,
    projects: events.filter(e => e.category === "project").length,
  };

  return (
    <div className="space-y-5 max-w-7xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-6 h-6 text-orange-400" />Calendar
          </h1>
          <p className="text-slate-400 text-sm mt-1">All deadlines, expiries, and compliance dates</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-800 rounded-lg p-0.5 border border-slate-700">
            <button onClick={() => setView("month")} className={cn("px-3 py-1.5 rounded text-xs font-medium",
              view === "month" ? "bg-orange-500 text-white" : "text-slate-400")}>Month</button>
            <button onClick={() => setView("list")} className={cn("px-3 py-1.5 rounded text-xs font-medium",
              view === "list" ? "bg-orange-500 text-white" : "text-slate-400")}>List</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <Card><CardContent className="p-3 text-center"><p className="text-slate-500 text-xs">All Events</p><p className="text-xl font-bold text-white">{stats.total}</p></CardContent></Card>
        <Card className="bg-red-500/5 border-red-500/20"><CardContent className="p-3 text-center"><p className="text-red-300 text-xs">Tenders</p><p className="text-xl font-bold text-red-400">{stats.tenders}</p></CardContent></Card>
        <Card className="bg-yellow-500/5 border-yellow-500/20"><CardContent className="p-3 text-center"><p className="text-yellow-300 text-xs">Documents</p><p className="text-xl font-bold text-yellow-400">{stats.documents}</p></CardContent></Card>
        <Card className="bg-cyan-500/5 border-cyan-500/20"><CardContent className="p-3 text-center"><p className="text-cyan-300 text-xs">Compliance</p><p className="text-xl font-bold text-cyan-400">{stats.compliance}</p></CardContent></Card>
        <Card className="bg-purple-500/5 border-purple-500/20"><CardContent className="p-3 text-center"><p className="text-purple-300 text-xs">Projects</p><p className="text-xl font-bold text-purple-400">{stats.projects}</p></CardContent></Card>
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-8 w-8 p-0"><ChevronLeft className="w-4 h-4" /></Button>
          <h2 className="text-white font-semibold min-w-[160px] text-center">
            {currentDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
          </h2>
          <Button variant="ghost" size="sm" onClick={() => navigate(1)} className="h-8 w-8 p-0"><ChevronRight className="w-4 h-4" /></Button>
        </div>
        <Button variant="outline" size="sm" onClick={goToday}>Today</Button>
      </div>

      {loading ? <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div> :
       view === "month" ? (
        <>
          {/* Calendar Grid */}
          <Card>
            <CardContent className="p-2 md:p-4">
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                  <div key={d} className="text-center text-slate-500 text-xs font-semibold py-2 uppercase">{d}</div>
                ))}
              </div>
              {/* Days grid */}
              <div className="grid grid-cols-7 gap-1">
                {days.map((day, i) => (
                  <button key={i} onClick={() => day.date && setSelectedDate(day.date)}
                    disabled={!day.date}
                    className={cn(
                      "aspect-square md:aspect-auto md:min-h-[90px] p-1 md:p-2 rounded-lg border text-left transition-all",
                      !day.date ? "invisible" :
                      isSelected(day.date) ? "bg-orange-500/20 border-orange-500/50" :
                      isToday(day.date) ? "bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/15" :
                      day.events.length > 0 ? "bg-slate-800/50 border-slate-700 hover:bg-slate-800" :
                      "bg-slate-900/30 border-slate-800/50 hover:bg-slate-800/30",
                      isPast(day.date) && !isToday(day.date) && "opacity-50"
                    )}>
                    {day.date && (
                      <>
                        <p className={cn("text-xs md:text-sm font-semibold",
                          isToday(day.date) ? "text-blue-400" :
                          day.events.length > 0 ? "text-white" : "text-slate-500"
                        )}>{day.date.getDate()}</p>
                        <div className="hidden md:block space-y-0.5 mt-1">
                          {day.events.slice(0, 2).map((e: any, idx: number) => (
                            <div key={idx} className={cn("text-[10px] truncate px-1 py-0.5 rounded border", COLOR_MAP[e.color])}>
                              {e.title}
                            </div>
                          ))}
                          {day.events.length > 2 && <p className="text-[10px] text-slate-500">+{day.events.length - 2} more</p>}
                        </div>
                        <div className="md:hidden flex justify-center mt-1">
                          {day.events.length > 0 && (
                            <div className={cn("w-1.5 h-1.5 rounded-full",
                              day.events.some((e: any) => e.color === "red") ? "bg-red-500" : "bg-orange-500")} />
                          )}
                        </div>
                      </>
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Selected day events */}
          {selectedDate && (
            <Card>
              <CardContent className="p-5">
                <h3 className="text-white font-semibold mb-3">
                  Events on {selectedDate.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </h3>
                {selectedEvents.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-4">No events scheduled</p>
                ) : (
                  <div className="space-y-2">
                    {selectedEvents.map((e: any, i: number) => {
                      const Icon = CATEGORY_ICONS[e.category] || FileText;
                      return (
                        <Link key={i} href={e.url}>
                          <div className={cn("p-3 rounded-lg border hover:scale-[1.01] transition-all cursor-pointer", COLOR_MAP[e.color])}>
                            <div className="flex items-start gap-3">
                              <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm">{e.title}</p>
                                {e.meta?.dept && <p className="text-xs opacity-80 mt-0.5">{e.meta.dept}</p>}
                                {e.meta?.amount && <p className="text-xs opacity-80 mt-0.5">Value: {formatCurrency(e.meta.amount)}</p>}
                                <Badge className="mt-1 text-[10px] bg-slate-900/50">{e.type.replace(/_/g, " ")}</Badge>
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
       ) : (
        // List view
        <Card>
          <CardContent className="p-0">
            {events.length === 0 ? (
              <div className="p-12 text-center">
                <Calendar className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No events this month</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {events.map((e: any, i: number) => {
                  const Icon = CATEGORY_ICONS[e.category] || FileText;
                  const eDate = new Date(e.date);
                  const days = Math.ceil((eDate.getTime() - Date.now()) / 86400000);
                  return (
                    <Link key={i} href={e.url}>
                      <div className="p-3 hover:bg-slate-800/30 flex items-center gap-3 cursor-pointer">
                        <div className={cn("w-12 h-12 rounded-lg flex flex-col items-center justify-center border flex-shrink-0", COLOR_MAP[e.color])}>
                          <p className="text-xs font-bold leading-none">{eDate.getDate()}</p>
                          <p className="text-[10px] mt-0.5">{eDate.toLocaleDateString("en-IN", { month: "short" })}</p>
                        </div>
                        <Icon className="w-4 h-4 text-slate-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{e.title}</p>
                          <p className="text-slate-500 text-xs">{e.type.replace(/_/g, " ")}</p>
                        </div>
                        <div className="text-right text-xs flex-shrink-0">
                          <p className={cn("font-semibold", days < 0 ? "text-red-400" : days <= 3 ? "text-red-300" : days <= 7 ? "text-yellow-400" : "text-green-400")}>
                            {days < 0 ? `${Math.abs(days)}d ago` : days === 0 ? "Today" : `${days}d`}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
       )}
    </div>
  );
}