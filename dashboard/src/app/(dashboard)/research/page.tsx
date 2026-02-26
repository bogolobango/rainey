"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  const { data, loading } = useApi<ResearchData>("/api/research");
  const callPreps = data?.callPreps ?? [];
  const featured = callPreps[0] ?? null;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display text-foreground">Prospect Research</h1>
          <p className="text-sm text-muted-foreground font-sans mt-1">
            {loading ? "Loading research briefs..." : "Deep research briefs and call prep docs for upcoming discovery calls"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" className="font-sans rounded-full">
            <RefreshCw className="h-4 w-4 mr-1" />
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
                          {contactName} — {new Date(cp.callDate).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="success" className="font-sans text-xs">Prep Ready</Badge>
                      <Button variant="outline" size="sm" className="font-sans text-xs">
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

      {/* Featured Call Prep (first one) */}
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
                      {new Date(featured.callDate).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })} — {contactName}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="font-sans text-xs">
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
    </div>
  );
}
