"use client";
import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, Plus, Loader2, Trash2, Mail, Crown, Briefcase, Calculator, HardHat, Eye, CheckCircle2, Clock, Copy, AlertCircle } from "lucide-react";
import { ROLES, type Role } from "@/lib/auth/roles";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const ROLE_ICONS: Record<string, any> = {
  OWNER: Crown, MANAGER: Briefcase, ACCOUNTANT: Calculator, SUPERVISOR: HardHat, VIEWER: Eye,
};

const ROLE_COLORS: Record<string, string> = {
  OWNER: "text-orange-400 border-orange-500/30 bg-orange-500/10",
  MANAGER: "text-blue-400 border-blue-500/30 bg-blue-500/10",
  ACCOUNTANT: "text-green-400 border-green-500/30 bg-green-500/10",
  SUPERVISOR: "text-purple-400 border-purple-500/30 bg-purple-500/10",
  VIEWER: "text-slate-400 border-slate-500/30 bg-slate-500/10",
};

export default function TeamPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ email: "", name: "", role: "VIEWER" as Role });

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/team/members");
      const d = await r.json();
      if (d.success) { setMembers(d.members); setInvites(d.invites); setCurrentUser(d.currentUser); }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const sendInvite = async () => {
    if (!f.email || !f.role) { toast.error("Email and role required"); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/team/invite", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f)
      });
      const d = await r.json();
      if (d.success) {
        toast.success(d.message, { duration: 5000 });
        if (!d.emailSent && d.inviteUrl) {
          // Copy invite URL to clipboard
          await navigator.clipboard.writeText(d.inviteUrl);
          toast.success("Invite link copied to clipboard!");
        }
        setOpen(false);
        setF({ email: "", name: "", role: "VIEWER" });
        fetch_();
      } else toast.error(d.error);
    } catch { toast.error("Error sending invite"); } finally { setSaving(false); }
  };

  const updateRole = async (id: string, newRole: string) => {
    try {
      const r = await fetch(`/api/team/members/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole })
      });
      if ((await r.json()).success) { toast.success("Role updated"); fetch_(); }
    } catch { toast.error("Error"); }
  };

  const removeMember = async (id: string) => {
    if (!confirm("Remove this team member?")) return;
    const r = await fetch(`/api/team/members/${id}`, { method: "DELETE" });
    if ((await r.json()).success) { toast.success("Removed"); fetch_(); }
  };

  const cancelInvite = async (id: string) => {
    if (!confirm("Cancel this invitation?")) return;
    const r = await fetch(`/api/team/invite?id=${id}`, { method: "DELETE" });
    if ((await r.json()).success) { toast.success("Cancelled"); fetch_(); }
  };

  const copyInviteLink = async (token: string) => {
    const appUrl = window.location.origin;
    const url = `${appUrl}/auth/accept-invite?token=${token}`;
    await navigator.clipboard.writeText(url);
    toast.success("Invite link copied!");
  };

  const isOwner = currentUser?.role === "OWNER";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-orange-400" />Team Members
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Invite team and manage roles. Only Owner can manage team.
          </p>
        </div>
        {isOwner && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-orange-500 hover:bg-orange-600">
                <Plus className="w-4 h-4 mr-2" />Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Invite Team Member</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Email Address *</Label>
                  <Input type="email" value={f.email}
                    onChange={e => setF(p => ({...p, email: e.target.value}))}
                    placeholder="person@company.com" />
                </div>
                <div className="space-y-1.5">
                  <Label>Name (optional)</Label>
                  <Input value={f.name}
                    onChange={e => setF(p => ({...p, name: e.target.value}))}
                    placeholder="Their full name" />
                </div>
                <div className="space-y-1.5">
                  <Label>Role *</Label>
                  <Select value={f.role} onValueChange={(v) => setF(p => ({...p, role: v as Role}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(ROLES).filter(([k]) => k !== "OWNER").map(([k, def]) => (
                        <SelectItem key={k} value={k}>
                          <div>
                            <p className="font-medium">{def.name}</p>
                            <p className="text-xs text-slate-500">{def.description}</p>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {f.role && (
                  <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                    <p className="text-slate-400 text-xs font-medium mb-2">Role Permissions:</p>
                    <p className="text-slate-300 text-xs">{ROLES[f.role].description}</p>
                  </div>
                )}

                <Button onClick={sendInvite} disabled={saving} className="w-full bg-orange-500 hover:bg-orange-600">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Mail className="w-4 h-4 mr-2" />Send Invitation</>}
                </Button>

                <p className="text-slate-500 text-xs text-center">
                  Invitation expires in 7 days. They will receive an email link.
                </p>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 text-center">
          <p className="text-slate-500 text-xs uppercase">Active Members</p>
          <p className="text-2xl font-bold text-white mt-1">{members.filter(m => m.isActive).length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-slate-500 text-xs uppercase">Pending Invites</p>
          <p className="text-2xl font-bold text-yellow-400 mt-1">{invites.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-slate-500 text-xs uppercase">Managers</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">{members.filter(m => m.role === "MANAGER").length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-slate-500 text-xs uppercase">Supervisors</p>
          <p className="text-2xl font-bold text-purple-400 mt-1">{members.filter(m => m.role === "SUPERVISOR").length}</p>
        </CardContent></Card>
      </div>

      {loading ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div> : (
        <>
          {/* Active Members */}
          <Card>
            <CardContent className="p-5">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-orange-400" />Team Members ({members.filter(m => m.isActive).length})
              </h3>
              <div className="space-y-2">
                {members.filter(m => m.isActive).map(m => {
                  const Icon = ROLE_ICONS[m.role] || Eye;
                  return (
                    <div key={m.id} className="p-3 bg-slate-800/50 rounded-lg border border-slate-800 flex items-center gap-3">
                      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center border",
                        ROLE_COLORS[m.role] || "bg-slate-800")}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-white font-semibold text-sm">{m.name}</p>
                          {m.id === currentUser?.id && <Badge className="bg-blue-500/20 text-blue-300 text-xs">You</Badge>}
                        </div>
                        <p className="text-slate-500 text-xs truncate">{m.email}{m.phone ? ` · ${m.phone}` : ""}</p>
                      </div>

                      {isOwner && m.id !== currentUser?.id && m.role !== "OWNER" ? (
                        <Select value={m.role} onValueChange={(v) => updateRole(m.id, v)}>
                          <SelectTrigger className="w-36 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(ROLES).filter(([k]) => k !== "OWNER").map(([k, def]) => (
                              <SelectItem key={k} value={k}>{def.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline" className={cn("text-xs", ROLE_COLORS[m.role])}>
                          {ROLES[m.role as Role]?.name || m.role}
                        </Badge>
                      )}

                      {isOwner && m.id !== currentUser?.id && m.role !== "OWNER" && (
                        <Button variant="ghost" size="sm" onClick={() => removeMember(m.id)}
                          className="text-red-400 hover:bg-red-500/10 h-8 w-8 p-0">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Pending Invites */}
          {invites.length > 0 && (
            <Card className="bg-yellow-500/5 border-yellow-500/20">
              <CardContent className="p-5">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-yellow-400" />Pending Invitations ({invites.length})
                </h3>
                <div className="space-y-2">
                  {invites.map(inv => {
                    const Icon = ROLE_ICONS[inv.role] || Eye;
                    const expiresIn = Math.ceil((new Date(inv.expiresAt).getTime() - Date.now()) / 86400000);
                    return (
                      <div key={inv.id} className="p-3 bg-slate-900/50 rounded-lg border border-slate-800 flex items-center gap-3">
                        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center border",
                          ROLE_COLORS[inv.role] || "bg-slate-800")}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium">{inv.name || inv.email}</p>
                          <p className="text-slate-500 text-xs">{inv.email} · Expires in {expiresIn}d</p>
                        </div>
                        <Badge variant="outline" className={cn("text-xs", ROLE_COLORS[inv.role])}>
                          {ROLES[inv.role as Role]?.name}
                        </Badge>
                        {isOwner && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => copyInviteLink(inv.inviteToken)}
                              className="text-blue-400 hover:bg-blue-500/10 h-8 w-8 p-0" title="Copy invite link">
                              <Copy className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => cancelInvite(inv.id)}
                              className="text-red-400 hover:bg-red-500/10 h-8 w-8 p-0">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Role Reference */}
          <Card>
            <CardContent className="p-5">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-orange-400" />Role Permissions Guide
              </h3>
              <div className="space-y-2">
                {Object.entries(ROLES).map(([k, def]) => {
                  const Icon = ROLE_ICONS[k] || Eye;
                  return (
                    <div key={k} className="p-3 bg-slate-800/50 rounded-lg border border-slate-800 flex items-start gap-3">
                      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center border flex-shrink-0 mt-0.5",
                        ROLE_COLORS[k])}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-semibold text-sm">{def.name}</p>
                        <p className="text-slate-400 text-xs mt-0.5">{def.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}