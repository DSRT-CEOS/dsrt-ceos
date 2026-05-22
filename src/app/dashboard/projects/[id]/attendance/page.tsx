"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ClipboardCheck, Loader2, Save, Users, IndianRupee, Calendar } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import toast from "react-hot-toast";

export default function AttendancePage() {
  const { id: projectId } = useParams();
  const [workers, setWorkers] = useState<any[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendance, setAttendance] = useState<Record<string, { status: string; overtime: string }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [wRes, aRes] = await Promise.all([
        fetch(`/api/workers?projectId=${projectId}`),
        fetch(`/api/attendance?projectId=${projectId}&date=${date}`),
      ]);
      const wData = await wRes.json();
      const aData = await aRes.json();

      if (wData.success) setWorkers(wData.workers);

      // Pre-fill attendance from existing records
      const initial: Record<string, { status: string; overtime: string }> = {};
      if (wData.success) {
        wData.workers.forEach((w: any) => {
          const existing = aData.records?.find((r: any) => r.workerName === w.name);
          initial[w.id] = {
            status: existing?.status || "PRESENT",
            overtime: existing?.overtimeHours ? String(existing.overtimeHours) : "",
          };
        });
      }
      setAttendance(initial);
    } finally { setLoading(false); }
  }, [projectId, date]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const setStatus = (workerId: string, status: string) => {
    setAttendance(p => ({ ...p, [workerId]: { ...p[workerId], status } }));
  };

  const setOvertime = (workerId: string, overtime: string) => {
    setAttendance(p => ({ ...p, [workerId]: { ...p[workerId], overtime } }));
  };

  const setAllPresent = () => {
    const all: Record<string, { status: string; overtime: string }> = {};
    workers.forEach(w => all[w.id] = { status: "PRESENT", overtime: "" });
    setAttendance(all);
    toast.success("All marked PRESENT");
  };

  const save = async () => {
    setSaving(true);
    try {
      const records = workers.map(w => ({
        workerName: w.name,
        workerAadhaar: w.aadhaarNumber,
        skillType: w.skillType,
        status: attendance[w.id]?.status || "ABSENT",
        overtimeHours: attendance[w.id]?.overtime ? parseFloat(attendance[w.id].overtime) : null,
        dailyWage: w.dailyWage,
      }));

      const r = await fetch("/api/attendance/bulk", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, date, records })
      });
      const d = await r.json();
      if (d.success) toast.success(`Saved ${d.count} records`);
      else toast.error(d.error);
    } catch { toast.error("Error"); } finally { setSaving(false); }
  };

  const stats = {
    present: Object.values(attendance).filter(a => a?.status === "PRESENT").length,
    halfDay: Object.values(attendance).filter(a => a?.status === "HALF_DAY").length,
    absent: Object.values(attendance).filter(a => a?.status === "ABSENT").length,
    totalOT: Object.values(attendance).reduce((s, a) => s + (a?.overtime ? parseFloat(a.overtime) : 0), 0),
    totalWage: workers.reduce((s, w) => {
      const a = attendance[w.id];
      if (!a) return s;
      let wage = 0;
      if (a.status === "PRESENT") wage = Number(w.dailyWage);
      else if (a.status === "HALF_DAY") wage = Number(w.dailyWage) / 2;
      if (a.overtime) wage += (Number(w.dailyWage) / 8) * 2 * parseFloat(a.overtime);
      return s + wage;
    }, 0),
  };

  return (
    <div className="space-y-5 max-w-6xl">
      <Link href={`/dashboard/projects/${projectId}`}><Button variant="ghost" size="sm" className="-ml-2"><ArrowLeft className="w-4 h-4 mr-2" />Back to Project</Button></Link>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><ClipboardCheck className="w-6 h-6 text-orange-400" />Daily Attendance</h1>
          <p className="text-slate-400 text-sm mt-1">Mark attendance for site workers</p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-1.5 border border-slate-700">
            <Calendar className="w-4 h-4 text-orange-400" />
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="border-0 bg-transparent h-7 w-auto p-0 text-sm" />
          </div>
          <Button onClick={setAllPresent} variant="outline" size="sm" disabled={workers.length === 0}>Mark All Present</Button>
          <Button onClick={save} disabled={saving || workers.length === 0} className="bg-orange-500 hover:bg-orange-600">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" />Save</>}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-4 text-center"><p className="text-slate-500 text-xs uppercase">Total</p><p className="text-2xl font-bold text-white mt-1">{workers.length}</p></CardContent></Card>
        <Card className="bg-green-500/5 border-green-500/20"><CardContent className="p-4 text-center"><p className="text-green-300 text-xs uppercase">Present</p><p className="text-2xl font-bold text-green-400 mt-1">{stats.present}</p></CardContent></Card>
        <Card className="bg-yellow-500/5 border-yellow-500/20"><CardContent className="p-4 text-center"><p className="text-yellow-300 text-xs uppercase">Half Day</p><p className="text-2xl font-bold text-yellow-400 mt-1">{stats.halfDay}</p></CardContent></Card>
        <Card className="bg-red-500/5 border-red-500/20"><CardContent className="p-4 text-center"><p className="text-red-300 text-xs uppercase">Absent</p><p className="text-2xl font-bold text-red-400 mt-1">{stats.absent}</p></CardContent></Card>
        <Card className="bg-orange-500/5 border-orange-500/20"><CardContent className="p-4 text-center"><p className="text-orange-300 text-xs uppercase">Day Wage</p><p className="text-lg font-bold text-orange-400 mt-1">{formatCurrency(stats.totalWage)}</p></CardContent></Card>
      </div>

      {loading ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div> :
       workers.length === 0 ? (
        <Card className="border-dashed"><CardContent className="p-12 text-center">
          <Users className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-white font-medium">No workers added yet</p>
          <p className="text-slate-500 text-sm mt-1 mb-4">Add workers first to mark attendance</p>
          <Link href={`/dashboard/projects/${projectId}/workers`}><Button className="bg-orange-500 hover:bg-orange-600">Add Workers</Button></Link>
        </CardContent></Card>
       ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-800">
              {workers.map(w => {
                const a = attendance[w.id] || { status: "PRESENT", overtime: "" };
                return (
                  <div key={w.id} className="p-3 hover:bg-slate-800/30 flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-500/10 border border-orange-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-orange-400 font-bold text-sm">{w.name.charAt(0)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{w.name}</p>
                      <p className="text-slate-500 text-xs">{w.trade || w.skillType.replace(/_/g, " ")} · {formatCurrency(w.dailyWage)}/day</p>
                    </div>
                    <div className="flex gap-1">
                      {[
                        { v: "PRESENT", l: "P", c: "green" },
                        { v: "HALF_DAY", l: "½", c: "yellow" },
                        { v: "ABSENT", l: "A", c: "red" },
                      ].map(s => (
                        <button key={s.v} onClick={() => setStatus(w.id, s.v)}
                          className={cn("w-9 h-9 rounded-lg font-bold text-sm border transition-all",
                            a.status === s.v ?
                              s.c === "green" ? "bg-green-500 border-green-500 text-white" :
                              s.c === "yellow" ? "bg-yellow-500 border-yellow-500 text-white" :
                              "bg-red-500 border-red-500 text-white"
                            : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
                          )}>{s.l}</button>
                      ))}
                    </div>
                    <Input type="number" value={a.overtime} onChange={e => setOvertime(w.id, e.target.value)}
                      placeholder="OT hrs" className="w-20 h-9 text-xs" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
       )}
    </div>
  );
}