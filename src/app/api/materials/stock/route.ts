import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const projectId = new URL(request.url).searchParams.get("projectId");
    if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });

    const project = await prisma.project.findFirst({ where: { id: projectId, companyId: dbUser.companyId } });
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const records = await prisma.materialLedger.findMany({ where: { projectId } });

    // Calculate stock for each item
    const stockMap = new Map<string, any>();
    records.forEach(r => {
      const key = `${r.itemName}|${r.unit}`;
      if (!stockMap.has(key)) {
        stockMap.set(key, {
          itemName: r.itemName,
          category: r.category,
          unit: r.unit,
          received: 0, issued: 0, returned: 0,
          totalValue: 0, lastRate: 0,
        });
      }
      const item = stockMap.get(key);
      const qty = Number(r.quantity);
      const amt = r.amount ? Number(r.amount) : 0;
      if (r.transactionType === "RECEIPT") {
        item.received += qty;
        item.totalValue += amt;
        if (r.rate) item.lastRate = Number(r.rate);
      } else if (r.transactionType === "ISSUE") {
        item.issued += qty;
      } else if (r.transactionType === "RETURN") {
        item.returned += qty;
      }
    });

    const stock = Array.from(stockMap.values()).map(s => ({
      ...s,
      balance: s.received - s.issued + s.returned,
      avgRate: s.received > 0 ? s.totalValue / s.received : 0,
    })).sort((a, b) => a.itemName.localeCompare(b.itemName));

    const totals = {
      totalItems: stock.length,
      totalValue: stock.reduce((s, i) => s + i.totalValue, 0),
      lowStockItems: stock.filter(s => s.balance < 0 || (s.received > 0 && s.balance / s.received < 0.1)).length,
    };

    return NextResponse.json({ success: true, stock, totals });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Err";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}