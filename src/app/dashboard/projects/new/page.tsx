"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import toast from "react-hot-toast";

export default function NewProjectPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({
    name: "", department: "", workOrderNumber: "", workOrderDate: "",
    contractValue: "", startDate: "", completionDate: "", projectCode: ""
  });

  const save = async () => {
    if (!f.name || !f.department || !f.contractValue) { toast.error("Name, department, contract value required"); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      const d = await r.json();
      if (d.success) { toast.success("Project created"); router.push(`/dashboard/projects/${d.project.id}`); }
      else toast.error(d.error);
    } catch { toast.error("Error"); } finally { setSaving(false); }
  };

  return (
    <div className="max-w-3xl space-y-5">
      <Link href="/dashboard/projects"><Button variant="ghost" size="sm" className="-ml-2"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button></Link>
      <h1 className="text-2xl font-bold text-white">New Project</h1>

      <Card><CardContent className="p-5 space-y-4">
        <div className="space-y-1.5"><Label>Project Name *</Label><Input value={f.name} onChange={e => setF(p => ({...p, name: e.target.value}))} placeholder="School Building Construction" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Department *</Label><Input value={f.department} onChange={e => setF(p => ({...p, department: e.target.value}))} placeholder="PWD, KMC..." /></div>
          <div className="space-y-1.5"><Label>Contract Value (Rs) *</Label><Input type="number" value={f.contractValue} onChange={e => setF(p => ({...p, contractValue: e.target.value}))} placeholder="5000000" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Work Order Number</Label><Input value={f.workOrderNumber} onChange={e => setF(p => ({...p, workOrderNumber: e.target.value}))} /></div>
          <div className="space-y-1.5"><Label>Project Code</Label><Input value={f.projectCode} onChange={e => setF(p => ({...p, projectCode: e.target.value}))} placeholder="PRJ-2025-01" /></div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5"><Label>WO Date</Label><Input type="date" value={f.workOrderDate} onChange={e => setF(p => ({...p, workOrderDate: e.target.value}))} /></div>
          <div className="space-y-1.5"><Label>Start Date</Label><Input type="date" value={f.startDate} onChange={e => setF(p => ({...p, startDate: e.target.value}))} /></div>
          <div className="space-y-1.5"><Label>Completion Date</Label><Input type="date" value={f.completionDate} onChange={e => setF(p => ({...p, completionDate: e.target.value}))} /></div>
        </div>
        <Button onClick={save} disabled={saving} className="w-full bg-orange-500 hover:bg-orange-600">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" />Create Project</>}
        </Button>
      </CardContent></Card>
    </div>
  );
}