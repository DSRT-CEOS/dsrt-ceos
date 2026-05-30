"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, GitCompare, Loader2, CheckCircle2, XCircle, AlertTriangle, Plus, X } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import toast from "react-hot-toast";

export default function CompareTendersPage() {
  const [allTenders, setAllTenders] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [comparison, setComparison] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    fetch("/api/tenders/list")
      .then(r => r.json())
      .then(d => { if (d.success) setAllTenders(d.tenders); })
      .finally(() => setLoading(false));
  }, []);

  const toggle = (id: string) => {
    setSelectedIds(p => {
      if (p.includes(id)) return p.filter(x => x !== id);
      if (p.length >= 4) { toast.error("Max 4 tenders for comparison"); return p; }
      return [...p, id];
    });
  };

  const compare = async () => {
    if (selectedIds.length < 2) { toast.error("Select at least 2 tenders"); return; }
    setComparing(true);
    try {
      const r = await fetch("/api/tenders/compare", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenderIds: selectedIds })
      });
      const d = await r.json();
      if (d.success) setComparison(d.tenders);
      else toast.error(d.error);
    } finally { setComparing(false); }
  };

  const reset = () => { setSelectedIds([]); setComparison(null); };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;

  return (
    <div className="space-y-5 max-w-7xl">
      <Link href="/dashboard/tenders"><Button variant="ghost" size="sm" className="-ml-2"><ArrowLeft className="w-4 h-4 mr-2" />Back to Tenders</Button></Link>

      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <GitCompare className="w-6 h-6 text-primary" />Compare Tenders
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Select 2-4 tenders for side-by-side comparison</p>
      </div>

      {!comparison ? (
        <>
          <Card><CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-foreground font-medium text-sm">Selected: {selectedIds.length} / 4</p>
              <div className="flex gap-2">
                {selectedIds.length > 0 && <Button variant="outline" size="sm" onClick={reset}>Clear</Button>}
                <Button onClick={compare} disabled={selectedIds.length < 2 || comparing} size="sm">
                  {comparing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><GitCompare className="w-4 h-4 mr-2" />Compare ({selectedIds.length})</>}
                </Button>
              </div>
            </div>
          </CardContent></Card>

          {allTenders.length === 0 ? (
            <Card className="border-dashed"><CardContent className="p-12 text-center">
              <p className="text-muted-foreground">No tenders uploaded yet</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-2">
              {allTenders.map(t => {
                const selected = selectedIds.includes(t.id);
                return (
                  <button key={t.id} onClick={() => toggle(t.id)}
                    className={cn("w-full p-4 rounded-md border text-left transition-all",
                      selected
                        ? "bg-primary/10 border-primary/50"
                        : "bg-card border-border hover:border-primary/30")}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {selected && <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />}
                          <p className="text-foreground font-semibold text-sm truncate">{t.workName}</p>
                        </div>
                        <p className="text-muted-foreground text-xs mt-1">{t.department || ""}</p>
                      </div>
                      <div className="text-right text-xs flex-shrink-0">
                        {t.estimatedCost && <p className="text-success font-semibold">{formatCurrency(t.estimatedCost)}</p>}
                        {t.track?.eligibilityStatus && (
                          <Badge variant="outline" className="text-[10px] mt-1">{t.track.eligibilityStatus}</Badge>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex justify-end">
            <Button onClick={reset} variant="outline" size="sm"><X className="w-4 h-4 mr-2" />New Comparison</Button>
          </div>

          <Card><CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 text-muted-foreground text-xs uppercase font-semibold sticky left-0 bg-card z-10">Attribute</th>
                  {comparison.map(t => (
                    <th key={t.id} className="text-left p-3 min-w-[240px]">
                      <Link href={`/dashboard/tenders/${t.id}`} className="text-foreground font-semibold text-sm hover:text-primary line-clamp-2">
                        {t.workName}
                      </Link>
                      <p className="text-muted-foreground text-xs mt-1 truncate">{t.department}</p>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <ComparisonRow label="Eligibility" cells={comparison.map(t => ({
                  value: t.eligibilityStatus || "Unchecked",
                  className: t.eligibilityStatus === "ELIGIBLE" ? "text-success" : t.eligibilityStatus === "NOT_ELIGIBLE" ? "text-destructive" : "text-yellow-400",
                  icon: t.eligibilityStatus === "ELIGIBLE" ? CheckCircle2 : t.eligibilityStatus === "NOT_ELIGIBLE" ? XCircle : AlertTriangle,
                }))} />
                <ComparisonRow label="Match Score" cells={comparison.map(t => ({
                  value: t.matchScore ? `${t.matchScore}%` : "—",
                  className: t.matchScore >= 80 ? "text-success" : t.matchScore >= 50 ? "text-yellow-400" : "text-destructive",
                }))} highlight />
                <ComparisonRow label="Estimated Cost" cells={comparison.map(t => ({
                  value: t.estimatedCost ? formatCurrency(t.estimatedCost) : "—",
                  className: "text-success font-semibold",
                }))} highlight />
                <ComparisonRow label="EMD" cells={comparison.map(t => ({
                  value: t.emdAmount ? formatCurrency(t.emdAmount) : "—",
                  className: "text-primary",
                }))} />
                <ComparisonRow label="Tender Fee" cells={comparison.map(t => ({
                  value: t.tenderFee ? formatCurrency(t.tenderFee) : "—",
                }))} />
                <ComparisonRow label="Location" cells={comparison.map(t => ({
                  value: t.district || t.location || "—",
                }))} />
                <ComparisonRow label="Sector" cells={comparison.map(t => ({
                  value: t.sector || "—",
                }))} />
                <ComparisonRow label="Days to Deadline" cells={comparison.map(t => ({
                  value: t.daysToDeadline != null ? `${t.daysToDeadline} days` : "—",
                  className: t.daysToDeadline === null ? "" : t.daysToDeadline <= 3 ? "text-destructive font-semibold" : t.daysToDeadline <= 7 ? "text-yellow-400" : "text-success",
                }))} highlight />
                <ComparisonRow label="Submission Date" cells={comparison.map(t => ({
                  value: t.lastSubmissionDate ? new Date(t.lastSubmissionDate).toLocaleDateString("en-IN") : "—",
                }))} />
                <ComparisonRow label="Completion Period" cells={comparison.map(t => ({
                  value: t.completionPeriod || "—",
                }))} />
                <ComparisonRow label="Required Class" cells={comparison.map(t => ({
                  value: t.requiredClass || "—",
                }))} />
                <ComparisonRow label="Required Turnover" cells={comparison.map(t => ({
                  value: t.requiredTurnover ? formatCurrency(t.requiredTurnover) : "—",
                }))} />
                <ComparisonRow label="Security Deposit" cells={comparison.map(t => ({
                  value: t.securityDepositPct ? `${t.securityDepositPct}%` : "—",
                }))} />
                <ComparisonRow label="Performance Guarantee" cells={comparison.map(t => ({
                  value: t.performanceGuarPct ? `${t.performanceGuarPct}%` : "—",
                }))} />
                <ComparisonRow label="Mobilization Advance" cells={comparison.map(t => ({
                  value: t.mobilizationAdv ? `Yes ${t.mobilizationAdvPct ? `(${t.mobilizationAdvPct}%)` : ""}` : "No",
                  className: t.mobilizationAdv ? "text-success" : "text-muted-foreground",
                }))} />
                <ComparisonRow label="Defect Liability" cells={comparison.map(t => ({
                  value: t.defectLiabilityPeriod || "—",
                }))} />
                <ComparisonRow label="Risk Flags" cells={comparison.map(t => ({
                  value: Array.isArray(t.riskFlags) ? `${t.riskFlags.length} flags` : "—",
                  className: Array.isArray(t.riskFlags) && t.riskFlags.length > 0 ? "text-destructive" : "text-success",
                }))} />
              </tbody>
            </table>
          </CardContent></Card>

          {/* AI Recommendation */}
          <Card className="bg-primary/5 border-primary/20"><CardContent className="p-5">
            <h3 className="text-foreground font-semibold mb-3 flex items-center gap-2"><GitCompare className="w-4 h-4 text-primary" />Recommendation</h3>
            <RecommendationDisplay tenders={comparison} />
          </CardContent></Card>
        </>
      )}
    </div>
  );
}

function ComparisonRow({ label, cells, highlight }: { label: string; cells: any[]; highlight?: boolean }) {
  return (
    <tr className={cn("border-b border-border/50", highlight && "bg-primary/5")}>
      <td className="p-3 text-muted-foreground text-xs font-medium sticky left-0 bg-card z-10">{label}</td>
      {cells.map((cell, i) => {
        const Icon = cell.icon;
        return (
          <td key={i} className={cn("p-3 text-sm", cell.className)}>
            <div className="flex items-center gap-1.5">
              {Icon && <Icon className="w-3.5 h-3.5" />}
              {cell.value}
            </div>
          </td>
        );
      })}
    </tr>
  );
}

function RecommendationDisplay({ tenders }: { tenders: any[] }) {
  // Best by match score
  const best = [...tenders].sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))[0];
  // Most urgent
  const urgent = [...tenders].filter(t => t.daysToDeadline != null).sort((a, b) => (a.daysToDeadline || 999) - (b.daysToDeadline || 999))[0];
  // Highest value eligible
  const highValue = [...tenders].filter(t => t.eligibilityStatus === "ELIGIBLE").sort((a, b) => (b.estimatedCost || 0) - (a.estimatedCost || 0))[0];

  return (
    <div className="space-y-3 text-sm">
      {best && (
        <div className="p-3 bg-secondary/30 rounded-md">
          <p className="text-muted-foreground text-xs uppercase mb-1">Best Match</p>
          <p className="text-foreground font-semibold">{best.workName}</p>
          <p className="text-success text-xs mt-1">Match Score: {best.matchScore || 0}%</p>
        </div>
      )}
      {urgent && urgent.daysToDeadline != null && urgent.daysToDeadline <= 7 && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-muted-foreground text-xs uppercase mb-1">Most Urgent</p>
          <p className="text-foreground font-semibold">{urgent.workName}</p>
          <p className="text-destructive text-xs mt-1">Only {urgent.daysToDeadline} days left</p>
        </div>
      )}
      {highValue && (
        <div className="p-3 bg-success/10 border border-success/20 rounded-md">
          <p className="text-muted-foreground text-xs uppercase mb-1">Highest Value Eligible</p>
          <p className="text-foreground font-semibold">{highValue.workName}</p>
          <p className="text-success text-xs mt-1">{formatCurrency(highValue.estimatedCost || 0)}</p>
        </div>
      )}
    </div>
  );
}