#!/usr/bin/env python3
"""
Rainey Daily Lead Scraper Agent — v2
Discovers multi-location chains in NYC metro/tristate area:
  - 50 indoor sports facilities
  - 50 med spas

Output schema (per column):
  Company Name | # of Locations | Location Cities/States | Website |
  First Name | Last Name | Role | Business Email | Phone Number |
  LinkedIn | Personal LinkedIn | Annual Revenue | Size | Research
"""

import os
import json
import csv
import time
import datetime
import requests
import traceback
from openai import OpenAI

# ── Configuration ─────────────────────────────────────────────────────────────
TELEGRAM_BOT_TOKEN = "8658777754:AAFxea4RReT-4nvsShNyb2d2sbq9asKQ7c4"
TELEGRAM_CHAT_ID   = "-1003863619660"
OUTPUT_DIR         = "/home/ubuntu/rainey/output"
SEEN_FILE          = "/home/ubuntu/rainey/seen_companies.json"
TARGET_COUNT       = 50
MODEL              = "gpt-4.1-mini"

# CSV column order — must match exactly
FIELDNAMES = [
    "Company Name",
    "# of Locations",
    "Location Cities/States",
    "Website",
    "First Name",
    "Last Name",
    "Role",
    "Business Email",
    "Phone Number",
    "LinkedIn",
    "Personal LinkedIn",
    "Annual Revenue",
    "Size",
    "Research",
]

client = OpenAI()

# ── Telegram helpers ──────────────────────────────────────────────────────────

def send_telegram_message(text: str):
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    try:
        r = requests.post(
            url,
            json={"chat_id": TELEGRAM_CHAT_ID, "text": text, "parse_mode": "HTML"},
            timeout=30,
        )
        r.raise_for_status()
        print(f"[Telegram] Message sent.")
    except Exception as e:
        print(f"[Telegram] Failed to send message: {e}")


def send_telegram_document(file_path: str, caption: str = ""):
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendDocument"
    try:
        with open(file_path, "rb") as f:
            r = requests.post(
                url,
                data={"chat_id": TELEGRAM_CHAT_ID, "caption": caption},
                files={"document": f},
                timeout=60,
            )
        r.raise_for_status()
        print(f"[Telegram] Document sent: {os.path.basename(file_path)}")
    except Exception as e:
        print(f"[Telegram] Failed to send document: {e}")

# ── Dedup helpers ─────────────────────────────────────────────────────────────

def load_seen() -> set:
    if os.path.exists(SEEN_FILE):
        with open(SEEN_FILE) as f:
            data = json.load(f)
        return set(n.strip().lower() for n in data)
    return set()


def save_seen(seen: set):
    with open(SEEN_FILE, "w") as f:
        json.dump(sorted(list(seen)), f, indent=2)

# ── Discovery via OpenAI ──────────────────────────────────────────────────────

def gpt_discover_leads(category: str, count: int) -> list[dict]:
    """
    Use GPT to generate a structured list of real multi-location chains
    in the NYC metro / tristate area with as much known intel as possible.
    """
    system_prompt = (
        "You are an expert B2B sales researcher specializing in identifying "
        "multi-location business chains in the NYC metro and tristate area (NY, NJ, CT). "
        "You have deep knowledge of real operating businesses, their leadership teams, "
        "company size, revenue, and contact details. "
        "Return ONLY a valid JSON array — no markdown, no explanation."
    )

    user_prompt = f"""
Research and list {count} real, currently operating multi-location {category} chains 
in the NYC metro / tristate area (New York, New Jersey, Connecticut).
Focus on chains with 2 or more locations. Mix of well-known and lesser-known chains.

For each company, provide as much real, accurate information as you know:

- company_name: Official business name
- num_locations: Number of locations in the tristate area (integer or range like "3-5")
- location_cities_states: Comma-separated list of cities/states where they operate (e.g. "Manhattan NY, Brooklyn NY, Hoboken NJ")
- website: Official website URL
- first_name: First name of the primary decision maker (owner, GM, VP Operations, or founder)
- last_name: Last name of the primary decision maker
- role: Their exact title
- business_email: Their confirmed or most likely professional email (use format like firstname@company.com or info@company.com — only if you have reasonable confidence; otherwise leave blank)
- phone_number: Main business phone number
- linkedin_company: LinkedIn company page URL (e.g. https://www.linkedin.com/company/companyname)
- linkedin_personal: LinkedIn profile URL of the decision maker if known
- annual_revenue: Estimated annual revenue (e.g. "$2M-$5M", "$10M+")
- size: Estimated number of employees (e.g. "10-50", "50-200")
- research: 2-3 sentence summary of what makes them a strong prospect, their growth trajectory, and any relevant intel for a sales rep

Return ONLY a valid JSON array of objects with exactly these keys:
company_name, num_locations, location_cities_states, website, first_name, last_name, role,
business_email, phone_number, linkedin_company, linkedin_personal, annual_revenue, size, research

Do not include any text before or after the JSON array.
"""

    print(f"[OpenAI] Discovering {count} {category} leads...")
    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.5,
        max_tokens=12000,
    )

    raw = response.choices[0].message.content.strip()

    # Strip markdown fences if present
    if raw.startswith("```"):
        lines = raw.split("\n")
        raw = "\n".join(lines[1:-1]) if lines[-1].strip() == "```" else "\n".join(lines[1:])

    leads = json.loads(raw)
    print(f"[OpenAI] Received {len(leads)} {category} leads from GPT")
    return leads

# ── Web research enrichment ───────────────────────────────────────────────────

def web_enrich_lead(lead: dict) -> dict:
    """
    Use OpenAI with web-research prompting to fill in missing fields
    for a single lead: real email, phone, LinkedIn, revenue, size.
    """
    company = lead.get("company_name", "")
    website = lead.get("website", "")
    first   = lead.get("first_name", "")
    last    = lead.get("last_name", "")
    role    = lead.get("role", "")

    # Only enrich if key fields are missing
    missing = []
    if not lead.get("business_email"):
        missing.append("business_email")
    if not lead.get("phone_number"):
        missing.append("phone_number")
    if not lead.get("linkedin_company"):
        missing.append("linkedin_company")
    if not lead.get("annual_revenue"):
        missing.append("annual_revenue")
    if not lead.get("size"):
        missing.append("size")

    if not missing:
        return lead

    enrich_prompt = f"""
You are a B2B sales researcher. Using your knowledge of real businesses, 
find the following missing information for this company:

Company: {company}
Website: {website}
Decision Maker: {first} {last} ({role})
Missing fields: {', '.join(missing)}

Return ONLY a JSON object with just the missing fields filled in.
For business_email: use the real contact email from their website if known, 
  or the decision maker's professional email if known (e.g. john.smith@company.com).
  If truly unknown, use the generic contact email (info@, contact@) or leave blank.
For phone_number: use their real main business phone if known, else leave blank.
For linkedin_company: use https://www.linkedin.com/company/[slug] format.
For annual_revenue: estimate based on number of locations and industry (e.g. "$1M-$3M").
For size: estimate employee count range (e.g. "15-40").

Return ONLY a JSON object. No explanation, no markdown.
"""

    try:
        resp = client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": enrich_prompt}],
            temperature=0.3,
            max_tokens=500,
        )
        raw = resp.choices[0].message.content.strip()
        if raw.startswith("```"):
            lines = raw.split("\n")
            raw = "\n".join(lines[1:-1]) if lines[-1].strip() == "```" else "\n".join(lines[1:])
        enriched = json.loads(raw)
        for k, v in enriched.items():
            if v and not lead.get(k):
                lead[k] = v
    except Exception as e:
        print(f"  [Enrich] Warning for {company}: {e}")

    return lead

# ── Dedup ─────────────────────────────────────────────────────────────────────

def deduplicate(leads: list[dict], seen: set) -> tuple[list[dict], int]:
    new_leads, dupes = [], 0
    for lead in leads:
        key = lead.get("company_name", "").strip().lower()
        if key and key not in seen:
            new_leads.append(lead)
            seen.add(key)
        else:
            dupes += 1
            print(f"  [Dedup] Skipping: {lead.get('company_name')}")
    return new_leads, dupes

# ── CSV writer ────────────────────────────────────────────────────────────────

def to_row(lead: dict) -> dict:
    """Map internal keys to the canonical CSV column names."""
    return {
        "Company Name":        lead.get("company_name", ""),
        "# of Locations":      lead.get("num_locations", ""),
        "Location Cities/States": lead.get("location_cities_states", ""),
        "Website":             lead.get("website", ""),
        "First Name":          lead.get("first_name", ""),
        "Last Name":           lead.get("last_name", ""),
        "Role":                lead.get("role", ""),
        "Business Email":      lead.get("business_email", ""),
        "Phone Number":        lead.get("phone_number", ""),
        "LinkedIn":            lead.get("linkedin_company", ""),
        "Personal LinkedIn":   lead.get("linkedin_personal", ""),
        "Annual Revenue":      lead.get("annual_revenue", ""),
        "Size":                lead.get("size", ""),
        "Research":            lead.get("research", ""),
    }


def write_csv(leads: list[dict], filepath: str):
    if not leads:
        print(f"[CSV] No leads to write for {filepath}")
        return
    rows = [to_row(l) for l in leads]
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDNAMES)
        writer.writeheader()
        writer.writerows(rows)
    print(f"[CSV] Wrote {len(rows)} rows → {os.path.basename(filepath)}")

# ── Main ──────────────────────────────────────────────────────────────────────

def run_category(category: str, count: int, seen: set) -> tuple[list[dict], str]:
    """Discover, enrich, and deduplicate leads for one category. Returns (leads, csv_path)."""
    today = datetime.date.today().isoformat()
    print(f"\n{'─'*55}")
    print(f"  Category: {category.upper()}")
    print(f"{'─'*55}")

    # Step 1: Discover
    try:
        raw_leads = gpt_discover_leads(category, count)
    except Exception as e:
        print(f"[ERROR] Discovery failed for {category}: {e}")
        raw_leads = []

    # Step 2: Enrich each lead via web research
    enriched = []
    for i, lead in enumerate(raw_leads, 1):
        print(f"  [Enrich {i}/{len(raw_leads)}] {lead.get('company_name', '?')}")
        enriched.append(web_enrich_lead(lead))
        time.sleep(0.3)  # gentle rate limiting

    # Step 3: Deduplicate
    new_leads, dupes = deduplicate(enriched, seen)
    print(f"\n  Result: {len(new_leads)} new leads, {dupes} duplicates skipped")

    # Step 4: Write CSV
    slug = category.lower().replace(" ", "_")
    csv_path = os.path.join(OUTPUT_DIR, f"{slug}_{today}.csv")
    write_csv(new_leads, csv_path)

    return new_leads, csv_path


def main(categories: dict | None = None):
    today = datetime.date.today().isoformat()
    print(f"\n{'='*55}")
    print(f"  Rainey Lead Scraper v2 — {today}")
    print(f"{'='*55}")

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    seen = load_seen()
    print(f"[Dedup] {len(seen)} companies in seen_companies.json")

    if categories is None:
        categories = {
            "indoor sports facility": TARGET_COUNT,
            "med spa": TARGET_COUNT,
        }

    all_results = {}
    csv_files   = {}

    for category, count in categories.items():
        leads, csv_path = run_category(category, count, seen)
        all_results[category] = leads
        csv_files[category]   = csv_path

    save_seen(seen)
    print(f"\n[Dedup] Saved {len(seen)} companies to seen_companies.json")

    # Build Telegram summary
    lines = [f"<b>Rainey Lead Report — {today}</b>\n", "NYC Metro / Tristate Area\n"]
    total = 0
    for cat, leads in all_results.items():
        n = len(leads)
        total += n
        lines.append(f"{cat.title()}: <b>{n}</b> new leads")
    lines.append(f"\n<b>Total: {total} new leads</b>")
    lines.append("CSV files attached.")
    summary = "\n".join(lines)

    send_telegram_message(summary)
    for cat, path in csv_files.items():
        if os.path.exists(path) and os.path.getsize(path) > 0:
            send_telegram_document(path, caption=f"{cat.title()} Leads — {today}")
        else:
            print(f"[Telegram] Skipping {cat} — file empty or missing")

    print("\n[Done] Rainey scraper completed successfully.\n")
    return all_results, csv_files


if __name__ == "__main__":
    import sys
    # Allow running a single category: python3 rainey.py "med spa"
    if len(sys.argv) > 1:
        cat = sys.argv[1].lower()
        cats = {cat: TARGET_COUNT}
    else:
        cats = None

    try:
        main(cats)
    except Exception as e:
        err_msg = (
            f"<b>Rainey Scraper ERROR — {datetime.date.today().isoformat()}</b>\n\n"
            f"<code>{str(e)}</code>\n\n"
            f"Check /home/ubuntu/rainey/output/ for partial results."
        )
        print(f"\n[FATAL ERROR]\n{traceback.format_exc()}")
        try:
            requests.post(
                f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                json={"chat_id": TELEGRAM_CHAT_ID, "text": err_msg, "parse_mode": "HTML"},
                timeout=30,
            )
        except Exception:
            pass
        raise
