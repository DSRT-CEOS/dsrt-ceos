"use client";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, AlertTriangle, CheckCircle2, Clock, Download, Trash2, ExternalLink, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const LABELS: Record<string, string> = {
  PAN_GST: "PAN / GST", REGISTRATION: "Registration", ESI_EPF: "ESI / EPF",
  TURNOVER_CA: "CA Cert", BANK_SOLVENCY: "Solvency", WORK_ORDER: "Work Order",
  COMPLETION_CERT: "Completion", PERFORMANCE_CERT: "Performance", LABOUR_LICENSE: "Labour",
  ELECTRICAL_LICENSE: "Electrical", INSURANCE: "Insurance", PARTNERSHIP_DEED: "Partnership", OTHER: "Other",
};

export default function DocumentCard({ doc, onDelete }: { doc: any; onDelete?: () => void }) {
  const [deleting, setDeleting] = useState(false);
  const expired = doc.isExpired || (doc.expiryDate && new Date(doc.expiryDate) < new Date());
  const soon = !expired && doc.expiryDate && new Date(doc.expiryDate) <= new Date(Date.now() + 30 * 86400000);
  const days = doc.expiryDate ? Math.ceil((new Date(doc.expiryDate).getTime() - Date.now()) / 86400000) : null;

  const del = async () => {
    if (!confirm("Delete this document?")) return;
    setDeleting(true);
    try {
      const r = await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
      const d = await r.json();
      if (d.success) { toast.success("Deleted"); onDelete?.(); }
      else toast.error(d.error);
    } catch { toast.error("Network error"); } finally { setDeleting(false); }
  };

  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "N/A";
  const fmtSize = (b: number | null) => !b ? "" : b < 1048576 ? `${(b/1024).toFixed(0)} KB` : `${(b/1048576).toFixed(1)} MB`;

  return (
    <Card className={cn(expired && "border-red-800/50", soon && !expired && "border-yellow-800/50")}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border",
            expired ? "bg-red-500/10 border-red-500/20" : soon ? "bg-yellow-500/10 border-yellow-500/20" : "bg-slate-800 border-slate-700")}>
            <FileText className={cn("w-5 h-5", expired ? "text-red-400" : soon ? "text-yellow-400" : "text-slate-400")} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <p className="text-white font-medium text-sm leading-snug line-clamp-2">{doc.name}</p>
              <Badge variant="outline" className="text-xs flex-shrink-0">{LABELS[doc.category] || doc.category}</Badge>
            </div>
            {doc.subCategory && <p className="text-slate-500 text-xs mb-2">{doc.subCategory.replace(/_/g, " ")}</p>}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              {doc.issueDate && <span className="text-slate-500">Issued: {fmtDate(doc.issueDate)}</span>}
              {doc.expiryDate && (
                <span className={cn("flex items-center gap-1 font-medium",
                  expired ? "text-red-400" : soon ? "text-yellow-400" : "text-green-400")}>
                  {expired ? <><AlertTriangle className="w-3 h-3" /> EXPIRED</> :
                   soon ? <><Clock className="w-3 h-3" /> {days}d left</> :
                   <><CheckCircle2 className="w-3 h-3" /> Valid till {fmtDate(doc.expiryDate)}</>}
                </span>
              )}
              {doc.fileSize && <span className="text-slate-600">{fmtSize(doc.fileSize)}</span>}
              {!doc.isProcessed && <span className="text-blue-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Processing...</span>}
              {doc.isProcessed && <span className="text-green-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> AI Done</span>}
            </div>
            {doc.extractedData && Object.keys(doc.extractedData).length > 0 && (
              <div className="mt-2 p-2 bg-slate-800/60 rounded-lg border border-slate-700/50">
                <p className="text-slate-500 text-xs mb-1">Extracted</p>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                  {Object.entries(doc.extractedData).filter(([, v]) => v && typeof v === "string" && (v as string).length < 50).slice(0, 4).map(([k, v]) => (
                    <span key={k} className="text-xs"><span className="text-slate-500">{k}: </span><span className="text-slate-300">{String(v)}</span></span>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-slate-800">
              <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="sm" className="h-7 text-xs px-2"><ExternalLink className="w-3 h-3 mr-1" />View</Button>
              </a>
              <a href={doc.fileUrl} download>
                <Button variant="ghost" size="sm" className="h-7 text-xs px-2"><Download className="w-3 h-3 mr-1" />Download</Button>
              </a>
              <Button variant="ghost" size="sm" onClick={del} disabled={deleting} className="text-red-400 hover:bg-red-500/10 h-7 text-xs px-2 ml-auto">
                {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}