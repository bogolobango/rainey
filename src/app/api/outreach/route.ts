import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { outreachMessages, leads } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";

export async function GET() {
  try {
    const messages = await db
      .select({
        id: outreachMessages.id,
        leadId: outreachMessages.leadId,
        channel: outreachMessages.channel,
        templateId: outreachMessages.templateId,
        subject: outreachMessages.subject,
        body: outreachMessages.body,
        personalizationNotes: outreachMessages.personalizationNotes,
        roiCalculation: outreachMessages.roiCalculation,
        status: outreachMessages.status,
        sequenceDay: outreachMessages.sequenceDay,
        scheduledAt: outreachMessages.scheduledAt,
        sentAt: outreachMessages.sentAt,
        createdAt: outreachMessages.createdAt,
        companyName: leads.companyName,
        contactFirst: leads.firstName,
        contactLast: leads.lastName,
        score: leads.score,
      })
      .from(outreachMessages)
      .leftJoin(leads, eq(outreachMessages.leadId, leads.id))
      .orderBy(desc(outreachMessages.createdAt))
      .limit(50);

    const draftCount = messages.filter(m => m.status === "draft").length;
    const approvedCount = messages.filter(m => m.status === "approved").length;

    return NextResponse.json({ messages, draftCount, approvedCount });
  } catch (error) {
    console.error("Failed to fetch outreach:", error);
    return NextResponse.json({ error: "Failed to fetch outreach" }, { status: 500 });
  }
}
