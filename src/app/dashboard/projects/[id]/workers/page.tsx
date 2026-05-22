"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Users, Trash2, Loader2, IndianRupee, Phone } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

const SKILLS = [
  { v: "UNSKILLED", l: "Unskilled Labor" },
  { v: "SEMI_SKILLED", l: "Semi-Skilled" },
  { v: "SKILLED", l: "Skilled" },
  { v: "HIGHLY_SKILLED", l: "Highly Skilled" },
];

const TRADES = ["Mason", "Carpenter", "Electrician", "Plumber", "Welder", "Painter", "Helper", "Driver", "Operator", "Steel Fixer", "Bar Bender", "Other"];

export default function WorkersPage() {
  const { id: projectId } = useParams();
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ name: "", aadhaarNumber: "", phone: "", skillType: "UNSKILLED", trade: "", dailyWage: "", bankAccount: "", bankIfsc: "" });

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/workers?projectId=${projectId}`);
      const d = await r.json();
      if (d.success) setWorkers(d.workers);
    } finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const add = async () => {
    if (!f.name || !f.dailyWage) { toast.error("Name and wage required"); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/workers", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, projectId })
      });
      const d = await r.json();
      if (d.success) { toast.success("Worker added"); setOpen(false); setF({ name: "", aadhaarNumber: "", phone: "", skillType: "UNSKILLED", trade: "", dailyWage: "", bankAccount: "", bankIfsc: "" }); fetch_(); }
      else toast.error(d.error);
    } catch { toast.error("Error"); } finally { setSaving(false); }
  };

  const del = async (id: string) => {
    if (!confirm("Remove this worker?")) return;
    const r = await fetch(`/api/workers/${id}`, { method: "DELETE" });
    if ((await r.json()).success) { toast.success("Removed"); fetch_(); }
  };

  return (
    <div className="space-y-5 max-w-5xl">
      <Link href={`/dashboard/projects/${projectId}`}><Button variant="ghost" size="sm" className="-ml-2"><ArrowLeft className="w-4 h-4 mr-2" />Back to Project</Button></Link>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Users className="w-6 h-6 text-orange-400" />Workers</h1>
          <p className="text-slate-400 text-sm mt-1">Site workforce for this project</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="bg-orange-500 hover:bg-orange-600"><Plus className="w-4 h-4 mr-2" />Add Worker</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Worker</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5"><Label>Full Name *</Label><Input value={f.name} onChange={e => setF(p => ({...p, name: e.target.value}))} placeholder="Worker name" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Aadhaar</Label><Input value={f.aadhaarNumber} onChange={e => setF(p => ({...p, aadhaarNumber: e.target.value}))} maxLength={14} /></div>
                <div className="space-y-1.5"><Label>Phone</Label><Input value={f.phone} onChange={e => setF(p => ({...p, phone: e.target.value}))} placeholder="98765 43210" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Skill Type</Label>
                  <Select value={f.skillType} onValueChange={v => setF(p => ({...p, skillType: v}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SKILLS.map(s => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Trade</Label>
                  <Select value={f.trade} onValueChange={v => setF(p => ({...p, trade: v}))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{TRADES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5"><Label>Daily Wage (Rs) *</Label><Input type="number" value={f.dailyWage} onChange={e => setF(p => ({...p, dailyWage: e.target.value}))} placeholder="500" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Bank Account</Label><Input value={f.bankAccount} onChange={e => setF(p => ({...p, bankAccount: e.target.value}))} /></div>
                <div className="space-y-1.5"><Label>IFSC Code</Label><Input value={f.bankIfsc} onChange={e => setF(p => ({...p, bankIfsc: e.target.value.toUpperCase()}))} /></div>
              </div>
              <Button onClick={add} disabled={saving} className="w-full bg-orange-500 hover:bg-orange-600">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Worker"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><p className="text-slate-500 text-xs uppercase">Total Workers</p><p className="text-2xl font-bold text-white mt-1">{workers.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-slate-500 text-xs uppercase">Skilled</p><p className="text-2xl font-bold text-green-400 mt-1">{workers.filter(w => w.skillType === "SKILLED" || w.skillType === "HIGHLY_SKILLED").length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-slate-500 text-xs uppercase">Unskilled</p><p className="text-2xl font-bold text-blue-400 mt-1">{workers.filter(w => w.skillType === "UNSKILLED").length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-slate-500 text-xs uppercase">Avg Wage</p><p className="text-2xl font-bold text-orange-400 mt-1">{formatCurrency(workers.length > 0 ? workers.reduce((s, w) => s + Number(w.dailyWage), 0) / workers.length : 0)}</p></CardContent></Card>
      </div>

      {loading ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div> :
       workers.length === 0 ? (
        <Card className="border-dashed"><CardContent className="p-12 text-center">
          <Users className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-white font-medium">No workers added</p>
          <p className="text-slate-500 text-sm mt-1">Add workers to start tracking attendance and wages</p>
        </CardContent></Card>
       ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {workers.map(w => (
            <Card key={w.id}><CardContent className="p-4 flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <div className="w-10 h-10 bg-orange-500/10 border border-orange-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-orange-400 font-bold">{w.name.charAt(0)}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white font-semibold text-sm">{w.name}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant="outline" className="text-xs">{w.skillType.replace(/_/g, " ")}</Badge>
                    {w.trade && <Badge variant="outline" className="text-xs text-blue-400 border-blue-500/30">{w.trade}</Badge>}
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs">
                    <span className="text-green-400 font-semibold flex items-center gap-1"><IndianRupee className="w-3 h-3" />{formatCurrency(w.dailyWage)}/day</span>
                    {w.phone && <span className="text-slate-500 flex items-center gap-1"><Phone className="w-3 h-3" />{w.phone}</span>}
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => del(w.id)} className="text-red-400 hover:bg-red-500/10 h-7 w-7 p-0"><Trash2 className="w-3.5 h-3.5" /></Button>
            </CardContent></Card>
          ))}
        </div>
       )}
    </div>
  );
}