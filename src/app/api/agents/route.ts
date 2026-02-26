import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentRuns, leads, outreachMessages, followUpSequences, callPreps, proposals } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import type { AgentType, Lead, Channel } from "@/types";
import { generateOutreachBatch } from "@/lib/agents/outreach-composer";
import { generateMorningBriefing } from "@/lib/agents/pipeline-intelligence";
import { generateCallPrep } from "@/lib/agents/prospect-research";
import { generateProposal } from "@/lib/agents/proposal-generator";
import { buildDailyFollowUpQueue } from "@/lib/agents/follow-up-sequencing";
import { formatCurrency, calculateROI } from "@/lib/utils";

/** Hydrate a DB row into a typed Lead by parsing JSON fields. */
function hydrateLead(row: Record<string, unknown>): Lead {
  return {
    ...row,
    painSignals: row.painSignals ? JSON.parse(row.painSignals as string) : [],
    scoreBreakdown: row.scoreBreakdown ? JSON.parse(row.scoreBreakdown as string) : null,
  } as Lead;
}

// GET /api/agents — Returns status of all agents
export async function GET() {
  try {
    const agentTypes: AgentType[] = [
      "lead_scout",
      "outreach_composer",
      "pipeline_intelligence",
      "prospect_research",
      "follow_up_sequencing",
      "proposal_generator",
    ];

    const latestRuns = await Promise.all(
      agentTypes.map(async (type) => {
        const runs = await db
          .select()
          .from(agentRuns)
          .where(eq(agentRuns.agentType, type))
          .orderBy(desc(agentRuns.startedAt))
          .limit(1);
        return {
          agentType: type,
          latestRun: runs[0] || null,
        };
      })
    );

    return NextResponse.json({ agents: latestRuns });
  } catch (error) {
    console.error("Failed to fetch agent status:", error);
    return NextResponse.json({ error: "Failed to fetch agent status" }, { status: 500 });
  }
}

// POST /api/agents — Trigger an agent run
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentType } = body as { agentType: AgentType };

    // Create a new run record
    const [run] = await db.insert(agentRuns).values({
      agentType,
      status: "running",
    }).returning();

    // Execute agent logic based on type
    let itemsProcessed = 0;
    let summary = "";

    try {
      switch (agentType) {
        case "lead_scout": {
          // Lead Scout requires OpenAI API key; if not available, just mark completed
          summary = "Lead Scout requires OPENAI_API_KEY to discover new leads. Configure it in your environment to enable GPT-powered lead discovery.";
          break;
        }

        case "outreach_composer": {
          // Get cold leads without draft messages
          const coldLeads = await db
            .select()
            .from(leads)
            .where(eq(leads.pipelineStage, "cold"))
            .orderBy(desc(leads.score))
            .limit(10);

          if (coldLeads.length === 0) {
            summary = "No cold leads available for outreach generation.";
            break;
          }

          const batch = generateOutreachBatch(coldLeads.map(hydrateLead));

          for (const msg of batch.messages) {
            await db.insert(outreachMessages).values({
              leadId: msg.leadId,
              channel: msg.channel,
              templateId: msg.templateId,
              subject: msg.subject,
              body: msg.body,
              personalizationNotes: msg.personalizationNotes,
              roiCalculation: msg.roiCalculation,
              status: "draft",
              sequenceDay: 0,
            });
            itemsProcessed++;
          }

          summary = batch.summary;
          break;
        }

        case "pipeline_intelligence": {
          const briefing = await generateMorningBriefing();
          summary = briefing;
          itemsProcessed = 1;
          break;
        }

        case "prospect_research": {
          // Generate call preps for discovery_booked leads without one
          const bookedLeads = await db
            .select()
            .from(leads)
            .where(eq(leads.pipelineStage, "discovery_booked"));

          for (const lead of bookedLeads) {
            const existing = await db
              .select({ id: callPreps.id })
              .from(callPreps)
              .where(eq(callPreps.leadId, lead.id))
              .limit(1);

            if (existing.length > 0) continue;

            const prep = generateCallPrep(hydrateLead(lead as Record<string, unknown>));
            const roi = calculateROI(lead.locationCount);

            await db.insert(callPreps).values({
              leadId: lead.id,
              callDate: new Date(Date.now() + 3 * 86400000).toISOString(),
              companySnapshot: JSON.stringify(prep.companySnapshot),
              painSignals: JSON.stringify(prep.painSignals),
              financialModel: JSON.stringify({
                "Est. Annual Lost Revenue": formatCurrency(prep.financialModel.estimatedAnnualLostRevenue),
                "Monthly Investment": formatCurrency(roi.monthlyInvestment),
                "Projected ROI": `${prep.financialModel.roi}X`,
                "Payback Period": `${prep.financialModel.paybackDays} days`,
              }),
              killerQuestions: JSON.stringify(prep.killerQuestions),
              objectionHandles: JSON.stringify(prep.objectionHandles),
              recommendedCaseStudy: prep.recommendedCaseStudy,
              competitiveIntel: prep.competitiveIntel,
            });
            itemsProcessed++;
          }

          summary = `Generated ${itemsProcessed} call prep doc(s) for discovery-booked leads.`;
          break;
        }

        case "follow_up_sequencing": {
          // Get active sequences with their leads
          const activeSeqs = await db
            .select({
              seqId: followUpSequences.id,
              leadId: followUpSequences.leadId,
              currentDay: followUpSequences.currentDay,
              channelHistory: followUpSequences.channelHistory,
            })
            .from(followUpSequences)
            .where(eq(followUpSequences.status, "active"));

          if (activeSeqs.length === 0) {
            summary = "No active follow-up sequences to process.";
            break;
          }

          const seqData: Array<{ lead: Lead; currentDay: number; channelsUsed: Channel[] }> = [];

          for (const seq of activeSeqs) {
            const [lead] = await db
              .select()
              .from(leads)
              .where(eq(leads.id, seq.leadId))
              .limit(1);

            if (lead) {
              seqData.push({
                lead: hydrateLead(lead as Record<string, unknown>),
                currentDay: seq.currentDay,
                channelsUsed: seq.channelHistory ? JSON.parse(seq.channelHistory) as Channel[] : [],
              });
            }
          }

          const queue = buildDailyFollowUpQueue(seqData);

          for (const msg of queue) {
            await db.insert(outreachMessages).values({
              leadId: msg.leadId,
              channel: msg.channel,
              templateId: msg.templateId,
              subject: msg.subject,
              body: msg.body,
              status: "draft",
              sequenceDay: msg.sequenceDay,
            });
            itemsProcessed++;
          }

          summary = `Follow-Up Queue: ${queue.length} messages generated for ${activeSeqs.length} active sequences.`;
          break;
        }

        case "proposal_generator": {
          // Generate proposals for demo_completed leads without one
          const demoLeads = await db
            .select()
            .from(leads)
            .where(eq(leads.pipelineStage, "demo_completed"));

          for (const lead of demoLeads) {
            const existing = await db
              .select({ id: proposals.id })
              .from(proposals)
              .where(eq(proposals.leadId, lead.id))
              .limit(1);

            if (existing.length > 0) continue;

            const proposal = generateProposal({ lead: hydrateLead(lead as Record<string, unknown>) });
            const roi = calculateROI(lead.locationCount);

            await db.insert(proposals).values({
              leadId: lead.id,
              executiveSummary: proposal.executiveSummary,
              currentStateAnalysis: proposal.currentStateAnalysis,
              proposedSolution: proposal.proposedSolution,
              financialModel: proposal.financialModel,
              implementationTimeline: proposal.implementationTimeline,
              caseStudy: proposal.caseStudy,
              pricing: JSON.stringify({
                setupFee: lead.locationCount <= 5 ? 2000 : 5000,
                monthly: roi.monthlyInvestment,
                yearOneValue: roi.estimatedAnnualValue,
                roi: roi.roi,
              }),
              nextSteps: proposal.nextSteps,
              status: "draft",
            });
            itemsProcessed++;
          }

          summary = `Generated ${itemsProcessed} proposal(s) for demo-completed leads.`;
          break;
        }
      }

      // Update run record as completed
      await db
        .update(agentRuns)
        .set({
          status: "completed",
          completedAt: sql`datetime('now')`,
          itemsProcessed,
          summary,
        })
        .where(eq(agentRuns.id, run.id));
    } catch (agentError) {
      // Update run record as failed
      await db
        .update(agentRuns)
        .set({
          status: "failed",
          completedAt: sql`datetime('now')`,
          errorLog: String(agentError),
        })
        .where(eq(agentRuns.id, run.id));

      console.error(`Agent ${agentType} failed:`, agentError);
    }

    // Return the updated run
    const [updatedRun] = await db
      .select()
      .from(agentRuns)
      .where(eq(agentRuns.id, run.id))
      .limit(1);

    return NextResponse.json({ run: updatedRun }, { status: 201 });
  } catch (error) {
    console.error("Failed to trigger agent:", error);
    return NextResponse.json({ error: "Failed to trigger agent" }, { status: 500 });
  }
}
