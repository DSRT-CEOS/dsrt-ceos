"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Download, Trash2, FileText, CheckCircle2, Send, Receipt, IndianRupee, ExternalLink } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import toast from "react-hot-toast";

export default function BillDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [bill, setBill] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [payment, setPayment] = useState({ paymentAmount: "", paymentDate: new Date().toISOString().split("T")[0], paymentReference: "" });

  const fetch_ = useCallback(async () => {
    try {
      const r = await fetch(`/api/bills/${id}`);
      const d = await r.json();
      if (d.success) {
        setBill(d.bill);
        setPayment(p => ({ ...p, paymentAmount: String(d.bill.netPayable) }));
      }
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const generatePdf = async () => {
    setUpdating(true);
    try {
      const r = await fetch(`/api/bills/${id}/generate-pdf`, { method: "POST" });
      const d = await r.json();
      if (d.success) { toast.success("PDF generated"); window.open(d.url, "_blank"); fetch_(); }
      else toast.error(d.error);
    } finally { setUpdating(false); }
  };

  const updateStatus = async (status: string) => {
    setUpdating(true);
    try {
      const r = await fetch(`/api/bills/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      if ((await r.json()).success) { toast.success(`Marked as ${status}`); fetch_(); }
    } finally { setUpdating(false); }
  };

  const recordPayment = async () => {
    if (!payment.paymentAmount) { toast.error("Enter amount"); return; }
    setUpdating(true);
    try {
      const r = await fetch(`/api/bills/${id}/payment`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payment) });
      if ((await r.json()).success) { toast.success("Payment recorded"); setShowPayment(false); fetch_(); }
    } finally { setUpdating(false); }
  };

  const del = async () => {
    if (!confirm("Delete this bill?")) return;
    const r = await fetch(`/api/bills/${id}`, { method: "DELETE" });
    if ((await r.json()).success) { toast.success("Deleted"); router.push("/dashboard/billing"); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div>;
  if (!bill) return <div className="text-center py-20"><p className="text-slate-400">Bill not found</p></div>;

  return (
    <div className="space-y-5 max-w-5xl">
      <Link href="/dashboard/billing"><Button variant="ghost" size="sm" className="-ml-2"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button></Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Receipt className="w-6 h-6 text-orange-400" />{bill.billNumber}</h1>
          <div className="flex items-center gap-3 mt-2 flex-wrap text-sm">
            <span className="text-slate-400">{bill.project.name}</span>
            <Badge variant="outline" className={cn(
              bill.status === "DRAFT" ? "text-slate-400" :
              bill.status === "PAID" ? "text-green-400 border-green-500/30 bg-green-500/10" :
              "text-orange-400 border-orange-500/30 bg-orange-500/10"
            )}>{bill.status}</Badge>
            <span className="text-slate-500">Date: {new Date(bill.billDate).toLocaleDateString("en-IN")}</span>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={generatePdf} disabled={updating} className="bg-orange-500 hover:bg-orange-600">
            {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><FileText className="w-4 h-4 mr-2" />Generate PDF</>}
          </Button>
          {bill.billDocumentUrl && (
            <a href={bill.billDocumentUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline"><ExternalLink className="w-4 h-4 mr-2" />View PDF</Button>
            </a>
          )}
          <Button variant="outline" onClick={del} className="text-red-400 hover:bg-red-500/10"><Trash2 className="w-4 h-4" /></Button>
        </div>
      </div>

      {/* Status Workflow */}
      <Card><CardContent className="p-5">
        <p className="text-slate-400 text-xs uppercase mb-3">Bill Workflow</p>
        <div className="flex flex-wrap gap-2">
          {["DRAFT", "SUBMITTED", "UNDER_CHECK", "PASSED", "PAID"].map(s => (
            <button key={s} onClick={() => updateStatus(s)} disabled={updating || bill.status === s}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                bill.status === s ? "bg-orange-500/20 border-orange-500/50 text-orange-300" : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-white")}>{s}</button>
          ))}
        </div>
      </CardContent></Card>

      {/* Amount Summary */}
      <Card><CardContent className="p-5">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><IndianRupee className="w-4 h-4 text-orange-400" />Amount Breakdown</h3>
        <div className="space-y-2">
          <div className="flex justify-between p-3 bg-slate-800/50 rounded-lg"><span className="text-slate-300">Gross Amount</span><span className="text-white font-semibold">{formatCurrency(bill.grossAmount)}</span></div>
          <div className="flex justify-between p-3 bg-blue-500/5 rounded-lg border border-blue-500/20"><span className="text-blue-300">+ GST ({bill.gstRate}%)</span><span className="text-blue-300 font-semibold">{formatCurrency(bill.gstAmount)}</span></div>
          <div className="flex justify-between p-3 bg-blue-500/10 rounded-lg border border-blue-500/30"><span className="text-blue-200 font-medium">Total with GST</span><span className="text-blue-200 font-bold">{formatCurrency(Number(bill.grossAmount) + Number(bill.gstAmount))}</span></div>

          <div className="pt-2"><p className="text-slate-500 text-xs uppercase mb-2">Deductions</p>
            <div className="space-y-1.5">
              <div className="flex justify-between p-2 bg-red-500/5 rounded text-sm"><span className="text-slate-400">Security Deposit</span><span className="text-red-400">-{formatCurrency(bill.sdDeduction)}</span></div>
              <div className="flex justify-between p-2 bg-red-500/5 rounded text-sm"><span className="text-slate-400">IT TDS</span><span className="text-red-400">-{formatCurrency(bill.itTdsDeduction)}</span></div>
              <div className="flex justify-between p-2 bg-red-500/5 rounded text-sm"><span className="text-slate-400">GST TDS</span><span className="text-red-400">-{formatCurrency(bill.gstTdsDeduction)}</span></div>
              <div className="flex justify-between p-2 bg-red-500/5 rounded text-sm"><span className="text-slate-400">Labour Cess</span><span className="text-red-400">-{formatCurrency(bill.labourCess)}</span></div>
              {bill.royaltyDeduction > 0 && <div className="flex justify-between p-2 bg-red-500/5 rounded text-sm"><span className="text-slate-400">Royalty</span><span className="text-red-400">-{formatCurrency(bill.royaltyDeduction)}</span></div>}
              {bill.advanceRecovery > 0 && <div className="flex justify-between p-2 bg-red-500/5 rounded text-sm"><span className="text-slate-400">Advance Recovery</span><span className="text-red-400">-{formatCurrency(bill.advanceRecovery)}</span></div>}
              {bill.ldDeduction > 0 && <div className="flex justify-between p-2 bg-red-500/5 rounded text-sm"><span className="text-slate-400">LD/Penalty</span><span className="text-red-400">-{formatCurrency(bill.ldDeduction)}</span></div>}
            </div>
          </div>

          <div className="flex justify-between p-4 bg-green-500/10 rounded-lg border-2 border-green-500/30 mt-3"><span className="text-green-300 font-bold text-lg">NET PAYABLE</span><span className="text-green-400 font-bold text-2xl">{formatCurrency(bill.netPayable)}</span></div>
        </div>
      </CardContent></Card>

      {/* Payment Tracking */}
      <Card><CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-400" />Payment</h3>
          {bill.status !== "PAID" && !showPayment && (
            <Button onClick={() => setShowPayment(true)} size="sm" className="bg-green-500 hover:bg-green-600"><CheckCircle2 className="w-4 h-4 mr-2" />Record Payment</Button>
          )}
        </div>

        {bill.status === "PAID" ? (
          <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/30">
            <p className="text-green-300 font-semibold mb-2">Payment Received</p>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div><p className="text-slate-500">Amount</p><p className="text-green-400 font-bold">{formatCurrency(bill.paymentAmount)}</p></div>
              <div><p className="text-slate-500">Date</p><p className="text-white">{bill.paymentDate ? new Date(bill.paymentDate).toLocaleDateString("en-IN") : ""}</p></div>
              <div><p className="text-slate-500">Reference</p><p className="text-white">{bill.paymentReference || "N/A"}</p></div>
            </div>
          </div>
        ) : showPayment ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Amount Received</Label><Input type="number" value={payment.paymentAmount} onChange={e => setPayment(p => ({...p, paymentAmount: e.target.value}))} /></div>
              <div className="space-y-1.5"><Label>Payment Date</Label><Input type="date" value={payment.paymentDate} onChange={e => setPayment(p => ({...p, paymentDate: e.target.value}))} /></div>
            </div>
            <div className="space-y-1.5"><Label>Reference Number</Label><Input value={payment.paymentReference} onChange={e => setPayment(p => ({...p, paymentReference: e.target.value}))} placeholder="UTR / Cheque No / Transaction ID" /></div>
            <div className="flex gap-2">
              <Button onClick={recordPayment} disabled={updating} className="bg-green-500 hover:bg-green-600">{updating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Payment"}</Button>
              <Button variant="outline" onClick={() => setShowPayment(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <p className="text-slate-500 text-sm">Payment pending. Click "Record Payment" when received.</p>
        )}
      </CardContent></Card>
    </div>
  );
}