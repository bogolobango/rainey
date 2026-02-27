/**
 * Database Seed — Populates the DB with realistic BDR pipeline data.
 *
 * Called automatically on first load when the DB is empty,
 * or manually via GET /api/seed.
 */

import { db } from "./index";
import {
  leads,
  outreachMessages,
  pipelineEvents,
  agentRuns,
  callPreps,
  proposals,
  followUpSequences,
} from "./schema";
import { sql } from "drizzle-orm";
import { scoreLead, classifyTier } from "@/lib/agents/lead-scout";
import { formatCurrency, calculateROI } from "@/lib/utils";

// ─── Helper ─────────────────────────────────────────────────────────────────

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().replace("T", " ").slice(0, 19);
}

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().replace("T", " ").slice(0, 19);
}

function hoursAgo(n: number): string {
  const d = new Date();
  d.setHours(d.getHours() - n);
  return d.toISOString().replace("T", " ").slice(0, 19);
}

// ─── Lead Data ──────────────────────────────────────────────────────────────

interface SeedLead {
  companyName: string;
  website: string;
  vertical: "indoor_sports" | "med_spa" | "dental" | "youth_sports";
  locationCount: number;
  locationCitiesStates: string;
  bookingPlatform: string | null;
  googleRating: number | null;
  googleReviewCount: number | null;
  annualRevenue: string;
  employeeCount: string;
  firstName: string;
  lastName: string;
  title: string;
  email: string;
  phone: string;
  linkedinCompany: string;
  linkedinPersonal: string;
  painSignals: string[];
  research: string;
  pipelineStage: string;
  createdDaysAgo: number;
}

const SEED_LEADS: SeedLead[] = [
  // ── Indoor Sports (Primary Vertical) ────────────────────
  {
    companyName: "Brooklyn Boulders",
    website: "https://brooklynboulders.com",
    vertical: "indoor_sports",
    locationCount: 5,
    locationCitiesStates: "Brooklyn NY, Queens NY, Somerville MA, Chicago IL, Denver CO",
    bookingPlatform: "Mindbody",
    googleRating: 4.5,
    googleReviewCount: 2847,
    annualRevenue: "$10M-$15M",
    employeeCount: "100-200",
    firstName: "Lance",
    lastName: "Pinn",
    title: "CEO & Co-Founder",
    email: "lance@brooklynboulders.com",
    phone: "(718) 522-7625",
    linkedinCompany: "https://linkedin.com/company/brooklyn-boulders",
    linkedinPersonal: "https://linkedin.com/in/lancepinn",
    painSignals: ["After-hours inquiry gap", "Manual booking across 5 locations", "High volume — 2,800+ Google reviews"],
    research: "Brooklyn Boulders is a rapidly growing climbing gym chain with 5 locations. Strong brand presence with 2,800+ reviews. Their Mindbody integration handles scheduling but likely misses after-hours inquiries across multiple time zones.",
    pipelineStage: "discovery_booked",
    createdDaysAgo: 12,
  },
  {
    companyName: "Chelsea Piers",
    website: "https://chelseapiers.com",
    vertical: "indoor_sports",
    locationCount: 3,
    locationCitiesStates: "Manhattan NY, Brooklyn NY, Stamford CT",
    bookingPlatform: "Custom POS",
    googleRating: 4.3,
    googleReviewCount: 4521,
    annualRevenue: "$50M+",
    employeeCount: "500+",
    firstName: "David",
    lastName: "Tewksbury",
    title: "President",
    email: "dtewksbury@chelseapiers.com",
    phone: "(212) 336-6666",
    linkedinCompany: "https://linkedin.com/company/chelsea-piers",
    linkedinPersonal: "https://linkedin.com/in/davidtewksbury",
    painSignals: ["Complex multi-sport scheduling", "Peak hour overflow", "Legacy custom POS system"],
    research: "Chelsea Piers is the largest sports & entertainment complex in NYC with 3 massive locations. Likely losing significant revenue from after-hours inquiries given their scale and diverse program offerings.",
    pipelineStage: "contacted",
    createdDaysAgo: 8,
  },
  {
    companyName: "Arena Sports",
    website: "https://arenasports.net",
    vertical: "indoor_sports",
    locationCount: 5,
    locationCitiesStates: "Seattle WA, Redmond WA, Issaquah WA",
    bookingPlatform: "Dash Platform",
    googleRating: 4.2,
    googleReviewCount: 1893,
    annualRevenue: "$8M-$12M",
    employeeCount: "75-150",
    firstName: "Peter",
    lastName: "Fewing",
    title: "Owner & President",
    email: "peter@arenasports.net",
    phone: "(206) 625-0300",
    linkedinCompany: "https://linkedin.com/company/arena-sports",
    linkedinPersonal: "https://linkedin.com/in/peterfewing",
    painSignals: ["5 locations, manual inquiry routing", "Mixed sports programming complexity"],
    research: "Arena Sports operates 5 indoor sports facilities in the Seattle metro area. Strong comparable client for our case study. Perfect candidate for AI booking automation.",
    pipelineStage: "demo_completed",
    createdDaysAgo: 18,
  },
  {
    companyName: "SPORTIME",
    website: "https://sportimeny.com",
    vertical: "indoor_sports",
    locationCount: 8,
    locationCitiesStates: "Randall's Island NY, Kings Park NY, Roslyn NY, Syosset NY, Bethpage NY, Amagansett NY, Quogue NY, Harbor Island NY",
    bookingPlatform: "CourtReserve",
    googleRating: 4.1,
    googleReviewCount: 1245,
    annualRevenue: "$12M-$20M",
    employeeCount: "150-250",
    firstName: "Joe",
    lastName: "Andreoli",
    title: "VP Operations",
    email: "jandreoli@sportimeny.com",
    phone: "(212) 427-6150",
    linkedinCompany: "https://linkedin.com/company/sportimeny",
    linkedinPersonal: "https://linkedin.com/in/joeandreoli",
    painSignals: ["8 locations — coordination challenge", "Seasonal demand spikes", "Multiple sport types"],
    research: "SPORTIME is the largest tennis and sports operator in NY with 8 facilities. Their scale and seasonal demand patterns make them ideal for automated inquiry handling. 8 locations = significant lost revenue from response delays.",
    pipelineStage: "cold",
    createdDaysAgo: 2,
  },
  {
    companyName: "Aviator Sports",
    website: "https://aviatorsports.com",
    vertical: "indoor_sports",
    locationCount: 2,
    locationCitiesStates: "Brooklyn NY, Floyd Bennett Field NY",
    bookingPlatform: "Mindbody",
    googleRating: 4.0,
    googleReviewCount: 982,
    annualRevenue: "$5M-$8M",
    employeeCount: "50-100",
    firstName: "Kenneth",
    lastName: "Hershon",
    title: "Managing Partner",
    email: "ken@aviatorsports.com",
    phone: "(718) 758-7500",
    linkedinCompany: "https://linkedin.com/company/aviator-sports",
    linkedinPersonal: "https://linkedin.com/in/kennethrhershon",
    painSignals: ["Large facility, high inquiry volume", "After-hours events scheduling"],
    research: "Aviator Sports & Events Center in Brooklyn is one of NYC's largest indoor sports complexes (175,000 sq ft). High inquiry volume from diverse sports programs and events.",
    pipelineStage: "responded",
    createdDaysAgo: 6,
  },
  {
    companyName: "Asphalt Green",
    website: "https://asphaltgreen.org",
    vertical: "indoor_sports",
    locationCount: 2,
    locationCitiesStates: "Upper East Side NY, Battery Park City NY",
    bookingPlatform: "Daxko",
    googleRating: 4.4,
    googleReviewCount: 678,
    annualRevenue: "$15M-$25M",
    employeeCount: "200-300",
    firstName: "Robert",
    lastName: "Jaeger",
    title: "Executive Director",
    email: "rjaeger@asphaltgreen.org",
    phone: "(212) 369-8890",
    linkedinCompany: "https://linkedin.com/company/asphalt-green",
    linkedinPersonal: "",
    painSignals: ["Non-profit model — cost sensitivity", "Youth program enrollment complexity"],
    research: "Asphalt Green is a premier Manhattan non-profit sports facility with 2 locations. Strong community reputation. Non-profit model means ROI pitch needs to emphasize cost savings over revenue.",
    pipelineStage: "contacted",
    createdDaysAgo: 5,
  },
  {
    companyName: "The Edge Climbing",
    website: "https://edgeclimbing.com",
    vertical: "indoor_sports",
    locationCount: 3,
    locationCitiesStates: "Long Island City NY, North Brunswick NJ, Hoboken NJ",
    bookingPlatform: "ClimbTrack",
    googleRating: 4.6,
    googleReviewCount: 1534,
    annualRevenue: "$3M-$6M",
    employeeCount: "40-70",
    firstName: "Max",
    lastName: "Chen",
    title: "General Manager",
    email: "max@edgeclimbing.com",
    phone: "(718) 729-7625",
    linkedinCompany: "https://linkedin.com/company/the-edge-climbing",
    linkedinPersonal: "https://linkedin.com/in/maxchen-climbing",
    painSignals: ["Rapid expansion — 3rd location just opened", "After-hours inquiry spike", "Youth program waitlist management"],
    research: "The Edge is a fast-growing climbing gym chain in the NYC/NJ area with 3 locations. Recently opened their Hoboken location. Rapid growth means inquiry volume is outpacing their front desk capacity.",
    pipelineStage: "cold",
    createdDaysAgo: 1,
  },
  {
    companyName: "Lifetime Fitness NYC",
    website: "https://lifetime.life",
    vertical: "indoor_sports",
    locationCount: 4,
    locationCitiesStates: "Sky Manhattan NY, 23rd Street NY, Dumbo Brooklyn NY, Garden City NY",
    bookingPlatform: "Lifetime App",
    googleRating: 4.1,
    googleReviewCount: 3200,
    annualRevenue: "$25M+",
    employeeCount: "300+",
    firstName: "Sarah",
    lastName: "Mitchell",
    title: "Regional VP, Northeast",
    email: "smitchell@lifetime.life",
    phone: "(212) 466-5400",
    linkedinCompany: "https://linkedin.com/company/life-time-inc",
    linkedinPersonal: "https://linkedin.com/in/sarahmitchell-lifetime",
    painSignals: ["Enterprise complexity", "Multi-sport scheduling gaps", "Premium brand — slow response damages perception"],
    research: "Life Time has 4 premium locations in the NYC metro area. Premium pricing means each lost inquiry represents high-value revenue. Their proprietary app handles bookings but may not capture all inquiry channels.",
    pipelineStage: "cold",
    createdDaysAgo: 1,
  },

  // ── Med Spa (Secondary Vertical) ────────────────────────
  {
    companyName: "Ever/Body",
    website: "https://everbody.com",
    vertical: "med_spa",
    locationCount: 6,
    locationCitiesStates: "SoHo NY, Upper East Side NY, Flatiron NY, Brooklyn NY, West Village NY, Greenwich CT",
    bookingPlatform: "Zenoti",
    googleRating: 4.7,
    googleReviewCount: 892,
    annualRevenue: "$15M-$25M",
    employeeCount: "100-200",
    firstName: "Kate",
    lastName: "Wolff",
    title: "CEO & Founder",
    email: "kate@everbody.com",
    phone: "(646) 398-7788",
    linkedinCompany: "https://linkedin.com/company/everbody",
    linkedinPersonal: "https://linkedin.com/in/katewolff",
    painSignals: ["6 locations — scheduling complexity", "High-value procedures $500-$5K", "After-hours consultation requests"],
    research: "Ever/Body is a fast-growing luxury med spa with 6 locations across NYC and CT. Founded in 2019, rapidly expanding. Each missed consultation inquiry represents $500-$5K in lost procedures.",
    pipelineStage: "proposal_sent",
    createdDaysAgo: 15,
  },
  {
    companyName: "Skinney Medspa",
    website: "https://skinneymedspa.com",
    vertical: "med_spa",
    locationCount: 4,
    locationCitiesStates: "Midtown NY, Upper East Side NY, Flatiron NY, Park Slope Brooklyn NY",
    bookingPlatform: "Vagaro",
    googleRating: 4.8,
    googleReviewCount: 2100,
    annualRevenue: "$8M-$12M",
    employeeCount: "60-100",
    firstName: "Marko",
    lastName: "Nikolic",
    title: "Owner",
    email: "marko@skinneymedspa.com",
    phone: "(212) 754-6639",
    linkedinCompany: "https://linkedin.com/company/skinney-medspa",
    linkedinPersonal: "https://linkedin.com/in/markonikolic-skinney",
    painSignals: ["High review volume — 2,100+ reviews", "Premium pricing sensitivity", "Phone-heavy clientele"],
    research: "Skinney Medspa has 4 Manhattan/Brooklyn locations and an outstanding 4.8-star rating. Their high review count suggests massive inquiry volume. Phone calls are critical in their demographic.",
    pipelineStage: "responded",
    createdDaysAgo: 7,
  },
  {
    companyName: "Glow Med Spa",
    website: "https://glowmedspa.com",
    vertical: "med_spa",
    locationCount: 3,
    locationCitiesStates: "Morristown NJ, Short Hills NJ, Summit NJ",
    bookingPlatform: "Booker",
    googleRating: 4.6,
    googleReviewCount: 765,
    annualRevenue: "$4M-$7M",
    employeeCount: "30-50",
    firstName: "Jennifer",
    lastName: "Walsh",
    title: "Practice Director",
    email: "jennifer@glowmedspa.com",
    phone: "(973) 451-6500",
    linkedinCompany: "https://linkedin.com/company/glow-med-spa",
    linkedinPersonal: "https://linkedin.com/in/jennifermwalsh",
    painSignals: ["3 NJ locations — suburban demographics", "Evening consultation demand", "Booker platform limitations"],
    research: "Glow Med Spa operates 3 locations in affluent NJ suburbs. Suburban clientele expects responsiveness. Evening and weekend inquiry gaps are likely significant revenue losses.",
    pipelineStage: "contacted",
    createdDaysAgo: 4,
  },
  {
    companyName: "LMC Laser & Med Clinic",
    website: "https://lmclaser.com",
    vertical: "med_spa",
    locationCount: 5,
    locationCitiesStates: "Financial District NY, Midtown NY, Chelsea NY, Jersey City NJ, Hoboken NJ",
    bookingPlatform: "Aesthetic Record",
    googleRating: 4.3,
    googleReviewCount: 1320,
    annualRevenue: "$6M-$10M",
    employeeCount: "50-80",
    firstName: "Dr. Anthony",
    lastName: "Rossi",
    title: "Medical Director",
    email: "arossi@lmclaser.com",
    phone: "(212) 269-0077",
    linkedinCompany: "https://linkedin.com/company/lmc-laser",
    linkedinPersonal: "https://linkedin.com/in/dranthonyrossi",
    painSignals: ["5 locations — NY + NJ coordination", "Medical provider scheduling complexity", "After-hours patient inquiries"],
    research: "LMC Laser has 5 locations across NYC and NJ. Medical director-led practice means high-value procedures. After-hours inquiry handling is critical for capturing patients researching procedures at night.",
    pipelineStage: "cold",
    createdDaysAgo: 3,
  },
  {
    companyName: "RealSelf Aesthetics",
    website: "https://realselfaesthetics.com",
    vertical: "med_spa",
    locationCount: 2,
    locationCitiesStates: "Upper East Side NY, Greenwich CT",
    bookingPlatform: "PatientNow",
    googleRating: 4.9,
    googleReviewCount: 430,
    annualRevenue: "$3M-$5M",
    employeeCount: "15-25",
    firstName: "Dr. Lisa",
    lastName: "Hwang",
    title: "Founder & Chief Medical Officer",
    email: "lisa@realselfaesthetics.com",
    phone: "(212) 744-9990",
    linkedinCompany: "https://linkedin.com/company/realself-aesthetics",
    linkedinPersonal: "https://linkedin.com/in/drlisahwang",
    painSignals: ["High-ticket procedures only", "Consultation-heavy model", "Weekend inquiry gap"],
    research: "Boutique med spa with 2 upscale locations. 4.9-star rating indicates exceptional quality. High-ticket focus ($2K-$15K procedures) means each missed inquiry is extremely costly.",
    pipelineStage: "cold",
    createdDaysAgo: 1,
  },

  // ── Youth Sports ───────────────────────────────────────
  {
    companyName: "Soccer Shots NYC",
    website: "https://soccershots.com/nyc",
    vertical: "youth_sports",
    locationCount: 4,
    locationCitiesStates: "Manhattan NY, Brooklyn NY, Queens NY, Westchester NY",
    bookingPlatform: "LeagueApps",
    googleRating: 4.7,
    googleReviewCount: 580,
    annualRevenue: "$2M-$4M",
    employeeCount: "40-60",
    firstName: "Michael",
    lastName: "Torres",
    title: "Regional Director",
    email: "mtorres@soccershots.com",
    phone: "(646) 555-2847",
    linkedinCompany: "https://linkedin.com/company/soccer-shots",
    linkedinPersonal: "https://linkedin.com/in/michaeltorres-soccershots",
    painSignals: ["Seasonal enrollment surge", "Parent communication overload", "Multi-venue coordination"],
    research: "Soccer Shots is a national youth soccer franchise with 4 NYC metro territories. Seasonal enrollment creates massive inquiry spikes. Parent inquiries require quick responses to secure spots.",
    pipelineStage: "contacted",
    createdDaysAgo: 3,
  },
  {
    companyName: "Gymnastics City",
    website: "https://gymnasticscity.com",
    vertical: "youth_sports",
    locationCount: 3,
    locationCitiesStates: "Hackensack NJ, Wayne NJ, Parsippany NJ",
    bookingPlatform: "JackRabbit",
    googleRating: 4.5,
    googleReviewCount: 320,
    annualRevenue: "$2M-$3M",
    employeeCount: "25-40",
    firstName: "Rachel",
    lastName: "Kim",
    title: "Owner",
    email: "rachel@gymnasticscity.com",
    phone: "(201) 555-9821",
    linkedinCompany: "https://linkedin.com/company/gymnastics-city",
    linkedinPersonal: "https://linkedin.com/in/rachel-kim-gymnastics",
    painSignals: ["Waitlist management", "Class schedule complexity", "Trial class booking friction"],
    research: "Gymnastics City has 3 NJ locations with strong ratings. Youth gymnastics has very high inquiry volume from parents. Waitlist management and trial class bookings are key friction points.",
    pipelineStage: "cold",
    createdDaysAgo: 1,
  },

  // ── Dental ─────────────────────────────────────────────
  {
    companyName: "Tend Dental",
    website: "https://tend.com",
    vertical: "dental",
    locationCount: 10,
    locationCitiesStates: "Multiple Manhattan NY, Brooklyn NY, Nashville TN, Atlanta GA",
    bookingPlatform: "Custom",
    googleRating: 4.8,
    googleReviewCount: 5600,
    annualRevenue: "$30M+",
    employeeCount: "300+",
    firstName: "Doug",
    lastName: "Hudson",
    title: "CEO & Co-Founder",
    email: "doug@tend.com",
    phone: "(212) 920-8363",
    linkedinCompany: "https://linkedin.com/company/tend-dental",
    linkedinPersonal: "https://linkedin.com/in/doughudson",
    painSignals: ["10+ locations — scaling challenge", "Rapid expansion", "Tech-forward brand — AI-ready"],
    research: "Tend is a VC-backed, tech-forward dental chain with 10+ locations. Their brand is built on modern patient experience. Natural fit for AI-powered patient communication. Recently raised Series C.",
    pipelineStage: "negotiating",
    createdDaysAgo: 25,
  },
  {
    companyName: "Smile Direct Club NYC",
    website: "https://smiledirectclub.com",
    vertical: "dental",
    locationCount: 4,
    locationCitiesStates: "Midtown NY, Financial District NY, Union Square NY, Hoboken NJ",
    bookingPlatform: "Dentrix",
    googleRating: 3.8,
    googleReviewCount: 1890,
    annualRevenue: "$8M-$15M",
    employeeCount: "80-120",
    firstName: "James",
    lastName: "Park",
    title: "Regional Operations Manager",
    email: "jpark@smiledirectclub.com",
    phone: "(212) 555-1847",
    linkedinCompany: "https://linkedin.com/company/smiledirectclub",
    linkedinPersonal: "https://linkedin.com/in/jamesparknyc",
    painSignals: ["High inquiry volume from ads", "After-hours consultation requests", "Lower rating — response time issues"],
    research: "Smile Direct Club has 4 NYC/NJ SmileShops. Their lower rating (3.8) may indicate patient communication gaps. Heavy digital ad spend drives high inquiry volume that needs instant response.",
    pipelineStage: "cold",
    createdDaysAgo: 2,
  },

  // ── More Indoor Sports ─────────────────────────────────
  {
    companyName: "Court 16 Tennis",
    website: "https://court16.com",
    vertical: "indoor_sports",
    locationCount: 3,
    locationCitiesStates: "Long Island City NY, Gowanus Brooklyn NY, City Point Brooklyn NY",
    bookingPlatform: "CourtReserve",
    googleRating: 4.6,
    googleReviewCount: 445,
    annualRevenue: "$3M-$5M",
    employeeCount: "25-40",
    firstName: "Alex",
    lastName: "Brun",
    title: "Co-Founder",
    email: "alex@court16.com",
    phone: "(718) 200-1600",
    linkedinCompany: "https://linkedin.com/company/court-16",
    linkedinPersonal: "https://linkedin.com/in/alexbrun",
    painSignals: ["Premium brand — response speed matters", "Lesson + court booking complexity", "Evening inquiry peak"],
    research: "Court 16 is a premium tennis concept with 3 NYC locations. Modern brand that attracts a tech-savvy clientele. Evening and weekend inquiry spikes from their working professional demographic.",
    pipelineStage: "cold",
    createdDaysAgo: 1,
  },
  {
    companyName: "Gotham Volleyball",
    website: "https://gothamvolleyball.com",
    vertical: "indoor_sports",
    locationCount: 2,
    locationCitiesStates: "Manhattan NY, Brooklyn NY",
    bookingPlatform: "Google Forms",
    googleRating: 4.3,
    googleReviewCount: 210,
    annualRevenue: "$1M-$2M",
    employeeCount: "10-20",
    firstName: "Chris",
    lastName: "Martinez",
    title: "Director",
    email: "chris@gothamvolleyball.com",
    phone: "(212) 555-4738",
    linkedinCompany: "https://linkedin.com/company/gotham-volleyball",
    linkedinPersonal: "https://linkedin.com/in/chrismartinez-gotham",
    painSignals: ["Google Forms for booking — no automation", "League registration chaos", "No after-hours handling"],
    research: "Gotham Volleyball uses Google Forms for registration — a clear sign of booking infrastructure gaps. League registration periods create huge inquiry spikes with no automation.",
    pipelineStage: "contacted",
    createdDaysAgo: 9,
  },
];

// ─── Seed Function ──────────────────────────────────────────────────────────

export async function seedDatabase(): Promise<{
  leadsInserted: number;
  messagesInserted: number;
  eventsInserted: number;
  runsInserted: number;
  callPrepsInserted: number;
  proposalsInserted: number;
  sequencesInserted: number;
}> {
  // Check if already seeded
  const existing = await db.select({ count: sql<number>`count(*)` }).from(leads);
  if (existing[0].count > 0) {
    return {
      leadsInserted: 0,
      messagesInserted: 0,
      eventsInserted: 0,
      runsInserted: 0,
      callPrepsInserted: 0,
      proposalsInserted: 0,
      sequencesInserted: 0,
    };
  }

  let messagesInserted = 0;
  let eventsInserted = 0;
  let callPrepsInserted = 0;
  let proposalsInserted = 0;
  let sequencesInserted = 0;

  // ── Insert Leads ──
  const insertedLeads: Array<{ id: number; stage: string; vertical: string; locationCount: number; createdDaysAgo: number; companyName: string; firstName: string; lastName: string }> = [];

  for (const seedLead of SEED_LEADS) {
    const discoveredLead = {
      companyName: seedLead.companyName,
      website: seedLead.website,
      vertical: seedLead.vertical as "indoor_sports" | "med_spa" | "dental" | "youth_sports",
      locationCount: seedLead.locationCount,
      locationCitiesStates: seedLead.locationCitiesStates,
      bookingPlatform: seedLead.bookingPlatform,
      googleRating: seedLead.googleRating,
      googleReviewCount: seedLead.googleReviewCount,
      annualRevenue: seedLead.annualRevenue,
      employeeCount: seedLead.employeeCount,
      firstName: seedLead.firstName,
      lastName: seedLead.lastName,
      title: seedLead.title,
      email: seedLead.email,
      phone: seedLead.phone,
      linkedinCompany: seedLead.linkedinCompany,
      linkedinPersonal: seedLead.linkedinPersonal,
      painSignals: seedLead.painSignals,
      research: seedLead.research,
    };

    const { score, breakdown } = scoreLead(discoveredLead);
    const tier = classifyTier(discoveredLead);

    const [row] = await db.insert(leads).values({
      companyName: seedLead.companyName,
      website: seedLead.website,
      vertical: seedLead.vertical,
      tier,
      locationCount: seedLead.locationCount,
      locationCitiesStates: seedLead.locationCitiesStates,
      bookingPlatform: seedLead.bookingPlatform,
      googleRating: seedLead.googleRating,
      googleReviewCount: seedLead.googleReviewCount,
      annualRevenue: seedLead.annualRevenue,
      employeeCount: seedLead.employeeCount,
      score,
      scoreBreakdown: JSON.stringify(breakdown),
      firstName: seedLead.firstName,
      lastName: seedLead.lastName,
      title: seedLead.title,
      email: seedLead.email,
      phone: seedLead.phone,
      linkedinCompany: seedLead.linkedinCompany,
      linkedinPersonal: seedLead.linkedinPersonal,
      pipelineStage: seedLead.pipelineStage,
      painSignals: JSON.stringify(seedLead.painSignals),
      research: seedLead.research,
      source: "lead_scout",
      createdAt: daysAgo(seedLead.createdDaysAgo),
      updatedAt: daysAgo(Math.max(0, seedLead.createdDaysAgo - 2)),
    }).returning();

    insertedLeads.push({
      id: row.id,
      stage: seedLead.pipelineStage,
      vertical: seedLead.vertical,
      locationCount: seedLead.locationCount,
      createdDaysAgo: seedLead.createdDaysAgo,
      companyName: seedLead.companyName,
      firstName: seedLead.firstName,
      lastName: seedLead.lastName,
    });
  }

  // ── Insert Pipeline Events ──
  for (const lead of insertedLeads) {
    // Entry event
    await db.insert(pipelineEvents).values({
      leadId: lead.id,
      fromStage: null,
      toStage: "cold",
      trigger: "lead_scout",
      notes: `Discovered by Lead Scout — ${lead.companyName}`,
      createdAt: daysAgo(lead.createdDaysAgo),
    });
    eventsInserted++;

    // Advancement events based on current stage
    const stages = ["cold", "contacted", "responded", "discovery_booked", "demo_completed", "proposal_sent", "negotiating"];
    const currentIdx = stages.indexOf(lead.stage);

    if (currentIdx >= 1) {
      await db.insert(pipelineEvents).values({
        leadId: lead.id,
        fromStage: "cold",
        toStage: "contacted",
        trigger: "instantly_sent",
        notes: "Initial outreach email sent via Instantly",
        createdAt: daysAgo(lead.createdDaysAgo - 1),
      });
      eventsInserted++;
    }
    if (currentIdx >= 2) {
      await db.insert(pipelineEvents).values({
        leadId: lead.id,
        fromStage: "contacted",
        toStage: "responded",
        trigger: "email_reply",
        notes: `${lead.firstName} replied — interested in learning more`,
        createdAt: daysAgo(lead.createdDaysAgo - 3),
      });
      eventsInserted++;
    }
    if (currentIdx >= 3) {
      await db.insert(pipelineEvents).values({
        leadId: lead.id,
        fromStage: "responded",
        toStage: "discovery_booked",
        trigger: "calendar_event",
        notes: "Discovery call booked via Calendly",
        createdAt: daysAgo(lead.createdDaysAgo - 5),
      });
      eventsInserted++;
    }
    if (currentIdx >= 4) {
      await db.insert(pipelineEvents).values({
        leadId: lead.id,
        fromStage: "discovery_booked",
        toStage: "demo_completed",
        trigger: "manual",
        notes: "Demo completed — strong interest, requesting proposal",
        createdAt: daysAgo(lead.createdDaysAgo - 8),
      });
      eventsInserted++;
    }
    if (currentIdx >= 5) {
      await db.insert(pipelineEvents).values({
        leadId: lead.id,
        fromStage: "demo_completed",
        toStage: "proposal_sent",
        trigger: "manual",
        notes: "Custom proposal sent with ROI analysis",
        createdAt: daysAgo(lead.createdDaysAgo - 10),
      });
      eventsInserted++;
    }
    if (currentIdx >= 6) {
      await db.insert(pipelineEvents).values({
        leadId: lead.id,
        fromStage: "proposal_sent",
        toStage: "negotiating",
        trigger: "email_reply",
        notes: "Proposal reviewed — negotiating terms and pilot scope",
        createdAt: daysAgo(lead.createdDaysAgo - 12),
      });
      eventsInserted++;
    }
  }

  // ── Insert Outreach Messages ──
  // Generate messages for leads that are past cold stage
  for (const lead of insertedLeads) {
    const stages = ["cold", "contacted", "responded", "discovery_booked", "demo_completed", "proposal_sent", "negotiating"];
    const currentIdx = stages.indexOf(lead.stage);

    if (currentIdx >= 1) {
      // Initial email
      const lostRevenue = lead.locationCount * (lead.vertical === "med_spa" ? 72000 : lead.vertical === "dental" ? 48000 : 56000);
      await db.insert(outreachMessages).values({
        leadId: lead.id,
        channel: "email",
        templateId: lead.vertical === "indoor_sports" || lead.vertical === "youth_sports" ? "A" : "C",
        subject: `How ${lead.companyName} can capture the 80% of leads you're currently losing`,
        body: `Hi ${lead.firstName},\n\nI work with multi-location ${lead.vertical === "indoor_sports" ? "indoor sports facilities" : lead.vertical === "med_spa" ? "med spas" : "practices"} to solve a problem that's costing the industry millions: slow inquiry response times.\n\nIndustry data shows that 80% of inquiries are lost when facilities can't respond instantly. For a ${lead.locationCount}-location operation like ${lead.companyName}, that's likely costing you ${formatCurrency(lostRevenue)} in annual lost revenue.\n\nWe've built an AI-powered system that automates 60% of routine inquiries—instantly, 24/7.\n\nWould you be open to a 15-minute call next week?`,
        personalizationNotes: `${lead.locationCount} locations, ${lead.vertical}`,
        roiCalculation: `${lead.locationCount} locations × $500/mo = ${formatCurrency(lead.locationCount * 500)}/mo → est. ${calculateROI(lead.locationCount).roi}X ROI`,
        status: "sent",
        sequenceDay: 0,
        sentAt: daysAgo(lead.createdDaysAgo - 1),
        createdAt: daysAgo(lead.createdDaysAgo - 1),
      });
      messagesInserted++;

      // LinkedIn connection
      await db.insert(outreachMessages).values({
        leadId: lead.id,
        channel: "linkedin",
        templateId: "B",
        subject: null,
        body: `Hi ${lead.firstName}, I've been researching multi-location ${lead.vertical === "indoor_sports" ? "indoor sports facilities" : "med spas"} in the NYC metro area, and ${lead.companyName}'s approach really stood out. I work with facilities like yours to automate inquiry handling and recapture lost revenue. Would be great to connect.`,
        personalizationNotes: `LinkedIn connection request — ${lead.locationCount} locations`,
        roiCalculation: "",
        status: "sent",
        sequenceDay: 0,
        sentAt: daysAgo(lead.createdDaysAgo - 1),
        createdAt: daysAgo(lead.createdDaysAgo - 1),
      });
      messagesInserted++;
    }

    if (currentIdx >= 2) {
      // Follow-up after response
      await db.insert(outreachMessages).values({
        leadId: lead.id,
        channel: "email",
        templateId: "D",
        subject: `Re: How ${lead.companyName} can capture lost leads`,
        body: `Hi ${lead.firstName},\n\nThanks for your interest! I'd love to walk you through exactly how this works for a ${lead.locationCount}-location operation like yours.\n\nOur most recent comparable client (Arena Sports, 5 locations) achieved a 10X ROI in their first year.\n\nDoes Thursday at 2pm or Friday at 10am work for a quick 15-minute call?`,
        personalizationNotes: "Follow-up to positive reply",
        roiCalculation: "",
        status: "sent",
        sequenceDay: 3,
        sentAt: daysAgo(lead.createdDaysAgo - 3),
        openedAt: daysAgo(lead.createdDaysAgo - 3),
        repliedAt: daysAgo(lead.createdDaysAgo - 3),
        createdAt: daysAgo(lead.createdDaysAgo - 3),
      });
      messagesInserted++;
    }
  }

  // Add draft messages for cold leads (queued but not sent)
  for (const lead of insertedLeads.filter(l => l.stage === "cold")) {
    const lostRevenue = lead.locationCount * (lead.vertical === "med_spa" ? 72000 : lead.vertical === "dental" ? 48000 : 56000);
    await db.insert(outreachMessages).values({
      leadId: lead.id,
      channel: "email",
      templateId: lead.vertical === "indoor_sports" || lead.vertical === "youth_sports" ? "A" : "C",
      subject: `How ${lead.companyName} can capture the 80% of leads you're currently losing`,
      body: `Hi ${lead.firstName},\n\nI work with multi-location ${lead.vertical === "indoor_sports" ? "indoor sports facilities" : lead.vertical === "med_spa" ? "med spas" : "practices"} to solve a problem: slow inquiry response times.\n\nFor a ${lead.locationCount}-location operation like ${lead.companyName}, that's likely costing you ${formatCurrency(lostRevenue)} in annual lost revenue.\n\nWe've built an AI-powered system that automates 60% of routine inquiries—instantly, 24/7.\n\nWould you be open to a 15-minute call?`,
      personalizationNotes: `${lead.locationCount} locations, ${lead.vertical}`,
      roiCalculation: `${lead.locationCount} locations × $500/mo = ${formatCurrency(lead.locationCount * 500)}/mo → est. ${calculateROI(lead.locationCount).roi}X ROI`,
      status: "draft",
      sequenceDay: 0,
      createdAt: hoursAgo(2),
    });
    messagesInserted++;

    await db.insert(outreachMessages).values({
      leadId: lead.id,
      channel: "linkedin",
      templateId: "B",
      subject: null,
      body: `Hi ${lead.firstName}, I've been researching multi-location businesses in the NYC metro area, and ${lead.companyName}'s approach really stood out. Would love to connect.`,
      personalizationNotes: "LinkedIn connection request",
      roiCalculation: "",
      status: "draft",
      sequenceDay: 0,
      createdAt: hoursAgo(2),
    });
    messagesInserted++;
  }

  // ── Insert Agent Runs ──
  const agentTypes = ["lead_scout", "outreach_composer", "pipeline_intelligence", "prospect_research", "follow_up_sequencing", "proposal_generator"] as const;
  const agentSummaries: Record<string, string> = {
    lead_scout: "Lead Scout completed: 20 new leads inserted (22 discovered, 22 enriched, 2 duplicates skipped)",
    outreach_composer: "Outreach Composer completed: 18 messages generated for 9 leads (9 emails, 9 LinkedIn)",
    pipeline_intelligence: "Morning Briefing: 3 stale prospects flagged, 12 active prospects, 8 messages queued",
    prospect_research: "Call Prep generated for Brooklyn Boulders discovery call",
    follow_up_sequencing: "Follow-Up Queue: 4 touches scheduled for today (2 emails, 2 LinkedIn)",
    proposal_generator: "Proposal generated for Ever/Body — $47K annual contract value",
  };

  for (const agentType of agentTypes) {
    // Completed run from today
    await db.insert(agentRuns).values({
      agentType,
      status: "completed",
      startedAt: hoursAgo(agentType === "lead_scout" ? 14 : agentType === "outreach_composer" ? 13 : 12),
      completedAt: hoursAgo(agentType === "lead_scout" ? 13.5 : agentType === "outreach_composer" ? 12.8 : 11.8),
      itemsProcessed: agentType === "lead_scout" ? 20 : agentType === "outreach_composer" ? 18 : agentType === "follow_up_sequencing" ? 4 : 1,
      summary: agentSummaries[agentType],
    });

    // Completed run from yesterday
    await db.insert(agentRuns).values({
      agentType,
      status: "completed",
      startedAt: daysAgo(1),
      completedAt: daysAgo(1),
      itemsProcessed: agentType === "lead_scout" ? 18 : agentType === "outreach_composer" ? 16 : 3,
      summary: `Previous run for ${agentType}`,
    });
  }

  // ── Insert Call Preps ──
  // For leads at discovery_booked stage
  for (const lead of insertedLeads.filter(l => ["discovery_booked", "demo_completed", "proposal_sent", "negotiating"].includes(l.stage))) {
    const roi = calculateROI(lead.locationCount);
    const lostRevenue = lead.locationCount * (lead.vertical === "med_spa" ? 72000 : lead.vertical === "dental" ? 48000 : 56000);

    await db.insert(callPreps).values({
      leadId: lead.id,
      callDate: lead.stage === "discovery_booked" ? daysFromNow(2) : daysAgo(lead.createdDaysAgo - 7),
      companySnapshot: `${lead.companyName} operates ${lead.locationCount} locations across ${SEED_LEADS.find(s => s.companyName === lead.companyName)?.locationCitiesStates ?? "the tristate area"}. ${SEED_LEADS.find(s => s.companyName === lead.companyName)?.research ?? ""}`,
      painSignals: JSON.stringify(SEED_LEADS.find(s => s.companyName === lead.companyName)?.painSignals ?? []),
      financialModel: JSON.stringify({
        "Est. Annual Lost Revenue": formatCurrency(lostRevenue),
        "Monthly Investment": formatCurrency(roi.monthlyInvestment),
        "Projected ROI": `${roi.roi}X`,
        "Payback Period": `${roi.paybackDays} days`,
        "Year 1 Value": formatCurrency(Math.round(lostRevenue * 2.35)),
      }),
      killerQuestions: JSON.stringify([
        `"With ${lead.locationCount} locations, how are you currently scaling your inquiry handling without proportionally scaling headcount?"`,
        `"What happens to the 40% of inquiries that come in after your staff goes home?"`,
        `"What percentage of inquiries do you estimate go unanswered?"`,
      ]),
      objectionHandles: JSON.stringify({
        "We already have a booking system": "We don't replace your existing system — we make it intelligent. We plug in via API and automate the inquiry-to-booking flow.",
        "It's too expensive": `At ${formatCurrency(roi.monthlyInvestment)}/month for ${lead.locationCount} locations, you only need ${Math.ceil(roi.monthlyInvestment / 150)} additional bookings per month to break even.`,
        "How do I know it works?": "We offer a free 4-week pilot at one location. Zero risk, data-driven decision after the trial.",
      }),
      recommendedCaseStudy: "Arena Sports (Seattle, 5 locations): 60% automation rate, 15% labor cost reduction, 10X ROI in Year 1",
      competitiveIntel: "As of 2026, no evidence of AI-powered customer service automation among facility competitors — first-mover advantage window open.",
      createdAt: daysAgo(lead.createdDaysAgo - 5),
    });
    callPrepsInserted++;
  }

  // ── Insert Proposals ──
  // For leads at demo_completed, proposal_sent, or negotiating
  for (const lead of insertedLeads.filter(l => ["demo_completed", "proposal_sent", "negotiating"].includes(l.stage))) {
    const roi = calculateROI(lead.locationCount);
    const lostRevenue = lead.locationCount * (lead.vertical === "med_spa" ? 72000 : lead.vertical === "dental" ? 48000 : 56000);
    const year1Recovery = Math.round(lostRevenue * 2.35);

    const status = lead.stage === "negotiating" ? "sent" : lead.stage === "proposal_sent" ? "sent" : "draft";

    await db.insert(proposals).values({
      leadId: lead.id,
      executiveSummary: `${lead.companyName} is losing an estimated ${formatCurrency(lostRevenue)} annually from slow inquiry response times across ${lead.locationCount} locations. Our AI-powered booking automation will recover ${formatCurrency(year1Recovery)} in Year 1 value. Projected ROI: ${roi.roi}X.`,
      currentStateAnalysis: `${lead.companyName} operates ${lead.locationCount} locations. Industry benchmarks suggest 80% of leads are lost when facilities can't respond instantly. With an estimated ${(lead.locationCount * 500 * 12).toLocaleString()} annual inquiries, even a 5% improvement in conversion represents significant revenue recovery.`,
      proposedSolution: "AI-powered intelligence layer integrating with existing booking platform to automate 60%+ of routine inquiries — 24/7, across SMS, email, and web chat.",
      financialModel: JSON.stringify({
        setupFee: lead.locationCount <= 5 ? 2000 : 5000,
        monthly: roi.monthlyInvestment,
        yearOneValue: year1Recovery,
        roi: roi.roi,
        annualInvestment: roi.annualInvestment,
      }),
      implementationTimeline: "Week 1: API integration & setup. Week 2: AI configuration. Week 3: Testing & staff training. Week 4: Go-live across all locations.",
      caseStudy: "Arena Sports (Seattle, 5 locations): 60% automation rate, 15% labor cost reduction, 10X ROI in Year 1",
      pricing: JSON.stringify({
        setupFee: lead.locationCount <= 5 ? 2000 : 5000,
        monthly: roi.monthlyInvestment,
        yearOneValue: year1Recovery,
        roi: roi.roi,
      }),
      nextSteps: "1. Review proposal with team\n2. Schedule follow-up call\n3. Select pilot location for 4-week free trial\n4. Data review → full rollout decision",
      status,
      createdAt: daysAgo(lead.createdDaysAgo - 9),
    });
    proposalsInserted++;
  }

  // ── Insert Follow-Up Sequences ──
  // For leads at contacted or responded stage (active sequences)
  for (const lead of insertedLeads.filter(l => ["contacted", "responded"].includes(l.stage))) {
    const currentDay = lead.stage === "responded" ? 7 : 3;
    const nextTouchDays = lead.stage === "responded" ? 7 : 3;

    await db.insert(followUpSequences).values({
      leadId: lead.id,
      currentDay,
      status: "active",
      nextTouchAt: daysFromNow(nextTouchDays - currentDay + 1),
      channelHistory: JSON.stringify(lead.stage === "responded" ? ["email", "linkedin", "email"] : ["email", "linkedin"]),
      createdAt: daysAgo(lead.createdDaysAgo - 1),
      updatedAt: daysAgo(1),
    });
    sequencesInserted++;
  }

  // Paused sequences (for leads that booked discovery)
  for (const lead of insertedLeads.filter(l => l.stage === "discovery_booked")) {
    await db.insert(followUpSequences).values({
      leadId: lead.id,
      currentDay: 7,
      status: "paused",
      nextTouchAt: null,
      channelHistory: JSON.stringify(["email", "linkedin", "email"]),
      pausedUntil: daysFromNow(7),
      createdAt: daysAgo(lead.createdDaysAgo - 1),
      updatedAt: daysAgo(3),
    });
    sequencesInserted++;
  }

  // Completed/exited sequences
  for (const lead of insertedLeads.filter(l => ["demo_completed", "proposal_sent", "negotiating"].includes(l.stage))) {
    await db.insert(followUpSequences).values({
      leadId: lead.id,
      currentDay: 14,
      status: "exited",
      nextTouchAt: null,
      channelHistory: JSON.stringify(["email", "linkedin", "email", "email"]),
      createdAt: daysAgo(lead.createdDaysAgo - 1),
      updatedAt: daysAgo(lead.createdDaysAgo - 8),
    });
    sequencesInserted++;
  }

  return {
    leadsInserted: insertedLeads.length,
    messagesInserted,
    eventsInserted,
    runsInserted: agentTypes.length * 2,
    callPrepsInserted,
    proposalsInserted,
    sequencesInserted,
  };
}
