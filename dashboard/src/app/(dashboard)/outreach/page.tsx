"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  const { data, loading, refetch } = useApi<OutreachData>("/api/outreach");
  const { toasts, addToast, dismiss } = useToast();
  const messages = data?.messages ?? [];
  const draftCount = data?.draftCount ?? 0;
  const approvedCount = data?.approvedCount ?? 0;
  const emailCount = messages.filter(m => m.channel === "email").length;
  const linkedinCount = messages.filter(m => m.channel === "linkedin").length;

  const [actionLoading, setActionLoading] = useState<Record<number, boolean>>({});
  const [bulkLoading, setBulkLoading] = useState(false);
  const [previewItem, setPreviewItem] = useState<OutreachRow | null>(null);
  const [editItem, setEditItem] = useState<OutreachRow | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");

  async function handleApprove(id: number) {
    setActionLoading(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fetch("/api/outreach", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", messageIds: [id] }),
      });
      if (res.ok) { addToast("Message approved", "success"); refetch(); }
      else addToast("Failed to approve", "error");
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }));
    }
  }

  async function handleReject(id: number) {
    setActionLoading(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fetch("/api/outreach", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", messageIds: [id] }),
      });
      if (res.ok) { addToast("Message rejected", "success"); refetch(); }
      else addToast("Failed to reject", "error");
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }));
    }
  }

  async function handleApproveAll() {
    setBulkLoading(true);
    try {
      const res = await fetch("/api/outreach", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve_all" }),
      });
      if (res.ok) {
        const result = await res.json();
        addToast(`${result.updated ?? 0} messages approved`, "success");
        refetch();
      }
    } finally {
      setBulkLoading(false);
    }
  }

  function openEdit(item: OutreachRow) {
    setEditItem(item);
    setEditSubject(item.subject ?? "");
    setEditBody(item.body ?? "");
  }

  async function handleSaveEdit() {
    if (!editItem) return;
    try {
      const res = await fetch("/api/outreach", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "edit", messageId: editItem.id, subject: editSubject, body: editBody }),
      });
      if (res.ok) { addToast("Message updated", "success"); setEditItem(null); refetch(); }
      else addToast("Failed to save changes", "error");
    } catch {
      addToast("Failed to save changes", "error");
    }
  }

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
          <Button variant="outline" size="sm" className="font-sans" onClick={handleApproveAll} disabled={bulkLoading || draftCount === 0}>
            {bulkLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
            Approve All
          </Button>
          <Button size="sm" className="font-sans rounded-full" onClick={() => addToast("Sending approved messages via Instantly.ai...", "info")} disabled={approvedCount === 0}>
            <Send className="h-4 w-4 mr-1" />
            Send Approved ({approvedCount})
          </Button>
        </div>
      </div>

      {/* Queue Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><Mail className="h-4 w-4 text-primary" /></div><div><p className="text-xs text-muted-foreground font-sans">Emails</p><p className="text-lg font-display">{emailCount}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-chart-4/10"><Linkedin className="h-4 w-4 text-chart-4" /></div><div><p className="text-xs text-muted-foreground font-sans">LinkedIn</p><p className="text-lg font-display">{linkedinCount}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-highlight-green/10"><Check className="h-4 w-4 text-highlight-green" /></div><div><p className="text-xs text-muted-foreground font-sans">Approved</p><p className="text-lg font-display">{approvedCount}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-chart-5/10"><Clock className="h-4 w-4 text-chart-5" /></div><div><p className="text-xs text-muted-foreground font-sans">Pending</p><p className="text-lg font-display">{draftCount}</p></div></CardContent></Card>
      </div>

      {/* Message Queue */}
      <Card>
        <CardHeader><CardTitle className="text-base font-sans font-semibold">Message Queue</CardTitle></CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            {loading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : messages.length === 0 ? (
              <p className="text-sm text-muted-foreground font-sans py-8 text-center">No messages queued yet. Run the Outreach Composer to generate drafts.</p>
            ) : (
              <div className="space-y-4">
                {messages.map((item) => {
                  const contactName = [item.contactFirst, item.contactLast].filter(Boolean).join(" ") || "Unknown";
                  const isItemLoading = actionLoading[item.id];
                  return (
                    <div key={item.id} className="p-4 rounded-xl border border-border hover:border-primary/20 transition-all">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-bold text-primary font-sans">{(item.companyName ?? "?").charAt(0)}</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-sans font-semibold text-sm text-foreground">{item.companyName}</h3>
                              <span className="text-xs text-muted-foreground font-sans">&rarr; {contactName}</span>
                            </div>
                            <Badge variant="outline" className="text-xs font-sans mt-0.5">
                              {item.channel === "email" ? <Mail className="h-3 w-3 mr-1" /> : <Linkedin className="h-3 w-3 mr-1" />}
                              {item.templateId ?? item.channel}
                            </Badge>
                          </div>
                        </div>
                        <Badge variant={item.status === "approved" ? "success" : "secondary"} className="font-sans text-xs">{item.status}</Badge>
                      </div>
                      {item.subject && <p className="text-sm font-medium font-sans text-foreground mb-1">{item.subject}</p>}
                      <p className="text-sm text-muted-foreground font-sans line-clamp-2">{item.body}</p>
                      {item.roiCalculation && <p className="text-xs font-medium font-sans text-primary mt-2">{item.roiCalculation}</p>}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                        <span className="text-xs text-muted-foreground font-sans">Lead score: {item.score ?? "—"}</span>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="text-xs font-sans h-7" onClick={() => setPreviewItem(item)}><Eye className="h-3 w-3 mr-1" />Preview</Button>
                          <Button variant="ghost" size="sm" className="text-xs font-sans h-7" onClick={() => openEdit(item)}><Edit2 className="h-3 w-3 mr-1" />Edit</Button>
                          {item.status === "draft" ? (
                            <Button variant="ghost" size="sm" className="text-xs font-sans h-7 text-highlight-green" onClick={() => handleApprove(item.id)} disabled={isItemLoading}>
                              {isItemLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Check className="h-3 w-3 mr-1" />Approve</>}
                            </Button>
                          ) : (
                            <Button variant="ghost" size="sm" className="text-xs font-sans h-7 text-highlight-coral" onClick={() => handleReject(item.id)} disabled={isItemLoading}>
                              {isItemLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <><X className="h-3 w-3 mr-1" />Revoke</>}
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

      {/* Preview Dialog */}
      <Dialog open={!!previewItem} onOpenChange={(open) => { if (!open) setPreviewItem(null); }}>
        <DialogContent>
          {previewItem && (
            <>
              <DialogHeader>
                <DialogTitle className="font-sans">Preview: {previewItem.companyName}</DialogTitle>
                <DialogDescription className="font-sans">{previewItem.channel} &middot; {[previewItem.contactFirst, previewItem.contactLast].filter(Boolean).join(" ")}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                {previewItem.subject && <div><p className="text-xs text-muted-foreground font-sans mb-1">Subject</p><p className="text-sm font-medium font-sans">{previewItem.subject}</p></div>}
                <div><p className="text-xs text-muted-foreground font-sans mb-1">Body</p><p className="text-sm font-sans whitespace-pre-wrap">{previewItem.body}</p></div>
                {previewItem.personalizationNotes && <div><p className="text-xs text-muted-foreground font-sans mb-1">Personalization</p><p className="text-sm font-sans text-primary">{previewItem.personalizationNotes}</p></div>}
                {previewItem.roiCalculation && <div><p className="text-xs text-muted-foreground font-sans mb-1">ROI</p><p className="text-sm font-sans text-highlight-green">{previewItem.roiCalculation}</p></div>}
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setPreviewItem(null)} className="font-sans">Close</Button></DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={(open) => { if (!open) setEditItem(null); }}>
        <DialogContent>
          {editItem && (
            <>
              <DialogHeader>
                <DialogTitle className="font-sans">Edit: {editItem.companyName}</DialogTitle>
                <DialogDescription className="font-sans">Edit the message before approving</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div>
                  <label className="text-xs text-muted-foreground font-sans mb-1 block">Subject</label>
                  <input type="text" value={editSubject} onChange={(e) => setEditSubject(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-sans mb-1 block">Body</label>
                  <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={8} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
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
