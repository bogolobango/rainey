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
} from "lucide-react";
import { VERTICAL_LABELS, PIPELINE_STAGE_LABELS, type Lead, type Vertical } from "@/types";

// Sample leads data — will be replaced by API
const sampleLeads: Partial<Lead>[] = [
  {
    id: 1,
    companyName: "Brooklyn Boulders",
    website: "https://brooklynboulders.com",
    vertical: "indoor_sports",
    tier: "tier_1",
    locationCount: 5,
    locationCitiesStates: "Brooklyn NY, Somerville MA, Chicago IL",
    bookingPlatform: "Custom",
    googleRating: 4.6,
    googleReviewCount: 2840,
    score: 8.5,
    firstName: "Lance",
    lastName: "Pinn",
    title: "CEO & Founder",
    email: "lance@brooklynboulders.com",
    pipelineStage: "cold",
    painSignals: ["High inquiry volume", "After-hours gap", "Manual booking"],
    research: "Fast-growing climbing gym chain with 5 locations. Heavy walk-in traffic and class bookings. No visible automation on inquiry handling.",
  },
  {
    id: 2,
    companyName: "Chelsea Piers",
    website: "https://chelseapiers.com",
    vertical: "indoor_sports",
    tier: "tier_2",
    locationCount: 3,
    locationCitiesStates: "Manhattan NY, Brooklyn NY, Stamford CT",
    bookingPlatform: "EZFacility",
    googleRating: 4.3,
    googleReviewCount: 5200,
    score: 9.1,
    firstName: "David",
    lastName: "Tewksbury",
    title: "Executive VP",
    email: "dtewksbury@chelseapiers.com",
    pipelineStage: "contacted",
    painSignals: ["5200+ Google reviews mentioning wait times", "Hiring front desk staff", "Complex multi-sport booking"],
    research: "Massive sports complex with 3 locations. Extremely high inquiry volume across multiple sports. Reviews frequently mention difficulty reaching staff.",
  },
  {
    id: 3,
    companyName: "Skin Laundry",
    website: "https://skinlaundry.com",
    vertical: "med_spa",
    tier: "tier_2",
    locationCount: 8,
    locationCitiesStates: "Manhattan NY, Brooklyn NY, Los Angeles CA, Scottsdale AZ",
    bookingPlatform: "Boulevard",
    googleRating: 4.7,
    googleReviewCount: 1800,
    score: 7.5,
    firstName: "Scott",
    lastName: "Samson",
    title: "COO",
    email: "scott@skinlaundry.com",
    pipelineStage: "cold",
    painSignals: ["Rapid multi-city expansion", "High-volume laser treatments", "After-hours inquiry gap"],
    research: "Laser facial chain expanding rapidly. 8 locations with plans for more. High-frequency repeat bookings create complex scheduling needs.",
  },
  {
    id: 4,
    companyName: "Socceroof",
    website: "https://socceroof.com",
    vertical: "indoor_sports",
    tier: "tier_2",
    locationCount: 9,
    locationCitiesStates: "Brooklyn NY, Queens NY, Bronx NY, Manhattan NY",
    bookingPlatform: "Bond Sports",
    googleRating: 4.2,
    googleReviewCount: 3100,
    score: 9.4,
    firstName: "Lesiba",
    lastName: "Mashishi",
    title: "Founder & CEO",
    email: "lesiba@socceroof.com",
    pipelineStage: "discovery_booked",
    painSignals: ["$505K identified losses from slow response", "9 locations with different hours", "42-hour avg response time"],
    research: "9-location rooftop soccer facility. Our analysis shows $1.188M Year 1 value recovery opportunity. Strong ICP match.",
  },
  {
    id: 5,
    companyName: "Gotham Padel",
    website: "https://gothampadel.com",
    vertical: "indoor_sports",
    tier: "tier_1",
    locationCount: 6,
    locationCitiesStates: "Manhattan NY, Brooklyn NY, Jersey City NJ",
    bookingPlatform: "Upper Hand",
    googleRating: 4.5,
    googleReviewCount: 920,
    score: 7.8,
    firstName: "Marco",
    lastName: "DiNuzzo",
    title: "General Manager",
    email: "marco@gothampadel.com",
    pipelineStage: "cold",
    painSignals: ["Rapid expansion in padel market", "Court booking complexity", "Peak-time congestion"],
    research: "Fast-growing padel club capitalizing on the sport's US boom. 6 locations and growing. Court availability is a key bottleneck.",
  },
];

const verticalColors: Record<Vertical, string> = {
  indoor_sports: "bg-chart-1/10 text-chart-1",
  med_spa: "bg-chart-2/10 text-chart-2",
  dental: "bg-chart-3/10 text-chart-3",
  youth_sports: "bg-chart-5/10 text-chart-5",
};

export default function LeadsPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display text-foreground">Lead Pipeline</h1>
          <p className="text-sm text-muted-foreground font-sans mt-1">
            {sampleLeads.length} leads discovered and enriched by Lead Scout
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
                <p className="text-2xl font-display text-foreground">8.5</p>
              </div>
              <Target className="h-5 w-5 text-primary" />
            </div>
            <Progress value={85} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-sans">Sports Facilities</p>
                <p className="text-2xl font-display text-foreground">60%</p>
              </div>
              <div className="text-xs text-muted-foreground font-sans">150 leads</div>
            </div>
            <Progress value={60} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-sans">Ready for Outreach</p>
                <p className="text-2xl font-display text-foreground">42</p>
              </div>
              <div className="text-xs text-muted-foreground font-sans">scored 7+</div>
            </div>
            <Progress value={42} className="mt-2" />
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
            <div className="space-y-3">
              {sampleLeads.map((lead) => (
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
                          <Badge className={`text-xs font-sans ${verticalColors[lead.vertical!]}`}>
                            {VERTICAL_LABELS[lead.vertical!]}
                          </Badge>
                          <Badge variant="outline" className="text-xs font-sans">
                            {PIPELINE_STAGE_LABELS[lead.pipelineStage!]}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground font-sans">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {lead.locationCount} locations — {lead.locationCitiesStates}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground font-sans">
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-chart-5" />
                            {lead.googleRating} ({lead.googleReviewCount} reviews)
                          </span>
                          <span>Platform: {lead.bookingPlatform}</span>
                        </div>
                        {/* Decision maker */}
                        <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border/50">
                          <span className="text-sm font-medium font-sans text-foreground">
                            {lead.firstName} {lead.lastName}
                          </span>
                          <span className="text-xs text-muted-foreground font-sans">{lead.title}</span>
                          <div className="flex items-center gap-2">
                            {lead.email && <Mail className="h-3 w-3 text-muted-foreground hover:text-primary cursor-pointer" />}
                            {lead.phone && <Phone className="h-3 w-3 text-muted-foreground hover:text-primary cursor-pointer" />}
                            <Linkedin className="h-3 w-3 text-muted-foreground hover:text-primary cursor-pointer" />
                          </div>
                        </div>
                        {/* Pain signals */}
                        {lead.painSignals && lead.painSignals.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {lead.painSignals.map((signal, i) => (
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
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
