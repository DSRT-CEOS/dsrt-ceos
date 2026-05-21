"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, FileText, Sparkles, Download, Trash2, Loader2,
  CheckCircle2, Plus, ExternalLink, RefreshCw, Wand2, ClipboardList,
  FileSignature, Award, IndianRupee, Users, Wrench, Mail
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const DOC_TYPES = [
  { type: "COVERING_LETTER", title: "Covering Letter", desc: "Formal letter accompanying bid submission", icon: Mail, color: "blue" },
  { type: "AFFIDAVIT_NON_BLACKLISTING", title: "Non-Blacklisting Affidavit", desc: "Declaration not blacklisted by any govt dept", icon: FileSignature, color: "purple" },
  { type: "AFFIDAVIT_AUTHENTICITY", title: "Authenticity Affidavit", desc: "All submitted documents are true and correct", icon: FileSignature, color: "purple" },
  { type: "AFFIDAVIT_NO_RELATION", title: "No Relationship Affidavit", desc: "No relation with tendering authority officials", icon: FileSignature, color: "purple" },
  { type: "EXPERIENCE_STATEMENT", title: "Experience Statement", desc: "AI picks best matching past works", icon: Award, color: "green" },
  { type: "TURNOVER_STATEMENT", title: "Turnover Certificate", desc: "CA-format turnover for last 3 years", icon: IndianRupee, color: "yellow" },
  { type: "STAFF_DETAILS", title: "Staff Deployment", desc: "Engineers and key personnel list", icon: Users, color: "cyan" },
  { type: "MACHINERY_LIST", title: "Machinery List", desc: "Equipment to be deployed", icon: Wrench, color: "orange" },
  { type: "CHECKLIST", title: "Submission Checklist", desc: "Master checklist for the submission package", icon: ClipboardList, color: "pink" },
];

const COLOR_MAP: Record<string, string> = {
  blue: "bg-blue-500/10 border-blue-500/20 text-blue-400",
  purple: "bg-purple-500/10 border-purple-500/20 text-purple-400",
  green: "bg-green-500/10 border-green-500/20 text-green-400",
  yellow: "bg-yellow-500/10 border-yellow-500/20 text-yellow-400",
  cyan: "bg-cyan-500/10 border-cyan-500/20 text-cyan-400",
  orange: "bg-orange-500/10 border-orange-500/20 text-orange-400",
  pink: "bg-pink-500/10 border-pink-500/20 text-pink-400",
};

export default function GeneratePage() {
  const { id } = useParams();
  const [tender, setTender] = useState<any>(null);
  const [generated, setGenerated] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<Set<string>>(new Set());
  const [generatingAll, setGeneratingAll] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [tRes, gRes] = await Promise.all([
        fetch(`/api/tenders/${id}`),
        fetch(`/api/generated/list?tenderId=${id}`),
      ]);
      const tData = await tRes.json();
      const gData = await gRes.json();
      if (tData.success) setTender(tData.tender);
      if (gData.success) setGenerated(gData.documents);
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const generateDoc = async (docType: string) => {
    setGenerating(prev => new Set(prev).add(docType));
    try {
      const r = await fetch(`/api/generate/${id}/document`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docType }),
      });
      const d = await r.json();
      if (d.success) {
        toast.success(`Generated: ${DOC_TYPES.find(t => t.type === docType)?.title}`);
        await fetchData();
      } else {
        toast.error(d.error || "Generation failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setGenerating(prev => { const s = new Set(prev); s.delete(docType); return s; });
    }
  };

  const generateAll = async () => {
    setGeneratingAll(true);
    const toGen = DOC_TYPES.filter(t => !isGenerated(t.type));
    if (toGen.length === 0) { toast.success("All documents already generated"); setGeneratingAll(false); return; }
    toast.success(`Generating ${toGen.length} documents...`);
    for (const doc of toGen) {
      await generateDoc(doc.type);
    }
    setGeneratingAll(false);
    toast.success("All documents generated!");
  };

  const deleteDoc = async (docId: string) => {
    if (!confirm("Delete this generated document?")) return;
    try {
      const r = await fetch(`/api/generated/${docId}`, { method: "DELETE" });
      if ((await r.json()).success) { toast.success("Deleted"); fetchData(); }
    } catch { toast.error("Failed"); }
  };

  const isGenerated = (type: string) => generated.some(g => g.type === type);
  const getGenerated = (type: string) => generated.find(g => g.type === type);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div>;
  if (!tender) return <div className="text-center py-20"><p className="text-slate-400">Tender not found</p></div>;

  const progress = Math.round((generated.length / DOC_TYPES.length) * 100);

  return (
    <div className="space-y-5 max-w-6xl">
      <div>
        <Link href={`/dashboard/tenders/${id}`}>
          <Button variant="ghost" size="sm" className="mb-3 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />Back to Tender
          </Button>
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Wand2 className="w-6 h-6 text-orange-400" /> Document Generator
            </h1>
            <p className="text-slate-400 text-sm mt-1 line-clamp-1">For: {tender.workName}</p>
          </div>
          <Button
            onClick={generateAll}
            disabled={generatingAll || generated.length === DOC_TYPES.length}
            className="bg-orange-500 hover:bg-orange-600"
          >
            {generatingAll ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating all...</> :
             <><Sparkles className="w-4 h-4 mr-2" />Generate All Documents</>}
          </Button>
        </div>
      </div>

      <Card className="bg-gradient-to-r from-orange-500/10 to-amber-500/5 border-orange-500/20">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-orange-400" />
              <div>
                <p className="text-white font-semibold">Submission Package Progress</p>
                <p className="text-slate-400 text-sm">{generated.length} of {DOC_TYPES.length} documents generated</p>
              </div>
            </div>
            <p className="text-2xl font-bold text-orange-400">{progress}%</p>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2">
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {DOC_TYPES.map(doc => {
          const exists = isGenerated(doc.type);
          const existing = getGenerated(doc.type);
          const isGenerating = generating.has(doc.type);

          return (
            <Card key={doc.type} className={cn(exists && "border-green-500/30 bg-green-500/5")}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border", COLOR_MAP[doc.color])}>
                    <doc.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-white font-semibold text-sm">{doc.title}</p>
                      {exists && (
                        <Badge className="bg-green-500/20 text-green-400 border border-green-500/30 text-xs">
                          <CheckCircle2 className="w-3 h-3 mr-1" />Generated
                        </Badge>
                      )}
                    </div>
                    <p className="text-slate-500 text-xs mb-3">{doc.desc}</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {isGenerating ? (
                        <Button disabled size="sm" className="bg-orange-500/50 text-xs h-8">
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />AI Writing...
                        </Button>
                      ) : exists ? (
                        <>
                          <a href={existing.fileUrl} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm" className="text-xs h-8">
                              <ExternalLink className="w-3 h-3 mr-1" />View
                            </Button>
                          </a>
                          <a href={existing.fileUrl} download>
                            <Button variant="outline" size="sm" className="text-xs h-8">
                              <Download className="w-3 h-3 mr-1" />Download
                            </Button>
                          </a>
                          <Button variant="ghost" size="sm" onClick={() => generateDoc(doc.type)} className="text-xs h-8 text-orange-400 hover:bg-orange-500/10">
                            <RefreshCw className="w-3 h-3 mr-1" />Regenerate
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteDoc(existing.id)} className="text-xs h-8 w-8 p-0 text-red-400 hover:bg-red-500/10 ml-auto">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" onClick={() => generateDoc(doc.type)} className="bg-orange-500 hover:bg-orange-600 text-xs h-8">
                          <Plus className="w-3 h-3 mr-1" />Generate
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {generated.length > 0 && (
        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardContent className="p-5">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" /> Generated Documents Ready
            </h3>
            <p className="text-slate-400 text-sm mb-3">All generated documents are saved to your account. Download individually or print all for submission.</p>
            <div className="flex gap-2 flex-wrap">
              {generated.map(g => (
                <a key={g.id} href={g.fileUrl} download className="inline-block">
                  <Badge className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 cursor-pointer text-xs py-1.5">
                    <Download className="w-3 h-3 mr-1" />{g.name}
                  </Badge>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}