"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BarChart3, Loader2, Calendar } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

export default function GanttPage() {
  const { id: projectId } = useParams();
  const [project, setProject] = useState<any>(null);
  const [boqItems, setBoqItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, bRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/boq?projectId=${projectId}`),
      ]);
      const pData = await pRes.json();
      const bData = await bRes.json();
      if (pData.success) setProject(pData.project);
      if (bData.success) setBoqItems(bData.items);
    } finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { fetch_(); }, [fetch_]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div>;
  if (!project) return <div className="text-center py-20"><p className="text-slate-400">Project not found</p></div>;

  const startDate = project.startDate ? new Date(project.startDate) : new Date();
  const endDate = project.completionDate ? new Date(project.completionDate) : new Date(Date.now() + 180 * 86400000);
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000);
  const elapsedDays = Math.max(0, Math.ceil((Date.now() - startDate.getTime()) / 86400000));
  const timeProgressPct = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));

  // Calculate weeks
  const weeks = Math.ceil(totalDays / 7);
  const today = new Date();
  const todayOffset = Math.max(0, Math.ceil((today.getTime() - startDate.getTime()) / 86400000));
  const todayPct = (todayOffset / totalDays) * 100;

  // Distribute BOQ items across the timeline based on planned vs actual
  const itemsWithSchedule = boqItems.map((item: any, i: number) => {
    // Auto-distribute: split total duration into BOQ items
    const itemDuration = Math.max(7, Math.floor(totalDays / boqItems.length));
    const itemStart = i * (totalDays / boqItems.length);
    const itemEnd = itemStart + itemDuration;
    return {
      ...item,
      startPct: (itemStart / totalDays) * 100,
      widthPct: Math.min(100 - (itemStart / totalDays) * 100, (itemDuration / totalDays) * 100),
      progress: item.progress || 0,
    };
  });

  return (
    <div className="space-y-5 max-w-7xl">
      <Link href={`/dashboard/projects/${projectId}`}><Button variant="ghost" size="sm" className="-ml-2"><ArrowLeft className="w-4 h-4 mr-2" />Back to Project</Button></Link>

      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2"><BarChart3 className="w-6 h-6 text-orange-400" />Project Timeline</h1>
        <p className="text-slate-400 text-sm mt-1">{project.name}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <p className="text-slate-500 text-xs uppercase">Duration</p>
          <p className="text-xl font-bold text-white mt-1">{totalDays} days</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-slate-500 text-xs uppercase">Elapsed</p>
          <p className="text-xl font-bold text-blue-400 mt-1">{elapsedDays} days</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-slate-500 text-xs uppercase">Time Progress</p>
          <p className="text-xl font-bold text-orange-400 mt-1">{timeProgressPct.toFixed(0)}%</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-slate-500 text-xs uppercase">Work Progress</p>
          <p className="text-xl font-bold text-green-400 mt-1">{(project.progressPercent || 0).toFixed(0)}%</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold flex items-center gap-2"><Calendar className="w-4 h-4 text-orange-400" />Schedule</h3>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-500 rounded" /><span className="text-slate-400">Planned</span></div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500 rounded" /><span className="text-slate-400">Completed</span></div>
              <div className="flex items-center gap-1"><div className="w-0.5 h-3 bg-red-400" /><span className="text-slate-400">Today</span></div>
            </div>
          </div>

          <div className="text-xs text-slate-500 mb-2 flex justify-between">
            <span>{startDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
            <span>{endDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
          </div>

          {/* Timeline header with week markers */}
          <div className="relative h-6 mb-3 bg-slate-800 rounded">
            {Array.from({ length: weeks }).map((_, i) => (
              <div key={i} className="absolute top-0 bottom-0 border-l border-slate-700" style={{ left: `${(i / weeks) * 100}%` }}>
                <span className="absolute top-full mt-1 text-[9px] text-slate-600 whitespace-nowrap">W{i + 1}</span>
              </div>
            ))}
            {/* Today marker */}
            {todayPct >= 0 && todayPct <= 100 && (
              <div className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-10" style={{ left: `${todayPct}%` }}>
                <span className="absolute top-full mt-1 text-[10px] text-red-400 font-bold whitespace-nowrap -translate-x-1/2">TODAY</span>
              </div>
            )}
          </div>

          {/* BOQ items as Gantt bars */}
          <div className="space-y-1.5 mt-8">
            {itemsWithSchedule.length === 0 ? (
              <div className="text-center py-8">
                <BarChart3 className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                <p className="text-slate-400 text-sm mb-2">No BOQ items to schedule</p>
                <Link href={`/dashboard/projects/${projectId}/boq`}>
                  <Button size="sm" className="bg-orange-500 hover:bg-orange-600">Add BOQ Items</Button>
                </Link>
              </div>
            ) : (
              itemsWithSchedule.map((item, i) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 items-center hover:bg-slate-800/30 p-2 rounded">
                  <div className="col-span-3 min-w-0">
                    <p className="text-white text-xs font-medium truncate">{item.slNo}. {item.description}</p>
                    <p className="text-slate-500 text-[10px]">{item.contractQty} {item.unit} · {formatCurrency(item.amount || 0)}</p>
                  </div>
                  <div className="col-span-9 relative h-7 bg-slate-800/50 rounded">
                    {/* Today line */}
                    {todayPct >= 0 && todayPct <= 100 && (
                      <div className="absolute top-0 bottom-0 w-0.5 bg-red-400/60 z-10" style={{ left: `${todayPct}%` }} />
                    )}
                    {/* Planned bar (blue, full duration) */}
                    <div className="absolute top-1 bottom-1 bg-blue-500/30 border border-blue-500/50 rounded"
                      style={{ left: `${item.startPct}%`, width: `${item.widthPct}%` }}>
                      {/* Completed bar (green, based on progress) */}
                      <div className="h-full bg-green-500/80 border-r-2 border-green-300 rounded-l"
                        style={{ width: `${Math.min(item.progress, 100)}%` }} />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-white text-[10px] font-bold drop-shadow">{item.progress.toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      {boqItems.length > 0 && (
        <Card className={cn(
          (project.progressPercent || 0) >= timeProgressPct
            ? "bg-green-500/5 border-green-500/20"
            : "bg-yellow-500/5 border-yellow-500/20"
        )}>
          <CardContent className="p-5">
            <h3 className="text-white font-semibold mb-2">Schedule Analysis</h3>
            <p className="text-slate-300 text-sm">
              {(project.progressPercent || 0) >= timeProgressPct
                ? `Work progress (${(project.progressPercent || 0).toFixed(0)}%) is on track with time elapsed (${timeProgressPct.toFixed(0)}%).`
                : `Work progress (${(project.progressPercent || 0).toFixed(0)}%) is behind time elapsed (${timeProgressPct.toFixed(0)}%). Gap: ${(timeProgressPct - (project.progressPercent || 0)).toFixed(1)}%.`}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}