import prisma from "@/lib/prisma";

export type ToolName =
  | "list_tenders" | "list_projects" | "list_bills" | "list_documents"
  | "list_pending_bills" | "list_urgent_tenders" | "list_eligible_tenders"
  | "get_tender" | "get_project" | "get_bill"
  | "get_compliance_summary" | "get_financial_summary"
  | "navigate";

export interface ToolCall {
  tool: ToolName;
  params?: Record<string, any>;
}

export interface ToolResult {
  tool: ToolName;
  success: boolean;
  data?: any;
  navigate?: string;
  error?: string;
}

export async function executeToolCall(call: ToolCall, companyId: string): Promise<ToolResult> {
  try {
    switch (call.tool) {
      case "list_tenders": {
        const items = await prisma.tender.findMany({
          where: { uploadedById: companyId, isActive: true },
          orderBy: { createdAt: "desc" },
          take: 10,
          include: { tracks: { where: { companyId }, take: 1 } }
        });
        return {
          tool: call.tool, success: true,
          data: items.map(t => ({
            id: t.id, workName: t.workName, department: t.department,
            estimatedCost: t.estimatedCost ? Number(t.estimatedCost) : null,
            deadline: t.lastSubmissionDate,
            status: t.tracks[0]?.status,
            eligibility: t.tracks[0]?.eligibilityStatus,
            matchScore: t.tracks[0]?.matchScore,
            url: `/dashboard/tenders/${t.id}`,
          })),
        };
      }

      case "list_urgent_tenders": {
        const items = await prisma.tender.findMany({
          where: {
            uploadedById: companyId, isActive: true,
            lastSubmissionDate: { gte: new Date(), lte: new Date(Date.now() + 7 * 86400000) },
            tracks: { some: { companyId, status: { in: ["DISCOVERED", "SHORTLISTED", "PREPARING"] } } }
          },
          orderBy: { lastSubmissionDate: "asc" }, take: 10,
        });
        return {
          tool: call.tool, success: true,
          data: items.map(t => ({
            id: t.id, workName: t.workName, department: t.department,
            estimatedCost: t.estimatedCost ? Number(t.estimatedCost) : null,
            deadline: t.lastSubmissionDate,
            daysLeft: t.lastSubmissionDate ? Math.ceil((new Date(t.lastSubmissionDate).getTime() - Date.now()) / 86400000) : 0,
            url: `/dashboard/tenders/${t.id}`,
          })),
        };
      }

      case "list_eligible_tenders": {
        const tracks = await prisma.tenderTrack.findMany({
          where: { companyId, eligibilityStatus: "ELIGIBLE" },
          include: { tender: true },
          orderBy: { matchScore: "desc" }, take: 10,
        });
        return {
          tool: call.tool, success: true,
          data: tracks.map(t => ({
            id: t.tender.id, workName: t.tender.workName,
            department: t.tender.department,
            estimatedCost: t.tender.estimatedCost ? Number(t.tender.estimatedCost) : null,
            matchScore: t.matchScore,
            url: `/dashboard/tenders/${t.tender.id}`,
          })),
        };
      }

      case "list_projects": {
        const items = await prisma.project.findMany({
          where: { companyId },
          orderBy: { createdAt: "desc" }, take: 10,
        });
        return {
          tool: call.tool, success: true,
          data: items.map(p => ({
            id: p.id, name: p.name, department: p.department, status: p.status,
            contractValue: Number(p.contractValue),
            totalBilled: Number(p.totalBilled),
            totalReceived: Number(p.totalReceived),
            url: `/dashboard/projects/${p.id}`,
          })),
        };
      }

      case "list_bills": {
        const items = await prisma.rABill.findMany({
          where: { project: { companyId } },
          include: { project: { select: { name: true } } },
          orderBy: { createdAt: "desc" }, take: 10,
        });
        return {
          tool: call.tool, success: true,
          data: items.map(b => ({
            id: b.id, billNumber: b.billNumber, status: b.status,
            netPayable: Number(b.netPayable),
            project: b.project.name,
            billDate: b.billDate,
            url: `/dashboard/billing/${b.id}`,
          })),
        };
      }

      case "list_pending_bills": {
        const items = await prisma.rABill.findMany({
          where: { project: { companyId }, status: { in: ["SUBMITTED", "UNDER_CHECK", "PASSED"] } },
          include: { project: { select: { name: true } } },
          orderBy: { submittedDate: "asc" }, take: 10,
        });
        return {
          tool: call.tool, success: true,
          data: items.map(b => ({
            id: b.id, billNumber: b.billNumber, status: b.status,
            netPayable: Number(b.netPayable),
            project: b.project.name,
            url: `/dashboard/billing/${b.id}`,
          })),
        };
      }

      case "list_documents": {
        const items = await prisma.companyDocument.findMany({
          where: { companyId, isLatest: true },
          orderBy: { createdAt: "desc" }, take: 10,
        });
        return {
          tool: call.tool, success: true,
          data: items.map(d => ({
            id: d.id, name: d.name, category: d.category,
            expiryDate: d.expiryDate, isExpired: d.isExpired,
            url: `/dashboard/documents`,
          })),
        };
      }

      case "get_compliance_summary": {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const bills = await prisma.rABill.findMany({
          where: { project: { companyId }, billDate: { gte: monthStart, lte: monthEnd } }
        });

        return {
          tool: call.tool, success: true,
          data: {
            period: now.toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
            gstCollected: bills.reduce((s, b) => s + Number(b.gstAmount), 0),
            gstTdsReceived: bills.reduce((s, b) => s + Number(b.gstTdsDeduction), 0),
            itTdsPaid: bills.reduce((s, b) => s + Number(b.itTdsDeduction), 0),
            labourCess: bills.reduce((s, b) => s + Number(b.labourCess), 0),
            url: "/dashboard/compliance"
          }
        };
      }

      case "get_financial_summary": {
        const [projects, bills] = await Promise.all([
          prisma.project.findMany({ where: { companyId } }),
          prisma.rABill.findMany({ where: { project: { companyId } } }),
        ]);

        const totalContract = projects.reduce((s, p) => s + Number(p.contractValue), 0);
        const totalBilled = bills.reduce((s, b) => s + Number(b.netPayable), 0);
        const totalReceived = bills.filter(b => b.status === "PAID").reduce((s, b) => s + (b.paymentAmount ? Number(b.paymentAmount) : 0), 0);
        const pending = bills.filter(b => b.status !== "PAID" && b.status !== "DRAFT").reduce((s, b) => s + Number(b.netPayable), 0);
        const totalExpenses = projects.reduce((s, p) => s + Number(p.totalExpenses), 0);

        return {
          tool: call.tool, success: true,
          data: {
            projectCount: projects.length, billCount: bills.length,
            totalContract, totalBilled, totalReceived, pending, totalExpenses,
            profit: totalReceived - totalExpenses,
            url: "/dashboard/reports"
          }
        };
      }

      case "navigate": {
        const path = call.params?.path || "/dashboard";
        return { tool: call.tool, success: true, navigate: path };
      }

      default:
        return { tool: call.tool, success: false, error: "Unknown tool" };
    }
  } catch (err: any) {
    return { tool: call.tool, success: false, error: err.message };
  }
}

export function getToolSchema(): string {
  return `AVAILABLE TOOLS (use these for real data):

1. list_tenders - Show user's uploaded tenders
2. list_urgent_tenders - Tenders closing in 7 days
3. list_eligible_tenders - Tenders user is eligible for
4. list_projects - User's projects
5. list_bills - All bills
6. list_pending_bills - Bills awaiting payment
7. list_documents - Company documents
8. get_compliance_summary - GST/TDS/ESI/EPF summary
9. get_financial_summary - Financial overview
10. navigate(path) - Navigate to a page

NAVIGATION PATHS:
- /dashboard, /dashboard/calendar
- /dashboard/tenders, /dashboard/documents
- /dashboard/projects, /dashboard/projects/new
- /dashboard/billing, /dashboard/billing/new
- /dashboard/compliance, /dashboard/reports
- /dashboard/settings/{profile|preferences|staff|machinery|past-works|registrations|team}

To use a tool, respond with JSON wrapped in <tool> tags:
<tool>{"tool": "list_urgent_tenders"}</tool>
<tool>{"tool": "navigate", "params": {"path": "/dashboard/tenders"}}</tool>`;
}