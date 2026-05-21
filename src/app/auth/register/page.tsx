"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import toast from "react-hot-toast";
import Link from "next/link";
import { Building2, Loader2, ArrowRight, ArrowLeft, Mail, CheckCircle2, AlertCircle } from "lucide-react";

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  const [userData, setUserData] = useState({ name: "", email: "", phone: "", password: "" });
  const [companyData, setCompanyData] = useState({
    name: "", type: "PROPRIETORSHIP", panNumber: "",
    gstNumber: "", state: "West Bengal", city: "", contractorClass: "CLASS_III",
  });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    try {
      const supabase = createClient();
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: { full_name: userData.name },
        },
      });

      if (authError) {
        if (authError.message.includes("already registered")) {
          setErrorMsg("This email is already registered. Please sign in instead.");
          return;
        }
        if (authError.message.includes("rate limit")) {
          setErrorMsg("Too many requests. Please wait a moment and try again.");
          return;
        }
        throw authError;
      }
      if (!authData.user) throw new Error("Registration failed");

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: { ...userData, supabaseId: authData.user.id },
          company: companyData,
        }),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || "Setup failed");

      setDone(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration failed";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="w-10 h-10 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Check Your Email</h1>
          <p className="text-slate-400 mb-2">
            We sent a verification link to:
          </p>
          <p className="text-orange-400 font-semibold text-lg mb-6">{userData.email}</p>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-left mb-6">
            <p className="text-slate-300 text-sm font-medium mb-3">Next steps:</p>
            <div className="space-y-2">
              {[
                "Open your email inbox",
                "Click the confirmation link from DSRT CEOS",
                "Come back and sign in",
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-orange-500/20 border border-orange-500/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-orange-400 text-xs font-bold">{i + 1}</span>
                  </div>
                  <p className="text-slate-400 text-sm">{step}</p>
                </div>
              ))}
            </div>
          </div>
          <Link href="/auth/login">
            <Button className="w-full">Go to Sign In</Button>
          </Link>
          <p className="text-slate-600 text-xs mt-4">
            Did not receive email? Check spam folder or{" "}
            <button
              onClick={async () => {
                const supabase = createClient();
                await supabase.auth.resend({ type: "signup", email: userData.email });
                toast.success("Verification email resent!");
              }}
              className="text-orange-400 hover:text-orange-300"
            >
              click to resend
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <Link href="/" className="block text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500 rounded-2xl mb-4 shadow-lg shadow-orange-500/20">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Register Your Company</h1>
          <div className="flex items-center justify-center gap-2 mt-3">
            <div className={`h-2 w-20 rounded-full transition-all ${step === 1 ? "bg-orange-500" : "bg-green-500"}`} />
            <div className={`h-2 w-20 rounded-full transition-all ${step === 2 ? "bg-orange-500" : "bg-slate-700"}`} />
          </div>
          <p className="text-slate-500 text-sm mt-2">Step {step} of 2</p>
        </Link>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-400 text-sm">{errorMsg}</p>
          </div>
        )}

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={step === 2 ? handleRegister : (e) => { e.preventDefault(); setStep(2); }}>
              {step === 1 && (
                <div className="space-y-4">
                  <h3 className="text-white font-semibold text-lg mb-4">Your Details</h3>
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input placeholder="Ramesh Kumar" value={userData.name}
                      onChange={(e) => setUserData({ ...userData, name: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <Input type="email" placeholder="ramesh@company.com" value={userData.email}
                      onChange={(e) => setUserData({ ...userData, email: e.target.value })} required />
                    <p className="text-slate-500 text-xs flex items-center gap-1">
                      <Mail className="w-3 h-3" /> A verification email will be sent to this address
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Mobile Number</Label>
                    <Input type="tel" placeholder="+91 98765 43210" value={userData.phone}
                      onChange={(e) => setUserData({ ...userData, phone: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Password (min 8 characters)</Label>
                    <Input type="password" placeholder="••••••••" value={userData.password}
                      onChange={(e) => setUserData({ ...userData, password: e.target.value })}
                      required minLength={8} />
                  </div>
                  <Button type="submit" className="w-full">
                    Next <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-2 bg-green-500/10 border border-green-500/20 rounded-lg mb-4">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <p className="text-green-400 text-xs">{userData.email}</p>
                  </div>
                  <h3 className="text-white font-semibold text-lg">Company Details</h3>
                  <div className="space-y-2">
                    <Label>Company Name</Label>
                    <Input placeholder="Kumar Construction Co." value={companyData.name}
                      onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })} required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Company Type</Label>
                      <Select value={companyData.type} onValueChange={(v) => setCompanyData({ ...companyData, type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PROPRIETORSHIP">Proprietorship</SelectItem>
                          <SelectItem value="PARTNERSHIP">Partnership</SelectItem>
                          <SelectItem value="PRIVATE_LIMITED">Pvt Limited</SelectItem>
                          <SelectItem value="LLP">LLP</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Contractor Class</Label>
                      <Select value={companyData.contractorClass} onValueChange={(v) => setCompanyData({ ...companyData, contractorClass: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CLASS_I">Class I</SelectItem>
                          <SelectItem value="CLASS_II">Class II</SelectItem>
                          <SelectItem value="CLASS_III">Class III</SelectItem>
                          <SelectItem value="CLASS_IV">Class IV</SelectItem>
                          <SelectItem value="CLASS_V">Class V</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>PAN (optional)</Label>
                      <Input placeholder="ABCDE1234F" value={companyData.panNumber}
                        onChange={(e) => setCompanyData({ ...companyData, panNumber: e.target.value.toUpperCase() })} />
                    </div>
                    <div className="space-y-2">
                      <Label>GST (optional)</Label>
                      <Input placeholder="19ABCDE1234F1Z5" value={companyData.gstNumber}
                        onChange={(e) => setCompanyData({ ...companyData, gstNumber: e.target.value.toUpperCase() })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input placeholder="Kolkata" value={companyData.city}
                      onChange={(e) => setCompanyData({ ...companyData, city: e.target.value })} />
                  </div>
                  <div className="flex gap-3">
                    <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
                      <ArrowLeft className="w-4 h-4 mr-1" /> Back
                    </Button>
                    <Button type="submit" className="flex-1" disabled={loading}>
                      {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> : "Create Account"}
                    </Button>
                  </div>
                </div>
              )}
            </form>
            <div className="mt-4 text-center">
              <p className="text-slate-500 text-sm">
                Already registered?{" "}
                <Link href="/auth/login" className="text-orange-400 hover:text-orange-300">Sign in</Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}