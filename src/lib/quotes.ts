/**
 * Literal quote matching. No fuzzy matching, no regular expressions built
 * from untrusted text, and no invented positions: a quote is either found
 * character-for-character or it is not.
 */

export interface QuoteMatch {
  start: number;
  end: number;
}

const WRAPPING_QUOTES = /^["'“”‘’]+|["'“”‘’]+$/g;

/** Strip whitespace and quotation marks a model may wrap around a quote. */
export function cleanQuote(quote: string): string {
  return quote.trim().replace(WRAPPING_QUOTES, "").trim();
}

/** Position of the first exact occurrence of `quote` in `brief`, or null. */
export function findQuote(brief: string, quote: string): QuoteMatch | null {
  if (quote.length === 0) return null;
  const start = brief.indexOf(quote);
  if (start === -1) return null;
  return { start, end: start + quote.length };
}

/**
 * Resolve a quote supplied by the analysis. Tries the text as given, then
 * with wrapping quotation marks removed. Returns the text to display and
 * whether it was found word-for-word.
 */
export function verifyQuote(
  brief: string,
  quote: string,
): { text: string; verified: boolean } {
  const trimmed = quote.trim();
  if (findQuote(brief, trimmed)) return { text: trimmed, verified: true };
  const cleaned = cleanQuote(quote);
  if (findQuote(brief, cleaned)) return { text: cleaned, verified: true };
  return { text: trimmed, verified: false };
}
