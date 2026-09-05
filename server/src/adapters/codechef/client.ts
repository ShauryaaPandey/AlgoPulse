import { Platform } from '../../config/constants.js';
import { PlatformError, RateLimitError } from '../../utils/errors.js';
import { retry } from '../../utils/retry.js';
import type { CodeChefProfilePageData, CodeChefUserProfile, CodeChefSubmission } from './types.js';

export class CodeChefClient {
  private lastRequestTime = 0;
  private readonly minIntervalMs = 1500;

  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.minIntervalMs) {
      await new Promise(resolve => setTimeout(resolve, this.minIntervalMs - elapsed));
    }
    this.lastRequestTime = Date.now();
  }

  private async fetchPage(url: string): Promise<string> {
    await this.waitForRateLimit();

    return retry(
      async () => {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; AlgoPulse/1.0)',
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'en-US,en;q=0.9'
          }
        });

        if (response.status === 429) {
          throw new RateLimitError('CodeChef rate limit hit', 30000);
        }

        if (response.status === 404) {
          throw new PlatformError(Platform.CODECHEF, 'User not found', undefined, 404);
        }

        if (!response.ok) {
          throw new PlatformError(Platform.CODECHEF, `HTTP ${response.status}: ${response.statusText}`, undefined, response.status);
        }

        return response.text();
      },
      {
        maxRetries: 2,
        initialDelayMs: 1500,
        maxDelayMs: 8000,
        backoffFactor: 2,
        shouldRetry: (error) => {
          if (error instanceof RateLimitError) return true;
          if (error instanceof PlatformError) return error.statusCode >= 500;
          return true;
        }
      }
    );
  }

  async getProfilePageData(username: string): Promise<CodeChefProfilePageData> {
    const url = `https://www.codechef.com/users/${username}`;
    const html = await this.fetchPage(url);

    return parseProfilePage(html, username);
  }
}

function parseProfilePage(html: string, username: string): CodeChefProfilePageData {
  const profile: CodeChefUserProfile = {
    username,
    name: extractMeta(html, 'og:title') ?? extractTextBetween(html, '<h1 itemprop="name">', '</h1>'),
    currentRating: null,
    highestRating: null,
    countryName: null,
    globalRank: null,
    countryRank: null,
    stars: null
  };

  const ratingMatch = html.match(/["']currentRating["']\s*[:=]\s*(\d+)/i)
    ?? html.match(/Rating\s*<\/[^>]+>\s*<[^>]+>\s*(\d+)/i)
    ?? html.match(/<div[^>]*class="[^"]*rating-number[^"]*"[^>]*>\s*(\d+)\s*<\/div>/i);

  if (ratingMatch?.[1]) {
    profile.currentRating = parseInt(ratingMatch[1], 10);
  }

  const highestMatch = html.match(/[Hh]ighest\s*[Rr]ating[^>]*>\s*(\d+)/i)
    ?? html.match(/["']highestRating["']\s*[:=]\s*(\d+)/i);

  if (highestMatch?.[1]) {
    profile.highestRating = parseInt(highestMatch[1], 10);
  }

  const globalRankMatch = html.match(/[Gg]lobal\s*[Rr]ank[^>]*>(?:[^<]*<[^>]+>)*[^<]*?(\d[\d,]*)/i);
  if (globalRankMatch?.[1]) {
    profile.globalRank = parseInt(globalRankMatch[1].replace(/,/g, ''), 10);
  }

  const countryMatch = html.match(/itemprop="addressCountry"[^>]*>([^<]+)</i)
    ?? html.match(/[Cc]ountry[^>]*>([A-Za-z ]{2,50})</i);
  if (countryMatch?.[1]) {
    profile.countryName = countryMatch[1].trim();
  }

  const starsMatch = html.match(/(\d)\s*[★*⭐]/)
    ?? html.match(/["']stars["']\s*[:=]\s*["']([^"']+)["']/i);
  if (starsMatch?.[1]) {
    profile.stars = starsMatch[1];
  }

  const recentSubmissions = parseRecentSubmissions(html, username);

  return { profile, recentSubmissions };
}

function parseRecentSubmissions(html: string, _username: string): CodeChefSubmission[] {
  const submissions: CodeChefSubmission[] = [];

  const tableMatch = html.match(/<table[^>]*class="[^"]*dataTable[^"]*"[^>]*>([\s\S]*?)<\/table>/i)
    ?? html.match(/Recent\s+Submissions[\s\S]{0,200}<table[^>]*>([\s\S]*?)<\/table>/i);

  if (!tableMatch?.[1]) return submissions;

  const rowMatches = tableMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);

  let idx = 0;
  for (const rowMatch of rowMatches) {
    const cells = [...rowMatch[1]!.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m =>
      m[1]!.replace(/<[^>]+>/g, '').trim()
    );
    if (cells.length < 3) continue;

    const problemCode = extractHref(rowMatch[1]!)?.split('/').pop() ?? cells[1] ?? `UNKNOWN-${idx}`;
    const result = cells[2] ?? '';
    const language = cells[3] ?? '';
    const date = cells[4] ?? '';

    submissions.push({
      id: `codechef-${_username}-${problemCode}-${idx}`,
      problemCode,
      problemName: cells[1] ?? problemCode,
      result,
      language,
      date
    });
    idx++;
  }

  return submissions;
}

function extractMeta(html: string, property: string): string | null {
  const match = html.match(new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']+)["']`, 'i'))
    ?? html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']${property}["']`, 'i'));
  return match?.[1] ?? null;
}

function extractTextBetween(html: string, start: string, end: string): string | null {
  const startIdx = html.indexOf(start);
  if (startIdx === -1) return null;
  const endIdx = html.indexOf(end, startIdx + start.length);
  if (endIdx === -1) return null;
  const raw = html.slice(startIdx + start.length, endIdx);
  return raw.replace(/<[^>]+>/g, '').trim() || null;
}

function extractHref(html: string): string | null {
  const match = html.match(/href=["']([^"']+)["']/i);
  return match?.[1] ?? null;
}
