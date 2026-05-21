"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Receipt, Plus, Loader2, IndianRupee, Clock, CheckCircle2 } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";

export default function BillingPage() {
  const [bills, setBills] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/bills").then(r => r.json()).then(d => {
      if (d.success) { setBills(d.bills); setStats(d.stats); }
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Receipt className="w-6 h-6 text-orange-400" />RA Bills</h1>
          <p className="text-slate-400 text-sm mt-1">Running Account bills with auto-calculated deductions</p>
        </div>
        <Link href="/dashboard/billing/new"><Button className="bg-orange-500 hover:bg-orange-600"><Plus className="w-4 h-4 mr-2" />New Bill</Button></Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <p className="text-slate-500 text-xs uppercase">Total Bills</p>
          <p className="text-2xl font-bold text-white mt-1">{stats.total || 0}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-slate-500 text-xs uppercase">Total Billed</p>
          <p className="text-lg font-bold text-orange-400 mt-1">{formatCurrency(stats.totalBilled || 0)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-slate-500 text-xs uppercase">Received</p>
          <p className="text-lg font-bold text-green-400 mt-1">{formatCurrency(stats.totalReceived || 0)}</p>
        </CardContent></Card>
        <Card className="bg-yellow-500/5 border-yellow-500/20"><CardContent className="p-4">
          <p className="text-slate-500 text-xs uppercase">Pending</p>
          <p className="text-lg font-bold text-yellow-400 mt-1">{formatCurrency(stats.pending || 0)}</p>
        </CardContent></Card>
      </div>

      {loading ? <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div> :
       bills.length === 0 ? (
        <Card className="border-dashed"><CardContent className="p-16 text-center">
          <Receipt className="w-16 h-16 text-slate-700 mx-auto mb-4" />
          <h3 className="text-white font-semibold text-lg mb-2">No bills yet</h3>
          <p className="text-slate-500 text-sm mb-6">Create your first RA Bill with auto-calculated SD, TDS, GST, Labour Cess.</p>
          <Link href="/dashboard/billing/new">
            <Button className="bg-orange-500 hover:bg-orange-600"><Plus className="w-4 h-4 mr-2" />Create Bill</Button>
          </Link>
        </CardContent></Card>
       ) : (
        <div className="space-y-2">
          {bills.map(b => (
            <Link key={b.id} href={`/dashboard/billing/${b.id}`}>
              <Card className="hover:border-slate-700 transition-all cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-white font-semibold text-sm">{b.billNumber}</p>
                        <Badge variant="outline" className={cn("text-xs",
                          b.status === "DRAFT" ? "text-slate-400" :
                          b.status === "PAID" ? "text-green-400 border-green-500/30 bg-green-500/10" :
                          "text-orange-400 border-orange-500/30 bg-orange-500/10"
                        )}>{b.status}</Badge>
                      </div>
                      <p className="text-slate-400 text-xs">{b.project?.name}</p>
                      <p className="text-slate-500 text-xs mt-0.5">{new Date(b.billDate).toLocaleDateString("en-IN")}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-500 text-xs">Gross: {formatCurrency(b.grossAmount)}</p>
                      <p className="text-green-400 font-bold">{formatCurrency(b.netPayable)}</p>
                      {b.status === "PAID" && b.paymentAmount && (
                        <p className="text-slate-500 text-xs mt-1 flex items-center gap-1 justify-end"><CheckCircle2 className="w-3 h-3 text-green-400" />Paid: {formatCurrency(b.paymentAmount)}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
       )}
    </div>
  );
}