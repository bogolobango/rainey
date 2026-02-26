"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  MapPin,
  Star,
  Target,
  Mail,
  Phone,
  Linkedin,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { VERTICAL_LABELS, PIPELINE_STAGE_LABELS, type Lead, type Vertical } from "@/types";
import { useApi } from "@/hooks/use-api";

interface LeadsData {
  leads: Lead[];
  total: number;
}

const verticalColors: Record<Vertical, string> = {
  indoor_sports: "bg-chart-1/10 text-chart-1",
  med_spa: "bg-chart-2/10 text-chart-2",
  dental: "bg-chart-3/10 text-chart-3",
  youth_sports: "bg-chart-5/10 text-chart-5",
};

export default function LeadsPage() {
  const { data, loading } = useApi<LeadsData>("/api/leads");
  const allLeads = data?.leads ?? [];

  const avgScore = allLeads.length > 0
    ? Math.round(allLeads.reduce((sum, l) => sum + l.score, 0) / allLeads.length * 10) / 10
    : 0;
  const sportsCount = allLeads.filter(l => l.vertical === "indoor_sports" || l.vertical === "youth_sports").length;
  const sportsPct = allLeads.length > 0 ? Math.round((sportsCount / allLeads.length) * 100) : 0;
  const readyForOutreach = allLeads.filter(l => l.score >= 7).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display text-foreground">Lead Pipeline</h1>
          <p className="text-sm text-muted-foreground font-sans mt-1">
            {loading ? "Loading leads..." : `${data?.total ?? 0} leads discovered and enriched by Lead Scout`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="font-sans">
            <Filter className="h-4 w-4 mr-1" />
            Filter
          </Button>
          <Button variant="outline" size="sm" className="font-sans">
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </Button>
          <Button size="sm" className="font-sans rounded-full">
            <RefreshCw className="h-4 w-4 mr-1" />
            Run Lead Scout
          </Button>
        </div>
      </div>

      {/* Score Distribution */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-sans">Avg Lead Score</p>
                <p className="text-2xl font-display text-foreground">{avgScore}</p>
              </div>
              <Target className="h-5 w-5 text-primary" />
            </div>
            <Progress value={avgScore * 10} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-sans">Sports Facilities</p>
                <p className="text-2xl font-display text-foreground">{sportsPct}%</p>
              </div>
              <div className="text-xs text-muted-foreground font-sans">{sportsCount} leads</div>
            </div>
            <Progress value={sportsPct} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-sans">Ready for Outreach</p>
                <p className="text-2xl font-display text-foreground">{readyForOutreach}</p>
              </div>
              <div className="text-xs text-muted-foreground font-sans">scored 7+</div>
            </div>
            <Progress value={allLeads.length > 0 ? (readyForOutreach / allLeads.length) * 100 : 0} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Lead List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-sans font-semibold">All Leads</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search leads..."
                  className="h-8 w-64 rounded-lg border border-input bg-background pl-9 pr-3 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : allLeads.length === 0 ? (
              <p className="text-sm text-muted-foreground font-sans py-8 text-center">
                No leads yet. Run the Lead Scout agent to discover prospects.
              </p>
            ) : (
              <div className="space-y-3">
                {allLeads.map((lead) => {
                  const painSignals = typeof lead.painSignals === "string"
                    ? JSON.parse(lead.painSignals) as string[]
                    : (lead.painSignals ?? []);
                  return (
                    <div
                      key={lead.id}
                      className="p-4 rounded-xl border border-border hover:border-primary/20 hover:bg-muted/30 transition-all cursor-pointer"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          {/* Company avatar */}
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-lg font-bold text-primary font-sans">
                              {lead.companyName?.charAt(0)}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-sans font-semibold text-foreground">
                                {lead.companyName}
                              </h3>
                              {lead.vertical && VERTICAL_LABELS[lead.vertical as Vertical] && (
                                <Badge className={`text-xs font-sans ${verticalColors[lead.vertical as Vertical] ?? ""}`}>
                                  {VERTICAL_LABELS[lead.vertical as Vertical]}
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-xs font-sans">
                                {PIPELINE_STAGE_LABELS[lead.pipelineStage]}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground font-sans">
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {lead.locationCount} locations{lead.locationCitiesStates ? ` — ${lead.locationCitiesStates}` : ""}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground font-sans">
                              {lead.googleRating != null && (
                                <span className="flex items-center gap-1">
                                  <Star className="h-3 w-3 text-chart-5" />
                                  {lead.googleRating}{lead.googleReviewCount != null ? ` (${lead.googleReviewCount} reviews)` : ""}
                                </span>
                              )}
                              {lead.bookingPlatform && <span>Platform: {lead.bookingPlatform}</span>}
                            </div>
                            {/* Decision maker */}
                            {(lead.firstName || lead.lastName) && (
                              <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border/50">
                                <span className="text-sm font-medium font-sans text-foreground">
                                  {lead.firstName} {lead.lastName}
                                </span>
                                {lead.title && <span className="text-xs text-muted-foreground font-sans">{lead.title}</span>}
                                <div className="flex items-center gap-2">
                                  {lead.email && <Mail className="h-3 w-3 text-muted-foreground hover:text-primary cursor-pointer" />}
                                  {lead.phone && <Phone className="h-3 w-3 text-muted-foreground hover:text-primary cursor-pointer" />}
                                  {lead.linkedinPersonal && <Linkedin className="h-3 w-3 text-muted-foreground hover:text-primary cursor-pointer" />}
                                </div>
                              </div>
                            )}
                            {/* Pain signals */}
                            {painSignals.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {painSignals.map((signal: string, i: number) => (
                                  <span
                                    key={i}
                                    className="inline-flex items-center px-2 py-0.5 rounded-full bg-highlight-coral/10 text-highlight-coral text-xs font-sans"
                                  >
                                    {signal}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Score + Actions */}
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <div className="w-12 h-12 rounded-full border-2 border-primary flex items-center justify-center">
                              <span className="text-lg font-display text-primary">{lead.score}</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground font-sans mt-1">score</span>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>
                      {lead.research && (
                        <p className="text-xs text-muted-foreground font-sans mt-3 pl-16 line-clamp-2">
                          {lead.research}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
