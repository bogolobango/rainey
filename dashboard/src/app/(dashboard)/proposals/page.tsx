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
} from "lucide-react";

interface Proposal {
  id: number;
  company: string;
  contact: string;
  status: "draft" | "reviewed" | "sent";
  createdAt: string;
  locations: number;
  monthlyValue: number;
  setupFee: number;
  roi: number;
  yearOneValue: number;
}

const proposals: Proposal[] = [
  { id: 1, company: "Arena Sports", contact: "Emily Chen", status: "draft", createdAt: "Today, 4:30 PM", locations: 5, monthlyValue: 2500, setupFee: 3000, roi: 10, yearOneValue: 150000 },
  { id: 2, company: "Socceroof", contact: "Lesiba Mashishi", status: "reviewed", createdAt: "Feb 25", locations: 9, monthlyValue: 4500, setupFee: 5000, roi: 20.1, yearOneValue: 1188000 },
  { id: 3, company: "Brooklyn Boulders", contact: "Lance Pinn", status: "sent", createdAt: "Feb 22", locations: 5, monthlyValue: 2500, setupFee: 3000, roi: 12, yearOneValue: 180000 },
];

export default function ProposalsPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display text-foreground">Proposals</h1>
          <p className="text-sm text-muted-foreground font-sans mt-1">
            Custom proposals with prospect-specific ROI calculations
          </p>
        </div>
        <Button size="sm" className="font-sans rounded-full">
          <FileText className="h-4 w-4 mr-1" />
          Generate Proposal
        </Button>
      </div>

      {/* Proposal Cards */}
      <div className="space-y-4">
        {proposals.map((proposal) => (
          <Card key={proposal.id} className="hover:border-primary/20 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-sans font-semibold text-foreground">{proposal.company}</h3>
                    <p className="text-sm text-muted-foreground font-sans">{proposal.contact} — {proposal.locations} locations</p>
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
                  <span className="text-xs text-muted-foreground font-sans">{proposal.createdAt}</span>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 p-4 rounded-xl bg-muted/50">
                <div>
                  <p className="text-xs text-muted-foreground font-sans">Setup Fee</p>
                  <p className="text-lg font-display text-foreground">${proposal.setupFee.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-sans">Monthly</p>
                  <p className="text-lg font-display text-foreground">${proposal.monthlyValue.toLocaleString()}/mo</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-sans">Year 1 Value</p>
                  <p className="text-lg font-display text-highlight-green">${(proposal.yearOneValue / 1000).toFixed(0)}K</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-sans">Projected ROI</p>
                  <p className="text-lg font-display text-primary">{proposal.roi}X</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-sans">Annual Contract</p>
                  <p className="text-lg font-display text-foreground">${(proposal.setupFee + proposal.monthlyValue * 12).toLocaleString()}</p>
                </div>
              </div>

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
                    Send to {proposal.contact.split(" ")[0]}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
