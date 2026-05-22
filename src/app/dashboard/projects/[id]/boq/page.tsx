"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, ListChecks, Plus, Loader2, Trash2, Edit2, Save, X, TrendingUp } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import toast from "react-hot-toast";

export default function BOQPage() {
  const { id: projectId } = useParams();
  const [items, setItems] = useState<any[]>([]);
  const [totals, setTotals] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [f, setF] = useState({ slNo: "", description: "", unit: "Cum", contractQty: "", rate: "" });

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/boq?projectId=${projectId}`);
      const d = await r.json();
      if (d.success) { setItems(d.items); setTotals(d.totals); }
    } finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const add = async () => {
    if (!f.description || !f.contractQty || !f.rate) { toast.error("All fields required"); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/boq", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, projectId, slNo: f.slNo || String(items.length + 1) })
      });
      const d = await r.json();
      if (d.success) {
        toast.success("Item added");
        setOpen(false);
        setF({ slNo: "", description: "", unit: "Cum", contractQty: "", rate: "" });
        fetch_();
      } else toast.error(d.error);
    } catch { toast.error("Error"); } finally { setSaving(false); }
  };

  const updateProgress = async (id: string, completed: string) => {
    try {
      const r = await fetch(`/api/boq/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totalCompleted: completed })
      });
      if ((await r.json()).success) { toast.success("Progress updated"); setEditingId(null); fetch_(); }
    } catch { toast.error("Error"); }
  };

  const del = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    const r = await fetch(`/api/boq/${id}`, { method: "DELETE" });
    if ((await r.json()).success) { toast.success("Deleted"); fetch_(); }
  };

  return (
    <div className="space-y-5 max-w-6xl">
      <Link href={`/dashboard/projects/${projectId}`}><Button variant="ghost" size="sm" className="-ml-2"><ArrowLeft className="w-4 h-4 mr-2" />Back to Project</Button></Link>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><ListChecks className="w-6 h-6 text-orange-400" />BOQ Progress</h1>
          <p className="text-slate-400 text-sm mt-1">Bill of Quantities with completion tracking</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="bg-orange-500 hover:bg-orange-600"><Plus className="w-4 h-4 mr-2" />Add BOQ Item</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add BOQ Item</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-3">
                <div className="space-y-1.5"><Label>S.No</Label><Input value={f.slNo} onChange={e => setF(p => ({...p, slNo: e.target.value}))} placeholder="1" /></div>
                <div className="space-y-1.5 col-span-3"><Label>Description *</Label><Input value={f.description} onChange={e => setF(p => ({...p, description: e.target.value}))} placeholder="PCC 1:3:6 for foundation" /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5"><Label>Unit</Label><Input value={f.unit} onChange={e => setF(p => ({...p, unit: e.target.value}))} placeholder="Cum" /></div>
                <div className="space-y-1.5"><Label>Quantity *</Label><Input type="number" value={f.contractQty} onChange={e => setF(p => ({...p, contractQty: e.target.value}))} placeholder="100" /></div>
                <div className="space-y-1.5"><Label>Rate (Rs) *</Label><Input type="number" value={f.rate} onChange={e => setF(p => ({...p, rate: e.target.value}))} placeholder="5500" /></div>
              </div>
              {f.contractQty && f.rate && (
                <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                  <p className="text-slate-400 text-xs">Item Value</p>
                  <p className="text-orange-400 font-bold text-xl">{formatCurrency(parseFloat(f.contractQty) * parseFloat(f.rate))}</p>
                </div>
              )}
              <Button onClick={add} disabled={saving} className="w-full bg-orange-500 hover:bg-orange-600">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Item"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 text-center"><p className="text-slate-500 text-xs uppercase">BOQ Items</p><p className="text-2xl font-bold text-white mt-1">{totals.itemCount || 0}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-slate-500 text-xs uppercase">Total Value</p><p className="text-lg font-bold text-white mt-1">{formatCurrency(totals.totalContractValue || 0)}</p></CardContent></Card>
        <Card className="bg-green-500/5 border-green-500/20"><CardContent className="p-4 text-center"><p className="text-green-300 text-xs uppercase">Completed</p><p className="text-lg font-bold text-green-400 mt-1">{formatCurrency(totals.totalCompleted || 0)}</p></CardContent></Card>
        <Card className="bg-orange-500/5 border-orange-500/20"><CardContent className="p-4 text-center"><p className="text-orange-300 text-xs uppercase">Avg Progress</p><p className="text-2xl font-bold text-orange-400 mt-1">{(totals.avgProgress || 0).toFixed(1)}%</p></CardContent></Card>
      </div>

      {loading ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div> :
       items.length === 0 ? (
        <Card className="border-dashed"><CardContent className="p-12 text-center">
          <ListChecks className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-white font-medium">No BOQ items yet</p>
          <p className="text-slate-500 text-sm mt-1">Add work items to track progress and billing</p>
        </CardContent></Card>
       ) : (
        <Card><CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-800 bg-slate-800/50">
                <tr className="text-slate-500 text-xs uppercase">
                  <th className="text-left py-2 px-3">S.No</th>
                  <th className="text-left py-2 px-3">Description</th>
                  <th className="text-center py-2 px-3">Unit</th>
                  <th className="text-right py-2 px-3">Qty</th>
                  <th className="text-right py-2 px-3">Rate</th>
                  <th className="text-right py-2 px-3">Amount</th>
                  <th className="text-center py-2 px-3">Done</th>
                  <th className="text-center py-2 px-3">Progress</th>
                  <th className="text-center py-2 px-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-3 text-slate-400">{item.slNo}</td>
                    <td className="py-3 px-3 text-white max-w-xs">{item.description}</td>
                    <td className="py-3 px-3 text-center text-slate-400">{item.unit}</td>
                    <td className="py-3 px-3 text-right text-slate-300">{item.contractQty.toFixed(2)}</td>
                    <td className="py-3 px-3 text-right text-slate-300">{formatCurrency(item.rate)}</td>
                    <td className="py-3 px-3 text-right text-white font-semibold">{formatCurrency(item.amount)}</td>
                    <td className="py-3 px-3 text-center">
                      {editingId === item.id ? (
                        <div className="flex items-center gap-1">
                          <Input type="number" value={editValue} onChange={e => setEditValue(e.target.value)} className="w-20 h-7 text-xs" />
                          <Button size="sm" onClick={() => updateProgress(item.id, editValue)} className="h-7 w-7 p-0 bg-green-500 hover:bg-green-600"><Save className="w-3 h-3" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-7 w-7 p-0"><X className="w-3 h-3" /></Button>
                        </div>
                      ) : (
                        <button onClick={() => { setEditingId(item.id); setEditValue(String(item.totalCompleted)); }}
                          className="text-green-400 hover:text-green-300 font-semibold flex items-center gap-1 mx-auto">
                          {item.totalCompleted.toFixed(2)} <Edit2 className="w-3 h-3" />
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className={cn("h-full transition-all", item.progress >= 100 ? "bg-green-500" : item.progress >= 50 ? "bg-orange-500" : "bg-blue-500")} style={{ width: `${Math.min(item.progress, 100)}%` }} />
                        </div>
                        <span className={cn("text-xs font-bold", item.progress >= 100 ? "text-green-400" : "text-slate-400")}>{item.progress.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <Button variant="ghost" size="sm" onClick={() => del(item.id)} className="text-red-400 hover:bg-red-500/10 h-7 w-7 p-0"><Trash2 className="w-3.5 h-3.5" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent></Card>
       )}
    </div>
  );
}