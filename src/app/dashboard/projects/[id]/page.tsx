"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Building2, IndianRupee, FileText, Loader2, Plus, Trash2, Download, Eye, Receipt, TrendingUp } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import toast from "react-hot-toast";

export default function ProjectDetail() {
  const { id } = useParams();
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
  const balance = project.totalBilled - project.totalReceived;

  return (
    <div className="space-y-5 max-w-6xl">
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
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/billing/new?projectId=${id}`}>
            <Button className="bg-orange-500 hover:bg-orange-600"><Plus className="w-4 h-4 mr-2" />Create Bill</Button>
          </Link>
          <Button variant="outline" onClick={del} className="text-red-400 hover:bg-red-500/10"><Trash2 className="w-4 h-4" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <p className="text-slate-500 text-xs uppercase">Contract Value</p>
          <p className="text-xl font-bold text-white mt-1">{formatCurrency(project.contractValue)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-slate-500 text-xs uppercase">Total Billed</p>
          <p className="text-xl font-bold text-orange-400 mt-1">{formatCurrency(project.totalBilled)}</p>
          <p className="text-slate-600 text-xs mt-1">{billedPct.toFixed(1)}% complete</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-slate-500 text-xs uppercase">Received</p>
          <p className="text-xl font-bold text-green-400 mt-1">{formatCurrency(project.totalReceived)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-slate-500 text-xs uppercase">Pending</p>
          <p className="text-xl font-bold text-yellow-400 mt-1">{formatCurrency(balance)}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Receipt className="w-4 h-4 text-orange-400" />Bills ({project.bills?.length || 0})</h3>
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
              {project.bills.map((b: any) => (
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
                      <div className="text-right">
                        <p className="text-green-400 font-semibold">{formatCurrency(b.netPayable)}</p>
                        <p className="text-slate-500 text-xs">Gross: {formatCurrency(b.grossAmount)}</p>
                      </div>
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