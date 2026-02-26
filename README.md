# Rainey — Daily Lead Scraper Agent

Rainey is an automated B2B lead generation agent that discovers multi-location business chains in the **NYC metro / tristate area** (NY, NJ, CT), enriches each lead with decision-maker contact intelligence, deduplicates against a persistent store, writes structured CSVs, and delivers results via Telegram.

---

## Output Schema

Every CSV produced by Rainey uses the following standardized columns:

| Column | Description |
|---|---|
| Company Name | Official business name |
| # of Locations | Number of tristate area locations |
| Location Cities/States | Comma-separated operating locations |
| Website | Official website URL |
| First Name | Decision maker first name |
| Last Name | Decision maker last name |
| Role | Decision maker title |
| Business Email | Researched professional email |
| Phone Number | Main business phone |
| LinkedIn | Company LinkedIn page URL |
| Personal LinkedIn | Decision maker LinkedIn profile URL |
| Annual Revenue | Estimated annual revenue range |
| Size | Estimated employee count range |
| Research | 2–3 sentence prospect intel summary |

---

## Categories

- **Indoor Sports Facilities** — multi-location chains (gyms, climbing, trampoline parks, courts, etc.)
- **Med Spas** — multi-location aesthetic/wellness chains

Target: **50 leads per category** per daily run.

---

## Project Structure

```
rainey/
├── rainey.py              # Main scraper agent
├── seen_companies.json    # Persistent deduplication store
├── output/                # Daily CSV output files
│   ├── indoor_sports_YYYY-MM-DD.csv
│   └── med_spa_YYYY-MM-DD.csv
└── README.md
```

---

## How It Works

1. **Discovery** — OpenAI (`gpt-4.1-mini`) identifies real multi-location chains in the target geography
2. **Enrichment** — Each lead is individually researched to fill in decision-maker details, emails, LinkedIn URLs, revenue, and size estimates
3. **Deduplication** — Company names are normalized and checked against `seen_companies.json`; duplicates are skipped and the store is updated after each run
4. **CSV Export** — Results are written to `/output/` with date-stamped filenames
5. **Telegram Notification** — A summary message and both CSV files are sent to the configured Telegram channel

---

## Running the Scraper

```bash
# Full run (both categories)
python3 rainey.py

# Single category
python3 rainey.py "med spa"
python3 rainey.py "indoor sports facility"
```

---

## Configuration

| Variable | Location | Description |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | `rainey.py` | Telegram bot token |
| `TELEGRAM_CHAT_ID` | `rainey.py` | Target Telegram channel ID |
| `TARGET_COUNT` | `rainey.py` | Leads to discover per category (default: 50) |
| `MODEL` | `rainey.py` | OpenAI model (default: `gpt-4.1-mini`) |
| `OPENAI_API_KEY` | Environment variable | Required for OpenAI API access |

---

## Dependencies

```
openai
requests
```

Install with:
```bash
pip install openai requests
```

---

## Scheduling (Daily Runs)

To run Rainey daily via cron:

```cron
0 8 * * * cd /home/ubuntu/rainey && python3 rainey.py >> /home/ubuntu/rainey/rainey.log 2>&1
```

---

## Notes

- `seen_companies.json` grows over time and prevents the same company from appearing in multiple daily pulls
- Email fields are populated via research — never randomly guessed
- All output CSVs are UTF-8 encoded
