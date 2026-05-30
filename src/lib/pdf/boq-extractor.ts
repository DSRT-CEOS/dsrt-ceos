import { chatCompletion } from "@/lib/ai/groq";
import { createServiceClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

interface BOQItemExtracted {
  slNo: string;
  description: string;
  unit?: string;
  quantity?: number;
  rate?: number;
}

export async function extractBOQFromTender(tenderId: string): Promise<{ count: number; items: BOQItemExtracted[] }> {
  const tender = await prisma.tender.findUnique({ where: { id: tenderId } });
  if (!tender || !tender.originalFilePath) throw new Error("Tender not found");

  let text = tender.rawText || "";

  // If no rawText, download and parse
  if (!text || text.length < 100) {
    const supabase = createServiceClient();
    const { data: file, error } = await supabase.storage.from("tender-documents").download(tender.originalFilePath);
    if (error || !file) throw new Error("Cannot download tender PDF");

    const buffer = Buffer.from(await file.arrayBuffer());
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buffer);
    text = data.text || "";
  }

  if (text.length < 100) throw new Error("PDF has no readable text");

  // Try to find BOQ section
  const boqMarkers = [
    /bill\s+of\s+quantit/i,
    /BOQ/i,
    /schedule\s+of\s+(items|quantities|work)/i,
    /price\s+schedule/i,
    /summary\s+of\s+items/i,
  ];

  let boqStart = -1;
  for (const marker of boqMarkers) {
    const m = text.match(marker);
    if (m && m.index !== undefined && m.index > boqStart) {
      boqStart = m.index;
    }
  }

  const boqText = boqStart > 0 ? text.substring(boqStart, Math.min(boqStart + 20000, text.length)) : text.substring(0, 15000);

  const prompt = `Extract BOQ (Bill of Quantities) items from this Indian government tender document.

Return JSON object with key "items" containing array of BOQ items:
{
  "items": [
    {"slNo": "1", "description": "PCC 1:3:6 for foundation", "unit": "Cum", "quantity": 100, "rate": 5500},
    {"slNo": "2", "description": "RCC M20 for plinth", "unit": "Cum", "quantity": 50, "rate": 7800}
  ]
}

RULES:
- Extract every line item with quantity
- Handle decimal units (Cum, Sqm, RM, Kg, MT, Bag, Nos)
- If rate is not given (only quantity), set rate to null
- Description should be clean (no extra spaces, no S.No prefix)
- Skip header rows, totals, summaries
- Maximum 100 items

DOCUMENT TEXT:
${boqText}`;

  try {
    const response = await chatCompletion([
      { role: "system", content: "You are an expert at extracting BOQ data from Indian construction tender documents. Return only valid JSON." },
      { role: "user", content: prompt }
    ], {
      fallbackChain: ["llama-3.1-8b-instant", "llama-3.3-70b-versatile"],
      temperature: 0.1,
      maxTokens: 4000,
      responseFormat: "json_object",
    });

    const parsed = JSON.parse(response);
    const items: BOQItemExtracted[] = parsed.items || [];

    // Save to ProjectBOQProgress if project exists (linked via tender track)
    const track = await prisma.tenderTrack.findFirst({
      where: { tenderId },
      include: { project: true }
    });

    if (track?.project) {
      // Clear existing BOQ and add fresh
      await prisma.projectBOQProgress.deleteMany({ where: { projectId: track.project.id } });

      if (items.length > 0) {
        await prisma.projectBOQProgress.createMany({
          data: items.map((item, idx) => ({
            projectId: track.project!.id,
            boqItemId: `BOQ-${Date.now()}-${idx}`,
            slNo: String(item.slNo || idx + 1),
            description: item.description,
            unit: item.unit || null,
            contractQty: item.quantity || 0,
            rate: item.rate || 0,
            totalCompleted: 0,
          }))
        });
      }
    }

    // Also save to BOQItem table (linked to tender)
    await prisma.bOQItem.deleteMany({ where: { tenderId } });
    if (items.length > 0) {
      await prisma.bOQItem.createMany({
        data: items.map((item, idx) => ({
          tenderId,
          slNo: String(item.slNo || idx + 1),
          description: item.description,
          unit: item.unit || null,
          quantity: item.quantity || null,
          sortOrder: idx,
        }))
      });
    }

    return { count: items.length, items };
  } catch (err: any) {
    console.error("BOQ extract error:", err);
    throw new Error("Failed to extract BOQ: " + err.message);
  }
}