"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, FileText, Plus, Loader2, Download, ExternalLink, Trash2, Receipt, Calculator } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

export default function GSTInvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [f, setF] = useState({
    invoiceDate: new Date().toISOString().split("T")[0],
    buyerName: "", buyerGstin: "", buyerAddress: "", placeOfSupply: "",
    itemDescription: "", hsnSacCode: "9954",
    quantity: "1", unit: "Job", taxableValue: "", gstRate: "18",
    notes: "",
  });

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/gst-invoice");
      const d = await r.json();
      if (d.success) { setInvoices(d.invoices); setStats(d.stats); }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const create = async () => {
    if (!f.buyerName || !f.itemDescription || !f.taxableValue) { toast.error("Buyer, description, value required"); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/gst-invoice", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f)
      });
      const d = await r.json();
      if (d.success) {
        toast.success("Invoice created");
        setOpen(false);
        setF({ invoiceDate: new Date().toISOString().split("T")[0], buyerName: "", buyerGstin: "", buyerAddress: "", placeOfSupply: "", itemDescription: "", hsnSacCode: "9954", quantity: "1", unit: "Job", taxableValue: "", gstRate: "18", notes: "" });
        fetch_();
      } else toast.error(d.error);
    } catch { toast.error("Error"); } finally { setSaving(false); }
  };

  const generatePDF = async (id: string) => {
    setGenerating(id);
    try {
      const r = await fetch(`/api/gst-invoice/${id}`);
      const d = await r.json();
      if (d.success) { window.open(d.url, "_blank"); fetch_(); }
      else toast.error(d.error);
    } finally { setGenerating(null); }
  };

  const del = async (id: string) => {
    if (!confirm("Delete this invoice?")) return;
    const r = await fetch(`/api/gst-invoice/${id}`, { method: "DELETE" });
    if ((await r.json()).success) { toast.success("Deleted"); fetch_(); }
  };

  // Live GST calculation preview
  const taxable = parseFloat(f.taxableValue) || 0;
  const rate = parseFloat(f.gstRate) || 18;
  const gst = (taxable * rate) / 100;
  const total = taxable + gst;

  return (
    <div className="space-y-5 max-w-6xl">
      <Link href="/dashboard/billing"><Button variant="ghost" size="sm" className="-ml-2"><ArrowLeft className="w-4 h-4 mr-2" />Back to Billing</Button></Link>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />GST Tax Invoices
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Generate tax-compliant GST invoices</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />New Invoice</Button></DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader><DialogTitle>Create GST Tax Invoice</DialogTitle></DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto pr-2">
              <div className="space-y-3">
                <h3 className="text-foreground font-semibold text-sm flex items-center gap-2"><Receipt className="w-4 h-4 text-primary" />Invoice Details</h3>
                <div className="space-y-1.5"><Label>Invoice Date *</Label><Input type="date" value={f.invoiceDate} onChange={e => setF(p => ({...p, invoiceDate: e.target.value}))} /></div>
                <div className="space-y-1.5"><Label>Buyer Name *</Label><Input value={f.buyerName} onChange={e => setF(p => ({...p, buyerName: e.target.value}))} placeholder="Buyer company name" /></div>
                <div className="space-y-1.5"><Label>Buyer GSTIN</Label><Input value={f.buyerGstin} onChange={e => setF(p => ({...p, buyerGstin: e.target.value.toUpperCase()}))} placeholder="19ABCDE1234F1Z5" maxLength={15} /></div>
                <div className="space-y-1.5"><Label>Buyer Address</Label><Input value={f.buyerAddress} onChange={e => setF(p => ({...p, buyerAddress: e.target.value}))} /></div>
                <div className="space-y-1.5"><Label>Place of Supply</Label><Input value={f.placeOfSupply} onChange={e => setF(p => ({...p, placeOfSupply: e.target.value}))} placeholder="West Bengal" /></div>
              </div>

              <div className="space-y-3">
                <h3 className="text-foreground font-semibold text-sm flex items-center gap-2"><Calculator className="w-4 h-4 text-primary" />Item & Tax</h3>
                <div className="space-y-1.5"><Label>Item Description *</Label><Input value={f.itemDescription} onChange={e => setF(p => ({...p, itemDescription: e.target.value}))} placeholder="Construction services for RA Bill 01" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>HSN/SAC Code</Label><Input value={f.hsnSacCode} onChange={e => setF(p => ({...p, hsnSacCode: e.target.value}))} /></div>
                  <div className="space-y-1.5"><Label>Unit</Label><Input value={f.unit} onChange={e => setF(p => ({...p, unit: e.target.value}))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Quantity</Label><Input type="number" value={f.quantity} onChange={e => setF(p => ({...p, quantity: e.target.value}))} /></div>
                  <div className="space-y-1.5"><Label>GST Rate %</Label><Input type="number" value={f.gstRate} onChange={e => setF(p => ({...p, gstRate: e.target.value}))} /></div>
                </div>
                <div className="space-y-1.5"><Label>Taxable Value (Rs) *</Label><Input type="number" value={f.taxableValue} onChange={e => setF(p => ({...p, taxableValue: e.target.value}))} placeholder="500000" /></div>

                {taxable > 0 && (
                  <div className="p-3 bg-primary/10 border border-primary/30 rounded-md space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Taxable:</span><span className="text-foreground font-semibold">{formatCurrency(taxable)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">GST ({rate}%):</span><span className="text-primary font-semibold">{formatCurrency(gst)}</span></div>
                    <div className="flex justify-between border-t border-primary/30 pt-1 mt-1"><span className="text-foreground font-bold">Total:</span><span className="text-success font-bold text-lg">{formatCurrency(total)}</span></div>
                  </div>
                )}
              </div>
            </div>

            <Button onClick={create} disabled={saving} className="w-full mt-4">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Generate Invoice"}
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4 text-center"><p className="text-muted-foreground text-xs uppercase">Invoices</p><p className="text-2xl font-bold text-foreground mt-1">{stats.total || 0}</p></CardContent></Card>
        <Card className="bg-primary/5 border-primary/20"><CardContent className="p-4 text-center"><p className="text-muted-foreground text-xs uppercase">Total Value</p><p className="text-lg font-bold text-primary mt-1">{formatCurrency(stats.totalValue || 0)}</p></CardContent></Card>
        <Card className="bg-success/5 border-success/20"><CardContent className="p-4 text-center"><p className="text-muted-foreground text-xs uppercase">Total GST</p><p className="text-lg font-bold text-success mt-1">{formatCurrency(stats.totalGST || 0)}</p></CardContent></Card>
      </div>

      {loading ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div> :
       invoices.length === 0 ? (
        <Card className="border-dashed"><CardContent className="p-12 text-center">
          <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-foreground font-medium">No GST invoices yet</p>
          <p className="text-muted-foreground text-sm mt-1">Generate tax-compliant invoices for clients</p>
        </CardContent></Card>
       ) : (
        <div className="space-y-2">
          {invoices.map(inv => (
            <Card key={inv.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-foreground font-bold">{inv.invoiceNumber}</p>
                      <Badge variant="outline" className="text-[10px]">{inv.isInterState ? "IGST" : "CGST+SGST"}</Badge>
                    </div>
                    <p className="text-muted-foreground text-sm truncate">{inv.buyerName}</p>
                    <p className="text-muted-foreground text-xs mt-0.5">{new Date(inv.invoiceDate).toLocaleDateString("en-IN")} · {inv.itemDescription.substring(0, 60)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-success font-bold">{formatCurrency(inv.totalAmount)}</p>
                    <p className="text-muted-foreground text-xs">GST: {formatCurrency(Number(inv.cgstAmount) + Number(inv.sgstAmount) + Number(inv.igstAmount))}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button onClick={() => generatePDF(inv.id)} disabled={generating === inv.id} size="sm" variant={inv.invoiceFileUrl ? "outline" : "default"}>
                      {generating === inv.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    </Button>
                    {inv.invoiceFileUrl && <a href={inv.invoiceFileUrl} target="_blank" rel="noopener noreferrer"><Button size="sm" variant="outline"><ExternalLink className="w-3.5 h-3.5" /></Button></a>}
                    <Button onClick={() => del(inv.id)} size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
       )}
    </div>
  );
}