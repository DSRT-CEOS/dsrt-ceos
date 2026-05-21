"use client";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Building2, IndianRupee, AlertTriangle, CheckCircle2, XCircle, ArrowRight, Loader2, FileText } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function TenderCard({ tender }: { tender: any }) {
  const daysLeft = tender.lastSubmissionDate
    ? Math.ceil((new Date(tender.lastSubmissionDate).getTime() - Date.now()) / 86400000)
    : null;

  const isProcessing = tender.processingStatus === "PENDING" || tender.processingStatus === "PROCESSING";
  const isFailed = tender.processingStatus === "FAILED";
  const elig = tender.track?.eligibilityStatus;

  const eligColor = elig === "ELIGIBLE" ? "text-green-400" :
                    elig === "PARTIAL" ? "text-yellow-400" :
                    elig === "NOT_ELIGIBLE" ? "text-red-400" : "text-slate-500";
  const EligIcon = elig === "ELIGIBLE" ? CheckCircle2 :
                   elig === "PARTIAL" ? AlertTriangle :
                   elig === "NOT_ELIGIBLE" ? XCircle : AlertTriangle;

  return (
    <Link href={`/dashboard/tenders/${tender.id}`}>
      <Card className="hover:border-slate-700 transition-all cursor-pointer group">
        <CardContent className="p-5">
          {isProcessing ? (
            <div className="flex items-center gap-3 mb-3 p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
              <p className="text-blue-300 text-xs font-medium">AI analyzing this tender...</p>
            </div>
          ) : isFailed ? (
            <div className="flex items-center gap-3 mb-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <p className="text-red-300 text-xs">Analysis failed. Click to retry.</p>
            </div>
          ) : null}

          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className="text-white font-semibold text-sm leading-snug flex-1 line-clamp-2">{tender.workName}</h3>
            {tender.track?.status && (
              <Badge variant="outline" className="text-xs flex-shrink-0">{tender.track.status}</Badge>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap mb-3 text-xs">
            {tender.department && (
              <span className="text-slate-400 flex items-center gap-1 max-w-xs">
                <Building2 className="w-3 h-3" />
                <span className="truncate">{tender.department}</span>
              </span>
            )}
            {tender.district && (
              <span className="text-slate-500 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {tender.district}
              </span>
            )}
          </div>

          {!isProcessing && (
            <div className="grid grid-cols-3 gap-3 mb-3 bg-slate-800/40 rounded-lg p-3 border border-slate-800">
              <div>
                <p className="text-slate-500 text-xs">Estimated</p>
                <p className="text-green-400 font-semibold text-sm flex items-center gap-1">
                  <IndianRupee className="w-3 h-3" />
                  {tender.estimatedCost ? formatCurrency(tender.estimatedCost).replace("Rs ", "") : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-slate-500 text-xs">EMD</p>
                <p className="text-orange-400 font-semibold text-sm">
                  {tender.emdAmount ? formatCurrency(tender.emdAmount) : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-slate-500 text-xs">Deadline</p>
                <p className={cn("font-semibold text-sm flex items-center gap-1",
                  daysLeft === null ? "text-slate-500" :
                  daysLeft < 0 ? "text-red-500" :
                  daysLeft <= 3 ? "text-red-400" :
                  daysLeft <= 7 ? "text-yellow-400" : "text-green-400")}>
                  <Clock className="w-3 h-3" />
                  {daysLeft === null ? "N/A" : daysLeft < 0 ? "Expired" : `${daysLeft}d`}
                </p>
              </div>
            </div>
          )}

          {tender.track?.matchScore !== null && tender.track?.matchScore !== undefined && (
            <div className="flex items-center gap-4 mb-3">
              <div className="flex items-center gap-2 flex-1">
                <span className="text-slate-500 text-xs">Match:</span>
                <div className="flex items-center gap-1.5 flex-1">
                  <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className={cn("h-full transition-all",
                      tender.track.matchScore >= 80 ? "bg-green-500" :
                      tender.track.matchScore >= 60 ? "bg-yellow-500" : "bg-orange-500"
                    )} style={{ width: `${tender.track.matchScore}%` }} />
                  </div>
                  <span className="text-white font-semibold text-xs">{tender.track.matchScore}%</span>
                </div>
              </div>
              {elig && (
                <div className="flex items-center gap-1.5">
                  <EligIcon className={cn("w-3.5 h-3.5", eligColor)} />
                  <span className={cn("text-xs font-medium", eligColor)}>
                    {elig === "ELIGIBLE" ? "Eligible" : elig === "PARTIAL" ? "Partial" : elig === "NOT_ELIGIBLE" ? "Not Eligible" : "Check"}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <p className="text-slate-600 text-xs flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {tender.originalFileName || "tender.pdf"}
            </p>
            <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-orange-400 transition-colors" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}