"use client";
import { useCurrentUser } from "@/lib/hooks/useUser";
import { ROLES } from "@/lib/auth/roles";
import { Crown, Briefcase, Calculator, HardHat, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

const ROLE_ICONS: Record<string, any> = {
  OWNER: Crown, MANAGER: Briefcase, ACCOUNTANT: Calculator, SUPERVISOR: HardHat, VIEWER: Eye,
};

export default function RoleBadge() {
  const { role, loading } = useCurrentUser();
  if (loading) return null;

  const Icon = ROLE_ICONS[role] || Eye;
  const roleDef = ROLES[role];

  return (
    <div className={cn(
      "hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium",
      "bg-primary/10 border-primary/30 text-primary"
    )}>
      <Icon className="w-3 h-3" />
      <span>{roleDef?.name || role}</span>
    </div>
  );
}