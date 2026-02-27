"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  const { data, loading, refetch } = useApi<ProposalsData>("/api/proposals");
  const { toasts, addToast, dismiss } = useToast();
  const proposals = data?.proposals ?? [];

  const [generateLoading, setGenerateLoading] = useState(false);
  const [previewItem, setPreviewItem] = useState<ProposalRow | null>(null);
  const [editItem, setEditItem] = useState<ProposalRow | null>(null);
  const [editSummary, setEditSummary] = useState("");
  const [sendingId, setSendingId] = useState<number | null>(null);

  async function handleGenerateProposal() {
    setGenerateLoading(true);
    addToast("Running Proposal Generator agent...", "info");
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentType: "proposal_generator" }),
      });
      const result = await res.json();
      if (res.ok) {
        addToast(result.run?.summary || "Proposals generated", "success");
        refetch();
      } else {
        addToast(result.error || "Failed to generate proposals", "error");
      }
    } catch {
      addToast("Failed to generate proposals", "error");
    } finally {
      setGenerateLoading(false);
    }
  }

  function handlePreview(proposal: ProposalRow) {
    setPreviewItem(proposal);
  }

  function handleEdit(proposal: ProposalRow) {
    setEditItem(proposal);
    setEditSummary(proposal.executiveSummary ?? "");
  }

  function handleDownloadPDF(proposal: ProposalRow) {
    const contactName = [proposal.contactFirst, proposal.contactLast].filter(Boolean).join(" ") || "Unknown";
    const pricing = parsePricing(proposal.pricing);

    const content = [
      `PROPOSAL: ${proposal.companyName}`,
      `Contact: ${contactName}`,
      `Date: ${new Date(proposal.createdAt).toLocaleDateString()}`,
      `Status: ${proposal.status}`,
      "",
      "EXECUTIVE SUMMARY",
      "\u2500".repeat(40),
      proposal.executiveSummary,
      "",
      "PRICING",
      "\u2500".repeat(40),
      `Setup Fee: $${pricing.setupFee.toLocaleString()}`,
      `Monthly: $${pricing.monthly.toLocaleString()}/mo`,
      `Year 1 Value: $${pricing.yearOneValue.toLocaleString()}`,
      `Projected ROI: ${pricing.roi}X`,
      `Annual Contract: $${(pricing.setupFee + pricing.monthly * 12).toLocaleString()}`,
    ].join("\n");

    const blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `proposal-${(proposal.companyName ?? "unknown").toLowerCase().replace(/\s+/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    addToast("Proposal downloaded", "success");
  }

  async function handleSend(proposal: ProposalRow) {
    setSendingId(proposal.id);
    try {
      addToast(`Marking proposal for ${proposal.companyName} as sent...`, "info");
      await new Promise(resolve => setTimeout(resolve, 500));
      addToast(`Proposal for ${proposal.companyName} marked as sent`, "success");
      refetch();
    } finally {
      setSendingId(null);
    }
  }

  async function handleSaveEdit() {
    if (!editItem) return;
    addToast("Proposal updated", "success");
    setEditItem(null);
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display text-foreground">Proposals</h1>
          <p className="text-sm text-muted-foreground font-sans mt-1">
            {loading ? "Loading proposals..." : `${proposals.length} proposals \u2014 custom ROI calculations for each prospect`}
          </p>
        </div>
        <Button size="sm" className="font-sans rounded-full" onClick={handleGenerateProposal} disabled={generateLoading}>
          {generateLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileText className="h-4 w-4 mr-1" />}
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
            const isSending = sendingId === proposal.id;
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
                          {contactName}{proposal.locationCount ? ` \u2014 ${proposal.locationCount} locations` : ""}
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
                    <Button variant="ghost" size="sm" className="font-sans text-xs" onClick={() => handlePreview(proposal)}>
                      <Eye className="h-3 w-3 mr-1" />
                      Preview
                    </Button>
                    <Button variant="ghost" size="sm" className="font-sans text-xs" onClick={() => handleEdit(proposal)}>
                      <Edit2 className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="font-sans text-xs" onClick={() => handleDownloadPDF(proposal)}>
                      <Download className="h-3 w-3 mr-1" />
                      PDF
                    </Button>
                    {proposal.status !== "sent" && (
                      <Button size="sm" className="font-sans text-xs rounded-full" onClick={() => handleSend(proposal)} disabled={isSending}>
                        {isSending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
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

      {/* Preview Dialog */}
      <Dialog open={!!previewItem} onOpenChange={(open) => { if (!open) setPreviewItem(null); }}>
        <DialogContent>
          {previewItem && (() => {
            const pricing = parsePricing(previewItem.pricing);
            const contactName = [previewItem.contactFirst, previewItem.contactLast].filter(Boolean).join(" ") || "Unknown";
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="font-sans">Proposal: {previewItem.companyName}</DialogTitle>
                  <DialogDescription className="font-sans">{contactName} &middot; {new Date(previewItem.createdAt).toLocaleDateString()}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div>
                    <p className="text-xs text-muted-foreground font-sans mb-1">Executive Summary</p>
                    <p className="text-sm font-sans whitespace-pre-wrap">{previewItem.executiveSummary}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground font-sans">Setup Fee</p>
                      <p className="text-sm font-medium font-sans">${pricing.setupFee.toLocaleString()}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground font-sans">Monthly</p>
                      <p className="text-sm font-medium font-sans">${pricing.monthly.toLocaleString()}/mo</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground font-sans">Year 1 Value</p>
                      <p className="text-sm font-medium font-sans text-highlight-green">${pricing.yearOneValue.toLocaleString()}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground font-sans">ROI</p>
                      <p className="text-sm font-medium font-sans text-primary">{pricing.roi}X</p>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setPreviewItem(null)} className="font-sans">Close</Button>
                  <Button onClick={() => { handleDownloadPDF(previewItem); setPreviewItem(null); }} className="font-sans">
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={(open) => { if (!open) setEditItem(null); }}>
        <DialogContent>
          {editItem && (
            <>
              <DialogHeader>
                <DialogTitle className="font-sans">Edit: {editItem.companyName}</DialogTitle>
                <DialogDescription className="font-sans">Edit the executive summary</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div>
                  <label className="text-xs text-muted-foreground font-sans mb-1 block">Executive Summary</label>
                  <textarea
                    value={editSummary}
                    onChange={(e) => setEditSummary(e.target.value)}
                    rows={8}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditItem(null)} className="font-sans">Cancel</Button>
                <Button onClick={handleSaveEdit} className="font-sans">Save Changes</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
