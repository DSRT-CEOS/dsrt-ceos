import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { Search, FileText, Building2, Shield, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getData(supabaseId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { supabaseId },
      include: { company: true },
    });
    if (!user) return null;

    const companyId = user.company.id;
    const [tenders, projects, docs] = await Promise.all([
      prisma.tender.count({ where: { uploadedById: companyId } }),
      prisma.project.count({ where: { companyId, status: "ACTIVE" } }),
      prisma.companyDocument.count({ where: { companyId, isLatest: true } }),
    ]);

    return { company: user.company, stats: { tenders, projects, docs } };
  } catch (err) {
    console.error("Dashboard data error:", err);
    return null;
  }
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const data = await getData(user.id);

  if (!data) {
    return (
      <div className="max-w-2xl">
        <Card>
          <CardContent className="p-8 text-center">
            <Building2 className="w-12 h-12 text-orange-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Welcome to DSRT CEOS</h2>
            <p className="text-slate-400 mb-4">Setting up your company profile...</p>
            <p className="text-slate-500 text-sm">If this persists, please contact support.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = [
    { label: "Tenders Uploaded", value: data.stats.tenders, icon: Search, color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Active Projects", value: data.stats.projects, icon: Building2, color: "text-green-400", bg: "bg-green-500/10" },
    { label: "Documents", value: data.stats.docs, icon: FileText, color: "text-purple-400", bg: "bg-purple-500/10" },
    { label: "Compliance", value: "—", icon: Shield, color: "text-yellow-400", bg: "bg-yellow-500/10" },
  ];

  const quickActions = [
    { label: "Upload Tender PDF", desc: "AI analyzes everything", href: "/dashboard/tenders", icon: Search },
    { label: "Add Documents", desc: "Build company vault", href: "/dashboard/documents", icon: FileText },
    { label: "Create RA Bill", desc: "Auto deductions", href: "/dashboard/billing", icon: Building2 },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-white">নমস্কার, {data.company.name}</h1>
        <p className="text-slate-400 mt-1 text-sm">
          {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">{stat.label}</p>
                  <p className={`text-3xl font-bold mt-1.5 ${stat.color}`}>{stat.value}</p>
                </div>
                <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="text-white font-semibold mb-3 text-sm uppercase tracking-wide">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href}>
              <Card className="cursor-pointer hover:scale-[1.02] transition-all">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center flex-shrink-0">
                    <action.icon className="w-5 h-5 text-orange-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm">{action.label}</p>
                    <p className="text-slate-500 text-xs">{action.desc}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-600" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-orange-500/10 border border-orange-500/20 rounded-xl flex items-center justify-center">
              <Search className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold">Get Started</h3>
              <p className="text-slate-500 text-sm">Upload your first tender PDF to see AI in action</p>
            </div>
          </div>
          <Link href="/dashboard/tenders">
            <button className="mt-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg">
              Go to Tenders →
            </button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}