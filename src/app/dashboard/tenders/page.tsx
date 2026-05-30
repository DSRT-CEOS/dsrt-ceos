import Link from "next/link";
"use client";
import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import TenderUploader from "@/components/tenders/TenderUploader";
import TenderCard from "@/components/tenders/TenderCard";
import { Search, Upload, Loader2, X, FileText, Sparkles, GitCompare } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_FILTERS = [
  { v: "ALL", l: "All" },
  { v: "DISCOVERED", l: "New" },
  { v: "SHORTLISTED", l: "Shortlisted" },
  { v: "PREPARING", l: "Preparing" },
  { v: "SUBMITTED", l: "Submitted" },
  { v: "WON", l: "Won" },
  { v: "SKIPPED", l: "Skipped" },
];

export default function TendersPage() {
  const [tenders, setTenders] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status, search, sortBy });
      const r = await fetch(`/api/tenders/list?${params}`);
      const d = await r.json();
      if (d.success) { setTenders(d.tenders); setStats(d.stats); }
    } finally { setLoading(false); }
  }, [status, search, sortBy]);

  useEffect(() => { const t = setTimeout(fetch_, 300); return () => clearTimeout(t); }, [fetch_]);

  // Auto-refresh if processing in progress
  useEffect(() => {
    if (stats.processing > 0) {
      const t = setInterval(fetch_, 5000);
      return () => clearInterval(t);
    }
  }, [stats.processing, fetch_]);

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-orange-400" /> Tender Vault
          </h1>
          <p className="text-slate-400 text-sm mt-1">Upload NIT PDFs - AI extracts everything automatically</p>
        </div>
        <Button onClick={() => setShowUpload(!showUpload)} className={cn(showUpload ? "bg-slate-700 hover:bg-slate-600" : "bg-orange-500 hover:bg-orange-600")}>
          {showUpload ? <><X className="w-4 h-4 mr-2" />Cancel</> : <><Upload className="w-4 h-4 mr-2" />Upload Tenders</>}
        </Button>
      </div>

      {showUpload && (
        <Card className="border-orange-500/20"><CardContent className="p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-orange-400" /> Upload Tender NIT PDFs
          </h3>
          <TenderUploader onComplete={() => { setShowUpload(false); setTimeout(fetch_, 2000); }} />
        </CardContent></Card>
      )}

      {stats.processing > 0 && (
        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-blue-400 animate-spin flex-shrink-0" />
            <div>
              <p className="text-blue-300 font-medium text-sm">{stats.processing} tender{stats.processing !== 1 ? "s" : ""} being analyzed</p>
              <p className="text-slate-400 text-xs">AI extracting data, eligibility, risk flags. Page refreshes every 5 seconds.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-white">{stats.total || 0}</p><p className="text-slate-500 text-xs">Total Tenders</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-blue-400">{stats.processing || 0}</p><p className="text-slate-500 text-xs">Processing</p>
        </CardContent></Card>
        <Card className="bg-green-500/5 border-green-500/20"><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{stats.eligible || 0}</p><p className="text-slate-500 text-xs">Eligible</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-slate-300">{stats.completed || 0}</p><p className="text-slate-500 text-xs">Analyzed</p>
        </CardContent></Card>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tenders..." className="pl-9 h-9" />
        </div>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map(f => (
              <button key={f.v} onClick={() => setStatus(f.v)}
                className={cn("px-2.5 py-1 rounded-lg text-xs font-medium border transition-all",
                  status === f.v ? "bg-orange-500/20 border-orange-500/40 text-orange-300" : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600")}>{f.l}</button>
            ))}
          </div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="bg-slate-800 border border-slate-700 text-white text-xs rounded-md px-2 py-1">
            <option value="newest">Newest First</option>
            <option value="deadline">Deadline (urgent)</option>
            <option value="value">Value (high to low)</option>
          </select>
        </div>
      </div>

      <p className="text-slate-400 text-sm">{loading ? "Loading..." : `${tenders.length} tender${tenders.length !== 1 ? "s" : ""}`}</p>

      {loading ? <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div> :
       tenders.length === 0 ? (
        <Card className="border-dashed"><CardContent className="p-16 text-center">
          <FileText className="w-16 h-16 text-slate-700 mx-auto mb-4" />
          <h3 className="text-white font-semibold text-lg mb-2">{search || status !== "ALL" ? "No tenders found" : "Upload your first tender"}</h3>
          <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
            {search || status !== "ALL" ? "Try changing filters" :
             "Browse CPPP, WBPWD, GeM portals and download NIT PDFs. Drop them here - AI extracts cost, EMD, deadline, eligibility, BOQ, risks - everything."}
          </p>
          {!search && status === "ALL" && <Button onClick={() => setShowUpload(true)} className="bg-orange-500 hover:bg-orange-600"><Upload className="w-4 h-4 mr-2" />Upload Tender PDF</Button>}
        </CardContent></Card>
       ) : (
        <div className="space-y-3">
          {tenders.map(t => <TenderCard key={t.id} tender={t} />)}
        </div>
       )}
    </div>
  );
}