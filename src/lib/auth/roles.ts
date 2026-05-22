export type Role = "OWNER" | "MANAGER" | "ACCOUNTANT" | "SUPERVISOR" | "VIEWER";

export interface RoleDefinition {
  name: string;
  description: string;
  color: string;
  permissions: {
    tenders: { view: boolean; upload: boolean; delete: boolean; analyze: boolean; generateDocs: boolean };
    projects: { view: boolean; create: boolean; edit: boolean; delete: boolean };
    bills: { view: boolean; create: boolean; edit: boolean; delete: boolean; markPaid: boolean };
    documents: { view: boolean; upload: boolean; delete: boolean };
    workers: { view: boolean; manage: boolean; markAttendance: boolean };
    materials: { view: boolean; manage: boolean };
    expenses: { view: boolean; manage: boolean; approve: boolean };
    compliance: { view: boolean };
    reports: { view: boolean };
    settings: { view: boolean; edit: boolean; manageTeam: boolean };
  };
}

export const ROLES: Record<Role, RoleDefinition> = {
  OWNER: {
    name: "Owner",
    description: "Full system access. Can manage team and all settings.",
    color: "orange",
    permissions: {
      tenders: { view: true, upload: true, delete: true, analyze: true, generateDocs: true },
      projects: { view: true, create: true, edit: true, delete: true },
      bills: { view: true, create: true, edit: true, delete: true, markPaid: true },
      documents: { view: true, upload: true, delete: true },
      workers: { view: true, manage: true, markAttendance: true },
      materials: { view: true, manage: true },
      expenses: { view: true, manage: true, approve: true },
      compliance: { view: true },
      reports: { view: true },
      settings: { view: true, edit: true, manageTeam: true },
    }
  },
  MANAGER: {
    name: "Project Manager",
    description: "Full operations access. Cannot manage team or change profile.",
    color: "blue",
    permissions: {
      tenders: { view: true, upload: true, delete: false, analyze: true, generateDocs: true },
      projects: { view: true, create: true, edit: true, delete: false },
      bills: { view: true, create: true, edit: true, delete: false, markPaid: false },
      documents: { view: true, upload: true, delete: false },
      workers: { view: true, manage: true, markAttendance: true },
      materials: { view: true, manage: true },
      expenses: { view: true, manage: true, approve: false },
      compliance: { view: true },
      reports: { view: true },
      settings: { view: true, edit: false, manageTeam: false },
    }
  },
  ACCOUNTANT: {
    name: "Accountant",
    description: "Financial access. Bills, payments, compliance, reports.",
    color: "green",
    permissions: {
      tenders: { view: true, upload: false, delete: false, analyze: false, generateDocs: false },
      projects: { view: true, create: false, edit: false, delete: false },
      bills: { view: true, create: true, edit: true, delete: false, markPaid: true },
      documents: { view: true, upload: false, delete: false },
      workers: { view: true, manage: false, markAttendance: false },
      materials: { view: true, manage: false },
      expenses: { view: true, manage: true, approve: true },
      compliance: { view: true },
      reports: { view: true },
      settings: { view: false, edit: false, manageTeam: false },
    }
  },
  SUPERVISOR: {
    name: "Site Supervisor",
    description: "Site operations. Attendance, materials, expenses, photos.",
    color: "purple",
    permissions: {
      tenders: { view: false, upload: false, delete: false, analyze: false, generateDocs: false },
      projects: { view: true, create: false, edit: false, delete: false },
      bills: { view: false, create: false, edit: false, delete: false, markPaid: false },
      documents: { view: true, upload: false, delete: false },
      workers: { view: true, manage: true, markAttendance: true },
      materials: { view: true, manage: true },
      expenses: { view: true, manage: true, approve: false },
      compliance: { view: false },
      reports: { view: false },
      settings: { view: false, edit: false, manageTeam: false },
    }
  },
  VIEWER: {
    name: "Viewer",
    description: "Read-only access to everything.",
    color: "slate",
    permissions: {
      tenders: { view: true, upload: false, delete: false, analyze: false, generateDocs: false },
      projects: { view: true, create: false, edit: false, delete: false },
      bills: { view: true, create: false, edit: false, delete: false, markPaid: false },
      documents: { view: true, upload: false, delete: false },
      workers: { view: true, manage: false, markAttendance: false },
      materials: { view: true, manage: false },
      expenses: { view: true, manage: false, approve: false },
      compliance: { view: true },
      reports: { view: true },
      settings: { view: false, edit: false, manageTeam: false },
    }
  },
};

export function hasPermission(role: Role, module: keyof RoleDefinition["permissions"], action: string): boolean {
  const roleDefs = ROLES[role];
  if (!roleDefs) return false;
  const modulePerms = roleDefs.permissions[module];
  if (!modulePerms) return false;
  return (modulePerms as any)[action] === true;
}

export const ROLE_LIST = Object.entries(ROLES).map(([key, def]) => ({
  value: key as Role,
  ...def,
}));