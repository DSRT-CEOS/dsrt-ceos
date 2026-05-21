"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, Users, Trash2, GraduationCap, Briefcase } from "lucide-react";
import toast from "react-hot-toast";

const DESIG = ["Site Engineer","Asst Engineer","Junior Engineer","Project Manager","Site Supervisor","Foreman","Safety Officer","QC Inspector","Electrical Engineer","Mechanical Engineer","Store Keeper","Accountant"];

export default function StaffPage() {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ name: "", designation: "", qualification: "", experienceYears: "", aadhaarNumber: "", panNumber: "" });

  const fetch_ = () => { setLoading(true); fetch("/api/company/staff").then(r => r.json()).then(d => d.success && setStaff(d.data)).finally(() => setLoading(false)); };
  useEffect(fetch_, []);

  const add = async () => {
    if (!f.name || !f.designation) { toast.error("Name and designation required"); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/company/staff", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(f) });
      const d = await r.json();
      if (d.success) { toast.success("Added"); setOpen(false); setF({ name: "", designation: "", qualification: "", experienceYears: "", aadhaarNumber: "", panNumber: "" }); fetch_(); }
      else toast.error(d.error);
    } catch { toast.error("Error"); } finally { setSaving(false); }
  };

  const del = async (id: string) => {
    if (!confirm("Remove this staff member?")) return;
    const r = await fetch(`/api/company/staff?id=${id}`, { method: "DELETE" });
    const d = await r.json();
    if (d.success) { toast.success("Removed"); fetch_(); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-xl flex items-center gap-2"><Users className="w-5 h-5 text-orange-400" /> Staff Members</h2>
          <p className="text-slate-400 text-sm mt-0.5">Engineers and personnel used in tender submissions</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="bg-orange-500 hover:bg-orange-600"><Plus className="w-4 h-4 mr-2" /> Add Staff</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Staff Member</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Name *</Label><Input value={f.name} onChange={e => setF(p => ({...p, name: e.target.value}))} placeholder="Rajesh Kumar" /></div>
                <div className="space-y-1.5"><Label>Designation *</Label>
                  <Select onValueChange={v => setF(p => ({...p, designation: v}))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{DESIG.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Qualification</Label><Input value={f.qualification} onChange={e => setF(p => ({...p, qualification: e.target.value}))} placeholder="B.Tech Civil" /></div>
                <div className="space-y-1.5"><Label>Experience (Years)</Label><Input type="number" value={f.experienceYears} onChange={e => setF(p => ({...p, experienceYears: e.target.value}))} placeholder="5" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Aadhaar</Label><Input value={f.aadhaarNumber} onChange={e => setF(p => ({...p, aadhaarNumber: e.target.value}))} maxLength={14} /></div>
                <div className="space-y-1.5"><Label>PAN</Label><Input value={f.panNumber} onChange={e => setF(p => ({...p, panNumber: e.target.value.toUpperCase()}))} maxLength={10} /></div>
              </div>
              <Button onClick={add} disabled={saving} className="w-full bg-orange-500 hover:bg-orange-600">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div> :
       staff.length === 0 ? (
        <Card className="border-dashed"><CardContent className="p-12 text-center">
          <Users className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-white font-medium">No staff added</p>
          <p className="text-slate-500 text-sm mt-1">Add your engineers — used in tender submissions automatically</p>
        </CardContent></Card>
       ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {staff.map(s => (
            <Card key={s.id}><CardContent className="p-4 flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-orange-500/10 border border-orange-500/20 rounded-full flex items-center justify-center">
                  <span className="text-orange-400 font-bold">{s.name.charAt(0)}</span>
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{s.name}</p>
                  <p className="text-slate-400 text-xs">{s.designation}</p>
                  {s.qualification && <p className="text-slate-500 text-xs flex items-center gap-1 mt-1"><GraduationCap className="w-3 h-3" /> {s.qualification}</p>}
                  {s.experienceYears && <p className="text-slate-500 text-xs flex items-center gap-1"><Briefcase className="w-3 h-3" /> {s.experienceYears} years</p>}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => del(s.id)} className="text-red-400 hover:bg-red-500/10 h-7 w-7 p-0"><Trash2 className="w-3.5 h-3.5" /></Button>
            </CardContent></Card>
          ))}
        </div>
       )}
    </div>
  );
}