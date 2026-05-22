"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Loader2, CheckCircle2, AlertCircle, Mail, UserPlus } from "lucide-react";
import { ROLES, type Role } from "@/lib/auth/roles";
import Link from "next/link";
import toast from "react-hot-toast";

function AcceptInviteContent() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token");

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<any>(null);
  const [error, setError] = useState("");
  const [accepting, setAccepting] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", password: "" });

  useEffect(() => {
    if (!token) { setError("Invalid invitation link"); setLoading(false); return; }
    fetch(`/api/team/accept?token=${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setInvite(d.invite);
          setForm(f => ({ ...f, name: d.invite.name || "" }));
        } else {
          setError(d.error || "Invalid invitation");
        }
      })
      .finally(() => setLoading(false));
  }, [token]);

  const accept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) { toast.error("Password must be 8+ characters"); return; }
    setAccepting(true);

    try {
      const supabase = createClient();

      // Create Supabase auth account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invite.email,
        password: form.password,
        options: { data: { full_name: form.name } }
      });

      if (authError) {
        if (authError.message.includes("already registered")) {
          // Try to sign in instead
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: invite.email, password: form.password,
          });
          if (signInError) throw new Error("This email is already registered. Please sign in with your existing password and we'll link your account.");
        } else throw authError;
      }

      if (!authData?.user) throw new Error("Failed to create account");

      // Accept invite + create user record
      const r = await fetch("/api/team/accept", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token, supabaseId: authData.user.id,
          name: form.name, phone: form.phone,
        })
      });

      const d = await r.json();
      if (!d.success) throw new Error(d.error);

      // Sign in
      await supabase.auth.signInWithPassword({ email: invite.email, password: form.password });

      toast.success(`Welcome to ${invite.companyName}!`);
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to accept invite");
    } finally { setAccepting(false); }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
    </div>
  );

  if (error || !invite) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Invalid Invitation</h1>
          <p className="text-slate-400 mb-4">{error}</p>
          <Link href="/auth/login"><Button className="bg-orange-500 hover:bg-orange-600">Go to Login</Button></Link>
        </CardContent>
      </Card>
    </div>
  );

  const roleDef = ROLES[invite.role as Role];

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500 rounded-2xl mb-4 shadow-lg shadow-orange-500/20">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">You are invited!</h1>
        </div>

        <Card className="mb-4 bg-gradient-to-br from-orange-500/10 to-amber-500/5 border-orange-500/20">
          <CardContent className="p-5 text-center">
            <Building2 className="w-10 h-10 text-orange-400 mx-auto mb-2" />
            <p className="text-white font-bold text-lg">{invite.companyName}</p>
            <p className="text-slate-400 text-sm">{invite.companyLocation}</p>
            <div className="mt-3 inline-flex items-center gap-1 px-3 py-1 bg-orange-500/20 border border-orange-500/30 rounded-full">
              <UserPlus className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-orange-300 text-sm font-medium">Joining as {roleDef?.name || invite.role}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="mb-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-400" />
              <p className="text-slate-300 text-sm">{invite.email}</p>
              <CheckCircle2 className="w-4 h-4 text-green-400 ml-auto" />
            </div>

            <form onSubmit={accept} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Your Full Name *</Label>
                <Input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))}
                  placeholder="Your name" required />
              </div>
              <div className="space-y-1.5">
                <Label>Mobile Number</Label>
                <Input type="tel" value={form.phone} onChange={e => setForm(p => ({...p, phone: e.target.value}))}
                  placeholder="+91 98765 43210" />
              </div>
              <div className="space-y-1.5">
                <Label>Create Password (min 8 characters) *</Label>
                <Input type="password" value={form.password}
                  onChange={e => setForm(p => ({...p, password: e.target.value}))}
                  placeholder="********" required minLength={8} />
              </div>

              <Button type="submit" disabled={accepting} className="w-full bg-orange-500 hover:bg-orange-600">
                {accepting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4 mr-2" />Accept and Join</>}
              </Button>

              {roleDef && (
                <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-800">
                  <p className="text-slate-400 text-xs font-medium mb-1">Your Role: {roleDef.name}</p>
                  <p className="text-slate-500 text-xs">{roleDef.description}</p>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div>}>
      <AcceptInviteContent />
    </Suspense>
  );
}