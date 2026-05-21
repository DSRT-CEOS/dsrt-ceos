"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Loader2, IndianRupee, TrendingUp, FileText, ArrowRight } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/projects").then(r => r.json()).then(d => {
      if (d.success) { setProjects(d.projects); setStats(d.stats); }
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-orange-400" />Projects
          </h1>
          <p className="text-slate-400 text-sm mt-1">Active and completed construction projects</p>
        </div>
        <Link href="/dashboard/projects/new">
          <Button className="bg-orange-500 hover:bg-orange-600"><Plus className="w-4 h-4 mr-2" />New Project</Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <p className="text-slate-500 text-xs uppercase">Active</p>
          <p className="text-3xl font-bold text-green-400 mt-1">{stats.active || 0}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-slate-500 text-xs uppercase">Contract Value</p>
          <p className="text-xl font-bold text-white mt-1">{formatCurrency(stats.totalValue || 0)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-slate-500 text-xs uppercase">Total Billed</p>
          <p className="text-xl font-bold text-orange-400 mt-1">{formatCurrency(stats.totalBilled || 0)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-slate-500 text-xs uppercase">Received</p>
          <p className="text-xl font-bold text-green-400 mt-1">{formatCurrency(stats.totalReceived || 0)}</p>
        </CardContent></Card>
      </div>

      {loading ? <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div> :
       projects.length === 0 ? (
        <Card className="border-dashed"><CardContent className="p-16 text-center">
          <Building2 className="w-16 h-16 text-slate-700 mx-auto mb-4" />
          <h3 className="text-white font-semibold text-lg mb-2">No projects yet</h3>
          <p className="text-slate-500 text-sm mb-6">Create a project to start tracking work, expenses, and bills.</p>
          <Link href="/dashboard/projects/new">
            <Button className="bg-orange-500 hover:bg-orange-600"><Plus className="w-4 h-4 mr-2" />Create First Project</Button>
          </Link>
        </CardContent></Card>
       ) : (
        <div className="space-y-3">
          {projects.map(p => {
            const billedPct = p.contractValue ? (p.totalBilled / p.contractValue) * 100 : 0;
            const receivedPct = p.totalBilled ? (p.totalReceived / p.totalBilled) * 100 : 0;
            return (
              <Link key={p.id} href={`/dashboard/projects/${p.id}`}>
                <Card className="hover:border-slate-700 transition-all cursor-pointer group">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold">{p.name}</p>
                        <p className="text-slate-500 text-xs mt-0.5">{p.department}</p>
                      </div>
                      <Badge variant="outline" className={cn(
                        p.status === "ACTIVE" ? "text-green-400 border-green-500/30 bg-green-500/10" :
                        p.status === "COMPLETED" ? "text-blue-400 border-blue-500/30 bg-blue-500/10" :
                        "text-slate-400"
                      )}>{p.status}</Badge>
                    </div>

                    <div className="grid grid-cols-4 gap-3 mb-3">
                      <div>
                        <p className="text-slate-500 text-xs">Contract</p>
                        <p className="text-white font-semibold text-sm flex items-center gap-1"><IndianRupee className="w-3 h-3" />{formatCurrency(p.contractValue).replace("Rs ", "")}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs">Billed</p>
                        <p className="text-orange-400 font-semibold text-sm">{formatCurrency(p.totalBilled).replace("Rs ", "")}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs">Received</p>
                        <p className="text-green-400 font-semibold text-sm">{formatCurrency(p.totalReceived).replace("Rs ", "")}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs">Bills</p>
                        <p className="text-white font-semibold text-sm flex items-center gap-1"><FileText className="w-3 h-3" />{p._count?.bills || 0}</p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Billing Progress</span>
                        <span className="text-orange-400">{billedPct.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5">
                        <div className="bg-orange-500 h-1.5 rounded-full transition-all" style={{ width: `${Math.min(billedPct, 100)}%` }} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-800">
                      <p className="text-slate-600 text-xs">WO: {p.workOrderNumber || "N/A"}</p>
                      <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-orange-400" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
       )}
    </div>
  );
}