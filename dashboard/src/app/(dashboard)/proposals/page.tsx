"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Download,
  Edit2,
  Send,
  Eye,
  Clock,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { useApi } from "@/hooks/use-api";

interface ProposalRow {
  id: number;
  leadId: number;
  executiveSummary: string;
  pricing: string;
  status: string;
  createdAt: string;
  companyName: string | null;
  contactFirst: string | null;
  contactLast: string | null;
  locationCount: number | null;
  vertical: string | null;
}

interface ProposalsData {
  proposals: ProposalRow[];
}

function parsePricing(pricingJson: string): { setupFee: number; monthly: number; yearOneValue: number; roi: number } {
  try {
    const p = JSON.parse(pricingJson);
    return {
      setupFee: p.setupFee ?? p.setup_fee ?? 0,
      monthly: p.monthly ?? p.monthlyValue ?? 0,
      yearOneValue: p.yearOneValue ?? p.year_one_value ?? 0,
      roi: p.roi ?? p.projectedROI ?? 0,
    };
  } catch {
    return { setupFee: 0, monthly: 0, yearOneValue: 0, roi: 0 };
  }
}

export default function ProposalsPage() {
  const { data, loading } = useApi<ProposalsData>("/api/proposals");
  const proposals = data?.proposals ?? [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display text-foreground">Proposals</h1>
          <p className="text-sm text-muted-foreground font-sans mt-1">
            {loading ? "Loading proposals..." : "Custom proposals with prospect-specific ROI calculations"}
          </p>
        </div>
        <Button size="sm" className="font-sans rounded-full">
          <FileText className="h-4 w-4 mr-1" />
          Generate Proposal
        </Button>
      </div>

      {/* Proposal Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : proposals.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <p className="text-sm text-muted-foreground font-sans text-center">
              No proposals generated yet. Use the Proposal Generator agent after a discovery call.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {proposals.map((proposal) => {
            const contactName = [proposal.contactFirst, proposal.contactLast].filter(Boolean).join(" ") || "Unknown";
            const pricing = parsePricing(proposal.pricing);
            const annualContract = pricing.setupFee + pricing.monthly * 12;
            return (
              <Card key={proposal.id} className="hover:border-primary/20 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-sans font-semibold text-foreground">{proposal.companyName}</h3>
                        <p className="text-sm text-muted-foreground font-sans">
                          {contactName}{proposal.locationCount ? ` — ${proposal.locationCount} locations` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          proposal.status === "sent" ? "success" :
                          proposal.status === "reviewed" ? "default" :
                          "secondary"
                        }
                        className="font-sans"
                      >
                        {proposal.status === "sent" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                        {proposal.status === "reviewed" && <Eye className="h-3 w-3 mr-1" />}
                        {proposal.status === "draft" && <Clock className="h-3 w-3 mr-1" />}
                        {proposal.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-sans">
                        {new Date(proposal.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Executive Summary */}
                  {proposal.executiveSummary && (
                    <p className="text-sm text-muted-foreground font-sans mb-4 line-clamp-2">
                      {proposal.executiveSummary}
                    </p>
                  )}

                  {/* Financial Summary */}
                  {(pricing.setupFee > 0 || pricing.monthly > 0) && (
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 p-4 rounded-xl bg-muted/50">
                      <div>
                        <p className="text-xs text-muted-foreground font-sans">Setup Fee</p>
                        <p className="text-lg font-display text-foreground">${pricing.setupFee.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-sans">Monthly</p>
                        <p className="text-lg font-display text-foreground">${pricing.monthly.toLocaleString()}/mo</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-sans">Year 1 Value</p>
                        <p className="text-lg font-display text-highlight-green">
                          ${pricing.yearOneValue >= 1000 ? `${(pricing.yearOneValue / 1000).toFixed(0)}K` : pricing.yearOneValue.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-sans">Projected ROI</p>
                        <p className="text-lg font-display text-primary">{pricing.roi}X</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-sans">Annual Contract</p>
                        <p className="text-lg font-display text-foreground">${annualContract.toLocaleString()}</p>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 mt-4">
                    <Button variant="ghost" size="sm" className="font-sans text-xs">
                      <Eye className="h-3 w-3 mr-1" />
                      Preview
                    </Button>
                    <Button variant="ghost" size="sm" className="font-sans text-xs">
                      <Edit2 className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="font-sans text-xs">
                      <Download className="h-3 w-3 mr-1" />
                      PDF
                    </Button>
                    {proposal.status !== "sent" && (
                      <Button size="sm" className="font-sans text-xs rounded-full">
                        <Send className="h-3 w-3 mr-1" />
                        Send to {(proposal.contactFirst ?? contactName.split(" ")[0])}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
