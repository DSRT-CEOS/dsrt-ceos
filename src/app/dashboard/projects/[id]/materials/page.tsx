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
import { ArrowLeft, Package, Plus, Loader2, ArrowDown, ArrowUp, Trash2, IndianRupee, Truck } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import toast from "react-hot-toast";

const CATEGORIES = ["Cement", "Steel", "Sand", "Aggregate", "Brick", "Wood", "Paint", "Electrical", "Plumbing", "Hardware", "Other"];
const UNITS = ["Bag", "MT", "Kg", "Cum", "CFT", "Nos", "Litre", "Mtr", "Sqm", "Sqft"];

export default function MaterialsPage() {
  const { id: projectId } = useParams();
  const [records, setRecords] = useState<any[]>([]);
  const [stock, setStock] = useState<any[]>([]);
  const [totals, setTotals] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"transactions" | "stock">("stock");
  const [f, setF] = useState({
    transactionType: "RECEIPT", itemName: "", category: "Cement",
    unit: "Bag", quantity: "", rate: "", vendorName: "",
    billNumber: "", vehicleNumber: "", workDescription: "",
    date: new Date().toISOString().split("T")[0],
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, sRes] = await Promise.all([
        fetch(`/api/materials?projectId=${projectId}`),
        fetch(`/api/materials/stock?projectId=${projectId}`),
      ]);
      const tData = await tRes.json();
      const sData = await sRes.json();
      if (tData.success) setRecords(tData.records);
      if (sData.success) { setStock(sData.stock); setTotals(sData.totals); }
    } finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const add = async () => {
    if (!f.itemName || !f.quantity) { toast.error("Item and quantity required"); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/materials", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, projectId }),
      });
      const d = await r.json();
      if (d.success) {
        toast.success("Material entry added");
        setOpen(false);
        setF({ ...f, itemName: "", quantity: "", rate: "", billNumber: "", vehicleNumber: "" });
        fetchData();
      } else toast.error(d.error);
    } catch { toast.error("Error"); } finally { setSaving(false); }
  };

  const del = async (id: string) => {
    if (!confirm("Delete this entry?")) return;
    const r = await fetch(`/api/materials/${id}`, { method: "DELETE" });
    if ((await r.json()).success) { toast.success("Deleted"); fetchData(); }
  };

  return (
    <div className="space-y-5 max-w-6xl">
      <Link href={`/dashboard/projects/${projectId}`}><Button variant="ghost" size="sm" className="-ml-2"><ArrowLeft className="w-4 h-4 mr-2" />Back to Project</Button></Link>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Package className="w-6 h-6 text-orange-400" />Materials</h1>
          <p className="text-slate-400 text-sm mt-1">Track receipts, issues, and stock</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="bg-orange-500 hover:bg-orange-600"><Plus className="w-4 h-4 mr-2" />New Entry</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Material Entry</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Type</Label>
                  <Select value={f.transactionType} onValueChange={v => setF(p => ({...p, transactionType: v}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RECEIPT">Receipt (Incoming)</SelectItem>
                      <SelectItem value="ISSUE">Issue (Used on Site)</SelectItem>
                      <SelectItem value="RETURN">Return</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={f.date} onChange={e => setF(p => ({...p, date: e.target.value}))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Item Name *</Label><Input value={f.itemName} onChange={e => setF(p => ({...p, itemName: e.target.value}))} placeholder="OPC 43 Grade Cement" /></div>
                <div className="space-y-1.5"><Label>Category</Label>
                  <Select value={f.category} onValueChange={v => setF(p => ({...p, category: v}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5"><Label>Quantity *</Label><Input type="number" value={f.quantity} onChange={e => setF(p => ({...p, quantity: e.target.value}))} /></div>
                <div className="space-y-1.5"><Label>Unit</Label>
                  <Select value={f.unit} onValueChange={v => setF(p => ({...p, unit: v}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Rate per Unit (Rs)</Label><Input type="number" value={f.rate} onChange={e => setF(p => ({...p, rate: e.target.value}))} placeholder="Optional" /></div>
              </div>
              {f.transactionType === "RECEIPT" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5"><Label>Vendor</Label><Input value={f.vendorName} onChange={e => setF(p => ({...p, vendorName: e.target.value}))} /></div>
                    <div className="space-y-1.5"><Label>Bill Number</Label><Input value={f.billNumber} onChange={e => setF(p => ({...p, billNumber: e.target.value}))} /></div>
                  </div>
                  <div className="space-y-1.5"><Label>Vehicle Number</Label><Input value={f.vehicleNumber} onChange={e => setF(p => ({...p, vehicleNumber: e.target.value}))} placeholder="WB 12 AB 1234" /></div>
                </>
              )}
              {f.transactionType === "ISSUE" && (
                <div className="space-y-1.5"><Label>Work Description</Label><Input value={f.workDescription} onChange={e => setF(p => ({...p, workDescription: e.target.value}))} placeholder="Foundation casting" /></div>
              )}
              <Button onClick={add} disabled={saving} className="w-full bg-orange-500 hover:bg-orange-600">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Entry"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><p className="text-slate-500 text-xs uppercase">Total Items</p><p className="text-2xl font-bold text-white mt-1">{totals.totalItems || 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-slate-500 text-xs uppercase">Total Value</p><p className="text-lg font-bold text-green-400 mt-1">{formatCurrency(totals.totalValue || 0)}</p></CardContent></Card>
        <Card className={cn(totals.lowStockItems > 0 && "bg-red-500/5 border-red-500/20")}><CardContent className="p-4"><p className="text-slate-500 text-xs uppercase">Low Stock Alert</p><p className={cn("text-2xl font-bold mt-1", totals.lowStockItems > 0 ? "text-red-400" : "text-slate-400")}>{totals.lowStockItems || 0}</p></CardContent></Card>
      </div>

      <div className="flex gap-2">
        <Button variant={tab === "stock" ? "default" : "outline"} onClick={() => setTab("stock")} className={tab === "stock" ? "bg-orange-500 hover:bg-orange-600" : ""}>Stock Register</Button>
        <Button variant={tab === "transactions" ? "default" : "outline"} onClick={() => setTab("transactions")} className={tab === "transactions" ? "bg-orange-500 hover:bg-orange-600" : ""}>Transactions</Button>
      </div>

      {loading ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div> :
       tab === "stock" ? (
        stock.length === 0 ? (
          <Card className="border-dashed"><CardContent className="p-12 text-center">
            <Package className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p className="text-white font-medium">No materials yet</p>
            <p className="text-slate-500 text-sm mt-1">Add receipts to track material stock</p>
          </CardContent></Card>
        ) : (
          <Card><CardContent className="p-0">
            <div className="divide-y divide-slate-800">
              {stock.map((s, i) => (
                <div key={i} className="p-4 hover:bg-slate-800/30">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div>
                      <p className="text-white font-semibold text-sm">{s.itemName}</p>
                      <Badge variant="outline" className="text-xs mt-1">{s.category}</Badge>
                    </div>
                    <div className="text-right">
                      <p className={cn("text-2xl font-bold", s.balance < 0 ? "text-red-400" : "text-green-400")}>{s.balance.toFixed(2)} <span className="text-sm text-slate-500">{s.unit}</span></p>
                      <p className="text-slate-500 text-xs">Balance</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div className="p-2 bg-green-500/5 rounded"><p className="text-slate-500">Received</p><p className="text-green-400 font-semibold">{s.received.toFixed(2)}</p></div>
                    <div className="p-2 bg-blue-500/5 rounded"><p className="text-slate-500">Issued</p><p className="text-blue-400 font-semibold">{s.issued.toFixed(2)}</p></div>
                    <div className="p-2 bg-yellow-500/5 rounded"><p className="text-slate-500">Returned</p><p className="text-yellow-400 font-semibold">{s.returned.toFixed(2)}</p></div>
                    <div className="p-2 bg-slate-800/50 rounded"><p className="text-slate-500">Avg Rate</p><p className="text-white font-semibold">{formatCurrency(s.avgRate)}</p></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent></Card>
        )
       ) : (
        records.length === 0 ? (
          <Card className="border-dashed"><CardContent className="p-12 text-center"><p className="text-slate-500">No transactions yet</p></CardContent></Card>
        ) : (
          <Card><CardContent className="p-0">
            <div className="divide-y divide-slate-800">
              {records.map(r => (
                <div key={r.id} className="p-3 hover:bg-slate-800/30 flex items-center gap-3">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                    r.transactionType === "RECEIPT" ? "bg-green-500/10 text-green-400" :
                    r.transactionType === "ISSUE" ? "bg-blue-500/10 text-blue-400" :
                    "bg-yellow-500/10 text-yellow-400")}>
                    {r.transactionType === "RECEIPT" ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{r.itemName}</p>
                    <div className="flex items-center gap-3 mt-0.5 text-xs">
                      <span className="text-slate-500">{new Date(r.date).toLocaleDateString("en-IN")}</span>
                      {r.vendorName && <span className="text-slate-500 flex items-center gap-1"><Truck className="w-3 h-3" />{r.vendorName}</span>}
                      {r.billNumber && <span className="text-slate-500">#{r.billNumber}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn("font-bold text-sm",
                      r.transactionType === "RECEIPT" ? "text-green-400" :
                      r.transactionType === "ISSUE" ? "text-blue-400" : "text-yellow-400"
                    )}>{r.transactionType === "RECEIPT" ? "+" : "-"}{r.quantity} {r.unit}</p>
                    {r.amount && <p className="text-slate-500 text-xs">{formatCurrency(r.amount)}</p>}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => del(r.id)} className="text-red-400 hover:bg-red-500/10 h-7 w-7 p-0"><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              ))}
            </div>
          </CardContent></Card>
        )
       )}
    </div>
  );
}