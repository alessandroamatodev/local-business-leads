import { Actor } from 'apify';
import log from '@apify/log';
import { PlaywrightCrawler } from 'crawlee';
import { setTimeout as sleep } from 'node:timers/promises';

await Actor.init();

Actor.on('aborting', async () => {
    log.warning('Actor abort requested, exiting quickly...');
    await sleep(1000);
    await Actor.exit();
});

const input = (await Actor.getInput()) ?? {};
const city = String(input.city ?? '').trim();
const keyword = String(input.keyword ?? '').trim();
const maxResults = Math.min(Math.max(Number(input.maxResults ?? 50), 1), 200);

if (!city || !keyword) {
    throw new Error('Input validation failed: "city" and "keyword" are required non-empty strings.');
}

const searchQuery = `${keyword} ${city}`;
const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`;
log.info(`Starting scrape for query: "${searchQuery}" with maxResults=${maxResults}`);

const normalizeText = (value) => {
    if (!value) return null;
    const cleaned = value.replace(/\s+/g, ' ').trim();
    return cleaned || null;
};

const parseReviewsCount = (value) => {
    if (!value) return null;
    const onlyNumber = value.replace(/[^\d]/g, '');
    return onlyNumber ? Number(onlyNumber) : null;
};

const closeConsentIfPresent = async (page) => {
    const selectors = [
        'button:has-text("Accept all")',
        'button:has-text("I agree")',
        'button[aria-label="Accept all"]',
        'form[action*="consent"] button[type="submit"]',
    ];

    for (const selector of selectors) {
        const button = page.locator(selector).first();
        if (await button.isVisible().catch(() => false)) {
            await button.click({ timeout: 5000 }).catch(() => {});
            await page.waitForTimeout(1000);
            log.info(`Handled consent dialog using selector: ${selector}`);
            return;
        }
    }
};

const extractedLeads = new Map();

const crawler = new PlaywrightCrawler({
    maxConcurrency: 1,
    requestHandlerTimeoutSecs: 180,
    async requestHandler({ page, request }) {
        await page.goto(request.url, { waitUntil: 'domcontentloaded', timeout: 120000 });
        await closeConsentIfPresent(page);
        await page.waitForTimeout(3000);

        const panelSelector = 'div[role="feed"], div[role="main"] div[aria-label][tabindex]';
        const panel = page.locator(panelSelector).first();
        const hasPanel = await panel.isVisible().catch(() => false);

        if (!hasPanel) {
            const pageText = normalizeText(await page.locator('body').innerText().catch(() => ''));
            log.error('Could not locate results panel on Google Maps page.');
            throw new Error(`Results panel not found. URL=${page.url()} title=${await page.title()} bodySnippet=${pageText?.slice(0, 250) ?? 'n/a'}`);
        }

        let noGrowthCycles = 0;
        let previousCount = 0;

        while (extractedLeads.size < maxResults && noGrowthCycles < 8) {
            const cards = page.locator('a[href*="/maps/place/"]');
            const currentCount = await cards.count();

            if (currentCount > previousCount) {
                previousCount = currentCount;
                noGrowthCycles = 0;
                log.info(`Loaded ${currentCount} cards in results panel.`);
            } else {
                noGrowthCycles += 1;
            }

            await panel.evaluate((el) => {
                el.scrollBy(0, 1400);
            }).catch(async () => {
                await page.mouse.wheel(0, 1600);
            });
            await page.waitForTimeout(1200);
        }

        const cards = page.locator('a[href*="/maps/place/"]');
        const cardsCount = await cards.count();
        log.info(`Processing up to ${Math.min(cardsCount, maxResults)} cards out of ${cardsCount} loaded.`);

        for (let i = 0; i < cardsCount && extractedLeads.size < maxResults; i++) {
            const card = cards.nth(i);

            try {
                await card.scrollIntoViewIfNeeded();
                await card.click({ timeout: 10000 });
                await page.waitForTimeout(1800);
            } catch {
                continue;
            }

            const lead = await page.evaluate(() => {
                const textFromButtonDataItem = (key) => {
                    const el = document.querySelector(`button[data-item-id="${key}"] .fontBodyMedium`) ||
                        document.querySelector(`a[data-item-id="${key}"] .fontBodyMedium`);
                    return el?.textContent?.trim() || null;
                };

                const name = document.querySelector('h1')?.textContent?.trim() || null;
                const address = textFromButtonDataItem('address');
                const phone = textFromButtonDataItem('phone:tel');
                const website = document.querySelector('a[data-item-id="authority"]')?.href || null;
                const ratingText = document.querySelector('div[role="main"] span[aria-hidden="true"]')?.textContent || null;
                const reviewsText = document.querySelector('button[jsaction*="pane.rating.moreReviews"]')?.textContent ||
                    document.querySelector('span[aria-label*="reviews"]')?.textContent || null;

                return {
                    name,
                    address,
                    phone,
                    website,
                    rating: ratingText,
                    reviewsText,
                    googleMapsUrl: window.location.href,
                };
            });

            const normalized = {
                name: normalizeText(lead.name),
                address: normalizeText(lead.address),
                phone: normalizeText(lead.phone),
                website: normalizeText(lead.website),
                rating: normalizeText(lead.rating),
                reviewsCount: parseReviewsCount(lead.reviewsText),
                googleMapsUrl: normalizeText(lead.googleMapsUrl),
                searchCity: city,
                searchKeyword: keyword,
                scrapedAt: new Date().toISOString(),
            };

            const dedupeKey = normalized.googleMapsUrl || `${normalized.name}|${normalized.address}`;
            if (!dedupeKey || extractedLeads.has(dedupeKey)) continue;

            extractedLeads.set(dedupeKey, normalized);
            log.info(`Collected ${extractedLeads.size}/${maxResults}: ${normalized.name ?? 'Unknown business'}`);
        }

        await Actor.pushData([...extractedLeads.values()].slice(0, maxResults));
        log.info(`Finished. Stored ${Math.min(extractedLeads.size, maxResults)} leads in dataset.`);
    },
});

await crawler.run([{ url: searchUrl }]);
await Actor.exit();
