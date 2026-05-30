"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Building2, Phone, Mail, MapPin, CreditCard, Plus, Loader2, IndianRupee, Briefcase, CheckCircle2, Star, Trash2 } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import toast from "react-hot-toast";

export default function SubcontractorDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [sub, setSub] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignOpen, setAssignOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [aForm, setAForm] = useState({
    projectId: "", workDescription: "", contractAmount: "", startDate: "", endDate: "", notes: "",
  });

  const [pForm, setPForm] = useState({
    amount: "", paymentDate: new Date().toISOString().split("T")[0],
    paymentMethod: "BANK_TRANSFER", reference: "", tdsDeducted: "0", projectId: "", notes: "",
  });

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, pRes] = await Promise.all([
        fetch(`/api/subcontractors/${id}`),
        fetch("/api/projects"),
      ]);
      const sData = await sRes.json();
      const pData = await pRes.json();
      if (sData.success) setSub(sData.subcontractor);
      if (pData.success) setProjects(pData.projects);
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const assign = async () => {
    if (!aForm.projectId || !aForm.workDescription || !aForm.contractAmount) { toast.error("All fields required"); return; }
    setSaving(true);
    try {
      const r = await fetch(`/api/subcontractors/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "assign", ...aForm })
      });
      const d = await r.json();
      if (d.success) {
        toast.success("Work assigned");
        setAssignOpen(false);
        setAForm({ projectId: "", workDescription: "", contractAmount: "", startDate: "", endDate: "", notes: "" });
        fetch_();
      } else toast.error(d.error);
    } finally { setSaving(false); }
  };

  const pay = async () => {
    if (!pForm.amount || !pForm.paymentDate) { toast.error("Amount and date required"); return; }
    setSaving(true);
    try {
      const r = await fetch(`/api/subcontractors/${id}/payments`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pForm)
      });
      const d = await r.json();
      if (d.success) {
        toast.success("Payment recorded");
        setPayOpen(false);
        setPForm({ amount: "", paymentDate: new Date().toISOString().split("T")[0], paymentMethod: "BANK_TRANSFER", reference: "", tdsDeducted: "0", projectId: "", notes: "" });
        fetch_();
      } else toast.error(d.error);
    } finally { setSaving(false); }
  };

  const updateRating = async (rating: number) => {
    await fetch(`/api/subcontractors/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating })
    });
    fetch_();
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  if (!sub) return <div className="text-center py-20"><p className="text-muted-foreground">Not found</p></div>;

  const outstanding = Number(sub.totalAwarded) - Number(sub.totalPaid);

  return (
    <div className="space-y-5 max-w-6xl">
      <Link href="/dashboard/subcontractors"><Button variant="ghost" size="sm" className="-ml-2"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button></Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-primary/10 border border-primary/30 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-primary font-bold text-xl">{sub.name.charAt(0)}</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{sub.name}</h1>
            {sub.contactPerson && <p className="text-muted-foreground text-sm">{sub.contactPerson}</p>}
            <div className="flex items-center gap-1 mt-2">
              {Array.from({length: 5}).map((_, i) => (
                <button key={i} onClick={() => updateRating(i + 1)}>
                  <Star className={cn("w-4 h-4", i < (sub.rating || 0) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/40 hover:text-yellow-400")} />
                </button>
              ))}
              <span className="text-muted-foreground text-xs ml-2">Click stars to rate</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
            <DialogTrigger asChild><Button variant="outline"><Briefcase className="w-4 h-4 mr-2" />Assign Work</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Assign Work to {sub.name}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Project *</Label>
                  <Select value={aForm.projectId} onValueChange={v => setAForm(p => ({...p, projectId: v}))}>
                    <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                    <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Work Description *</Label><Input value={aForm.workDescription} onChange={e => setAForm(p => ({...p, workDescription: e.target.value}))} placeholder="Electrical wiring for entire building" /></div>
                <div className="space-y-1.5"><Label>Contract Amount (Rs) *</Label><Input type="number" value={aForm.contractAmount} onChange={e => setAForm(p => ({...p, contractAmount: e.target.value}))} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Start Date</Label><Input type="date" value={aForm.startDate} onChange={e => setAForm(p => ({...p, startDate: e.target.value}))} /></div>
                  <div className="space-y-1.5"><Label>End Date</Label><Input type="date" value={aForm.endDate} onChange={e => setAForm(p => ({...p, endDate: e.target.value}))} /></div>
                </div>
                <Button onClick={assign} disabled={saving} className="w-full">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Assign Work"}</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={payOpen} onOpenChange={setPayOpen}>
            <DialogTrigger asChild><Button><IndianRupee className="w-4 h-4 mr-2" />Record Payment</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Amount (Rs) *</Label><Input type="number" value={pForm.amount} onChange={e => setPForm(p => ({...p, amount: e.target.value}))} /></div>
                  <div className="space-y-1.5"><Label>Date *</Label><Input type="date" value={pForm.paymentDate} onChange={e => setPForm(p => ({...p, paymentDate: e.target.value}))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Method</Label>
                    <Select value={pForm.paymentMethod} onValueChange={v => setPForm(p => ({...p, paymentMethod: v}))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                        <SelectItem value="CHEQUE">Cheque</SelectItem>
                        <SelectItem value="CASH">Cash</SelectItem>
                        <SelectItem value="UPI">UPI</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5"><Label>Reference / UTR</Label><Input value={pForm.reference} onChange={e => setPForm(p => ({...p, reference: e.target.value}))} /></div>
                </div>
                <div className="space-y-1.5"><Label>TDS Deducted (Rs)</Label><Input type="number" value={pForm.tdsDeducted} onChange={e => setPForm(p => ({...p, tdsDeducted: e.target.value}))} placeholder="1% for individual, 2% for companies" /></div>
                <Button onClick={pay} disabled={saving} className="w-full">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Record Payment"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Contact info */}
      {(sub.phone || sub.email || sub.address || sub.panNumber || sub.gstNumber) && (
        <Card><CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            {sub.phone && <div className="flex items-center gap-2 text-muted-foreground"><Phone className="w-4 h-4 text-primary" />{sub.phone}</div>}
            {sub.email && <div className="flex items-center gap-2 text-muted-foreground truncate"><Mail className="w-4 h-4 text-primary" />{sub.email}</div>}
            {sub.panNumber && <div className="flex items-center gap-2 text-muted-foreground"><CreditCard className="w-4 h-4 text-primary" />PAN: {sub.panNumber}</div>}
            {sub.gstNumber && <div className="flex items-center gap-2 text-muted-foreground"><CreditCard className="w-4 h-4 text-primary" />GST: {sub.gstNumber}</div>}
          </div>
          {sub.address && <p className="text-muted-foreground text-sm mt-2 flex items-start gap-2"><MapPin className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />{sub.address}</p>}
        </CardContent></Card>
      )}

      {/* Financial Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4">
          <p className="text-muted-foreground text-xs uppercase">Awarded</p>
          <p className="text-xl font-bold text-primary mt-1">{formatCurrency(sub.totalAwarded)}</p>
        </CardContent></Card>
        <Card className="bg-success/5 border-success/20"><CardContent className="p-4">
          <p className="text-muted-foreground text-xs uppercase">Paid</p>
          <p className="text-xl font-bold text-success mt-1">{formatCurrency(sub.totalPaid)}</p>
        </CardContent></Card>
        <Card className={cn(outstanding > 0 ? "bg-destructive/5 border-destructive/20" : "")}>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs uppercase">Outstanding</p>
            <p className={cn("text-xl font-bold mt-1", outstanding > 0 ? "text-destructive" : "text-success")}>{formatCurrency(outstanding)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Work Assignments */}
      <Card><CardContent className="p-5">
        <h3 className="text-foreground font-semibold mb-3 flex items-center gap-2"><Briefcase className="w-4 h-4 text-primary" />Work Assignments ({sub.assignments?.length || 0})</h3>
        {!sub.assignments || sub.assignments.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-6">No work assigned yet</p>
        ) : (
          <div className="space-y-2">
            {sub.assignments.map((a: any) => (
              <div key={a.id} className="p-3 bg-secondary/30 border border-border rounded-md">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground font-medium text-sm">{a.workDescription}</p>
                    <p className="text-muted-foreground text-xs mt-1">{a.project.name} · {a.project.department}</p>
                    {(a.startDate || a.endDate) && (
                      <p className="text-muted-foreground text-xs mt-1">
                        {a.startDate ? new Date(a.startDate).toLocaleDateString("en-IN") : "—"} to {a.endDate ? new Date(a.endDate).toLocaleDateString("en-IN") : "ongoing"}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-primary font-semibold">{formatCurrency(a.contractAmount)}</p>
                    <Badge variant="outline" className="text-xs mt-1">{a.status}</Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent></Card>

      {/* Payments */}
      <Card><CardContent className="p-5">
        <h3 className="text-foreground font-semibold mb-3 flex items-center gap-2"><IndianRupee className="w-4 h-4 text-success" />Payment History ({sub.payments?.length || 0})</h3>
        {!sub.payments || sub.payments.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-6">No payments recorded</p>
        ) : (
          <div className="space-y-2">
            {sub.payments.map((p: any) => (
              <div key={p.id} className="p-3 bg-secondary/30 border border-border rounded-md flex items-center justify-between">
                <div>
                  <p className="text-foreground font-semibold text-sm">{formatCurrency(p.amount)}</p>
                  <p className="text-muted-foreground text-xs">{new Date(p.paymentDate).toLocaleDateString("en-IN")} · {p.paymentMethod.replace(/_/g, " ")}</p>
                  {p.reference && <p className="text-muted-foreground text-xs">Ref: {p.reference}</p>}
                </div>
                {p.tdsDeducted > 0 && <Badge variant="outline" className="text-xs">TDS: {formatCurrency(p.tdsDeducted)}</Badge>}
              </div>
            ))}
          </div>
        )}
      </CardContent></Card>
    </div>
  );
}