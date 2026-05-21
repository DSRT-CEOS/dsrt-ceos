"use client";
import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DocumentUploader from "@/components/documents/DocumentUploader";
import DocumentCard from "@/components/documents/DocumentCard";
import { FolderOpen, Upload, Search, AlertTriangle, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

const FILTERS = [
  { v: "ALL", l: "All" }, { v: "PAN_GST", l: "PAN/GST" },
  { v: "REGISTRATION", l: "Registration" }, { v: "ESI_EPF", l: "ESI/EPF" },
  { v: "TURNOVER_CA", l: "CA Cert" }, { v: "WORK_ORDER", l: "Work Orders" },
  { v: "COMPLETION_CERT", l: "Completion" }, { v: "INSURANCE", l: "Insurance" },
  { v: "OTHER", l: "Other" },
];

export default function DocumentsPage() {
  const [docs, setDocs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [category, setCategory] = useState("ALL");
  const [search, setSearch] = useState("");

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ category, search });
      const r = await fetch(`/api/documents/list?${params}`);
      const d = await r.json();
      if (d.success) { setDocs(d.documents); setStats(d.stats); }
    } finally { setLoading(false); }
  }, [category, search]);

  useEffect(() => { const t = setTimeout(fetch_, 300); return () => clearTimeout(t); }, [fetch_]);

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><FolderOpen className="w-6 h-6 text-orange-400" />Document Vault</h1>
          <p className="text-slate-400 text-sm mt-1">All company docs — AI extracts and tracks everything</p>
        </div>
        <Button onClick={() => setShowUpload(!showUpload)} className={cn(showUpload ? "bg-slate-700 hover:bg-slate-600" : "bg-orange-500 hover:bg-orange-600")}>
          {showUpload ? <><X className="w-4 h-4 mr-2" />Cancel</> : <><Upload className="w-4 h-4 mr-2" />Upload</>}
        </Button>
      </div>

      {showUpload && (
        <Card className="border-orange-500/20"><CardContent className="p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Upload className="w-4 h-4 text-orange-400" />Upload Documents</h3>
          <DocumentUploader onComplete={() => { setShowUpload(false); setTimeout(fetch_, 2000); }} />
        </CardContent></Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-white">{stats.total || 0}</p><p className="text-slate-500 text-xs">Total</p>
        </CardContent></Card>
        <Card className={cn(stats.expired > 0 ? "bg-red-500/5 border-red-500/20" : "")}>
          <CardContent className="p-4 text-center">
            <p className={cn("text-2xl font-bold", stats.expired > 0 ? "text-red-400" : "text-slate-500")}>{stats.expired || 0}</p>
            <p className="text-slate-500 text-xs">Expired</p>
          </CardContent>
        </Card>
        <Card className={cn(stats.expiringSoon > 0 ? "bg-yellow-500/5 border-yellow-500/20" : "")}>
          <CardContent className="p-4 text-center">
            <p className={cn("text-2xl font-bold", stats.expiringSoon > 0 ? "text-yellow-400" : "text-slate-500")}>{stats.expiringSoon || 0}</p>
            <p className="text-slate-500 text-xs">Expiring Soon</p>
          </CardContent>
        </Card>
        <Card className="bg-green-500/5 border-green-500/20"><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{(stats.total || 0) - (stats.expired || 0) - (stats.expiringSoon || 0)}</p>
          <p className="text-slate-500 text-xs">Valid</p>
        </CardContent></Card>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="pl-9 h-9 text-sm" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map(f => (
            <button key={f.v} onClick={() => setCategory(f.v)}
              className={cn("px-2.5 py-1 rounded-lg text-xs font-medium border transition-all",
                category === f.v ? "bg-orange-500/20 border-orange-500/40 text-orange-300" : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600")}>
              {f.l}{stats.byCategory?.[f.v] > 0 && <span className="ml-1 text-slate-500">{stats.byCategory[f.v]}</span>}
            </button>
          ))}
        </div>
      </div>

      <p className="text-slate-400 text-sm">{loading ? "Loading..." : `${docs.length} document${docs.length !== 1 ? "s" : ""}`}</p>

      {loading ? <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div> :
       docs.length === 0 ? (
        <Card className="border-dashed"><CardContent className="p-16 text-center">
          <FolderOpen className="w-16 h-16 text-slate-700 mx-auto mb-4" />
          <h3 className="text-white font-semibold text-lg mb-2">Vault is empty</h3>
          <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">Upload company docs — AI extracts data, tracks expiry, organizes everything</p>
          {category === "ALL" && !search && <Button onClick={() => setShowUpload(true)} className="bg-orange-500 hover:bg-orange-600"><Upload className="w-4 h-4 mr-2" />Upload First Document</Button>}
        </CardContent></Card>
       ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {docs.map(d => <DocumentCard key={d.id} doc={d} onDelete={fetch_} />)}
        </div>
       )}
    </div>
  );
}