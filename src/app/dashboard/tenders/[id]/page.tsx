"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, Building2, Calendar, Clock, IndianRupee, MapPin, FileText,
  CheckCircle2, XCircle, AlertTriangle, Loader2, Sparkles, ExternalLink,
  Download, Trash2, RefreshCw, Bookmark, Eye, Send, X, Save
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import toast from "react-hot-toast";

const STATUS_OPTIONS = [
  { v: "DISCOVERED", l: "New", icon: Eye },
  { v: "SHORTLISTED", l: "Shortlisted", icon: Bookmark },
  { v: "PREPARING", l: "Preparing", icon: FileText },
  { v: "SUBMITTED", l: "Submitted", icon: Send },
  { v: "WON", l: "Won", icon: CheckCircle2 },
  { v: "LOST", l: "Lost", icon: XCircle },
  { v: "SKIPPED", l: "Skipped", icon: X },
];

export default function TenderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [tender, setTender] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [summaryLang, setSummaryLang] = useState<"en" | "bn" | "hi">("bn");
  const [updating, setUpdating] = useState(false);
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);

  const fetch_ = useCallback(async () => {
    try {
      const r = await fetch(`/api/tenders/${id}`);
      const d = await r.json();
      if (d.success) {
        setTender(d.tender);
        setNotes(d.tender.track?.userNotes || "");
      } else toast.error(d.error);
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetch_(); }, [fetch_]);

  // Auto-refresh while processing
  useEffect(() => {
    if (tender?.processingStatus === "PROCESSING" || tender?.processingStatus === "PENDING") {
      const t = setInterval(fetch_, 5000);
      return () => clearInterval(t);
    }
  }, [tender?.processingStatus, fetch_]);

  const updateStatus = async (status: string) => {
    setUpdating(true);
    try {
      const r = await fetch(`/api/tenders/${id}/track`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if ((await r.json()).success) {
        toast.success(`Marked as ${status}`);
        fetch_();
      }
    } finally { setUpdating(false); }
  };

  const saveNotes = async () => {
    setUpdating(true);
    try {
      const r = await fetch(`/api/tenders/${id}/track`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userNotes: notes }),
      });
      if ((await r.json()).success) {
        toast.success("Notes saved");
        setShowNotes(false);
        fetch_();
      }
    } finally { setUpdating(false); }
  };

  const reanalyze = async () => {
    setUpdating(true);
    try {
      const r = await fetch(`/api/tenders/${id}/analyze`, { method: "POST" });
      if ((await r.json()).success) {
        toast.success("Reanalysis started");
        setTimeout(fetch_, 2000);
      }
    } finally { setUpdating(false); }
  };

  const del = async () => {
    if (!confirm("Delete this tender permanently?")) return;
    setUpdating(true);
    try {
      const r = await fetch(`/api/tenders/${id}`, { method: "DELETE" });
      if ((await r.json()).success) {
        toast.success("Deleted");
        router.push("/dashboard/tenders");
      }
    } finally { setUpdating(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div>;
  if (!tender) return <div className="text-center py-20"><p className="text-slate-400">Tender not found</p></div>;

  const isProcessing = tender.processingStatus === "PENDING" || tender.processingStatus === "PROCESSING";
  const isFailed = tender.processingStatus === "FAILED";
  const daysLeft = tender.lastSubmissionDate
    ? Math.ceil((new Date(tender.lastSubmissionDate).getTime() - Date.now()) / 86400000)
    : null;
  const summary = summaryLang === "bn" ? tender.aiSummaryBn :
                  summaryLang === "hi" ? tender.aiSummaryHi : tender.aiSummaryEn;
  const elig = tender.track?.eligibilityStatus;

  return (
    <div className="space-y-5 max-w-6xl">
      <div>
        <Link href="/dashboard/tenders">
          <Button variant="ghost" size="sm" className="mb-3 -ml-2"><ArrowLeft className="w-4 h-4 mr-2" />Back to Tenders</Button>
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-white leading-tight">{tender.workName}</h1>
            <div className="flex items-center gap-3 mt-2 flex-wrap text-sm">
              {tender.department && (
                <span className="text-slate-400 flex items-center gap-1"><Building2 className="w-4 h-4" />{tender.department}</span>
              )}
              {tender.district && (
                <span className="text-slate-500 flex items-center gap-1"><MapPin className="w-4 h-4" />{tender.district}, {tender.state}</span>
              )}
              {tender.nitNumber && <Badge variant="outline">NIT: {tender.nitNumber}</Badge>}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <a href={tender.originalFileUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm"><ExternalLink className="w-4 h-4 mr-2" />View PDF</Button>
            </a>
            <a href={tender.originalFileUrl} download>
              <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2" />Download</Button>
            </a>
            {isFailed && (
              <Button variant="outline" size="sm" onClick={reanalyze} disabled={updating}>
                <RefreshCw className="w-4 h-4 mr-2" />Retry AI
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={del} disabled={updating} className="text-red-400 hover:bg-red-500/10">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {isProcessing && (
        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardContent className="p-6 flex items-center gap-4">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin flex-shrink-0" />
            <div>
              <h3 className="text-blue-300 font-semibold">AI is analyzing this tender</h3>
              <p className="text-slate-400 text-sm mt-1">Extracting cost, EMD, deadline, eligibility criteria, BOQ, risk flags, summaries in Bengali/Hindi/English. This takes 30-60 seconds.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {isFailed && (
        <Card className="bg-red-500/5 border-red-500/20">
          <CardContent className="p-6 flex items-center gap-4">
            <AlertTriangle className="w-8 h-8 text-red-400 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-red-300 font-semibold">Analysis Failed</h3>
              <p className="text-slate-400 text-sm mt-1">{tender.processingError || "Could not extract content from this PDF. It might be a scanned image."}</p>
            </div>
            <Button onClick={reanalyze} disabled={updating} className="bg-orange-500 hover:bg-orange-600"><RefreshCw className="w-4 h-4 mr-2" />Retry</Button>
          </CardContent>
        </Card>
      )}

      {!isProcessing && !isFailed && (
        <>
          {/* Key Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card><CardContent className="p-4">
              <p className="text-slate-500 text-xs uppercase tracking-wide">Estimated</p>
              <p className="text-green-400 font-bold text-xl mt-1 flex items-center gap-1">
                <IndianRupee className="w-4 h-4" />
                {tender.estimatedCost ? formatCurrency(tender.estimatedCost).replace("Rs ", "") : "N/A"}
              </p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-slate-500 text-xs uppercase tracking-wide">EMD</p>
              <p className="text-orange-400 font-bold text-xl mt-1">
                {tender.emdAmount ? formatCurrency(tender.emdAmount) : "N/A"}
              </p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-slate-500 text-xs uppercase tracking-wide">Deadline</p>
              <p className={cn("font-bold text-xl mt-1 flex items-center gap-1",
                daysLeft === null ? "text-slate-500" :
                daysLeft < 0 ? "text-red-500" :
                daysLeft <= 3 ? "text-red-400" :
                daysLeft <= 7 ? "text-yellow-400" : "text-green-400")}>
                <Clock className="w-4 h-4" />
                {daysLeft === null ? "N/A" : daysLeft < 0 ? "Expired" : `${daysLeft}d`}
              </p>
              {tender.lastSubmissionDate && (
                <p className="text-slate-600 text-xs mt-1">{new Date(tender.lastSubmissionDate).toLocaleDateString("en-IN")}</p>
              )}
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-slate-500 text-xs uppercase tracking-wide">Completion</p>
              <p className="text-slate-300 font-bold text-xl mt-1 flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {tender.completionPeriod || "N/A"}
              </p>
            </CardContent></Card>
          </div>

          {/* Eligibility */}
          {elig && tender.track?.eligibilityDetails?.checks && (
            <Card className={cn(
              "border-2",
              elig === "ELIGIBLE" ? "bg-green-500/5 border-green-500/30" :
              elig === "PARTIAL" ? "bg-yellow-500/5 border-yellow-500/30" :
              "bg-red-500/5 border-red-500/30"
            )}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {elig === "ELIGIBLE" ? <CheckCircle2 className="w-6 h-6 text-green-400" /> :
                     elig === "PARTIAL" ? <AlertTriangle className="w-6 h-6 text-yellow-400" /> :
                     <XCircle className="w-6 h-6 text-red-400" />}
                    <div>
                      <h3 className={cn("font-bold text-lg",
                        elig === "ELIGIBLE" ? "text-green-300" :
                        elig === "PARTIAL" ? "text-yellow-300" : "text-red-300"
                      )}>
                        {elig === "ELIGIBLE" ? "You are Eligible" :
                         elig === "PARTIAL" ? "Partially Eligible" : "Not Eligible"}
                      </h3>
                      <p className="text-slate-400 text-sm">Match Score: {tender.track.matchScore}%</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  {tender.track.eligibilityDetails.checks.map((c: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-slate-900/50 rounded-lg">
                      {c.status === "PASS" ? <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" /> :
                       c.status === "FAIL" ? <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" /> :
                       <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />}
                      <div className="flex-1">
                        <p className="text-white text-sm font-medium">{c.criterion}</p>
                        <p className="text-slate-400 text-xs mt-0.5">{c.note}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status Actions */}
          <Card>
            <CardContent className="p-5">
              <p className="text-slate-400 text-xs uppercase tracking-wide mb-3">Update Status</p>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map(s => (
                  <button key={s.v} onClick={() => updateStatus(s.v)} disabled={updating}
                    className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                      tender.track?.status === s.v
                        ? "bg-orange-500/20 border-orange-500/50 text-orange-300"
                        : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-white")}>
                    <s.icon className="w-3.5 h-3.5" />{s.l}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* AI Summary */}
          {summary && (
            <Card className="border-orange-500/20">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-orange-400" /> AI Summary
                  </h3>
                  <div className="flex gap-1">
                    {[{v:"bn",l:"বাংলা"},{v:"hi",l:"हिंदी"},{v:"en",l:"English"}].map(l => (
                      <button key={l.v} onClick={() => setSummaryLang(l.v as any)}
                        className={cn("px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                          summaryLang === l.v ? "bg-orange-500/20 text-orange-300 border border-orange-500/30" : "bg-slate-800 text-slate-400 border border-transparent hover:bg-slate-700")}>
                        {l.l}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">{summary}</div>
              </CardContent>
            </Card>
          )}

          {/* Risk Flags */}
          {tender.riskFlags && Array.isArray(tender.riskFlags) && tender.riskFlags.length > 0 && (
            <Card><CardContent className="p-5">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400" /> Risk Flags
              </h3>
              <div className="space-y-2">
                {tender.riskFlags.map((r: any, i: number) => (
                  <div key={i} className={cn("p-3 rounded-lg border",
                    r.type === "HIGH" ? "bg-red-500/5 border-red-500/20" :
                    r.type === "MEDIUM" ? "bg-yellow-500/5 border-yellow-500/20" :
                    "bg-blue-500/5 border-blue-500/20"
                  )}>
                    <div className="flex items-start gap-2">
                      <Badge className={cn(
                        r.type === "HIGH" ? "bg-red-500" : r.type === "MEDIUM" ? "bg-yellow-500" : "bg-blue-500"
                      )}>{r.type}</Badge>
                      <p className="text-slate-300 text-sm flex-1">{r.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent></Card>
          )}

          {/* Required Documents */}
          {tender.requiredDocuments && Array.isArray(tender.requiredDocuments) && tender.requiredDocuments.length > 0 && (
            <Card><CardContent className="p-5">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-orange-400" /> Required Documents
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {tender.requiredDocuments.map((doc: string, i: number) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-slate-800/50 rounded-lg border border-slate-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    <p className="text-slate-300 text-sm">{doc}</p>
                  </div>
                ))}
              </div>
            </CardContent></Card>
          )}

          {/* Financial Terms */}
          <Card><CardContent className="p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <IndianRupee className="w-4 h-4 text-orange-400" /> Financial Terms
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {tender.securityDepositPct && (
                <div className="flex justify-between p-3 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-400">Security Deposit</span>
                  <span className="text-white font-semibold">{tender.securityDepositPct}%</span>
                </div>
              )}
              {tender.performanceGuarPct && (
                <div className="flex justify-between p-3 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-400">Performance Guarantee</span>
                  <span className="text-white font-semibold">{tender.performanceGuarPct}%</span>
                </div>
              )}
              {tender.mobilizationAdv && (
                <div className="flex justify-between p-3 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-400">Mobilization Advance</span>
                  <span className="text-green-400 font-semibold">Yes {tender.mobilizationAdvPct && `(${tender.mobilizationAdvPct}%)`}</span>
                </div>
              )}
              {tender.tenderFee && (
                <div className="flex justify-between p-3 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-400">Tender Fee</span>
                  <span className="text-white font-semibold">{formatCurrency(tender.tenderFee)}</span>
                </div>
              )}
              {tender.defectLiabilityPeriod && (
                <div className="flex justify-between p-3 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-400">Defect Liability</span>
                  <span className="text-white font-semibold">{tender.defectLiabilityPeriod}</span>
                </div>
              )}
              {tender.requiredClass && (
                <div className="flex justify-between p-3 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-400">Required Class</span>
                  <span className="text-white font-semibold">{tender.requiredClass}</span>
                </div>
              )}
            </div>
            {tender.paymentTerms && (
              <div className="mt-3 p-3 bg-slate-800/50 rounded-lg">
                <p className="text-slate-400 text-xs mb-1">Payment Terms</p>
                <p className="text-slate-300 text-sm">{tender.paymentTerms}</p>
              </div>
            )}
            {tender.ldClause && (
              <div className="mt-3 p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
                <p className="text-red-300 text-xs mb-1">⚠️ Liquidated Damages</p>
                <p className="text-slate-300 text-sm">{tender.ldClause}</p>
              </div>
            )}
          </CardContent></Card>

          {/* Notes */}
          <Card><CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold">Your Notes</h3>
              {!showNotes && (
                <Button variant="outline" size="sm" onClick={() => setShowNotes(true)}>
                  {tender.track?.userNotes ? "Edit" : "Add Notes"}
                </Button>
              )}
            </div>
            {showNotes ? (
              <div className="space-y-2">
                <Textarea value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Add your notes, strategy, observations..." className="min-h-24" />
                <div className="flex gap-2">
                  <Button onClick={saveNotes} disabled={updating} className="bg-orange-500 hover:bg-orange-600">
                    {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" />Save</>}
                  </Button>
                  <Button variant="outline" onClick={() => { setShowNotes(false); setNotes(tender.track?.userNotes || ""); }}>Cancel</Button>
                </div>
              </div>
            ) : (
              <p className="text-slate-400 text-sm">
                {tender.track?.userNotes || "No notes yet. Add your thoughts, strategy, observations."}
              </p>
            )}
          </CardContent></Card>
        </>
      )}
    </div>
  );
}