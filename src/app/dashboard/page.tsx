import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { Search, FileText, Building2, Shield, ArrowRight, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

async function getData(uid: string) {
  try {
    const user = await prisma.user.findUnique({ where: { supabaseId: uid }, include: { company: true } });
    if (!user) return null;
    const cid = user.company.id;
    const [tenders, projects, docs] = await Promise.all([
      prisma.tender.count({ where: { uploadedById: cid } }),
      prisma.project.count({ where: { companyId: cid, status: "ACTIVE" } }),
      prisma.companyDocument.count({ where: { companyId: cid, isLatest: true } }),
    ]);
    return { company: user.company, stats: { tenders, projects, docs } };
  } catch { return null; }
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const data = await getData(user.id);
  if (!data) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-slate-400">Loading your dashboard...</p>
    </div>
  );

  const stats = [
    { label: "Tenders Uploaded", value: data.stats.tenders, icon: Search, color: "text-blue-400", bg: "bg-blue-500/10", href: "/dashboard/tenders" },
    { label: "Active Projects", value: data.stats.projects, icon: Building2, color: "text-green-400", bg: "bg-green-500/10", href: "/dashboard/projects" },
    { label: "Documents", value: data.stats.docs, icon: FileText, color: "text-purple-400", bg: "bg-purple-500/10", href: "/dashboard/documents" },
    { label: "Compliance", value: "OK", icon: Shield, color: "text-yellow-400", bg: "bg-yellow-500/10", href: "/dashboard/compliance" },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-white">নমস্কার, {data.company.name} 👋</h1>
        <p className="text-slate-400 mt-1 text-sm">
          {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="hover:border-slate-700 transition-all cursor-pointer">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">{s.label}</p>
                    <p className={`text-3xl font-bold mt-1.5 ${s.color}`}>{s.value}</p>
                  </div>
                  <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center`}>
                    <s.icon className={`w-5 h-5 ${s.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div>
        <h2 className="text-white font-semibold mb-3 text-sm uppercase tracking-wide text-slate-400">Quick Start</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { label: "Upload Tender PDF", desc: "AI analyzes eligibility, BOQ, risks", href: "/dashboard/tenders", icon: Search },
            { label: "Add Company Documents", desc: "PAN, GST, Registration, CA cert", href: "/dashboard/documents", icon: FileText },
            { label: "Complete Your Profile", desc: "Staff, machinery, past works", href: "/dashboard/settings", icon: Building2 },
          ].map((a) => (
            <Link key={a.href} href={a.href}>
              <Card className="cursor-pointer hover:border-orange-500/30 hover:bg-orange-500/5 transition-all">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center flex-shrink-0">
                    <a.icon className="w-5 h-5 text-orange-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm">{a.label}</p>
                    <p className="text-slate-500 text-xs mt-0.5">{a.desc}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-600 flex-shrink-0" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <Card className="bg-orange-500/5 border-orange-500/20">
        <CardContent className="p-5 flex items-start gap-4">
          <div className="w-10 h-10 bg-orange-500/20 border border-orange-500/30 rounded-xl flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold mb-1">CEOS AI is ready</h3>
            <p className="text-slate-400 text-sm">
              Click the orange chat button (bottom right) to ask anything in Bengali, Hindi, or English. 
              Try: <span className="text-orange-300 italic">"RA Bill এ কী কী deduction হয়?"</span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}