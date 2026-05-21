import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { groq, MODELS } from "@/lib/ai/groq";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const prefs = await prisma.companyPreference.findUnique({ where: { companyId: dbUser.companyId } });
    return NextResponse.json({ success: true, data: prefs });
  } catch (e: unknown) {
    const m = e instanceof Error ? e.message : "Err";
    return NextResponse.json({ success: false, error: m }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const b = await request.json();

    let parsed = null;
    if (b.preferenceNotes && b.preferenceNotes.length > 10) {
      try {
        const c = await groq.chat.completions.create({
          model: MODELS.FAST,
          messages: [
            { role: "system", content: "Parse user preferences. Return JSON: {sectors:[],locations:[],excludeSectors:[],minValue:null,maxValue:null,otherNotes:''}" },
            { role: "user", content: `Notes: "${b.preferenceNotes}"` }
          ],
          temperature: 0.2,
          max_tokens: 300,
          response_format: { type: "json_object" }
        });
        parsed = JSON.parse(c.choices[0]?.message?.content || "{}");
      } catch (err) { console.error("AI parse err:", err); }
    }

    const prefs = await prisma.companyPreference.upsert({
      where: { companyId: dbUser.companyId },
      update: {
        ...(b.preferredStates && { preferredStates: b.preferredStates }),
        ...(b.preferredDistricts !== undefined && { preferredDistricts: b.preferredDistricts }),
        ...(b.preferredSectors && { preferredSectors: b.preferredSectors }),
        ...(b.preferredDepartments !== undefined && { preferredDepartments: b.preferredDepartments }),
        ...(b.minTenderValue !== undefined && { minTenderValue: b.minTenderValue ? parseFloat(b.minTenderValue) : null }),
        ...(b.maxTenderValue !== undefined && { maxTenderValue: b.maxTenderValue ? parseFloat(b.maxTenderValue) : null }),
        ...(b.preferenceNotes !== undefined && { preferenceNotes: b.preferenceNotes }),
        ...(parsed && { parsedPreferences: parsed }),
      },
      create: {
        companyId: dbUser.companyId,
        preferredStates: b.preferredStates || ["West Bengal"],
        preferredDistricts: b.preferredDistricts || [],
        preferredSectors: b.preferredSectors || ["CIVIL_BUILDING"],
        preferredDepartments: b.preferredDepartments || [],
        minTenderValue: b.minTenderValue ? parseFloat(b.minTenderValue) : null,
        maxTenderValue: b.maxTenderValue ? parseFloat(b.maxTenderValue) : null,
        preferenceNotes: b.preferenceNotes || null,
        parsedPreferences: parsed,
      }
    });
    return NextResponse.json({ success: true, data: prefs });
  } catch (e: unknown) {
    const m = e instanceof Error ? e.message : "Err";
    return NextResponse.json({ success: false, error: m }, { status: 500 });
  }
}