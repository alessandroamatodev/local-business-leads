## What does Local Business Leads Scraper (Google Maps) do?
**Local Business Leads Scraper (Google Maps)** collects structured local business data from Google Maps search results for a given keyword and city (for example, "restaurants" in "Milan"). It loads the Maps result panel, iterates business cards, opens detail views, and extracts key lead-generation fields such as name, address, phone, website, rating, reviews count, and listing URL. You can run it on the [Apify platform](https://apify.com/) with scheduling, API access, monitoring, integrations, and scalable cloud execution.

This Actor is ideal for users who want repeatable lead extraction workflows without building and maintaining custom scraping infrastructure.

## Why use Local Business Leads Scraper (Google Maps)?
- Generate local business prospect lists quickly.
- Enrich outbound campaigns with contact details.
- Support SEO, paid media, and local competitor analysis.
- Power agency reporting and internal location intelligence dashboards.
- Monetize data via API endpoints and recurring runs.

## How to use Local Business Leads Scraper (Google Maps)
1. Open the Actor in Apify Console.
2. In the **Input** tab, set `city`, `keyword`, and optional `maxResults`.
3. Start the run.
4. Wait for completion and open the **Output** tab.
5. Export or consume results through dataset API.

## Input
Provide JSON input like:

```json
{
  "city": "Milan",
  "keyword": "restaurants",
  "maxResults": 50
}
```

- `city` (required, string)
- `keyword` (required, string)
- `maxResults` (optional, integer, default `50`, max `200`)

## Output
Example output item:

```json
{
  "name": "Ristorante Example",
  "address": "Via Roma 10, Milan, Italy",
  "phone": "+39 02 1234 5678",
  "website": "https://www.example.com/",
  "rating": "4.4",
  "reviewsCount": 1287,
  "googleMapsUrl": "https://www.google.com/maps/place/...",
  "searchCity": "Milan",
  "searchKeyword": "restaurants",
  "scrapedAt": "2026-04-29T00:00:00.000Z"
}
```

You can download the dataset in various formats such as JSON, HTML, CSV, or Excel.

## Data table
| Field | Type | Description |
|---|---|---|
| name | string \| null | Business name |
| address | string \| null | Street address from listing details |
| phone | string \| null | Phone number if present |
| website | string \| null | Website URL if present |
| rating | string \| null | Displayed Google rating |
| reviewsCount | number \| null | Parsed number of reviews |
| googleMapsUrl | string \| null | Unique Google Maps listing URL |
| searchCity | string | Input city |
| searchKeyword | string | Input keyword |
| scrapedAt | string | ISO timestamp when item was scraped |

## Pricing / Cost estimation
How much does it cost to scrape Google Maps data? Cost depends on run length, pages loaded, and retries. For smaller lead lists (tens to low hundreds of records), runs are typically lightweight. Use `maxResults` to control runtime and compute usage. If you're testing, start with 20-50 results to estimate cost before scaling.

## Tips or Advanced options
- Start with narrow city + keyword combinations for cleaner data.
- Use smaller `maxResults` for fast, low-cost iterative runs.
- Schedule runs daily/weekly for lead refresh pipelines.
- Post-process datasets to remove duplicates across runs.

## FAQ, disclaimers, and support
This Actor is designed for publicly available listing data. You are responsible for complying with applicable laws, platform Terms of Service, and data usage rules in your jurisdiction. Google Maps UI and selectors may change over time, which can affect extraction stability. If you need improvements, open an issue in the Actor repository or request a custom scraping solution.
