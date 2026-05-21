"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, Wrench, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

const CATS = ["Excavator","JCB","Dozer","Motor Grader","Compactor","Dumper","Concrete Mixer","Batching Plant","Tower Crane","Mobile Crane","Transit Mixer","Bar Bender","Welding Machine","DG Set","Pump","Drilling Machine","Air Compressor","Other"];

export default function MachineryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ name: "", category: "JCB", make: "", yearOfMfg: "", ownershipType: "OWNED", registrationNo: "" });

  const fetch_ = () => { setLoading(true); fetch("/api/company/machinery").then(r => r.json()).then(d => d.success && setItems(d.data)).finally(() => setLoading(false)); };
  useEffect(fetch_, []);

  const add = async () => {
    if (!f.name) { toast.error("Name required"); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/company/machinery", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(f) });
      const d = await r.json();
      if (d.success) { toast.success("Added"); setOpen(false); setF({ name: "", category: "JCB", make: "", yearOfMfg: "", ownershipType: "OWNED", registrationNo: "" }); fetch_(); }
      else toast.error(d.error);
    } catch { toast.error("Error"); } finally { setSaving(false); }
  };

  const del = async (id: string) => {
    if (!confirm("Remove?")) return;
    const r = await fetch(`/api/company/machinery?id=${id}`, { method: "DELETE" });
    if ((await r.json()).success) { toast.success("Removed"); fetch_(); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-xl flex items-center gap-2"><Wrench className="w-5 h-5 text-orange-400" /> Machinery</h2>
          <p className="text-slate-400 text-sm mt-0.5">Equipment registry for tender submissions</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="bg-orange-500 hover:bg-orange-600"><Plus className="w-4 h-4 mr-2" /> Add Equipment</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Equipment</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Name *</Label><Input value={f.name} onChange={e => setF(p => ({...p, name: e.target.value}))} placeholder="JCB 3CX" /></div>
                <div className="space-y-1.5"><Label>Category</Label>
                  <Select value={f.category} onValueChange={v => setF(p => ({...p, category: v}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-48">{CATS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5"><Label>Make</Label><Input value={f.make} onChange={e => setF(p => ({...p, make: e.target.value}))} placeholder="JCB" /></div>
                <div className="space-y-1.5"><Label>Year</Label><Input type="number" value={f.yearOfMfg} onChange={e => setF(p => ({...p, yearOfMfg: e.target.value}))} placeholder="2019" /></div>
                <div className="space-y-1.5"><Label>Owned/Hired</Label>
                  <Select value={f.ownershipType} onValueChange={v => setF(p => ({...p, ownershipType: v}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OWNED">Owned</SelectItem>
                      <SelectItem value="HIRED">Hired</SelectItem>
                      <SelectItem value="LEASED">Leased</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={add} disabled={saving} className="w-full bg-orange-500 hover:bg-orange-600">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div> :
       items.length === 0 ? (
        <Card className="border-dashed"><CardContent className="p-12 text-center">
          <Wrench className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-white font-medium">No equipment added</p>
          <p className="text-slate-500 text-sm mt-1">Add owned machinery for tender submissions</p>
        </CardContent></Card>
       ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map(m => (
            <Card key={m.id}><CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center"><Wrench className="w-4 h-4 text-slate-400" /></div>
                <div>
                  <p className="text-white font-medium text-sm">{m.name}</p>
                  <p className="text-slate-400 text-xs">{m.category} {m.make && `• ${m.make}`} {m.yearOfMfg && `• ${m.yearOfMfg}`}</p>
                  <span className={`text-xs px-2 py-0.5 rounded mt-1 inline-block ${m.ownershipType === "OWNED" ? "bg-green-500/10 text-green-400" : "bg-blue-500/10 text-blue-400"}`}>{m.ownershipType}</span>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => del(m.id)} className="text-red-400 hover:bg-red-500/10 h-7 w-7 p-0"><Trash2 className="w-3.5 h-3.5" /></Button>
            </CardContent></Card>
          ))}
        </div>
       )}
    </div>
  );
}