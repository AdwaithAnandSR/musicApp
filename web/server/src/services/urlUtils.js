/**
 * Parses and normalizes URL inputs into an array of clean URL strings.
 * Supports:
 * - Array of strings: ['url1', 'url2']
 * - Single string URL: 'https://youtube.com/watch?v=xxx'
 * - Stringified JSON array: '["url1", "url2"]'
 * - Unquoted bracket array: '[url1, url2]'
 * - Comma, newline, or whitespace separated URLs: 'url1, url2'
 */
function parseUrls(input) {
  if (!input) return [];

  if (Array.isArray(input)) {
    return input
      .flatMap(item => parseUrls(item))
      .filter(u => typeof u === 'string' && u.trim().length > 0);
  }

  if (typeof input !== 'string') {
    return [];
  }

  let str = input.trim();
  if (!str) return [];

  // Try parsing JSON array
  if (str.startsWith('[') && str.endsWith(']')) {
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed)) {
        return parsed
          .map(item => String(item).trim().replace(/^['"]|['"]$/g, ''))
          .filter(u => u.length > 0);
      }
    } catch (e) {
      // Strip brackets if JSON parsing failed (e.g. unquoted array like [url1, url2])
      str = str.slice(1, -1).trim();
    }
  }

  // Split by newlines, commas, or multiple spaces
  const rawItems = str.split(/[\n\r,]+/);
  const result = [];

  for (let raw of rawItems) {
    let cleaned = raw.trim().replace(/^['"]|['"]$/g, '');
    if (!cleaned) continue;

    if (cleaned.includes(' ') && !cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
      const spaceSplit = cleaned.split(/\s+/);
      for (let s of spaceSplit) {
        let sc = s.trim().replace(/^['"]|['"]$/g, '');
        if (sc) result.push(sc);
      }
    } else {
      result.push(cleaned);
    }
  }

  return result;
}

module.exports = {
  parseUrls
};
