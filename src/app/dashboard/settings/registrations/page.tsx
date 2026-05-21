"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, FileText, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

const DEPTS = ["PWD (WB)","CPWD","Railway MES","WB Housing","WBSEDCL","KMC","KMDA","NHAI","GeM","Other"];

export default function RegsPage() {
  const [regs, setRegs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ department: "", registrationNo: "", class: "", validFrom: "", validUntil: "", financialLimit: "" });

  const fetch_ = () => { setLoading(true); fetch("/api/company/registrations").then(r => r.json()).then(d => d.success && setRegs(d.data)).finally(() => setLoading(false)); };
  useEffect(fetch_, []);

  const add = async () => {
    if (!f.department || !f.registrationNo || !f.validUntil) { toast.error("Dept, reg no, validity required"); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/company/registrations", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(f) });
      const d = await r.json();
      if (d.success) { toast.success("Added"); setOpen(false); setF({ department: "", registrationNo: "", class: "", validFrom: "", validUntil: "", financialLimit: "" }); fetch_(); }
      else toast.error(d.error);
    } catch { toast.error("Error"); } finally { setSaving(false); }
  };

  const del = async (id: string) => {
    if (!confirm("Delete?")) return;
    const r = await fetch(`/api/company/registrations?id=${id}`, { method: "DELETE" });
    if ((await r.json()).success) { toast.success("Deleted"); fetch_(); }
  };

  const isExpired = (d: string) => new Date(d) < new Date();
  const isExpiringSoon = (d: string) => new Date(d).getTime() - Date.now() < 30 * 86400000;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-xl flex items-center gap-2"><FileText className="w-5 h-5 text-orange-400" /> Registrations</h2>
          <p className="text-slate-400 text-sm mt-0.5">Contractor registrations by department</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="bg-orange-500 hover:bg-orange-600"><Plus className="w-4 h-4 mr-2" /> Add</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Registration</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5"><Label>Department *</Label>
                <Select onValueChange={v => setF(p => ({...p, department: v}))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{DEPTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Registration No *</Label><Input value={f.registrationNo} onChange={e => setF(p => ({...p, registrationNo: e.target.value}))} /></div>
                <div className="space-y-1.5"><Label>Class</Label><Input value={f.class} onChange={e => setF(p => ({...p, class: e.target.value}))} placeholder="Class I, II..." /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Valid From</Label><Input type="date" value={f.validFrom} onChange={e => setF(p => ({...p, validFrom: e.target.value}))} /></div>
                <div className="space-y-1.5"><Label>Valid Until *</Label><Input type="date" value={f.validUntil} onChange={e => setF(p => ({...p, validUntil: e.target.value}))} /></div>
              </div>
              <div className="space-y-1.5"><Label>Financial Limit (₹)</Label><Input type="number" value={f.financialLimit} onChange={e => setF(p => ({...p, financialLimit: e.target.value}))} /></div>
              <Button onClick={add} disabled={saving} className="w-full bg-orange-500 hover:bg-orange-600">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div> :
       regs.length === 0 ? (
        <Card className="border-dashed"><CardContent className="p-12 text-center">
          <FileText className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-white font-medium">No registrations added</p>
        </CardContent></Card>
       ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {regs.map(r => {
            const expired = isExpired(r.validUntil);
            const soon = !expired && isExpiringSoon(r.validUntil);
            return (
              <Card key={r.id} className={cn(expired && "border-red-800/40", soon && "border-yellow-800/40")}>
                <CardContent className="p-4 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {expired ? <AlertTriangle className="w-4 h-4 text-red-400" /> : soon ? <AlertTriangle className="w-4 h-4 text-yellow-400" /> : <CheckCircle2 className="w-4 h-4 text-green-400" />}
                      <p className="text-white font-semibold text-sm">{r.department}</p>
                    </div>
                    <p className="text-slate-400 text-xs">Reg: {r.registrationNo}</p>
                    {r.class && <p className="text-slate-500 text-xs">{r.class}</p>}
                    <p className={cn("text-xs mt-1 font-medium", expired ? "text-red-400" : soon ? "text-yellow-400" : "text-green-400")}>
                      {expired ? "EXPIRED" : soon ? "Expiring soon" : "Valid"} — {new Date(r.validUntil).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => del(r.id)} className="text-red-400 hover:bg-red-500/10 h-7 w-7 p-0"><Trash2 className="w-3.5 h-3.5" /></Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
       )}
    </div>
  );
}