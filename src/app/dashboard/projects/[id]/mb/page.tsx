"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Ruler, Plus, Loader2, Trash2, Calculator } from "lucide-react";

export default function MBPage() {
  const { id: projectId } = useParams();
  const [entries, setEntries] = useState<any[]>([]);
  const [summary, setSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({
    mbNumber: "MB-01", pageNumber: "", date: new Date().toISOString().split("T")[0],
    itemDescription: "", unit: "Cum", location: "",
    length: "", breadth: "", height: "", number: "1", deduction: "0",
    remarks: "", measuredBy: "", checkedBy: "",
  });

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/mb?projectId=${projectId}`);
      const d = await r.json();
      if (d.success) { setEntries(d.entries); setSummary(d.itemSummary); }
    } finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const L = parseFloat(f.length) || 0;
  const B = parseFloat(f.breadth) || 0;
  const H = parseFloat(f.height) || 0;
  const N = parseFloat(f.number) || 1;
  const D = parseFloat(f.deduction) || 0;
  const liveQty = ((L || 1) * (B || 1) * (H || 1) * N) - D;

  const add = async () => {
    if (!f.itemDescription || !f.unit) { return; }
    setSaving(true);
    try {
      const r = await fetch("/api/mb", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, projectId })
      });
      const d = await r.json();
      if (d.success) {
        setOpen(false);
        setF({ ...f, itemDescription: "", location: "", length: "", breadth: "", height: "", number: "1", deduction: "0", remarks: "" });
        fetch_();
      }
    } finally { setSaving(false); }
  };

  const del = async (id: string) => {
    if (!confirm("Delete entry?")) return;
    await fetch(`/api/mb/${id}`, { method: "DELETE" });
    fetch_();
  };

  return (
    <div className="space-y-5 max-w-6xl">
      <Link href={`/dashboard/projects/${projectId}`}><Button variant="ghost" size="sm" className="-ml-2"><ArrowLeft className="w-4 h-4 mr-2" />Back to Project</Button></Link>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Ruler className="w-6 h-6 text-primary" />Measurement Book
          </h1>
          <p className="text-muted-foreground text-sm mt-1">PWD-format MB entries with auto-calculation</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />New Entry</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Measurement Entry</DialogTitle></DialogHeader>
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5"><Label>MB Number</Label><Input value={f.mbNumber} onChange={e => setF(p => ({...p, mbNumber: e.target.value}))} /></div>
                <div className="space-y-1.5"><Label>Page</Label><Input value={f.pageNumber} onChange={e => setF(p => ({...p, pageNumber: e.target.value}))} /></div>
                <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={f.date} onChange={e => setF(p => ({...p, date: e.target.value}))} /></div>
              </div>
              <div className="space-y-1.5"><Label>Item Description *</Label><Input value={f.itemDescription} onChange={e => setF(p => ({...p, itemDescription: e.target.value}))} placeholder="PCC 1:3:6 for foundation" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Unit *</Label><Input value={f.unit} onChange={e => setF(p => ({...p, unit: e.target.value}))} /></div>
                <div className="space-y-1.5"><Label>Location</Label><Input value={f.location} onChange={e => setF(p => ({...p, location: e.target.value}))} placeholder="Foundation 1" /></div>
              </div>

              <div className="p-3 bg-secondary/30 rounded-md">
                <p className="text-muted-foreground text-xs uppercase mb-2">Measurements</p>
                <div className="grid grid-cols-5 gap-2">
                  <div className="space-y-1"><Label className="text-xs">Length</Label><Input type="number" step="0.01" value={f.length} onChange={e => setF(p => ({...p, length: e.target.value}))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Breadth</Label><Input type="number" step="0.01" value={f.breadth} onChange={e => setF(p => ({...p, breadth: e.target.value}))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Height</Label><Input type="number" step="0.01" value={f.height} onChange={e => setF(p => ({...p, height: e.target.value}))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Nos</Label><Input type="number" value={f.number} onChange={e => setF(p => ({...p, number: e.target.value}))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Deduction</Label><Input type="number" step="0.01" value={f.deduction} onChange={e => setF(p => ({...p, deduction: e.target.value}))} /></div>
                </div>

                <div className="mt-3 p-2 bg-primary/10 border border-primary/30 rounded text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground"><Calculator className="w-3.5 h-3.5 inline mr-1" />Formula: ({L} × {B} × {H} × {N}) - {D}</span>
                    <span className="text-success font-bold">= {liveQty.toFixed(3)} {f.unit}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Measured By</Label><Input value={f.measuredBy} onChange={e => setF(p => ({...p, measuredBy: e.target.value}))} /></div>
                <div className="space-y-1.5"><Label>Checked By</Label><Input value={f.checkedBy} onChange={e => setF(p => ({...p, checkedBy: e.target.value}))} /></div>
              </div>
              <div className="space-y-1.5"><Label>Remarks</Label><Input value={f.remarks} onChange={e => setF(p => ({...p, remarks: e.target.value}))} /></div>

              <Button onClick={add} disabled={saving} className="w-full">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Entry"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Item Summary */}
      {summary.length > 0 && (
        <Card><CardContent className="p-4">
          <h3 className="text-foreground font-semibold mb-3 flex items-center gap-2"><Calculator className="w-4 h-4 text-primary" />Item-wise Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {summary.map((s: any, i: number) => (
              <div key={i} className="p-2.5 bg-secondary/30 border border-border rounded-md flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-foreground text-sm font-medium truncate">{s.description}</p>
                  <p className="text-muted-foreground text-xs">{s.count} entries</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-primary font-bold">{s.totalQty.toFixed(3)}</p>
                  <p className="text-muted-foreground text-xs">{s.unit}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {loading ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div> :
       entries.length === 0 ? (
        <Card className="border-dashed"><CardContent className="p-12 text-center">
          <Ruler className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-foreground font-medium">No MB entries yet</p>
          <p className="text-muted-foreground text-sm mt-1">Start recording measurements for billing</p>
        </CardContent></Card>
       ) : (
        <Card><CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 border-b border-border">
              <tr className="text-muted-foreground text-xs uppercase">
                <th className="text-left p-2">MB#</th>
                <th className="text-left p-2">Date</th>
                <th className="text-left p-2">Item / Location</th>
                <th className="text-center p-2">L × B × H × N</th>
                <th className="text-right p-2">Deduction</th>
                <th className="text-right p-2">Net Qty</th>
                <th className="text-center p-2">By</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entries.map(e => (
                <tr key={e.id} className="hover:bg-secondary/30">
                  <td className="p-2 text-muted-foreground">{e.mbNumber}{e.pageNumber ? `/${e.pageNumber}` : ""}</td>
                  <td className="p-2 text-muted-foreground text-xs">{new Date(e.date).toLocaleDateString("en-IN")}</td>
                  <td className="p-2"><p className="text-foreground font-medium">{e.itemDescription}</p>{e.location && <p className="text-muted-foreground text-xs">{e.location}</p>}</td>
                  <td className="p-2 text-center text-muted-foreground text-xs">{e.length || "—"} × {e.breadth || "—"} × {e.height || "—"} × {e.number}</td>
                  <td className="p-2 text-right text-destructive text-xs">{e.deduction > 0 ? e.deduction.toFixed(3) : "—"}</td>
                  <td className="p-2 text-right text-success font-bold">{e.netQuantity.toFixed(3)} <span className="text-muted-foreground text-xs">{e.unit}</span></td>
                  <td className="p-2 text-center text-muted-foreground text-xs">{e.measuredBy || "—"}</td>
                  <td className="p-2"><Button onClick={() => del(e.id)} size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent></Card>
       )}
    </div>
  );
}