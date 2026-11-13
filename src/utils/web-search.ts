import { GroundingSource } from '../ai/types.js';

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

/**
 * Perform a live web search to retrieve real-time facts and sources.
 * Acts as a reliable fallback when official API search grounding hits quota limits.
 */
export async function searchWebLive(query: string, maxResults = 5): Promise<{
  results: WebSearchResult[];
  sources: GroundingSource[];
  summaryText: string;
}> {
  try {
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'vi,en;q=0.9',
      },
    });

    if (!res.ok) {
      return { results: [], sources: [], summaryText: '' };
    }

    const html = await res.text();
    const resultBlocks = html.split(/<div class="result results_links/);
    const results: WebSearchResult[] = [];
    const sources: GroundingSource[] = [];

    for (const block of resultBlocks.slice(1, maxResults + 1)) {
      const titleMatch = block.match(
        /<h2 class="result__title">[\s\S]*?<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/
      );
      const snippetMatch = block.match(/<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);

      if (titleMatch && snippetMatch) {
        let url = titleMatch[1];
        if (url.includes('uddg=')) {
          const u = url.match(/uddg=([^&]+)/);
          if (u) url = decodeURIComponent(u[1]);
        }
        if (url.startsWith('//')) {
          url = `https:${url}`;
        }

        const title = titleMatch[2].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim();
        const snippet = snippetMatch[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim();

        if (title && snippet) {
          results.push({ title, url, snippet });
          sources.push({ title, uri: url });
        }
      }
    }

    if (results.length === 0) {
      return { results: [], sources: [], summaryText: '' };
    }

    const summaryText = results
      .map(
        (r, i) =>
          `[Nguồn ${i + 1}]: ${r.title}\nĐường dẫn: ${r.url}\nNội dung tóm tắt: ${r.snippet}`
      )
      .join('\n\n');

    return { results, sources, summaryText };
  } catch (error) {
    console.warn('[web-search] Lỗi tra cứu web live:', error);
    return { results: [], sources: [], summaryText: '' };
  }
}
