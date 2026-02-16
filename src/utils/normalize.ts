/**
 * Normalize text for comparison:
 * - lowercase
 * - remove punctuation
 * - remove articles (a/an/the)
 * - collapse whitespace
 * - trim
 */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // remove punctuation
    .replace(/\b(a|an|the)\b/g, '') // remove articles
    .replace(/\s+/g, ' ') // collapse whitespace
    .trim();
}

/**
 * Tokenize normalized text into words
 */
export function tokenize(text: string): string[] {
  return normalize(text).split(' ').filter(Boolean);
}

/**
 * Calculate match ratio between two texts using token overlap.
 * Returns a value between 0 and 1.
 */
export function matchScore(target: string, spoken: string): number {
  const targetTokens = tokenize(target);
  const spokenTokens = tokenize(spoken);

  if (targetTokens.length === 0) return 0;

  let matched = 0;
  const spokenSet = new Set(spokenTokens);

  for (const token of targetTokens) {
    if (spokenSet.has(token)) {
      matched++;
    }
  }

  return matched / targetTokens.length;
}

/**
 * Check if spoken text matches target for voice mode (≥ 0.8 threshold)
 */
export function isVoiceMatch(target: string, spoken: string): boolean {
  return matchScore(target, spoken) >= 0.8;
}

/**
 * Check if typed text matches target for typing mode (≥ 0.9 threshold)
 */
export function isTypingMatch(target: string, typed: string): boolean {
  return matchScore(target, typed) >= 0.9;
}
