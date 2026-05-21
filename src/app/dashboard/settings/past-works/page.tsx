"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, Briefcase, Trash2, Building2, IndianRupee, Calendar } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

const SECTORS = [{v:"CIVIL",l:"Civil"},{v:"ELECTRICAL",l:"Electrical"},{v:"MECHANICAL",l:"Mechanical"},{v:"ROAD",l:"Road"},{v:"BRIDGE",l:"Bridge"},{v:"WATER_SUPPLY",l:"Water Supply"},{v:"SEWERAGE",l:"Sewerage"},{v:"SOLAR",l:"Solar"}];
const def = { workName: "", department: "", workOrderNumber: "", workOrderDate: "", sector: "CIVIL", contractValue: "", completionDate: "", location: "", district: "", state: "West Bengal", isCompleted: true, workNature: "" };

export default function WorksPage() {
  const [works, setWorks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState(def);

  const fetch_ = () => { setLoading(true); fetch("/api/company/past-works").then(r => r.json()).then(d => d.success && setWorks(d.data)).finally(() => setLoading(false)); };
  useEffect(fetch_, []);

  const add = async () => {
    if (!f.workName || !f.department || !f.contractValue) { toast.error("Work name, dept, value required"); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/company/past-works", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(f) });
      const d = await r.json();
      if (d.success) { toast.success("Added"); setOpen(false); setF(def); fetch_(); }
      else toast.error(d.error);
    } catch { toast.error("Error"); } finally { setSaving(false); }
  };

  const del = async (id: string) => {
    if (!confirm("Delete?")) return;
    const r = await fetch(`/api/company/past-works?id=${id}`, { method: "DELETE" });
    if ((await r.json()).success) { toast.success("Deleted"); fetch_(); }
  };

  const total = works.reduce((s, w) => s + Number(w.contractValue || 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-xl flex items-center gap-2"><Briefcase className="w-5 h-5 text-orange-400" /> Past Works</h2>
          <p className="text-slate-400 text-sm mt-0.5">Project experience for tender submissions</p>
        </div>
        <div className="flex items-center gap-3">
          {works.length > 0 && <div className="text-right"><p className="text-slate-500 text-xs">Total Experience</p><p className="text-green-400 font-semibold text-sm">{formatCurrency(total)}</p></div>}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="bg-orange-500 hover:bg-orange-600"><Plus className="w-4 h-4 mr-2" /> Add</Button></DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Add Past Work</DialogTitle></DialogHeader>
              <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
                <div className="space-y-1.5"><Label>Work Name *</Label><Input value={f.workName} onChange={e => setF(p => ({...p, workName: e.target.value}))} placeholder="Construction of school building at Howrah" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Department *</Label><Input value={f.department} onChange={e => setF(p => ({...p, department: e.target.value}))} placeholder="PWD, KMC..." /></div>
                  <div className="space-y-1.5"><Label>Work Order No</Label><Input value={f.workOrderNumber} onChange={e => setF(p => ({...p, workOrderNumber: e.target.value}))} placeholder="WO/2022/123" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Sector *</Label>
                    <Select value={f.sector} onValueChange={v => setF(p => ({...p, sector: v}))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{SECTORS.map(s => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5"><Label>Contract Value (₹) *</Label><Input type="number" value={f.contractValue} onChange={e => setF(p => ({...p, contractValue: e.target.value}))} placeholder="5000000" /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5"><Label>WO Date</Label><Input type="date" value={f.workOrderDate} onChange={e => setF(p => ({...p, workOrderDate: e.target.value}))} /></div>
                  <div className="space-y-1.5"><Label>Completion</Label><Input type="date" value={f.completionDate} onChange={e => setF(p => ({...p, completionDate: e.target.value}))} /></div>
                  <div className="space-y-1.5"><Label>Location</Label><Input value={f.location} onChange={e => setF(p => ({...p, location: e.target.value}))} placeholder="Howrah" /></div>
                </div>
                <div className="space-y-1.5"><Label>Work Nature</Label><Input value={f.workNature} onChange={e => setF(p => ({...p, workNature: e.target.value}))} placeholder="RCC building, 3-storey, 2500 sqm" /></div>
                <Button onClick={add} disabled={saving} className="w-full bg-orange-500 hover:bg-orange-600">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Past Work"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div> :
       works.length === 0 ? (
        <Card className="border-dashed"><CardContent className="p-12 text-center">
          <Briefcase className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-white font-medium">No past works</p>
          <p className="text-slate-500 text-sm mt-1">CEOS auto-selects relevant ones for experience statements</p>
        </CardContent></Card>
       ) : (
        <div className="space-y-3">
          {works.map(w => (
            <Card key={w.id}><CardContent className="p-4 flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-white font-semibold text-sm">{w.workName}</p>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap text-xs">
                  <span className="text-slate-400 flex items-center gap-1"><Building2 className="w-3 h-3" /> {w.department}</span>
                  <span className="text-green-400 font-semibold flex items-center gap-1"><IndianRupee className="w-3 h-3" /> {formatCurrency(Number(w.contractValue)).replace("Rs ", "")}</span>
                  {w.completionDate && <span className="text-slate-500 flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(w.completionDate).getFullYear()}</span>}
                  <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-400">{w.sector}</span>
                </div>
                {w.workNature && <p className="text-slate-500 text-xs mt-1.5">{w.workNature}</p>}
              </div>
              <Button variant="ghost" size="sm" onClick={() => del(w.id)} className="text-red-400 hover:bg-red-500/10 h-7 w-7 p-0"><Trash2 className="w-3.5 h-3.5" /></Button>
            </CardContent></Card>
          ))}
        </div>
       )}
    </div>
  );
}