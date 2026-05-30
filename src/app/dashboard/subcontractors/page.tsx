"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, Plus, Loader2, Phone, Mail, IndianRupee, Star, Trash2, ArrowRight } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import toast from "react-hot-toast";

const SPECIALIZATIONS = ["Electrical", "Plumbing", "Painting", "Tiling", "Carpentry", "Welding", "Excavation", "Concrete Work", "Steel Work", "Glass Work", "False Ceiling", "Other"];

export default function SubcontractorsPage() {
  const [subs, setSubs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({
    name: "", contactPerson: "", phone: "", email: "",
    panNumber: "", gstNumber: "", address: "",
    bankAccount: "", bankIfsc: "", notes: "",
    specialization: [] as string[],
  });

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/subcontractors");
      const d = await r.json();
      if (d.success) { setSubs(d.subcontractors); setStats(d.stats); }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const toggleSpec = (s: string) => {
    setF(p => ({ ...p, specialization: p.specialization.includes(s) ? p.specialization.filter(x => x !== s) : [...p.specialization, s] }));
  };

  const add = async () => {
    if (!f.name) { toast.error("Name required"); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/subcontractors", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f)
      });
      const d = await r.json();
      if (d.success) {
        toast.success("Sub-contractor added");
        setOpen(false);
        setF({ name: "", contactPerson: "", phone: "", email: "", panNumber: "", gstNumber: "", address: "", bankAccount: "", bankIfsc: "", notes: "", specialization: [] });
        fetch_();
      } else toast.error(d.error);
    } catch { toast.error("Error"); } finally { setSaving(false); }
  };

  const del = async (id: string) => {
    if (!confirm("Remove this sub-contractor?")) return;
    const r = await fetch(`/api/subcontractors/${id}`, { method: "DELETE" });
    if ((await r.json()).success) { toast.success("Removed"); fetch_(); }
  };

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />Sub-contractors
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Track external contractors, awards, and payments</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Add Sub-contractor</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Add Sub-contractor</DialogTitle></DialogHeader>
            <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Company / Person Name *</Label><Input value={f.name} onChange={e => setF(p => ({...p, name: e.target.value}))} placeholder="ABC Electricals" /></div>
                <div className="space-y-1.5"><Label>Contact Person</Label><Input value={f.contactPerson} onChange={e => setF(p => ({...p, contactPerson: e.target.value}))} placeholder="Mr. Sharma" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Phone</Label><Input value={f.phone} onChange={e => setF(p => ({...p, phone: e.target.value}))} placeholder="+91 98765 43210" /></div>
                <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={f.email} onChange={e => setF(p => ({...p, email: e.target.value}))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>PAN</Label><Input value={f.panNumber} onChange={e => setF(p => ({...p, panNumber: e.target.value.toUpperCase()}))} maxLength={10} /></div>
                <div className="space-y-1.5"><Label>GST Number</Label><Input value={f.gstNumber} onChange={e => setF(p => ({...p, gstNumber: e.target.value.toUpperCase()}))} maxLength={15} /></div>
              </div>
              <div className="space-y-1.5"><Label>Address</Label><Input value={f.address} onChange={e => setF(p => ({...p, address: e.target.value}))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Bank Account</Label><Input value={f.bankAccount} onChange={e => setF(p => ({...p, bankAccount: e.target.value}))} /></div>
                <div className="space-y-1.5"><Label>IFSC</Label><Input value={f.bankIfsc} onChange={e => setF(p => ({...p, bankIfsc: e.target.value.toUpperCase()}))} /></div>
              </div>
              <div>
                <Label className="mb-2 block">Specialization</Label>
                <div className="flex flex-wrap gap-2">
                  {SPECIALIZATIONS.map(s => (
                    <button key={s} type="button" onClick={() => toggleSpec(s)}
                      className={cn("px-3 py-1.5 rounded-md text-xs font-medium border transition-all",
                        f.specialization.includes(s)
                          ? "bg-primary/15 border-primary/50 text-primary"
                          : "bg-secondary border-border text-muted-foreground hover:border-primary/30")}>{s}</button>
                  ))}
                </div>
              </div>
              <Button onClick={add} disabled={saving} className="w-full">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Sub-contractor"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 text-center"><p className="text-muted-foreground text-xs uppercase">Total</p><p className="text-2xl font-bold text-foreground mt-1">{stats.total || 0}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-muted-foreground text-xs uppercase">Awarded</p><p className="text-lg font-bold text-primary mt-1">{formatCurrency(stats.totalAwarded || 0)}</p></CardContent></Card>
        <Card className="bg-success/5 border-success/20"><CardContent className="p-4 text-center"><p className="text-muted-foreground text-xs uppercase">Paid</p><p className="text-lg font-bold text-success mt-1">{formatCurrency(stats.totalPaid || 0)}</p></CardContent></Card>
        <Card className="bg-destructive/5 border-destructive/20"><CardContent className="p-4 text-center"><p className="text-muted-foreground text-xs uppercase">Outstanding</p><p className="text-lg font-bold text-destructive mt-1">{formatCurrency(stats.outstanding || 0)}</p></CardContent></Card>
      </div>

      {loading ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div> :
       subs.length === 0 ? (
        <Card className="border-dashed"><CardContent className="p-12 text-center">
          <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-foreground font-medium">No sub-contractors yet</p>
          <p className="text-muted-foreground text-sm mt-1">Add external contractors to track work assignments and payments</p>
        </CardContent></Card>
       ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {subs.map(s => (
            <Link key={s.id} href={`/dashboard/subcontractors/${s.id}`}>
              <Card className="hover:border-primary/30 transition-all cursor-pointer group">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-primary/10 border border-primary/30 rounded-md flex items-center justify-center flex-shrink-0">
                        <span className="text-primary font-bold">{s.name.charAt(0)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground font-semibold text-sm truncate">{s.name}</p>
                        {s.contactPerson && <p className="text-muted-foreground text-xs">{s.contactPerson}</p>}
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          {s.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{s.phone}</span>}
                          {s.email && <span className="flex items-center gap-1 truncate"><Mail className="w-3 h-3" />{s.email}</span>}
                        </div>
                      </div>
                    </div>
                    {s.rating && (
                      <div className="flex items-center gap-0.5">
                        {Array.from({length: 5}).map((_, i) => (
                          <Star key={i} className={cn("w-3 h-3", i < s.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30")} />
                        ))}
                      </div>
                    )}
                  </div>

                  {s.specialization?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {s.specialization.slice(0, 3).map((sp: string) => (
                        <Badge key={sp} variant="outline" className="text-[10px]">{sp}</Badge>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border text-xs">
                    <div><p className="text-muted-foreground">Awarded</p><p className="text-primary font-semibold">{formatCurrency(s.totalAwarded)}</p></div>
                    <div><p className="text-muted-foreground">Paid</p><p className="text-success font-semibold">{formatCurrency(s.totalPaid)}</p></div>
                    <div><p className="text-muted-foreground">Pending</p><p className="text-destructive font-semibold">{formatCurrency(s.outstanding)}</p></div>
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-border">
                    <span className="text-muted-foreground text-xs">{s._count.assignments} jobs · {s._count.payments} payments</span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
       )}
    </div>
  );
}