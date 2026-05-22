import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, FileText, Building2, Receipt, ArrowRight, Sparkles, Clock, TrendingUp, AlertTriangle, CheckCircle2, IndianRupee } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

async function getDashData(uid: string) {
  try {
    const user = await prisma.user.findUnique({ where: { supabaseId: uid }, include: { company: true } });
    if (!user) return null;

    const cid = user.company.id;
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 86400000);

    const [
      tenderCount, activeProjects, totalDocs,
      recentTenders, urgentTenders, pendingBills, recentBills,
      totalBilled, totalReceived
    ] = await Promise.all([
      prisma.tender.count({ where: { uploadedById: cid, isActive: true } }),
      prisma.project.count({ where: { companyId: cid, status: "ACTIVE" } }),
      prisma.companyDocument.count({ where: { companyId: cid, isLatest: true } }),
      prisma.tender.findMany({
        where: { uploadedById: cid, isActive: true, processingStatus: "COMPLETED" },
        orderBy: { createdAt: "desc" }, take: 5,
        include: { tracks: { where: { companyId: cid }, take: 1 } }
      }),
      prisma.tender.findMany({
        where: {
          uploadedById: cid, isActive: true,
          lastSubmissionDate: { gte: now, lte: in7Days },
          tracks: { some: { companyId: cid, status: { in: ["DISCOVERED", "SHORTLISTED", "PREPARING"] } } }
        },
        orderBy: { lastSubmissionDate: "asc" }, take: 3,
      }),
      prisma.rABill.findMany({
        where: { project: { companyId: cid }, status: { in: ["SUBMITTED", "UNDER_CHECK", "PASSED"] } },
        orderBy: { submittedDate: "desc" }, take: 3,
        include: { project: { select: { name: true } } }
      }),
      prisma.rABill.findMany({
        where: { project: { companyId: cid } },
        orderBy: { createdAt: "desc" }, take: 5,
        include: { project: { select: { name: true } } }
      }),
      prisma.rABill.aggregate({ where: { project: { companyId: cid } }, _sum: { netPayable: true } }),
      prisma.rABill.aggregate({ where: { project: { companyId: cid }, status: "PAID" }, _sum: { paymentAmount: true } }),
    ]);

    return {
      company: user.company,
      stats: { tenderCount, activeProjects, totalDocs },
      recentTenders, urgentTenders, pendingBills, recentBills,
      totalBilled: Number(totalBilled._sum.netPayable || 0),
      totalReceived: Number(totalReceived._sum.paymentAmount || 0),
    };
  } catch (err) {
    console.error("Dash err:", err);
    return null;
  }
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const data = await getDashData(user.id);
  if (!data) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-slate-400">Loading dashboard...</p>
    </div>
  );

  const pendingAmount = data.totalBilled - data.totalReceived;

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-white">নমস্কার, {data.company.name}</h1>
        <p className="text-slate-400 mt-1 text-sm">
          {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/dashboard/tenders">
          <Card className="cursor-pointer hover:border-blue-500/30 hover:bg-blue-500/5 transition-all">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">Tenders</p>
                  <p className="text-3xl font-bold text-blue-400 mt-1.5">{data.stats.tenderCount}</p>
                  <p className="text-slate-500 text-xs mt-1">Total uploaded</p>
                </div>
                <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center"><Search className="w-5 h-5 text-blue-400" /></div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/projects">
          <Card className="cursor-pointer hover:border-green-500/30 hover:bg-green-500/5 transition-all">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">Projects</p>
                  <p className="text-3xl font-bold text-green-400 mt-1.5">{data.stats.activeProjects}</p>
                  <p className="text-slate-500 text-xs mt-1">Active now</p>
                </div>
                <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center"><Building2 className="w-5 h-5 text-green-400" /></div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/documents">
          <Card className="cursor-pointer hover:border-purple-500/30 hover:bg-purple-500/5 transition-all">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">Documents</p>
                  <p className="text-3xl font-bold text-purple-400 mt-1.5">{data.stats.totalDocs}</p>
                  <p className="text-slate-500 text-xs mt-1">In vault</p>
                </div>
                <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center"><FileText className="w-5 h-5 text-purple-400" /></div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/billing">
          <Card className="cursor-pointer hover:border-yellow-500/30 hover:bg-yellow-500/5 transition-all">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">Pending</p>
                  <p className="text-xl font-bold text-yellow-400 mt-1.5">{formatCurrency(pendingAmount)}</p>
                  <p className="text-slate-500 text-xs mt-1">From bills</p>
                </div>
                <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center"><IndianRupee className="w-5 h-5 text-yellow-400" /></div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Urgent tenders */}
      {data.urgentTenders.length > 0 && (
        <Card className="bg-red-500/5 border-red-500/20">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <h3 className="text-red-300 font-semibold">Urgent: Closing in 7 Days</h3>
            </div>
            <div className="space-y-2">
              {data.urgentTenders.map((t: any) => {
                const days = Math.ceil((new Date(t.lastSubmissionDate).getTime() - Date.now()) / 86400000);
                return (
                  <Link key={t.id} href={`/dashboard/tenders/${t.id}`}>
                    <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-800 hover:border-red-500/30 cursor-pointer">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium text-sm line-clamp-1">{t.workName}</p>
                          <p className="text-slate-500 text-xs mt-0.5">{t.department}</p>
                        </div>
                        <Badge className={`${days <= 1 ? "bg-red-500" : "bg-orange-500"} text-white`}><Clock className="w-3 h-3 mr-1" />{days}d</Badge>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent tenders */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold flex items-center gap-2"><Search className="w-4 h-4 text-blue-400" />Recent Tenders</h3>
              <Link href="/dashboard/tenders" className="text-orange-400 text-xs hover:text-orange-300">View all →</Link>
            </div>
            {data.recentTenders.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No tenders yet</p>
                <Link href="/dashboard/tenders"><Badge className="mt-3 bg-orange-500 cursor-pointer">Upload First</Badge></Link>
              </div>
            ) : (
              <div className="space-y-2">
                {data.recentTenders.map((t: any) => {
                  const track = t.tracks?.[0];
                  return (
                    <Link key={t.id} href={`/dashboard/tenders/${t.id}`}>
                      <div className="p-3 bg-slate-800/30 rounded-lg hover:bg-slate-800/60 cursor-pointer border border-slate-800">
                        <p className="text-white text-sm font-medium line-clamp-1">{t.workName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-slate-500 text-xs truncate">{t.department}</p>
                          {track?.eligibilityStatus === "ELIGIBLE" && <Badge className="bg-green-500/20 text-green-400 text-xs"><CheckCircle2 className="w-3 h-3 mr-1" />Eligible</Badge>}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent bills */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold flex items-center gap-2"><Receipt className="w-4 h-4 text-orange-400" />Recent Bills</h3>
              <Link href="/dashboard/billing" className="text-orange-400 text-xs hover:text-orange-300">View all →</Link>
            </div>
            {data.recentBills.length === 0 ? (
              <div className="text-center py-8">
                <Receipt className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No bills yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {data.recentBills.map((b: any) => (
                  <Link key={b.id} href={`/dashboard/billing/${b.id}`}>
                    <div className="p-3 bg-slate-800/30 rounded-lg hover:bg-slate-800/60 cursor-pointer border border-slate-800">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium">{b.billNumber}</p>
                          <p className="text-slate-500 text-xs truncate">{b.project?.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-green-400 text-sm font-semibold">{formatCurrency(Number(b.netPayable))}</p>
                          <Badge variant="outline" className="text-xs mt-0.5">{b.status}</Badge>
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

      {/* CTA */}
      <Card className="bg-gradient-to-r from-orange-500/10 to-amber-500/5 border-orange-500/20">
        <CardContent className="p-5 flex items-start gap-4">
          <div className="w-10 h-10 bg-orange-500/20 border border-orange-500/30 rounded-xl flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-orange-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-white font-semibold mb-1">CEOS AI Ready to Help</h3>
            <p className="text-slate-400 text-sm">
              Click the orange chat button (bottom right) to ask anything in Bengali, Hindi, or English. 
              Try: <span className="text-orange-300 italic">"আমার pending bills কত?"</span> or <span className="text-orange-300 italic">"Show eligible tenders"</span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}