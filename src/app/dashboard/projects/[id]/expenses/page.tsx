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
import { ArrowLeft, IndianRupee, Plus, Loader2, Trash2, CheckCircle2, Clock } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import toast from "react-hot-toast";

const CATEGORIES = ["LABOUR", "MATERIAL", "TRANSPORT", "FUEL", "MACHINERY", "ELECTRICITY", "WATER", "RENT", "SAFETY", "FOOD", "OFFICE", "OTHER"];

export default function ExpensesPage() {
  const { id: projectId } = useParams();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({
    date: new Date().toISOString().split("T")[0],
    category: "MATERIAL", description: "", vendorName: "",
    billNumber: "", amount: "", gstAmount: "0", paymentStatus: "PENDING",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/expenses?projectId=${projectId}`);
      const d = await r.json();
      if (d.success) { setExpenses(d.expenses); setStats(d.stats); }
    } finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const add = async () => {
    if (!f.amount || !f.description) { toast.error("Description and amount required"); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/expenses", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, projectId }),
      });
      const d = await r.json();
      if (d.success) {
        toast.success("Expense added");
        setOpen(false);
        setF({ ...f, description: "", amount: "", gstAmount: "0", vendorName: "", billNumber: "" });
        fetchData();
      } else toast.error(d.error);
    } catch { toast.error("Error"); } finally { setSaving(false); }
  };

  const markPaid = async (id: string) => {
    const r = await fetch(`/api/expenses/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentStatus: "PAID" }),
    });
    if ((await r.json()).success) { toast.success("Marked paid"); fetchData(); }
  };

  const del = async (id: string) => {
    if (!confirm("Delete this expense?")) return;
    const r = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    if ((await r.json()).success) { toast.success("Deleted"); fetchData(); }
  };

  return (
    <div className="space-y-5 max-w-6xl">
      <Link href={`/dashboard/projects/${projectId}`}><Button variant="ghost" size="sm" className="-ml-2"><ArrowLeft className="w-4 h-4 mr-2" />Back to Project</Button></Link>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><IndianRupee className="w-6 h-6 text-orange-400" />Project Expenses</h1>
          <p className="text-slate-400 text-sm mt-1">Track all project-related expenses</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="bg-orange-500 hover:bg-orange-600"><Plus className="w-4 h-4 mr-2" />Add Expense</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Expense</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={f.date} onChange={e => setF(p => ({...p, date: e.target.value}))} /></div>
                <div className="space-y-1.5"><Label>Category</Label>
                  <Select value={f.category} onValueChange={v => setF(p => ({...p, category: v}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5"><Label>Description *</Label><Input value={f.description} onChange={e => setF(p => ({...p, description: e.target.value}))} placeholder="Steel TMT 12mm purchase" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Vendor</Label><Input value={f.vendorName} onChange={e => setF(p => ({...p, vendorName: e.target.value}))} /></div>
                <div className="space-y-1.5"><Label>Bill Number</Label><Input value={f.billNumber} onChange={e => setF(p => ({...p, billNumber: e.target.value}))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Amount (Rs) *</Label><Input type="number" value={f.amount} onChange={e => setF(p => ({...p, amount: e.target.value}))} /></div>
                <div className="space-y-1.5"><Label>GST Amount</Label><Input type="number" value={f.gstAmount} onChange={e => setF(p => ({...p, gstAmount: e.target.value}))} /></div>
              </div>
              <div className="space-y-1.5"><Label>Payment Status</Label>
                <Select value={f.paymentStatus} onValueChange={v => setF(p => ({...p, paymentStatus: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="PAID">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={add} disabled={saving} className="w-full bg-orange-500 hover:bg-orange-600">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Expense"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><p className="text-slate-500 text-xs uppercase">Total Expenses</p><p className="text-xl font-bold text-orange-400 mt-1">{formatCurrency(stats.totalAmount || 0)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-slate-500 text-xs uppercase">Entries</p><p className="text-2xl font-bold text-white mt-1">{stats.total || 0}</p></CardContent></Card>
        <Card className="bg-green-500/5 border-green-500/20"><CardContent className="p-4"><p className="text-green-300 text-xs uppercase">Paid</p><p className="text-2xl font-bold text-green-400 mt-1">{stats.paid || 0}</p></CardContent></Card>
        <Card className="bg-yellow-500/5 border-yellow-500/20"><CardContent className="p-4"><p className="text-yellow-300 text-xs uppercase">Pending</p><p className="text-2xl font-bold text-yellow-400 mt-1">{stats.pending || 0}</p></CardContent></Card>
      </div>

      {stats.byCategory && Object.keys(stats.byCategory).length > 0 && (
        <Card><CardContent className="p-5">
          <p className="text-slate-400 text-sm font-medium mb-3">By Category</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.byCategory).map(([cat, amt]: any) => (
              <Badge key={cat} variant="outline" className="text-sm py-1.5">
                {cat}: <span className="text-orange-400 ml-1 font-semibold">{formatCurrency(amt)}</span>
              </Badge>
            ))}
          </div>
        </CardContent></Card>
      )}

      {loading ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div> :
       expenses.length === 0 ? (
        <Card className="border-dashed"><CardContent className="p-12 text-center">
          <IndianRupee className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-white font-medium">No expenses recorded</p>
          <p className="text-slate-500 text-sm mt-1">Track every cost for profitability analysis</p>
        </CardContent></Card>
       ) : (
        <Card><CardContent className="p-0">
          <div className="divide-y divide-slate-800">
            {expenses.map(e => (
              <div key={e.id} className="p-3 hover:bg-slate-800/30 flex items-center gap-3">
                <Badge variant="outline" className="text-xs">{e.category}</Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{e.description}</p>
                  <div className="flex items-center gap-2 mt-0.5 text-xs">
                    <span className="text-slate-500">{new Date(e.date).toLocaleDateString("en-IN")}</span>
                    {e.vendorName && <span className="text-slate-500">· {e.vendorName}</span>}
                    {e.billNumber && <span className="text-slate-500">· #{e.billNumber}</span>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-orange-400 font-bold text-sm">{formatCurrency(e.totalAmount)}</p>
                  {e.gstAmount > 0 && <p className="text-slate-500 text-xs">incl. GST {formatCurrency(e.gstAmount)}</p>}
                </div>
                {e.paymentStatus === "PAID" ? (
                  <Badge className="bg-green-500/20 text-green-400 border border-green-500/30 text-xs"><CheckCircle2 className="w-3 h-3 mr-1" />Paid</Badge>
                ) : (
                  <Button onClick={() => markPaid(e.id)} size="sm" variant="outline" className="text-xs h-7">
                    <Clock className="w-3 h-3 mr-1" />Mark Paid
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => del(e.id)} className="text-red-400 hover:bg-red-500/10 h-7 w-7 p-0"><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            ))}
          </div>
        </CardContent></Card>
       )}
    </div>
  );
}