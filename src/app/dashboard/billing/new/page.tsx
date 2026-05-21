"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Save, Calculator } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

function NewBillContent() {
  const router = useRouter();
  const params = useSearchParams();
  const initialProjectId = params.get("projectId") || "";

  const [projects, setProjects] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({
    projectId: initialProjectId, billType: "RA",
    billDate: new Date().toISOString().split("T")[0],
    periodFrom: "", periodTo: "",
    grossAmount: "", gstRate: "18",
    sdPct: "10", itTdsPct: "2", gstTdsPct: "2", labourCessPct: "1",
    royalty: "0", advanceRecovery: "0", otherDeductions: "0", ldDeduction: "0",
  });

  useEffect(() => {
    fetch("/api/projects").then(r => r.json()).then(d => d.success && setProjects(d.projects));
  }, []);

  const gross = parseFloat(f.grossAmount) || 0;
  const gstRate = parseFloat(f.gstRate) || 0;
  const gstAmount = (gross * gstRate) / 100;
  const totalWithGst = gross + gstAmount;
  const sdAmt = (gross * (parseFloat(f.sdPct) || 0)) / 100;
  const itTdsAmt = (gross * (parseFloat(f.itTdsPct) || 0)) / 100;
  const gstTdsAmt = (totalWithGst * (parseFloat(f.gstTdsPct) || 0)) / 100;
  const cessAmt = (gross * (parseFloat(f.labourCessPct) || 0)) / 100;
  const royAmt = parseFloat(f.royalty) || 0;
  const advAmt = parseFloat(f.advanceRecovery) || 0;
  const otherAmt = parseFloat(f.otherDeductions) || 0;
  const ldAmt = parseFloat(f.ldDeduction) || 0;
  const totalDed = sdAmt + itTdsAmt + gstTdsAmt + cessAmt + royAmt + advAmt + otherAmt + ldAmt;
  const netPayable = totalWithGst - totalDed;

  const save = async () => {
    if (!f.projectId || !f.grossAmount) { toast.error("Project and gross amount required"); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/bills", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      const d = await r.json();
      if (d.success) { toast.success("Bill created"); router.push(`/dashboard/billing/${d.bill.id}`); }
      else toast.error(d.error);
    } catch { toast.error("Error"); } finally { setSaving(false); }
  };

  return (
    <div className="max-w-5xl space-y-5">
      <Link href="/dashboard/billing"><Button variant="ghost" size="sm" className="-ml-2"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button></Link>
      <h1 className="text-2xl font-bold text-white">Create New Bill</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Inputs */}
        <Card><CardContent className="p-5 space-y-4">
          <h3 className="text-white font-semibold flex items-center gap-2"><Calculator className="w-4 h-4 text-orange-400" />Bill Details</h3>

          <div className="space-y-1.5"><Label>Project *</Label>
            <Select value={f.projectId} onValueChange={v => setF(p => ({...p, projectId: v}))}>
              <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
              <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Bill Type</Label>
              <Select value={f.billType} onValueChange={v => setF(p => ({...p, billType: v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="RA">Running Account</SelectItem>
                  <SelectItem value="FINAL">Final Bill</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Bill Date</Label><Input type="date" value={f.billDate} onChange={e => setF(p => ({...p, billDate: e.target.value}))} /></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Period From</Label><Input type="date" value={f.periodFrom} onChange={e => setF(p => ({...p, periodFrom: e.target.value}))} /></div>
            <div className="space-y-1.5"><Label>Period To</Label><Input type="date" value={f.periodTo} onChange={e => setF(p => ({...p, periodTo: e.target.value}))} /></div>
          </div>

          <div className="space-y-1.5"><Label>Gross Bill Amount (Rs) *</Label><Input type="number" value={f.grossAmount} onChange={e => setF(p => ({...p, grossAmount: e.target.value}))} placeholder="500000" className="text-lg font-semibold" /></div>

          <div className="space-y-1.5"><Label>GST Rate (%)</Label><Input type="number" value={f.gstRate} onChange={e => setF(p => ({...p, gstRate: e.target.value}))} /></div>

          <div className="border-t border-slate-800 pt-3">
            <p className="text-slate-400 text-sm font-medium mb-3">Deductions (%)</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Security Deposit</Label><Input type="number" value={f.sdPct} onChange={e => setF(p => ({...p, sdPct: e.target.value}))} /></div>
              <div className="space-y-1.5"><Label>IT TDS</Label><Input type="number" value={f.itTdsPct} onChange={e => setF(p => ({...p, itTdsPct: e.target.value}))} /></div>
              <div className="space-y-1.5"><Label>GST TDS</Label><Input type="number" value={f.gstTdsPct} onChange={e => setF(p => ({...p, gstTdsPct: e.target.value}))} /></div>
              <div className="space-y-1.5"><Label>Labour Cess</Label><Input type="number" value={f.labourCessPct} onChange={e => setF(p => ({...p, labourCessPct: e.target.value}))} /></div>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-3">
            <p className="text-slate-400 text-sm font-medium mb-3">Other Deductions (Rs)</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Royalty</Label><Input type="number" value={f.royalty} onChange={e => setF(p => ({...p, royalty: e.target.value}))} /></div>
              <div className="space-y-1.5"><Label>Advance Recovery</Label><Input type="number" value={f.advanceRecovery} onChange={e => setF(p => ({...p, advanceRecovery: e.target.value}))} /></div>
              <div className="space-y-1.5"><Label>LD / Penalty</Label><Input type="number" value={f.ldDeduction} onChange={e => setF(p => ({...p, ldDeduction: e.target.value}))} /></div>
              <div className="space-y-1.5"><Label>Other</Label><Input type="number" value={f.otherDeductions} onChange={e => setF(p => ({...p, otherDeductions: e.target.value}))} /></div>
            </div>
          </div>
        </CardContent></Card>

        {/* Live Calculation Preview */}
        <div className="space-y-3">
          <Card className="bg-orange-500/5 border-orange-500/20 sticky top-4">
            <CardContent className="p-5">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Calculator className="w-4 h-4 text-orange-400" />Live Calculation</h3>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between p-2 bg-slate-800/50 rounded">
                  <span className="text-slate-400">Gross Amount</span>
                  <span className="text-white font-semibold">{formatCurrency(gross)}</span>
                </div>
                <div className="flex justify-between p-2 bg-slate-800/50 rounded">
                  <span className="text-slate-400">+ GST ({f.gstRate}%)</span>
                  <span className="text-blue-400 font-semibold">{formatCurrency(gstAmount)}</span>
                </div>
                <div className="flex justify-between p-2 bg-blue-500/10 rounded border border-blue-500/20">
                  <span className="text-blue-300 font-medium">Total with GST</span>
                  <span className="text-blue-300 font-bold">{formatCurrency(totalWithGst)}</span>
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <p className="text-slate-500 text-xs uppercase mb-2">Deductions</p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs p-1.5"><span className="text-slate-400">Security Deposit ({f.sdPct}%)</span><span className="text-red-400">-{formatCurrency(sdAmt)}</span></div>
                    <div className="flex justify-between text-xs p-1.5"><span className="text-slate-400">IT TDS ({f.itTdsPct}%)</span><span className="text-red-400">-{formatCurrency(itTdsAmt)}</span></div>
                    <div className="flex justify-between text-xs p-1.5"><span className="text-slate-400">GST TDS ({f.gstTdsPct}%)</span><span className="text-red-400">-{formatCurrency(gstTdsAmt)}</span></div>
                    <div className="flex justify-between text-xs p-1.5"><span className="text-slate-400">Labour Cess ({f.labourCessPct}%)</span><span className="text-red-400">-{formatCurrency(cessAmt)}</span></div>
                    {royAmt > 0 && <div className="flex justify-between text-xs p-1.5"><span className="text-slate-400">Royalty</span><span className="text-red-400">-{formatCurrency(royAmt)}</span></div>}
                    {advAmt > 0 && <div className="flex justify-between text-xs p-1.5"><span className="text-slate-400">Advance Recovery</span><span className="text-red-400">-{formatCurrency(advAmt)}</span></div>}
                    {ldAmt > 0 && <div className="flex justify-between text-xs p-1.5"><span className="text-slate-400">LD/Penalty</span><span className="text-red-400">-{formatCurrency(ldAmt)}</span></div>}
                    {otherAmt > 0 && <div className="flex justify-between text-xs p-1.5"><span className="text-slate-400">Other</span><span className="text-red-400">-{formatCurrency(otherAmt)}</span></div>}
                  </div>
                  <div className="flex justify-between p-2 bg-red-500/10 rounded border border-red-500/20 mt-2">
                    <span className="text-red-300 font-medium">Total Deductions</span>
                    <span className="text-red-300 font-bold">-{formatCurrency(totalDed)}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <div className="flex justify-between p-3 bg-green-500/10 rounded-lg border-2 border-green-500/30">
                    <span className="text-green-300 font-bold">NET PAYABLE</span>
                    <span className="text-green-400 font-bold text-xl">{formatCurrency(netPayable)}</span>
                  </div>
                </div>
              </div>

              <Button onClick={save} disabled={saving || !f.projectId || !f.grossAmount} className="w-full bg-orange-500 hover:bg-orange-600 mt-4">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" />Save Bill</>}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function NewBillPage() {
  return <Suspense fallback={<Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto mt-20" />}><NewBillContent /></Suspense>;
}