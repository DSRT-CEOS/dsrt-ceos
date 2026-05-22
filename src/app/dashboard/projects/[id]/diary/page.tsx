"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, BookOpen, Plus, Loader2, Calendar, Cloud, Users, Trash2, Save } from "lucide-react";
import toast from "react-hot-toast";

const WEATHER = ["Sunny", "Cloudy", "Rainy", "Stormy", "Foggy", "Hot", "Pleasant"];

export default function DiaryPage() {
  const { id: projectId } = useParams();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({
    date: new Date().toISOString().split("T")[0],
    weather: "", temperature: "", manpowerCount: "",
    workDescription: "", workCompleted: "", materialReceived: "",
    machineryUsed: "", visitors: "", issues: "", instructions: "", safetyNotes: "",
  });

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/diary?projectId=${projectId}`);
      const d = await r.json();
      if (d.success) setEntries(d.entries);
    } finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const save = async () => {
    if (!f.workDescription) { toast.error("Work description required"); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/diary", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, projectId })
      });
      const d = await r.json();
      if (d.success) {
        toast.success("Diary entry saved");
        setOpen(false);
        setF({ ...f, workDescription: "", workCompleted: "", materialReceived: "", machineryUsed: "", visitors: "", issues: "", instructions: "", safetyNotes: "" });
        fetch_();
      } else toast.error(d.error);
    } catch { toast.error("Error"); } finally { setSaving(false); }
  };

  const del = async (id: string) => {
    if (!confirm("Delete this diary entry?")) return;
    const r = await fetch(`/api/diary/${id}`, { method: "DELETE" });
    if ((await r.json()).success) { toast.success("Deleted"); fetch_(); }
  };

  return (
    <div className="space-y-5 max-w-5xl">
      <Link href={`/dashboard/projects/${projectId}`}><Button variant="ghost" size="sm" className="-ml-2"><ArrowLeft className="w-4 h-4 mr-2" />Back to Project</Button></Link>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><BookOpen className="w-6 h-6 text-orange-400" />Site Diary</h1>
          <p className="text-slate-400 text-sm mt-1">Daily work records and observations</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="bg-orange-500 hover:bg-orange-600"><Plus className="w-4 h-4 mr-2" />New Entry</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Site Diary Entry</DialogTitle></DialogHeader>
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5"><Label>Date *</Label><Input type="date" value={f.date} onChange={e => setF(p => ({...p, date: e.target.value}))} /></div>
                <div className="space-y-1.5"><Label>Weather</Label>
                  <select value={f.weather} onChange={e => setF(p => ({...p, weather: e.target.value}))} className="w-full h-10 rounded-md border border-slate-700 bg-slate-800 px-3 text-sm text-white">
                    <option value="">Select</option>
                    {WEATHER.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5"><Label>Temp</Label><Input value={f.temperature} onChange={e => setF(p => ({...p, temperature: e.target.value}))} placeholder="32C" /></div>
              </div>

              <div className="space-y-1.5"><Label>Manpower Count</Label><Input type="number" value={f.manpowerCount} onChange={e => setF(p => ({...p, manpowerCount: e.target.value}))} placeholder="25" /></div>

              <div className="space-y-1.5"><Label>Work Description *</Label><Textarea value={f.workDescription} onChange={e => setF(p => ({...p, workDescription: e.target.value}))} placeholder="What work was carried out today" rows={3} /></div>

              <div className="space-y-1.5"><Label>Work Completed Today</Label><Textarea value={f.workCompleted} onChange={e => setF(p => ({...p, workCompleted: e.target.value}))} placeholder="Specific quantities completed" rows={2} /></div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Material Received</Label><Textarea value={f.materialReceived} onChange={e => setF(p => ({...p, materialReceived: e.target.value}))} placeholder="100 bags cement, 2 MT steel" rows={2} /></div>
                <div className="space-y-1.5"><Label>Machinery Used</Label><Textarea value={f.machineryUsed} onChange={e => setF(p => ({...p, machineryUsed: e.target.value}))} placeholder="1 JCB, 1 Mixer" rows={2} /></div>
              </div>

              <div className="space-y-1.5"><Label>Visitors</Label><Input value={f.visitors} onChange={e => setF(p => ({...p, visitors: e.target.value}))} placeholder="JE PWD, Site engineer" /></div>

              <div className="space-y-1.5"><Label>Issues / Hindrances</Label><Textarea value={f.issues} onChange={e => setF(p => ({...p, issues: e.target.value}))} placeholder="Heavy rain, material shortage" rows={2} /></div>

              <div className="space-y-1.5"><Label>Instructions Received</Label><Textarea value={f.instructions} onChange={e => setF(p => ({...p, instructions: e.target.value}))} placeholder="From department/consultant" rows={2} /></div>

              <div className="space-y-1.5"><Label>Safety Notes</Label><Textarea value={f.safetyNotes} onChange={e => setF(p => ({...p, safetyNotes: e.target.value}))} placeholder="Toolbox talk, incidents" rows={2} /></div>

              <Button onClick={save} disabled={saving} className="w-full bg-orange-500 hover:bg-orange-600">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" />Save Entry</>}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div> :
       entries.length === 0 ? (
        <Card className="border-dashed"><CardContent className="p-12 text-center">
          <BookOpen className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-white font-medium">No diary entries yet</p>
          <p className="text-slate-500 text-sm mt-1">Daily records help track progress and disputes</p>
        </CardContent></Card>
       ) : (
        <div className="space-y-3">
          {entries.map(e => (
            <Card key={e.id}><CardContent className="p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-orange-500/10 border border-orange-500/20 rounded-lg flex flex-col items-center justify-center">
                    <p className="text-orange-400 font-bold text-sm leading-none">{new Date(e.date).getDate()}</p>
                    <p className="text-orange-300 text-xs leading-none mt-0.5">{new Date(e.date).toLocaleDateString("en-IN", { month: "short" })}</p>
                  </div>
                  <div>
                    <p className="text-white font-semibold">{new Date(e.date).toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs">
                      {e.weather && <span className="text-slate-400 flex items-center gap-1"><Cloud className="w-3 h-3" />{e.weather} {e.temperature && `(${e.temperature})`}</span>}
                      {e.manpowerCount && <span className="text-slate-400 flex items-center gap-1"><Users className="w-3 h-3" />{e.manpowerCount} workers</span>}
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => del(e.id)} className="text-red-400 hover:bg-red-500/10 h-7 w-7 p-0"><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-slate-500 text-xs uppercase mb-1">Work Done</p>
                  <p className="text-white">{e.workDescription}</p>
                  {e.workCompleted && <p className="text-green-400 text-xs mt-1">✓ {e.workCompleted}</p>}
                </div>
                {(e.materialReceived || e.machineryUsed) && (
                  <div className="space-y-2">
                    {e.materialReceived && <div><p className="text-slate-500 text-xs uppercase mb-1">Material</p><p className="text-slate-300 text-xs">{e.materialReceived}</p></div>}
                    {e.machineryUsed && <div><p className="text-slate-500 text-xs uppercase mb-1">Machinery</p><p className="text-slate-300 text-xs">{e.machineryUsed}</p></div>}
                  </div>
                )}
              </div>

              {(e.issues || e.instructions || e.visitors || e.safetyNotes) && (
                <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  {e.visitors && <div><span className="text-slate-500">Visitors: </span><span className="text-slate-300">{e.visitors}</span></div>}
                  {e.issues && <div className="text-red-400"><span className="font-medium">Issues: </span>{e.issues}</div>}
                  {e.instructions && <div><span className="text-blue-400 font-medium">Instructions: </span><span className="text-slate-300">{e.instructions}</span></div>}
                  {e.safetyNotes && <div><span className="text-yellow-400 font-medium">Safety: </span><span className="text-slate-300">{e.safetyNotes}</span></div>}
                </div>
              )}
            </CardContent></Card>
          ))}
        </div>
       )}
    </div>
  );
}