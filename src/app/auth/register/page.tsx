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
import { Building2, Loader2, ArrowRight, ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [userData, setUserData] = useState({ name: "", email: "", phone: "", password: "" });
  const [companyData, setCompanyData] = useState({
    name: "",
    type: "PROPRIETORSHIP",
    panNumber: "",
    gstNumber: "",
    state: "West Bengal",
    city: "",
    contractorClass: "CLASS_III",
  });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error("User creation failed");

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: { ...userData, supabaseId: authData.user.id },
          company: companyData,
        }),
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error || "Registration failed");

      toast.success("Welcome to DSRT CEOS!");
      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <Link href="/" className="block text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500 rounded-2xl mb-4 shadow-lg shadow-orange-500/20">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Register Your Company</h1>
          <div className="flex items-center justify-center gap-2 mt-3">
            <div className={`h-2 w-16 rounded-full transition-all ${step === 1 ? "bg-orange-500" : "bg-slate-700"}`} />
            <div className={`h-2 w-16 rounded-full transition-all ${step === 2 ? "bg-orange-500" : "bg-slate-700"}`} />
          </div>
          <p className="text-slate-500 text-sm mt-2">Step {step} of 2</p>
        </Link>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={step === 2 ? handleRegister : (e) => { e.preventDefault(); setStep(2); }}>
              {step === 1 && (
                <div className="space-y-4">
                  <h3 className="text-white font-semibold text-lg mb-4">Your Details</h3>
                  <div className="space-y-2">
                    <Label>Your Full Name</Label>
                    <Input placeholder="Ramesh Kumar" value={userData.name} onChange={(e) => setUserData({ ...userData, name: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <Input type="email" placeholder="ramesh@company.com" value={userData.email} onChange={(e) => setUserData({ ...userData, email: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Mobile Number</Label>
                    <Input type="tel" placeholder="+91 98765 43210" value={userData.phone} onChange={(e) => setUserData({ ...userData, phone: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Password (min 8 characters)</Label>
                    <Input type="password" placeholder="********" value={userData.password} onChange={(e) => setUserData({ ...userData, password: e.target.value })} required minLength={8} />
                  </div>
                  <Button type="submit" className="w-full">
                    Next: Company Details <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <h3 className="text-white font-semibold text-lg mb-4">Company Details</h3>
                  <div className="space-y-2">
                    <Label>Company Name</Label>
                    <Input placeholder="Kumar Construction Co." value={companyData.name} onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })} required />
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
                      <Input placeholder="ABCDE1234F" value={companyData.panNumber} onChange={(e) => setCompanyData({ ...companyData, panNumber: e.target.value.toUpperCase() })} />
                    </div>
                    <div className="space-y-2">
                      <Label>GST (optional)</Label>
                      <Input placeholder="19ABCDE1234F1Z5" value={companyData.gstNumber} onChange={(e) => setCompanyData({ ...companyData, gstNumber: e.target.value.toUpperCase() })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input placeholder="Kolkata" value={companyData.city} onChange={(e) => setCompanyData({ ...companyData, city: e.target.value })} />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
                      <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                    <Button type="submit" className="flex-1" disabled={loading}>
                      {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</>) : "Create Account"}
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