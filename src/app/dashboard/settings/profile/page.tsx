"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, Building2, CreditCard, Banknote, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

const SECTORS = [
  { value: "CIVIL", label: "Civil Construction" },
  { value: "ELECTRICAL", label: "Electrical Work" },
  { value: "MECHANICAL", label: "Mechanical / HVAC" },
  { value: "ROAD", label: "Road & Highway" },
  { value: "BRIDGE", label: "Bridge & Structure" },
  { value: "WATER_SUPPLY", label: "Water Supply" },
  { value: "SEWERAGE", label: "Sewerage & Drainage" },
  { value: "SOLAR", label: "Solar Energy" },
];

const WB_DISTRICTS = [
  "Kolkata", "Howrah", "Hooghly", "North 24 Parganas", "South 24 Parganas",
  "Burdwan", "Nadia", "Murshidabad", "Birbhum", "Bankura", "Purulia",
  "West Midnapore", "East Midnapore", "Jalpaiguri", "Darjeeling",
  "Cooch Behar", "North Dinajpur", "South Dinajpur", "Malda", "Alipurduar",
];

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sectors, setSectors] = useState<string[]>(["CIVIL"]);
  const [form, setForm] = useState<any>({
    name: "", legalName: "", type: "PROPRIETORSHIP",
    panNumber: "", gstNumber: "", esiCode: "", epfCode: "",
    addressLine1: "", city: "", district: "", state: "West Bengal", pincode: "",
    contractorClass: "", financialLimit: "", establishedYear: "",
    bankName: "", bankBranch: "", bankAccountNumber: "", bankIfscCode: "",
    userName: "", userPhone: "",
  });

  useEffect(() => {
    fetch("/api/company/profile")
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          const c = data.data.company;
          setSectors(c.primarySector || ["CIVIL"]);
          setForm({
            name: c.name || "",
            legalName: c.legalName || "",
            type: c.type || "PROPRIETORSHIP",
            panNumber: c.panNumber || "",
            gstNumber: c.gstNumber || "",
            esiCode: c.esiCode || "",
            epfCode: c.epfCode || "",
            addressLine1: c.addressLine1 || "",
            city: c.city || "",
            district: c.district || "",
            state: c.state || "West Bengal",
            pincode: c.pincode || "",
            contractorClass: c.contractorClass || "",
            financialLimit: c.financialLimit ? String(c.financialLimit) : "",
            establishedYear: c.establishedYear ? String(c.establishedYear) : "",
            bankName: c.bankName || "",
            bankBranch: c.bankBranch || "",
            bankAccountNumber: c.bankAccountNumber || "",
            bankIfscCode: c.bankIfscCode || "",
            userName: data.data.name || "",
            userPhone: data.data.phone || "",
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const toggleSector = (s: string) => {
    setSectors(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sectors.length === 0) { toast.error("Select at least one sector"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/company/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, primarySector: sectors }),
      });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
        toast.success("Profile saved!");
        setTimeout(() => setSaved(false), 3000);
      } else toast.error(data.error || "Save failed");
    } catch { toast.error("Network error"); }
    finally { setSaving(false); }
  };

  const set = (k: string, v: string) => setForm((p: any) => ({ ...p, [k]: v }));

  const completion = () => {
    const fields = [form.name, form.panNumber, form.gstNumber, form.city, form.contractorClass, form.bankAccountNumber];
    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div>;

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white font-bold text-xl">Company Profile</h1>
          <p className="text-slate-400 text-sm mt-0.5">Complete profile for accurate tender eligibility checks</p>
        </div>
        <Button type="submit" disabled={saving} className="bg-orange-500 hover:bg-orange-600">
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> :
           saved ? <><CheckCircle2 className="w-4 h-4 mr-2" />Saved!</> :
           <><Save className="w-4 h-4 mr-2" />Save Changes</>}
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Profile Completion</span>
            <span className="text-white font-semibold text-sm">{completion()}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2">
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 h-2 rounded-full transition-all duration-500" style={{ width: `${completion()}%` }} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-4 h-4 text-orange-400" /> Company Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Company Name *</Label>
              <Input value={form.name} onChange={e => set("name", e.target.value)}
                placeholder="Kumar Construction Co." required />
            </div>
            <div className="space-y-1.5">
              <Label>Legal Name (per PAN)</Label>
              <Input value={form.legalName} onChange={e => set("legalName", e.target.value)}
                placeholder="Same or proprietor name" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => set("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PROPRIETORSHIP">Proprietorship</SelectItem>
                  <SelectItem value="PARTNERSHIP">Partnership</SelectItem>
                  <SelectItem value="PRIVATE_LIMITED">Pvt Limited</SelectItem>
                  <SelectItem value="LLP">LLP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Class</Label>
              <Select value={form.contractorClass} onValueChange={v => set("contractorClass", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLASS_I">Class I</SelectItem>
                  <SelectItem value="CLASS_II">Class II</SelectItem>
                  <SelectItem value="CLASS_III">Class III</SelectItem>
                  <SelectItem value="CLASS_IV">Class IV</SelectItem>
                  <SelectItem value="CLASS_V">Class V</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Financial Limit (₹)</Label>
              <Input type="number" value={form.financialLimit} onChange={e => set("financialLimit", e.target.value)}
                placeholder="5000000" />
            </div>
            <div className="space-y-1.5">
              <Label>Est. Year</Label>
              <Input type="number" value={form.establishedYear} onChange={e => set("establishedYear", e.target.value)}
                placeholder="2010" />
            </div>
          </div>
          <div>
            <Label className="mb-2 block">Primary Sectors (select all)</Label>
            <div className="flex flex-wrap gap-2">
              {SECTORS.map(s => (
                <button key={s.value} type="button" onClick={() => toggleSector(s.value)}
                  className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                    sectors.includes(s.value)
                      ? "bg-orange-500/20 border-orange-500/50 text-orange-300"
                      : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
                  )}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-orange-400" /> Tax & Registration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label>PAN Number</Label>
              <Input value={form.panNumber}
                onChange={e => set("panNumber", e.target.value.toUpperCase())}
                placeholder="ABCDE1234F" maxLength={10} />
            </div>
            <div className="space-y-1.5">
              <Label>GST Number</Label>
              <Input value={form.gstNumber}
                onChange={e => set("gstNumber", e.target.value.toUpperCase())}
                placeholder="19ABCDE1234F1Z5" maxLength={15} />
            </div>
            <div className="space-y-1.5">
              <Label>ESI Code</Label>
              <Input value={form.esiCode} onChange={e => set("esiCode", e.target.value)} placeholder="Optional" />
            </div>
            <div className="space-y-1.5">
              <Label>EPF/PF Code</Label>
              <Input value={form.epfCode} onChange={e => set("epfCode", e.target.value)} placeholder="Optional" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Address</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Address Line 1</Label>
            <Input value={form.addressLine1} onChange={e => set("addressLine1", e.target.value)}
              placeholder="Street, building, plot" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input value={form.city} onChange={e => set("city", e.target.value)} placeholder="Kolkata" />
            </div>
            <div className="space-y-1.5">
              <Label>District</Label>
              <Select value={form.district} onValueChange={v => set("district", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent className="max-h-48">
                  {WB_DISTRICTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>State</Label>
              <Input value={form.state} onChange={e => set("state", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>PIN Code</Label>
              <Input value={form.pincode} onChange={e => set("pincode", e.target.value)}
                placeholder="700001" maxLength={6} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Banknote className="w-4 h-4 text-orange-400" /> Bank Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label>Bank Name</Label>
              <Input value={form.bankName} onChange={e => set("bankName", e.target.value)} placeholder="SBI" />
            </div>
            <div className="space-y-1.5">
              <Label>Branch</Label>
              <Input value={form.bankBranch} onChange={e => set("bankBranch", e.target.value)} placeholder="Branch" />
            </div>
            <div className="space-y-1.5">
              <Label>Account No</Label>
              <Input value={form.bankAccountNumber} onChange={e => set("bankAccountNumber", e.target.value)} placeholder="Account" />
            </div>
            <div className="space-y-1.5">
              <Label>IFSC Code</Label>
              <Input value={form.bankIfscCode}
                onChange={e => set("bankIfscCode", e.target.value.toUpperCase())}
                placeholder="SBIN0001234" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={saving} className="bg-orange-500 hover:bg-orange-600 px-8">
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> :
           saved ? <><CheckCircle2 className="w-4 h-4 mr-2" />Saved!</> :
           <><Save className="w-4 h-4 mr-2" />Save Profile</>}
        </Button>
      </div>
    </form>
  );
}