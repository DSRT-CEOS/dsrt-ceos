"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, IndianRupee, Loader2, Calendar, Users, FileSpreadsheet } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function WagesPage() {
  const { id: projectId } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/attendance/summary?projectId=${projectId}&month=${month}`);
      const d = await r.json();
      if (d.success) setData(d);
    } finally { setLoading(false); }
  }, [projectId, month]);

  useEffect(() => { fetch_(); }, [fetch_]);

  return (
    <div className="space-y-5 max-w-6xl">
      <Link href={`/dashboard/projects/${projectId}`}><Button variant="ghost" size="sm" className="-ml-2"><ArrowLeft className="w-4 h-4 mr-2" />Back to Project</Button></Link>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><IndianRupee className="w-6 h-6 text-orange-400" />Monthly Wages</h1>
          <p className="text-slate-400 text-sm mt-1">Worker-wise wage calculation from attendance</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-1.5 border border-slate-700">
          <Calendar className="w-4 h-4 text-orange-400" />
          <Input type="month" value={month} onChange={e => setMonth(e.target.value)} className="border-0 bg-transparent h-7 w-auto p-0 text-sm" />
        </div>
      </div>

      {loading ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div> :
       !data || data.workers.length === 0 ? (
        <Card className="border-dashed"><CardContent className="p-12 text-center">
          <FileSpreadsheet className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-white font-medium">No attendance data for {data?.period || month}</p>
          <p className="text-slate-500 text-sm mt-1 mb-4">Mark daily attendance first to calculate wages</p>
          <Link href={`/dashboard/projects/${projectId}/attendance`}><Button className="bg-orange-500 hover:bg-orange-600">Mark Attendance</Button></Link>
        </CardContent></Card>
       ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card><CardContent className="p-4 text-center"><p className="text-slate-500 text-xs uppercase">Workers</p><p className="text-2xl font-bold text-white mt-1">{data.totals.uniqueWorkers}</p></CardContent></Card>
            <Card className="bg-green-500/5 border-green-500/20"><CardContent className="p-4 text-center"><p className="text-green-300 text-xs uppercase">Total Days</p><p className="text-2xl font-bold text-green-400 mt-1">{data.totals.totalPresent}</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-slate-500 text-xs uppercase">Half Days</p><p className="text-2xl font-bold text-yellow-400 mt-1">{data.totals.totalHalfDay}</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-slate-500 text-xs uppercase">OT Hours</p><p className="text-2xl font-bold text-blue-400 mt-1">{data.totals.totalOvertimeHours.toFixed(1)}</p></CardContent></Card>
            <Card className="bg-orange-500/5 border-orange-500/20"><CardContent className="p-4 text-center"><p className="text-orange-300 text-xs uppercase">Total Wages</p><p className="text-lg font-bold text-orange-400 mt-1">{formatCurrency(data.totals.totalWages)}</p></CardContent></Card>
          </div>

          <Card><CardContent className="p-5">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2"><Users className="w-4 h-4 text-orange-400" />Wage Sheet · {data.period}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-800">
                  <tr className="text-slate-500 text-xs uppercase">
                    <th className="text-left py-2 px-2">Worker</th>
                    <th className="text-center py-2 px-2">Skill</th>
                    <th className="text-right py-2 px-2">Rate</th>
                    <th className="text-center py-2 px-2">Present</th>
                    <th className="text-center py-2 px-2">Half</th>
                    <th className="text-center py-2 px-2">Absent</th>
                    <th className="text-center py-2 px-2">OT (hr)</th>
                    <th className="text-right py-2 px-2">Total Wage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {data.workers.map((w: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-800/30">
                      <td className="py-3 px-2 text-white font-medium">{w.workerName}</td>
                      <td className="py-3 px-2 text-center text-slate-400 text-xs">{w.skillType.replace(/_/g, " ")}</td>
                      <td className="py-3 px-2 text-right text-slate-300">{formatCurrency(w.dailyWage)}</td>
                      <td className="py-3 px-2 text-center text-green-400 font-semibold">{w.present}</td>
                      <td className="py-3 px-2 text-center text-yellow-400">{w.halfDay}</td>
                      <td className="py-3 px-2 text-center text-red-400">{w.absent}</td>
                      <td className="py-3 px-2 text-center text-blue-400">{w.overtimeHours.toFixed(1)}</td>
                      <td className="py-3 px-2 text-right text-orange-400 font-bold">{formatCurrency(w.totalWage)}</td>
                    </tr>
                  ))}
                  <tr className="bg-orange-500/5 font-bold">
                    <td colSpan={7} className="py-3 px-2 text-orange-300 text-right">TOTAL</td>
                    <td className="py-3 px-2 text-right text-orange-400 text-lg">{formatCurrency(data.totals.totalWages)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent></Card>
        </>
       )}
    </div>
  );
}