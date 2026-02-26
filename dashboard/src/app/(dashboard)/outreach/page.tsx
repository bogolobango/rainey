"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send,
  Check,
  X,
  Edit2,
  Eye,
  Mail,
  Linkedin,
  Clock,
  Loader2,
} from "lucide-react";
import { useApi } from "@/hooks/use-api";

interface OutreachRow {
  id: number;
  leadId: number;
  channel: string;
  templateId: string | null;
  subject: string | null;
  body: string;
  personalizationNotes: string | null;
  roiCalculation: string | null;
  status: string;
  sequenceDay: number;
  companyName: string | null;
  contactFirst: string | null;
  contactLast: string | null;
  score: number | null;
}

interface OutreachData {
  messages: OutreachRow[];
  draftCount: number;
  approvedCount: number;
}

export default function OutreachPage() {
  const { data, loading } = useApi<OutreachData>("/api/outreach");
  const messages = data?.messages ?? [];
  const draftCount = data?.draftCount ?? 0;
  const approvedCount = data?.approvedCount ?? 0;
  const emailCount = messages.filter(m => m.channel === "email").length;
  const linkedinCount = messages.filter(m => m.channel === "linkedin").length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display text-foreground">Outreach Queue</h1>
          <p className="text-sm text-muted-foreground font-sans mt-1">
            {loading ? "Loading outreach queue..." : `${draftCount} drafts pending review, ${approvedCount} approved and ready to send`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="font-sans">
            <Check className="h-4 w-4 mr-1" />
            Approve All
          </Button>
          <Button size="sm" className="font-sans rounded-full">
            <Send className="h-4 w-4 mr-1" />
            Send Approved ({approvedCount})
          </Button>
        </div>
      </div>

      {/* Queue Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Mail className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-sans">Emails</p>
              <p className="text-lg font-display">{emailCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-chart-4/10">
              <Linkedin className="h-4 w-4 text-chart-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-sans">LinkedIn</p>
              <p className="text-lg font-display">{linkedinCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-highlight-green/10">
              <Check className="h-4 w-4 text-highlight-green" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-sans">Approved</p>
              <p className="text-lg font-display">{approvedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-chart-5/10">
              <Clock className="h-4 w-4 text-chart-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-sans">Pending</p>
              <p className="text-lg font-display">{draftCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Message Queue */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-sans font-semibold">Message Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <p className="text-sm text-muted-foreground font-sans py-8 text-center">
                No messages queued yet. Run the Outreach Composer to generate drafts.
              </p>
            ) : (
              <div className="space-y-4">
                {messages.map((item) => {
                  const contactName = [item.contactFirst, item.contactLast].filter(Boolean).join(" ") || "Unknown";
                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-xl border border-border hover:border-primary/20 transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-bold text-primary font-sans">
                              {(item.companyName ?? "?").charAt(0)}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-sans font-semibold text-sm text-foreground">
                                {item.companyName}
                              </h3>
                              <span className="text-xs text-muted-foreground font-sans">&rarr; {contactName}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="outline" className="text-xs font-sans">
                                {item.channel === "email" ? <Mail className="h-3 w-3 mr-1" /> : <Linkedin className="h-3 w-3 mr-1" />}
                                {item.templateId ?? item.channel}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={item.status === "approved" ? "success" : "secondary"}
                            className="font-sans text-xs"
                          >
                            {item.status}
                          </Badge>
                        </div>
                      </div>

                      {item.subject && (
                        <p className="text-sm font-medium font-sans text-foreground mb-1">
                          {item.subject}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground font-sans line-clamp-2">
                        {item.body}
                      </p>
                      {item.roiCalculation && (
                        <p className="text-xs font-medium font-sans text-primary mt-2">
                          {item.roiCalculation}
                        </p>
                      )}

                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                        <span className="text-xs text-muted-foreground font-sans">
                          Lead score: {item.score ?? "—"}
                        </span>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="text-xs font-sans h-7">
                            <Eye className="h-3 w-3 mr-1" />
                            Preview
                          </Button>
                          <Button variant="ghost" size="sm" className="text-xs font-sans h-7">
                            <Edit2 className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          {item.status === "draft" ? (
                            <Button variant="ghost" size="sm" className="text-xs font-sans h-7 text-highlight-green">
                              <Check className="h-3 w-3 mr-1" />
                              Approve
                            </Button>
                          ) : (
                            <Button variant="ghost" size="sm" className="text-xs font-sans h-7 text-highlight-coral">
                              <X className="h-3 w-3 mr-1" />
                              Revoke
                            </Button>
                          )}
                        </div>
                      </div>
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
