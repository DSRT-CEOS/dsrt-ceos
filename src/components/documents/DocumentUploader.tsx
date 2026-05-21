"use client";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, X, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const CATS = [
  { v: "PAN_GST", l: "PAN / GST" },
  { v: "REGISTRATION", l: "Contractor Registration" },
  { v: "ESI_EPF", l: "ESI / EPF" },
  { v: "TURNOVER_CA", l: "CA Certificate" },
  { v: "BANK_SOLVENCY", l: "Bank Solvency" },
  { v: "WORK_ORDER", l: "Work Order" },
  { v: "COMPLETION_CERT", l: "Completion Cert" },
  { v: "PERFORMANCE_CERT", l: "Performance Cert" },
  { v: "LABOUR_LICENSE", l: "Labour License" },
  { v: "ELECTRICAL_LICENSE", l: "Electrical License" },
  { v: "INSURANCE", l: "Insurance" },
  { v: "PARTNERSHIP_DEED", l: "Partnership Deed" },
  { v: "OTHER", l: "Other" },
];

interface FileStatus { file: File; status: "pending" | "uploading" | "success" | "error"; error?: string; }

export default function DocumentUploader({ onComplete }: { onComplete?: () => void }) {
  const [files, setFiles] = useState<FileStatus[]>([]);
  const [category, setCategory] = useState("OTHER");
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback((accepted: File[]) => {
    setFiles(prev => [...prev, ...accepted.map(f => ({ file: f, status: "pending" as const }))]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"], "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"] },
    maxSize: 50 * 1024 * 1024,
  });

  const remove = (i: number) => setFiles(prev => prev.filter((_, idx) => idx !== i));

  const upload = async () => {
    const pending = files.filter(f => f.status === "pending");
    if (pending.length === 0 || uploading) return;
    setUploading(true);
    setFiles(prev => prev.map(f => f.status === "pending" ? { ...f, status: "uploading" } : f));

    try {
      const fd = new FormData();
      pending.forEach(({ file }) => fd.append("files", file));
      fd.append("category", category);

      const res = await fetch("/api/documents/upload", { method: "POST", body: fd });
      const data = await res.json();

      if (data.success) {
        const map = new Map(data.results.map((r: any) => [r.name, r]));
        setFiles(prev => prev.map(f => {
          if (f.status !== "uploading") return f;
          const r = map.get(f.file.name) as any;
          return r?.success ? { ...f, status: "success" } : { ...f, status: "error", error: r?.error };
        }));
        toast.success(`${data.results.filter((r: any) => r.success).length} uploaded! AI processing...`);
        onComplete?.();
      } else {
        setFiles(prev => prev.map(f => f.status === "uploading" ? { ...f, status: "error", error: data.error } : f));
        toast.error(data.error);
      }
    } catch {
      setFiles(prev => prev.map(f => f.status === "uploading" ? { ...f, status: "error", error: "Network" } : f));
      toast.error("Network error");
    } finally { setUploading(false); }
  };

  const sz = (b: number) => b < 1024 * 1024 ? `${(b/1024).toFixed(0)} KB` : `${(b/1048576).toFixed(1)} MB`;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-slate-300 text-sm font-medium mb-1.5">Category (AI will verify)</p>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent className="max-h-64">{CATS.map(c => <SelectItem key={c.v} value={c.v}>{c.l}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div {...getRootProps()} className={cn(
        "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
        isDragActive ? "border-orange-500 bg-orange-500/10" : "border-slate-700 hover:border-slate-600 hover:bg-slate-800/50"
      )}>
        <input {...getInputProps()} />
        <Upload className={cn("w-10 h-10 mx-auto mb-3", isDragActive ? "text-orange-400" : "text-slate-600")} />
        <p className="text-white font-medium text-sm">{isDragActive ? "Drop files" : "Drag and drop documents"}</p>
        <p className="text-slate-500 text-xs mt-1">PDF, JPG, PNG · Max 50MB · Multiple files</p>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-slate-400 text-xs">{files.length} file{files.length !== 1 ? "s" : ""}</p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {files.map((f, i) => (
              <div key={i} className={cn("flex items-center gap-3 p-3 rounded-lg border",
                f.status === "success" ? "bg-green-500/5 border-green-500/20" :
                f.status === "error" ? "bg-red-500/5 border-red-500/20" :
                f.status === "uploading" ? "bg-blue-500/5 border-blue-500/20" :
                "bg-slate-800 border-slate-700"
              )}>
                <FileText className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium truncate">{f.file.name}</p>
                  <p className="text-slate-500 text-xs">{sz(f.file.size)}</p>
                  {f.error && <p className="text-red-400 text-xs">{f.error}</p>}
                </div>
                {f.status === "pending" && <button onClick={() => remove(i)}><X className="w-4 h-4 text-slate-500 hover:text-red-400" /></button>}
                {f.status === "uploading" && <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />}
                {f.status === "success" && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                {f.status === "error" && <AlertCircle className="w-4 h-4 text-red-400" />}
              </div>
            ))}
          </div>
          <Button onClick={upload} disabled={uploading || files.every(f => f.status !== "pending")} className="w-full bg-orange-500 hover:bg-orange-600">
            {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</> :
             <><Upload className="w-4 h-4 mr-2" />Upload {files.filter(f => f.status === "pending").length} Files</>}
          </Button>
        </div>
      )}
    </div>
  );
}