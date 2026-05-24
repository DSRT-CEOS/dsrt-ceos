"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Building2, IndianRupee, FileText, Loader2, Plus, Trash2,
  Receipt, Users, Package, ClipboardCheck, Wallet, ListChecks, Camera, BookOpen, BarChart3
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import toast from "react-hot-toast";

export default function ProjectDetail() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    try {
      const r = await fetch(`/api/projects/${id}`);
      const d = await r.json();
      if (d.success) setProject(d.project);
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const del = async () => {
    if (!confirm("Delete this project and all its bills?")) return;
    const r = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if ((await r.json()).success) { toast.success("Deleted"); router.push("/dashboard/projects"); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div>;
  if (!project) return <div className="text-center py-20"><p className="text-slate-400">Project not found</p></div>;

  const billedPct = project.contractValue ? (project.totalBilled / project.contractValue) * 100 : 0;
  const profit = project.totalReceived - Number(project.totalExpenses || 0);

  return (
    <div className="space-y-5 max-w-7xl">
      <Link href="/dashboard/projects"><Button variant="ghost" size="sm" className="-ml-2"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button></Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">{project.name}</h1>
          <div className="flex items-center gap-3 mt-2 flex-wrap text-sm">
            <span className="text-slate-400 flex items-center gap-1"><Building2 className="w-4 h-4" />{project.department}</span>
            {project.workOrderNumber && <Badge variant="outline">WO: {project.workOrderNumber}</Badge>}
            <Badge variant="outline" className={cn(
              project.status === "ACTIVE" ? "text-green-400 border-green-500/30 bg-green-500/10" :
              project.status === "COMPLETED" ? "text-blue-400 border-blue-500/30 bg-blue-500/10" :
              "text-slate-400"
            )}>{project.status}</Badge>
            {project.progressPercent && <Badge className="bg-orange-500/20 text-orange-300 border border-orange-500/30">{Number(project.progressPercent).toFixed(0)}% Complete</Badge>}
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/billing/new?projectId=${id}`}>
            <Button className="bg-orange-500 hover:bg-orange-600"><Plus className="w-4 h-4 mr-2" />Create Bill</Button>
          </Link>
          <Button variant="outline" onClick={del} className="text-red-400 hover:bg-red-500/10"><Trash2 className="w-4 h-4" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-4">
          <p className="text-slate-500 text-xs uppercase">Contract</p>
          <p className="text-lg font-bold text-white mt-1">{formatCurrency(project.contractValue)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-slate-500 text-xs uppercase">Billed</p>
          <p className="text-lg font-bold text-orange-400 mt-1">{formatCurrency(project.totalBilled)}</p>
          <p className="text-slate-600 text-xs mt-1">{billedPct.toFixed(0)}%</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-slate-500 text-xs uppercase">Received</p>
          <p className="text-lg font-bold text-green-400 mt-1">{formatCurrency(project.totalReceived)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-slate-500 text-xs uppercase">Expenses</p>
          <p className="text-lg font-bold text-red-400 mt-1">{formatCurrency(project.totalExpenses)}</p>
        </CardContent></Card>
        <Card className={cn(profit > 0 ? "bg-green-500/5 border-green-500/20" : "bg-red-500/5 border-red-500/20")}>
          <CardContent className="p-4">
            <p className="text-slate-500 text-xs uppercase">Profit/Loss</p>
            <p className={cn("text-lg font-bold mt-1", profit > 0 ? "text-green-400" : "text-red-400")}>{formatCurrency(profit)}</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="text-slate-400 text-xs uppercase tracking-wide mb-2">Project Management</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Link href={`/dashboard/projects/${id}/boq`}>
            <Card className="hover:border-purple-500/30 hover:bg-purple-500/5 cursor-pointer transition-all"><CardContent className="p-4 text-center">
              <ListChecks className="w-6 h-6 text-purple-400 mx-auto mb-2" />
              <p className="text-white font-medium text-sm">BOQ</p>
              <p className="text-slate-500 text-xs">Quantities</p>
            </CardContent></Card>
          </Link>
          <Link href={`/dashboard/projects/${id}/gantt`}>
            <Card className="hover:border-indigo-500/30 hover:bg-indigo-500/5 cursor-pointer transition-all"><CardContent className="p-4 text-center">
              <BarChart3 className="w-6 h-6 text-indigo-400 mx-auto mb-2" />
              <p className="text-white font-medium text-sm">Gantt</p>
              <p className="text-slate-500 text-xs">Timeline</p>
            </CardContent></Card>
          </Link>
          <Link href={`/dashboard/projects/${id}/diary`}>
            <Card className="hover:border-blue-500/30 hover:bg-blue-500/5 cursor-pointer transition-all"><CardContent className="p-4 text-center">
              <BookOpen className="w-6 h-6 text-blue-400 mx-auto mb-2" />
              <p className="text-white font-medium text-sm">Diary</p>
              <p className="text-slate-500 text-xs">Daily logs</p>
            </CardContent></Card>
          </Link>
          <Link href={`/dashboard/projects/${id}/photos`}>
            <Card className="hover:border-pink-500/30 hover:bg-pink-500/5 cursor-pointer transition-all"><CardContent className="p-4 text-center">
              <Camera className="w-6 h-6 text-pink-400 mx-auto mb-2" />
              <p className="text-white font-medium text-sm">Photos</p>
              <p className="text-slate-500 text-xs">Evidence</p>
            </CardContent></Card>
          </Link>
          <Link href={`/dashboard/billing?projectId=${id}`}>
            <Card className="hover:border-orange-500/30 hover:bg-orange-500/5 cursor-pointer transition-all"><CardContent className="p-4 text-center">
              <Receipt className="w-6 h-6 text-orange-400 mx-auto mb-2" />
              <p className="text-white font-medium text-sm">Bills ({project.bills?.length || 0})</p>
              <p className="text-slate-500 text-xs">RA bills</p>
            </CardContent></Card>
          </Link>
        </div>
      </div>

      <div>
        <h3 className="text-slate-400 text-xs uppercase tracking-wide mb-2">Workforce & Resources</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Link href={`/dashboard/projects/${id}/workers`}>
            <Card className="hover:border-orange-500/30 hover:bg-orange-500/5 cursor-pointer transition-all"><CardContent className="p-4 text-center">
              <Users className="w-6 h-6 text-orange-400 mx-auto mb-2" />
              <p className="text-white font-medium text-sm">Workers</p>
            </CardContent></Card>
          </Link>
          <Link href={`/dashboard/projects/${id}/attendance`}>
            <Card className="hover:border-green-500/30 hover:bg-green-500/5 cursor-pointer transition-all"><CardContent className="p-4 text-center">
              <ClipboardCheck className="w-6 h-6 text-green-400 mx-auto mb-2" />
              <p className="text-white font-medium text-sm">Attendance</p>
            </CardContent></Card>
          </Link>
          <Link href={`/dashboard/projects/${id}/wages`}>
            <Card className="hover:border-yellow-500/30 hover:bg-yellow-500/5 cursor-pointer transition-all"><CardContent className="p-4 text-center">
              <Wallet className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
              <p className="text-white font-medium text-sm">Wages</p>
            </CardContent></Card>
          </Link>
          <Link href={`/dashboard/projects/${id}/materials`}>
            <Card className="hover:border-cyan-500/30 hover:bg-cyan-500/5 cursor-pointer transition-all"><CardContent className="p-4 text-center">
              <Package className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
              <p className="text-white font-medium text-sm">Materials</p>
            </CardContent></Card>
          </Link>
          <Link href={`/dashboard/projects/${id}/expenses`}>
            <Card className="hover:border-red-500/30 hover:bg-red-500/5 cursor-pointer transition-all"><CardContent className="p-4 text-center">
              <IndianRupee className="w-6 h-6 text-red-400 mx-auto mb-2" />
              <p className="text-white font-medium text-sm">Expenses</p>
            </CardContent></Card>
          </Link>
        </div>
      </div>

      <Card>
        <CardContent className="p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Receipt className="w-4 h-4 text-orange-400" />Recent Bills ({project.bills?.length || 0})</h3>
          {!project.bills || project.bills.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400 text-sm mb-4">No bills yet</p>
              <Link href={`/dashboard/billing/new?projectId=${id}`}>
                <Button className="bg-orange-500 hover:bg-orange-600" size="sm"><Plus className="w-4 h-4 mr-2" />Create First Bill</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {project.bills.slice(0, 5).map((b: any) => (
                <Link key={b.id} href={`/dashboard/billing/${b.id}`}>
                  <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-800 hover:border-slate-700 cursor-pointer transition-all">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-white font-semibold text-sm">{b.billNumber}</p>
                          <Badge variant="outline" className={cn("text-xs",
                            b.status === "DRAFT" ? "text-slate-400" :
                            b.status === "PAID" ? "text-green-400 border-green-500/30 bg-green-500/10" :
                            "text-orange-400 border-orange-500/30 bg-orange-500/10"
                          )}>{b.status}</Badge>
                        </div>
                        <p className="text-slate-500 text-xs mt-1">{new Date(b.billDate).toLocaleDateString("en-IN")}</p>
                      </div>
                      <p className="text-green-400 font-semibold">{formatCurrency(b.netPayable)}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}