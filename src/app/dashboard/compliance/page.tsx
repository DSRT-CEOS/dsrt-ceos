"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Loader2, Calendar, IndianRupee, AlertCircle, Users, Receipt, Building2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function CompliancePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/compliance").then(r => r.json()).then(d => {
      if (d.success) setData(d.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div>;
  if (!data) return <div className="text-center py-20"><p className="text-slate-400">Failed to load compliance data</p></div>;

  return (
    <div className="space-y-5 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Shield className="w-6 h-6 text-orange-400" />Compliance Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Period: {data.period}</p>
      </div>

      {/* Upcoming Filings */}
      <Card className="bg-yellow-500/5 border-yellow-500/20"><CardContent className="p-5">
        <h3 className="text-white font-semibold mb-3 flex items-center gap-2"><Calendar className="w-4 h-4 text-yellow-400" />Upcoming Filings</h3>
        <div className="space-y-2">
          {data.upcoming.map((u: any, i: number) => (
            <div key={i} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-800">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-yellow-400 border-yellow-500/30 bg-yellow-500/10">{u.type}</Badge>
                <div>
                  <p className="text-white font-medium text-sm">{u.form}</p>
                  <p className="text-slate-500 text-xs">Due: {u.dueDate}</p>
                </div>
              </div>
              <p className="text-orange-400 font-semibold">{formatCurrency(u.amount)}</p>
            </div>
          ))}
        </div>
      </CardContent></Card>

      {/* GST */}
      <Card><CardContent className="p-5">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Receipt className="w-4 h-4 text-orange-400" />GST Compliance</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="p-4 bg-slate-800/50 rounded-lg">
            <p className="text-slate-500 text-xs">GST Collected</p>
            <p className="text-xl font-bold text-blue-400 mt-1">{formatCurrency(data.gst.collected)}</p>
          </div>
          <div className="p-4 bg-slate-800/50 rounded-lg">
            <p className="text-slate-500 text-xs">GST TDS Received</p>
            <p className="text-xl font-bold text-green-400 mt-1">{formatCurrency(data.gst.tdsReceived)}</p>
          </div>
          <div className="p-4 bg-orange-500/10 rounded-lg border border-orange-500/20">
            <p className="text-orange-300 text-xs">Net GST Payable</p>
            <p className="text-xl font-bold text-orange-400 mt-1">{formatCurrency(data.gst.netPayable)}</p>
          </div>
        </div>
        <div className="mt-3 p-3 bg-blue-500/5 rounded-lg border border-blue-500/20">
          <p className="text-blue-300 text-xs">Filing Instructions</p>
          <p className="text-slate-400 text-xs mt-1">File GSTR-1 by 11th and GSTR-3B by 20th of next month on gst.gov.in</p>
        </div>
      </CardContent></Card>

      {/* TDS */}
      <Card><CardContent className="p-5">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><IndianRupee className="w-4 h-4 text-orange-400" />Income Tax TDS</h3>
        <div className="p-4 bg-slate-800/50 rounded-lg">
          <p className="text-slate-500 text-xs">TDS Deducted by Department</p>
          <p className="text-2xl font-bold text-green-400 mt-1">{formatCurrency(data.incomeTax.tdsPaid)}</p>
          <p className="text-slate-500 text-xs mt-2">Department deposits TDS - Verify via Form 26AS on incometax.gov.in</p>
        </div>
      </CardContent></Card>

      {/* Labour Cess */}
      <Card><CardContent className="p-5">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Building2 className="w-4 h-4 text-orange-400" />Labour Cess (BOCW)</h3>
        <div className="p-4 bg-slate-800/50 rounded-lg">
          <p className="text-slate-500 text-xs">Cess Deducted (1% on construction)</p>
          <p className="text-2xl font-bold text-yellow-400 mt-1">{formatCurrency(data.labourCess.collected)}</p>
        </div>
      </CardContent></Card>

      {/* ESI */}
      <Card><CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold flex items-center gap-2"><Users className="w-4 h-4 text-orange-400" />ESI (Employee State Insurance)</h3>
          <p className="text-orange-400 font-bold">Total: {formatCurrency(data.esi.totalMonthly)}/month</p>
        </div>
        {data.esi.staffBreakdown.length === 0 ? (
          <div className="p-4 bg-slate-800/50 rounded-lg text-center">
            <AlertCircle className="w-6 h-6 text-slate-500 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">Add staff with salary in Settings to see ESI calculations</p>
          </div>
        ) : (
          <div className="space-y-1">
            {data.esi.staffBreakdown.filter((s: any) => s.total > 0).map((s: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-2.5 bg-slate-800/50 rounded text-sm">
                <div>
                  <p className="text-white">{s.staff}</p>
                  <p className="text-slate-500 text-xs">{s.designation} - Wage: {formatCurrency(s.wage)}</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-400 text-xs">Employee 0.75%: {formatCurrency(s.employee)}</p>
                  <p className="text-slate-400 text-xs">Employer 3.25%: {formatCurrency(s.employer)}</p>
                  <p className="text-orange-400 font-semibold text-xs">Total: {formatCurrency(s.total)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent></Card>

      {/* EPF */}
      <Card><CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold flex items-center gap-2"><Users className="w-4 h-4 text-orange-400" />EPF (Provident Fund)</h3>
          <p className="text-orange-400 font-bold">Total: {formatCurrency(data.epf.totalMonthly)}/month</p>
        </div>
        {data.epf.staffBreakdown.length === 0 ? (
          <div className="p-4 bg-slate-800/50 rounded-lg text-center">
            <p className="text-slate-400 text-sm">Add staff with salary to see EPF calculations</p>
          </div>
        ) : (
          <div className="space-y-1">
            {data.epf.staffBreakdown.map((s: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-2.5 bg-slate-800/50 rounded text-sm">
                <div>
                  <p className="text-white">{s.staff}</p>
                  <p className="text-slate-500 text-xs">Basic: {formatCurrency(s.basic)}</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-400 text-xs">Employee 12%: {formatCurrency(s.employee)}</p>
                  <p className="text-slate-400 text-xs">Employer EPF+EPS: {formatCurrency(s.employerEpf + s.employerEps)}</p>
                  <p className="text-orange-400 font-semibold text-xs">Total: {formatCurrency(s.total)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent></Card>
    </div>
  );
}