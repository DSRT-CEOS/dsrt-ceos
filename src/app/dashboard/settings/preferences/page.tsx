"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, Sparkles, CheckCircle2, SlidersHorizontal } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

const DISTRICTS = ["Kolkata","Howrah","Hooghly","North 24 Parganas","South 24 Parganas","Burdwan","Nadia","Murshidabad","Birbhum","Bankura","Purulia","West Midnapore","East Midnapore","Jalpaiguri","Darjeeling","Cooch Behar"];
const SECTORS = [{v:"CIVIL_BUILDING",l:"Civil / Building"},{v:"ROAD",l:"Road & Highway"},{v:"BRIDGE",l:"Bridge"},{v:"ELECTRICAL",l:"Electrical"},{v:"MECHANICAL",l:"Mechanical / HVAC"},{v:"WATER_SUPPLY",l:"Water Supply"},{v:"SEWERAGE",l:"Sewerage"},{v:"SOLAR",l:"Solar"}];
const DEPTS = ["PWD","WBPWD","CPWD","WB Housing","KMC","WBSEDCL","Railway","NHAI","Zilla Parishad","Municipal Corp"];

export default function PreferencesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [p, setP] = useState({
    preferredDistricts: [] as string[], preferredSectors: [] as string[],
    preferredDepartments: [] as string[], minTenderValue: "", maxTenderValue: "",
    preferenceNotes: "",
  });

  useEffect(() => {
    fetch("/api/company/preferences").then(r => r.json()).then(d => {
      if (d.success && d.data) {
        setP({
          preferredDistricts: d.data.preferredDistricts || [],
          preferredSectors: d.data.preferredSectors || [],
          preferredDepartments: d.data.preferredDepartments || [],
          minTenderValue: d.data.minTenderValue ? String(d.data.minTenderValue) : "",
          maxTenderValue: d.data.maxTenderValue ? String(d.data.maxTenderValue) : "",
          preferenceNotes: d.data.preferenceNotes || "",
        });
      }
    }).finally(() => setLoading(false));
  }, []);

  const toggle = (key: "preferredDistricts" | "preferredSectors" | "preferredDepartments", v: string) =>
    setP(x => ({ ...x, [key]: x[key].includes(v) ? x[key].filter(i => i !== v) : [...x[key], v] }));

  const save = async () => {
    setSaving(true);
    try {
      const r = await fetch("/api/company/preferences", { method: "PATCH", headers: {"Content-Type":"application/json"}, body: JSON.stringify(p) });
      const d = await r.json();
      if (d.success) { setSaved(true); toast.success("Preferences saved!"); setTimeout(() => setSaved(false), 3000); }
      else toast.error(d.error);
    } catch { toast.error("Error"); } finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-xl flex items-center gap-2"><SlidersHorizontal className="w-5 h-5 text-orange-400" /> Preferences</h2>
          <p className="text-slate-400 text-sm mt-0.5">CEOS uses these to rank tenders for you</p>
        </div>
        <Button onClick={save} disabled={saving} className="bg-orange-500 hover:bg-orange-600">
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> :
           saved ? <><CheckCircle2 className="w-4 h-4 mr-2" />Saved!</> :
           <><Save className="w-4 h-4 mr-2" />Save</>}
        </Button>
      </div>

      <Card><CardHeader className="pb-3"><CardTitle className="text-base">Preferred Districts</CardTitle></CardHeader><CardContent>
        <div className="flex flex-wrap gap-2">
          {DISTRICTS.map(d => (
            <button key={d} onClick={() => toggle("preferredDistricts", d)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                p.preferredDistricts.includes(d) ? "bg-blue-500/20 border-blue-500/50 text-blue-300" : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600")}>{d}</button>
          ))}
        </div>
      </CardContent></Card>

      <Card><CardHeader className="pb-3"><CardTitle className="text-base">Preferred Sectors</CardTitle></CardHeader><CardContent>
        <div className="flex flex-wrap gap-2">
          {SECTORS.map(s => (
            <button key={s.v} onClick={() => toggle("preferredSectors", s.v)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                p.preferredSectors.includes(s.v) ? "bg-orange-500/20 border-orange-500/50 text-orange-300" : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600")}>{s.l}</button>
          ))}
        </div>
      </CardContent></Card>

      <Card><CardHeader className="pb-3"><CardTitle className="text-base">Preferred Departments</CardTitle></CardHeader><CardContent>
        <div className="flex flex-wrap gap-2">
          {DEPTS.map(d => (
            <button key={d} onClick={() => toggle("preferredDepartments", d)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                p.preferredDepartments.includes(d) ? "bg-green-500/20 border-green-500/50 text-green-300" : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600")}>{d}</button>
          ))}
        </div>
      </CardContent></Card>

      <Card><CardHeader className="pb-3"><CardTitle className="text-base">Value Range</CardTitle></CardHeader><CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5"><Label>Min Value (₹)</Label>
            <Input type="number" value={p.minTenderValue} onChange={e => setP(x => ({...x, minTenderValue: e.target.value}))} placeholder="1000000" /></div>
          <div className="space-y-1.5"><Label>Max Value (₹)</Label>
            <Input type="number" value={p.maxTenderValue} onChange={e => setP(x => ({...x, maxTenderValue: e.target.value}))} placeholder="50000000" /></div>
        </div>
      </CardContent></Card>

      <Card className="border-orange-500/20"><CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2"><Sparkles className="w-4 h-4 text-orange-400" /> AI Notes</CardTitle>
      </CardHeader><CardContent>
        <Textarea value={p.preferenceNotes} onChange={e => setP(x => ({...x, preferenceNotes: e.target.value}))}
          placeholder="Write in Bengali, Hindi or English:&#10;• শুধু PWD এবং KMC এর কাজ চাই, road এর কাজ করতে চাই না&#10;• Only building construction above 50 lakhs"
          className="min-h-32" />
        <p className="text-slate-600 text-xs mt-2 flex items-center gap-1"><Sparkles className="w-3 h-3 text-orange-400" />AI parses this for smarter matching</p>
      </CardContent></Card>
    </div>
  );
}