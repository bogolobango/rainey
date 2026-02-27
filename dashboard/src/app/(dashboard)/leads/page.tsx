"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ToastContainer } from "@/components/ui/toast-container";
import { useToast } from "@/hooks/use-toast";
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
  Check,
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

const VERTICALS: { value: Vertical | "all"; label: string }[] = [
  { value: "all", label: "All Verticals" },
  { value: "indoor_sports", label: "Indoor Sports" },
  { value: "med_spa", label: "Med Spa" },
  { value: "dental", label: "Dental" },
  { value: "youth_sports", label: "Youth Sports" },
];

export default function LeadsPage() {
  const { data, loading, refetch } = useApi<LeadsData>("/api/leads");
  const { toasts, addToast, dismiss } = useToast();
  const allLeads = data?.leads ?? [];

  const [searchQuery, setSearchQuery] = useState("");
  const [filterVertical, setFilterVertical] = useState<Vertical | "all">("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [scoutLoading, setScoutLoading] = useState(false);

  // Filter leads based on search query and vertical
  const filteredLeads = allLeads.filter((lead) => {
    const matchesSearch = searchQuery === "" || [
      lead.companyName,
      lead.firstName,
      lead.lastName,
      lead.email,
      lead.locationCitiesStates,
    ].some(field => field?.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesVertical = filterVertical === "all" || lead.vertical === filterVertical;

    return matchesSearch && matchesVertical;
  });

  const avgScore = filteredLeads.length > 0
    ? Math.round(filteredLeads.reduce((sum, l) => sum + l.score, 0) / filteredLeads.length * 10) / 10
    : 0;
  const sportsCount = filteredLeads.filter(l => l.vertical === "indoor_sports" || l.vertical === "youth_sports").length;
  const sportsPct = filteredLeads.length > 0 ? Math.round((sportsCount / filteredLeads.length) * 100) : 0;
  const readyForOutreach = filteredLeads.filter(l => l.score >= 7).length;

  async function handleRunLeadScout() {
    setScoutLoading(true);
    addToast("Running Lead Scout agent...", "info");
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentType: "lead_scout" }),
      });
      const result = await res.json();
      if (res.ok) {
        addToast(result.run?.summary || "Lead Scout completed", "success");
        refetch();
      } else {
        addToast(result.error || "Lead Scout failed", "error");
      }
    } catch {
      addToast("Failed to run Lead Scout", "error");
    } finally {
      setScoutLoading(false);
    }
  }

  function handleExportCSV() {
    if (filteredLeads.length === 0) {
      addToast("No leads to export", "error");
      return;
    }

    const headers = ["Company", "Contact", "Email", "Phone", "Vertical", "Score", "Stage", "Locations", "City/State"];
    const rows = filteredLeads.map((lead) => [
      lead.companyName ?? "",
      [lead.firstName, lead.lastName].filter(Boolean).join(" "),
      lead.email ?? "",
      lead.phone ?? "",
      lead.vertical ? VERTICAL_LABELS[lead.vertical as Vertical] ?? lead.vertical : "",
      String(lead.score ?? ""),
      PIPELINE_STAGE_LABELS[lead.pipelineStage] ?? lead.pipelineStage,
      String(lead.locationCount ?? ""),
      lead.locationCitiesStates ?? "",
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-export-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addToast(`Exported ${filteredLeads.length} leads to CSV`, "success");
  }

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
          <Button variant="outline" size="sm" className="font-sans" onClick={() => setFilterOpen(true)}>
            <Filter className="h-4 w-4 mr-1" />
            Filter
            {filterVertical !== "all" && <Badge variant="secondary" className="ml-1 text-[10px] px-1">{VERTICAL_LABELS[filterVertical]}</Badge>}
          </Button>
          <Button variant="outline" size="sm" className="font-sans" onClick={handleExportCSV} disabled={filteredLeads.length === 0}>
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </Button>
          <Button size="sm" className="font-sans rounded-full" onClick={handleRunLeadScout} disabled={scoutLoading}>
            {scoutLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
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
            <Progress value={filteredLeads.length > 0 ? (readyForOutreach / filteredLeads.length) * 100 : 0} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Lead List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-sans font-semibold">
              {filterVertical !== "all" || searchQuery ? `Filtered Leads (${filteredLeads.length})` : "All Leads"}
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search leads..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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
            ) : filteredLeads.length === 0 ? (
              <p className="text-sm text-muted-foreground font-sans py-8 text-center">
                {searchQuery || filterVertical !== "all"
                  ? "No leads match your filters."
                  : "No leads yet. Run the Lead Scout agent to discover prospects."}
              </p>
            ) : (
              <div className="space-y-3">
                {filteredLeads.map((lead) => {
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
                                  {lead.email && (
                                    <a href={`mailto:${lead.email}`} title={lead.email}>
                                      <Mail className="h-3 w-3 text-muted-foreground hover:text-primary cursor-pointer" />
                                    </a>
                                  )}
                                  {lead.phone && (
                                    <a href={`tel:${lead.phone}`} title={lead.phone}>
                                      <Phone className="h-3 w-3 text-muted-foreground hover:text-primary cursor-pointer" />
                                    </a>
                                  )}
                                  {lead.linkedinPersonal && (
                                    <a href={lead.linkedinPersonal} target="_blank" rel="noopener noreferrer">
                                      <Linkedin className="h-3 w-3 text-muted-foreground hover:text-primary cursor-pointer" />
                                    </a>
                                  )}
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

      {/* Filter Dialog */}
      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-sans">Filter Leads</DialogTitle>
            <DialogDescription className="font-sans">Select a vertical to filter leads</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {VERTICALS.map((v) => (
              <button
                key={v.value}
                className={`w-full text-left px-4 py-3 rounded-lg border text-sm font-sans transition-colors ${
                  filterVertical === v.value
                    ? "border-primary bg-primary/5 text-primary font-medium"
                    : "border-border hover:border-primary/20"
                }`}
                onClick={() => { setFilterVertical(v.value); setFilterOpen(false); }}
              >
                <div className="flex items-center justify-between">
                  <span>{v.label}</span>
                  {filterVertical === v.value && <Check className="h-4 w-4" />}
                </div>
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setFilterVertical("all"); setFilterOpen(false); }} className="font-sans">
              Clear Filter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
