"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useDropzone } from "react-dropzone";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ArrowLeft, Camera, Upload, Loader2, Trash2, X, Calendar, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const CATEGORIES = [
  { v: "PROGRESS", l: "Progress" },
  { v: "FOUNDATION", l: "Foundation" },
  { v: "STRUCTURE", l: "Structure" },
  { v: "FINISHING", l: "Finishing" },
  { v: "EXTERIOR", l: "Exterior" },
  { v: "QUALITY_CHECK", l: "Quality Check" },
  { v: "ISSUE", l: "Issue/Problem" },
  { v: "MILESTONE", l: "Milestone" },
];

export default function PhotosPage() {
  const { id: projectId } = useParams();
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [category, setCategory] = useState("PROGRESS");
  const [workArea, setWorkArea] = useState("");
  const [caption, setCaption] = useState("");
  const [viewPhoto, setViewPhoto] = useState<any>(null);
  const [filter, setFilter] = useState("ALL");

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/photos?projectId=${projectId}`);
      const d = await r.json();
      if (d.success) setPhotos(d.photos);
    } finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const onDrop = useCallback((accepted: File[]) => {
    setFiles(prev => [...prev, ...accepted]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
    maxSize: 10 * 1024 * 1024,
  });

  const upload = async () => {
    if (files.length === 0) { toast.error("Select photos first"); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("projectId", projectId as string);
      fd.append("category", category);
      fd.append("workArea", workArea);
      fd.append("caption", caption);
      files.forEach(f => fd.append("photos", f));

      const r = await fetch("/api/photos/upload", { method: "POST", body: fd });
      const d = await r.json();
      if (d.success) {
        toast.success(d.message);
        setFiles([]); setCaption(""); setWorkArea("");
        fetch_();
      } else toast.error(d.error);
    } catch { toast.error("Upload failed"); } finally { setUploading(false); }
  };

  const del = async (id: string) => {
    if (!confirm("Delete this photo?")) return;
    const r = await fetch(`/api/photos/${id}`, { method: "DELETE" });
    if ((await r.json()).success) { toast.success("Deleted"); fetch_(); }
  };

  const filtered = filter === "ALL" ? photos : photos.filter(p => p.category === filter);

  return (
    <div className="space-y-5 max-w-6xl">
      <Link href={`/dashboard/projects/${projectId}`}><Button variant="ghost" size="sm" className="-ml-2"><ArrowLeft className="w-4 h-4 mr-2" />Back to Project</Button></Link>

      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Camera className="w-6 h-6 text-orange-400" />Progress Photos</h1>
        <p className="text-slate-400 text-sm mt-1">Document site work with photos</p>
      </div>

      <Card><CardContent className="p-5 space-y-4">
        <h3 className="text-white font-semibold flex items-center gap-2"><Upload className="w-4 h-4 text-orange-400" />Upload Photos</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.v} value={c.v}>{c.l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Work Area</Label>
            <Input value={workArea} onChange={e => setWorkArea(e.target.value)} placeholder="Block A, Ground Floor" />
          </div>
          <div className="space-y-1.5">
            <Label>Caption (optional)</Label>
            <Input value={caption} onChange={e => setCaption(e.target.value)} placeholder="Foundation casting completed" />
          </div>
        </div>

        <div {...getRootProps()} className={cn(
          "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all",
          isDragActive ? "border-orange-500 bg-orange-500/10" : "border-slate-700 hover:border-slate-600"
        )}>
          <input {...getInputProps()} />
          <Camera className="w-10 h-10 mx-auto mb-2 text-orange-400" />
          <p className="text-white text-sm font-medium">{isDragActive ? "Drop photos here" : "Drag and drop site photos"}</p>
          <p className="text-slate-500 text-xs mt-1">JPG, PNG, WEBP · Max 10MB each · Multiple files</p>
        </div>

        {files.length > 0 && (
          <div className="space-y-2">
            <p className="text-slate-400 text-xs">{files.length} file{files.length !== 1 ? "s" : ""} selected</p>
            <div className="flex gap-2 flex-wrap">
              {files.map((f, i) => (
                <div key={i} className="relative group">
                  <Image src={URL.createObjectURL(f)} alt="" width={80} height={80} className="w-20 h-20 object-cover rounded-lg" unoptimized />
                  <button onClick={() => setFiles(p => p.filter((_, idx) => idx !== i))}
                    className="absolute -top-2 -right-2 bg-red-500 rounded-full p-0.5"><X className="w-3 h-3 text-white" /></button>
                </div>
              ))}
            </div>
            <Button onClick={upload} disabled={uploading} className="w-full bg-orange-500 hover:bg-orange-600">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Upload className="w-4 h-4 mr-2" />Upload {files.length} Photo{files.length !== 1 ? "s" : ""}</>}
            </Button>
          </div>
        )}
      </CardContent></Card>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-slate-400 text-sm">{loading ? "Loading..." : `${filtered.length} photo${filtered.length !== 1 ? "s" : ""}`}</p>
        <div className="flex flex-wrap gap-1.5">
          {[{ v: "ALL", l: "All" }, ...CATEGORIES].map(f => (
            <button key={f.v} onClick={() => setFilter(f.v)}
              className={cn("px-2.5 py-1 rounded-lg text-xs font-medium border transition-all",
                filter === f.v ? "bg-orange-500/20 border-orange-500/40 text-orange-300" : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600")}>{f.l}</button>
          ))}
        </div>
      </div>

      {loading ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div> :
       filtered.length === 0 ? (
        <Card className="border-dashed"><CardContent className="p-12 text-center">
          <Camera className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-white font-medium">No photos yet</p>
          <p className="text-slate-500 text-sm mt-1">Upload first photos above to document site progress</p>
        </CardContent></Card>
       ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map(p => (
            <div key={p.id} className="group relative rounded-lg overflow-hidden border border-slate-800 hover:border-orange-500/30 transition-all">
              <div className="aspect-square bg-slate-900 cursor-pointer" onClick={() => setViewPhoto(p)}>
                <Image src={p.photoUrl} alt={p.caption || ""} width={300} height={300} className="w-full h-full object-cover" unoptimized />
              </div>
              <div className="absolute top-2 left-2 flex gap-1">
                <Badge className="bg-slate-900/90 text-white border border-slate-700 text-xs">{p.category}</Badge>
              </div>
              <button onClick={() => del(p.id)}
                className="absolute top-2 right-2 bg-red-500/90 hover:bg-red-500 rounded-lg p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 className="w-3.5 h-3.5 text-white" />
              </button>
              <div className="p-2 bg-slate-900 border-t border-slate-800">
                {p.caption && <p className="text-white text-xs truncate font-medium">{p.caption}</p>}
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(p.takenAt).toLocaleDateString("en-IN")}</span>
                  {p.workArea && <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3" />{p.workArea}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
       )}

      <Dialog open={!!viewPhoto} onOpenChange={() => setViewPhoto(null)}>
        <DialogContent className="max-w-4xl p-0 bg-slate-900">
          {viewPhoto && (
            <div>
              <Image src={viewPhoto.photoUrl} alt={viewPhoto.caption || ""} width={1200} height={800} className="w-full h-auto max-h-[80vh] object-contain" unoptimized />
              <div className="p-4 border-t border-slate-800">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <Badge>{viewPhoto.category}</Badge>
                  <p className="text-slate-500 text-xs">{new Date(viewPhoto.takenAt).toLocaleString("en-IN")}</p>
                </div>
                {viewPhoto.caption && <p className="text-white font-medium">{viewPhoto.caption}</p>}
                {viewPhoto.workArea && <p className="text-slate-400 text-sm mt-1">📍 {viewPhoto.workArea}</p>}
                {viewPhoto.uploadedBy && <p className="text-slate-500 text-xs mt-2">By {viewPhoto.uploadedBy}</p>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}