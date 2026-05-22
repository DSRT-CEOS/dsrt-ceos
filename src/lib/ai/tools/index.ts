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
          include: { tracks: { where: { companyId }, take: 1 } },
          select: {
            id: true, workName: true, department: true,
            estimatedCost: true, lastSubmissionDate: true,
            tracks: { select: { status: true, eligibilityStatus: true, matchScore: true } }
          }
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
            daysLeft: Math.ceil((new Date(t.lastSubmissionDate!).getTime() - Date.now()) / 86400000),
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

// AI determines which tools to use based on user query
export function getToolSchema(): string {
  return `Available tools you can use to help the user:

1. list_tenders - Show user's uploaded tenders
2. list_urgent_tenders - Show tenders closing in 7 days
3. list_eligible_tenders - Show tenders where user is eligible
4. list_projects - Show user's projects
5. list_bills - Show all bills
6. list_pending_bills - Show bills awaiting payment
7. list_documents - Show company documents
8. get_compliance_summary - Get GST/TDS/ESI/EPF summary
9. get_financial_summary - Get overall financial picture
10. navigate(path) - Navigate user to a specific page

NAVIGATION PATHS:
- /dashboard - Home
- /dashboard/tenders - Tender list
- /dashboard/tenders/upload - Tender upload (no separate page - use tenders page)
- /dashboard/documents - Document vault
- /dashboard/projects - All projects
- /dashboard/projects/new - Create new project
- /dashboard/billing - All bills
- /dashboard/billing/new - Create new bill
- /dashboard/compliance - Compliance dashboard
- /dashboard/reports - Reports & analytics
- /dashboard/settings/profile - Company profile
- /dashboard/settings/preferences - Preferences
- /dashboard/settings/staff - Staff management
- /dashboard/settings/machinery - Machinery
- /dashboard/settings/past-works - Past works
- /dashboard/settings/registrations - Registrations

When user asks about data, USE the appropriate tool.
When user asks to "go to" or "show me" a section, USE navigate tool.
When user just asks for info/explanation, answer directly without tools.

To use a tool, respond with JSON wrapped in <tool> tags:
<tool>{"tool": "list_urgent_tenders"}</tool>
<tool>{"tool": "navigate", "params": {"path": "/dashboard/tenders"}}</tool>

You can use MULTIPLE tools in one response if needed.
After tool call, you'll see results and can give final answer.`;
}