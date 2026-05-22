"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, BarChart3, TrendingUp, IndianRupee, Target, Award, AlertCircle, Building2, FileText } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from "recharts";

const COLORS = ["#f97316", "#10b981", "#3b82f6", "#a855f7", "#eab308", "#ef4444", "#06b6d4", "#ec4899"];

export default function ReportsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reports/overview").then(r => r.json()).then(d => {
      if (d.success) setData(d.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div>;
  if (!data) return <div className="text-center py-20"><p className="text-slate-400">Failed to load reports</p></div>;

  const sectorData = Object.entries(data.tenders.bySector || {}).map(([name, value]) => ({ name, value }));
  const trackStatusData = Object.entries(data.tracks.byStatus || {}).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-5 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2"><BarChart3 className="w-6 h-6 text-orange-400" />Reports & Analytics</h1>
        <p className="text-slate-400 text-sm mt-1">Real-time insights from your business data</p>
      </div>

      {/* Hero stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
          <CardContent className="p-4">
            <p className="text-orange-300 text-xs uppercase">Contract Value</p>
            <p className="text-xl font-bold text-orange-400 mt-1">{formatCurrency(data.projects.totalContractValue)}</p>
            <p className="text-slate-500 text-xs mt-1">{data.projects.total} project{data.projects.total !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="p-4">
            <p className="text-green-300 text-xs uppercase">Received</p>
            <p className="text-xl font-bold text-green-400 mt-1">{formatCurrency(data.bills.totalReceived)}</p>
            <p className="text-slate-500 text-xs mt-1">{data.bills.paid} paid bill{data.bills.paid !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20">
          <CardContent className="p-4">
            <p className="text-yellow-300 text-xs uppercase">Pending</p>
            <p className="text-xl font-bold text-yellow-400 mt-1">{formatCurrency(data.bills.pending)}</p>
            <p className="text-slate-500 text-xs mt-1">{data.bills.submitted} pending bill{data.bills.submitted !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-4">
            <p className="text-blue-300 text-xs uppercase">Win Rate</p>
            <p className="text-xl font-bold text-blue-400 mt-1">{data.tracks.winRate.toFixed(0)}%</p>
            <p className="text-slate-500 text-xs mt-1">{data.tracks.won}/{data.tracks.submitted} won</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend Chart */}
      <Card>
        <CardContent className="p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-orange-400" />Monthly Billing Trend (Last 6 Months)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data.monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="month" stroke="#64748b" style={{ fontSize: "12px" }} />
              <YAxis stroke="#64748b" style={{ fontSize: "12px" }} tickFormatter={(v) => v >= 100000 ? `${(v / 100000).toFixed(0)}L` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
              <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }} formatter={(v: any) => formatCurrency(Number(v))} />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Line type="monotone" dataKey="billed" stroke="#f97316" strokeWidth={2} name="Billed" dot={{ fill: "#f97316" }} />
              <Line type="monotone" dataKey="received" stroke="#10b981" strokeWidth={2} name="Received" dot={{ fill: "#10b981" }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tender Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Target className="w-4 h-4 text-orange-400" />Tender Pipeline</h3>
            {trackStatusData.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-12">No tenders tracked yet</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={trackStatusData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: "10px" }} />
                    <YAxis stroke="#64748b" style={{ fontSize: "12px" }} />
                    <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }} />
                    <Bar dataKey="value" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-3 gap-2 mt-3 text-center text-xs">
                  <div className="p-2 bg-green-500/10 rounded"><p className="text-green-400 font-bold">{data.tracks.eligible}</p><p className="text-slate-500">Eligible</p></div>
                  <div className="p-2 bg-yellow-500/10 rounded"><p className="text-yellow-400 font-bold">{data.tracks.partial}</p><p className="text-slate-500">Partial</p></div>
                  <div className="p-2 bg-red-500/10 rounded"><p className="text-red-400 font-bold">{data.tracks.notEligible}</p><p className="text-slate-500">Not Eligible</p></div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><FileText className="w-4 h-4 text-orange-400" />Tenders by Sector</h3>
            {sectorData.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-12">No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={sectorData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {sectorData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Departments */}
      <Card>
        <CardContent className="p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Building2 className="w-4 h-4 text-orange-400" />Top Departments by Project Value</h3>
          {data.topDepts.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No project data yet</p>
          ) : (
            <div className="space-y-2">
              {data.topDepts.map((d: any, i: number) => {
                const collectionRate = d.totalValue > 0 ? (d.received / d.totalValue) * 100 : 0;
                return (
                  <div key={i} className="p-3 bg-slate-800/50 rounded-lg border border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-white font-semibold text-sm">{d.department}</p>
                        <p className="text-slate-500 text-xs">{d.projectCount} project{d.projectCount !== 1 ? "s" : ""}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-orange-400 font-bold">{formatCurrency(d.totalValue)}</p>
                        <p className="text-green-400 text-xs">Received: {formatCurrency(d.received)}</p>
                      </div>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5">
                      <div className="bg-gradient-to-r from-orange-500 to-green-500 h-1.5 rounded-full" style={{ width: `${Math.min(collectionRate, 100)}%` }} />
                    </div>
                    <p className="text-slate-500 text-xs mt-1">{collectionRate.toFixed(0)}% collected</p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Financial Breakdown */}
      <Card>
        <CardContent className="p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><IndianRupee className="w-4 h-4 text-orange-400" />Financial Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-slate-800/50 rounded-lg">
              <p className="text-slate-500 text-xs">Gross Billed</p>
              <p className="text-lg font-bold text-white mt-1">{formatCurrency(data.bills.totalGross)}</p>
            </div>
            <div className="p-3 bg-slate-800/50 rounded-lg">
              <p className="text-slate-500 text-xs">Net Billed</p>
              <p className="text-lg font-bold text-orange-400 mt-1">{formatCurrency(data.bills.totalNet)}</p>
            </div>
            <div className="p-3 bg-slate-800/50 rounded-lg">
              <p className="text-slate-500 text-xs">Deductions</p>
              <p className="text-lg font-bold text-red-400 mt-1">{formatCurrency(data.bills.totalDeductions)}</p>
            </div>
            <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
              <p className="text-green-300 text-xs">Total Received</p>
              <p className="text-lg font-bold text-green-400 mt-1">{formatCurrency(data.bills.totalReceived)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Stats */}
      <Card>
        <CardContent className="p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Award className="w-4 h-4 text-orange-400" />Company Readiness</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-slate-800/50 rounded-lg">
              <p className="text-2xl font-bold text-purple-400">{data.company.docs}</p>
              <p className="text-slate-500 text-xs">Documents</p>
            </div>
            <div className="p-3 bg-slate-800/50 rounded-lg">
              <p className="text-2xl font-bold text-cyan-400">{data.company.staff}</p>
              <p className="text-slate-500 text-xs">Staff Members</p>
            </div>
            <div className="p-3 bg-slate-800/50 rounded-lg">
              <p className="text-2xl font-bold text-orange-400">{data.company.machinery}</p>
              <p className="text-slate-500 text-xs">Machinery</p>
            </div>
            <div className="p-3 bg-slate-800/50 rounded-lg">
              <p className="text-2xl font-bold text-green-400">{data.company.pastWorks}</p>
              <p className="text-slate-500 text-xs">Past Works</p>
            </div>
          </div>
          {(data.company.docs < 5 || data.company.staff < 1 || data.company.pastWorks < 2) && (
            <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-yellow-300 text-sm font-medium">Complete your profile</p>
                <p className="text-slate-400 text-xs mt-1">Upload documents, add staff, machinery, and past works for accurate tender eligibility checks and auto-document generation.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}