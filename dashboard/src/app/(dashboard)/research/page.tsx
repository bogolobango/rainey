"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ToastContainer } from "@/components/ui/toast-container";
import { useToast } from "@/hooks/use-toast";
import {
  FileSearch,
  Calendar,
  Building2,
  Star,
  DollarSign,
  MessageCircleQuestion,
  Shield,
  Download,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { useApi } from "@/hooks/use-api";

interface CallPrepRow {
  id: number;
  leadId: number;
  callDate: string;
  companySnapshot: string;
  painSignals: string;
  financialModel: string;
  killerQuestions: string;
  objectionHandles: string;
  recommendedCaseStudy: string;
  competitiveIntel: string;
  createdAt: string;
  companyName: string | null;
  contactFirst: string | null;
  contactLast: string | null;
  vertical: string | null;
  locationCount: number | null;
}

interface ResearchData {
  callPreps: CallPrepRow[];
}

function parseJsonSafe<T>(val: string, fallback: T): T {
  try { return JSON.parse(val) as T; } catch { return fallback; }
}

export default function ResearchPage() {
  const { data, loading, refetch } = useApi<ResearchData>("/api/research");
  const { toasts, addToast, dismiss } = useToast();
  const callPreps = data?.callPreps ?? [];

  const [generateLoading, setGenerateLoading] = useState(false);
  const [selectedBrief, setSelectedBrief] = useState<CallPrepRow | null>(null);

  async function handleGenerateBrief() {
    setGenerateLoading(true);
    addToast("Running Prospect Research agent...", "info");
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentType: "prospect_research" }),
      });
      const result = await res.json();
      if (res.ok) {
        addToast(result.run?.summary || "Research briefs generated", "success");
        refetch();
      } else {
        addToast(result.error || "Failed to generate briefs", "error");
      }
    } catch {
      addToast("Failed to generate briefs", "error");
    } finally {
      setGenerateLoading(false);
    }
  }

  function handleExportPDF(cp: CallPrepRow) {
    const contactName = [cp.contactFirst, cp.contactLast].filter(Boolean).join(" ") || "Unknown";
    const painSignals: string[] = parseJsonSafe(cp.painSignals, []);
    const killerQuestions: string[] = parseJsonSafe(cp.killerQuestions, []);
    const objectionHandles: Record<string, string> = parseJsonSafe(cp.objectionHandles, {});
    const financialModel: Record<string, string> = parseJsonSafe(cp.financialModel, {});

    const lines = [
      `DISCOVERY CALL PREP: ${cp.companyName}`,
      `Contact: ${contactName}`,
      `Call Date: ${new Date(cp.callDate).toLocaleDateString()}`,
      "",
      "COMPANY SNAPSHOT",
      "\u2500".repeat(40),
      cp.companySnapshot,
      "",
    ];

    if (painSignals.length > 0) {
      lines.push("PAIN SIGNALS", "\u2500".repeat(40));
      painSignals.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
      lines.push("");
    }

    if (Object.keys(financialModel).length > 0) {
      lines.push("FINANCIAL MODEL", "\u2500".repeat(40));
      Object.entries(financialModel).forEach(([k, v]) => lines.push(`${k}: ${v}`));
      lines.push("");
    }

    if (killerQuestions.length > 0) {
      lines.push("KILLER OPENING QUESTIONS", "\u2500".repeat(40));
      killerQuestions.forEach((q, i) => lines.push(`${i + 1}. ${q}`));
      lines.push("");
    }

    if (Object.keys(objectionHandles).length > 0) {
      lines.push("OBJECTION PRE-HANDLES", "\u2500".repeat(40));
      Object.entries(objectionHandles).forEach(([obj, handle]) => {
        lines.push(`"${obj}"`);
        lines.push(`  \u2192 ${handle}`);
      });
      lines.push("");
    }

    if (cp.recommendedCaseStudy) {
      lines.push("RECOMMENDED CASE STUDY", "\u2500".repeat(40), cp.recommendedCaseStudy, "");
    }

    if (cp.competitiveIntel) {
      lines.push("COMPETITIVE INTEL", "\u2500".repeat(40), cp.competitiveIntel, "");
    }

    const content = lines.join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `call-prep-${(cp.companyName ?? "unknown").toLowerCase().replace(/\s+/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    addToast(`Call prep exported for ${cp.companyName}`, "success");
  }

  // The featured brief is the selected one, or if nothing selected the first one
  const featured = selectedBrief ?? callPreps[0] ?? null;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display text-foreground">Prospect Research</h1>
          <p className="text-sm text-muted-foreground font-sans mt-1">
            {loading ? "Loading research briefs..." : `${callPreps.length} research briefs \u2014 deep call prep docs for discovery calls`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" className="font-sans rounded-full" onClick={handleGenerateBrief} disabled={generateLoading}>
            {generateLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            Generate New Brief
          </Button>
        </div>
      </div>

      {/* Upcoming Calls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-sans font-semibold">Upcoming Discovery Calls</CardTitle>
            <Badge variant="secondary" className="font-sans text-xs">{callPreps.length} prepared</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : callPreps.length === 0 ? (
            <p className="text-sm text-muted-foreground font-sans py-4 text-center">
              No call prep docs yet. The Prospect Research agent will generate them for booked discovery calls.
            </p>
          ) : (
            <div className="space-y-3">
              {callPreps.map((cp) => {
                const contactName = [cp.contactFirst, cp.contactLast].filter(Boolean).join(" ") || "Unknown";
                return (
                  <div key={cp.id} className="flex items-center justify-between p-4 rounded-xl border border-border">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold font-sans text-foreground">{cp.companyName}</p>
                        <p className="text-xs text-muted-foreground font-sans">
                          {contactName} \u2014 {new Date(cp.callDate).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="success" className="font-sans text-xs">Prep Ready</Badge>
                      <Button variant="outline" size="sm" className="font-sans text-xs" onClick={() => setSelectedBrief(cp)}>
                        View Brief
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Featured Call Prep */}
      {featured && (() => {
        const contactName = [featured.contactFirst, featured.contactLast].filter(Boolean).join(" ") || "Unknown";
        const painSignals: string[] = parseJsonSafe(featured.painSignals, []);
        const killerQuestions: string[] = parseJsonSafe(featured.killerQuestions, []);
        const objectionHandles: Record<string, string> = parseJsonSafe(featured.objectionHandles, {});
        const financialModel: Record<string, string> = parseJsonSafe(featured.financialModel, {});

        return (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileSearch className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-base font-sans font-semibold">
                      Discovery Call Prep: {featured.companyName}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground font-sans mt-0.5">
                      {new Date(featured.callDate).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })} \u2014 {contactName}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="font-sans text-xs" onClick={() => handleExportPDF(featured)}>
                  <Download className="h-3 w-3 mr-1" />
                  Export PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-6">
                  {/* Company Snapshot */}
                  <div>
                    <h3 className="text-sm font-semibold font-sans text-foreground flex items-center gap-2 mb-3">
                      <Building2 className="h-4 w-4 text-primary" />
                      Company Snapshot
                    </h3>
                    <p className="text-sm text-muted-foreground font-sans">{featured.companySnapshot}</p>
                  </div>

                  {/* Pain Signals */}
                  {painSignals.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold font-sans text-foreground flex items-center gap-2 mb-3">
                        <Star className="h-4 w-4 text-highlight-coral" />
                        Pain Signals Detected
                      </h3>
                      <div className="space-y-2">
                        {painSignals.map((signal, i) => (
                          <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-highlight-coral/5">
                            <span className="text-highlight-coral font-bold text-sm mt-0.5">{i + 1}.</span>
                            <p className="text-sm text-foreground font-sans">{signal}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Financial Model */}
                  {Object.keys(financialModel).length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold font-sans text-foreground flex items-center gap-2 mb-3">
                        <DollarSign className="h-4 w-4 text-highlight-green" />
                        Financial Model
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {Object.entries(financialModel).map(([label, value]) => (
                          <div key={label} className="p-3 rounded-lg bg-muted/50">
                            <p className="text-xs text-muted-foreground font-sans">{label}</p>
                            <p className="text-sm font-medium font-sans text-foreground mt-0.5">{value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Killer Questions */}
                  {killerQuestions.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold font-sans text-foreground flex items-center gap-2 mb-3">
                        <MessageCircleQuestion className="h-4 w-4 text-chart-4" />
                        Killer Opening Questions
                      </h3>
                      <div className="space-y-2">
                        {killerQuestions.map((q, i) => (
                          <div key={i} className="p-3 rounded-lg bg-chart-4/5 border-l-2 border-chart-4">
                            <p className="text-sm font-sans text-foreground italic">{q}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Objection Handles */}
                  {Object.keys(objectionHandles).length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold font-sans text-foreground flex items-center gap-2 mb-3">
                        <Shield className="h-4 w-4 text-chart-5" />
                        Objection Pre-Handles
                      </h3>
                      <div className="space-y-2">
                        {Object.entries(objectionHandles).map(([objection, handle], i) => (
                          <div key={i} className="p-3 rounded-lg bg-chart-5/5">
                            <p className="text-xs font-semibold font-sans text-chart-5 mb-1">&ldquo;{objection}&rdquo;</p>
                            <p className="text-sm font-sans text-foreground">{handle}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        );
      })()}

      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
