// ========== FILE: src/utils/sanitize.js ==========
/**
 * Sanitize a string by trimming, removing null bytes, collapsing spaces, and enforcing length.
 */
const sanitizeString = (str, maxLength = 1000) => {
  if (typeof str !== 'string') return str;
  let clean = str.trim().replace(/\x00/g, '').replace(/\s+/g, ' ');
  if (clean.length > maxLength) {
    clean = clean.substring(0, maxLength);
  }
  return clean;
};

/**
 * Sanitize an object based on rules mapping.
 */
const sanitizeObject = (obj, rules) => {
  if (typeof obj !== 'object' || obj === null) return obj;
  const cleanObj = {};
  for (const [key, rule] of Object.entries(rules)) {
    if (obj[key] !== undefined) {
      let val = obj[key];
      if (typeof val === 'string') {
        if (rule.trim !== false) val = val.trim();
        if (!rule.allowHtml) val = val.replace(/<[^>]*>?/gm, ''); // simple strip tags
        if (rule.maxLength && val.length > rule.maxLength) {
          val = val.substring(0, rule.maxLength);
        }
      }
      cleanObj[key] = val;
    }
  }
  return cleanObj;
};

/**
 * Sanitize a search query string for safe processing.
 */
const sanitizeSearchQuery = (query) => {
  if (typeof query !== 'string') return '';
  let clean = query.replace(/[.*+?^${}()|[\]\\]/g, ''); // remove regex chars
  clean = clean.replace(/--|\/\*/g, ''); // remove SQL comment markers
  return clean.trim().toLowerCase().substring(0, 100);
};

/**
 * Escape % and _ for PostgreSQL LIKE/ILIKE queries.
 */
const escapeForLike = (str) => {
  if (typeof str !== 'string') return str;
  return str.replace(/[%_]/g, '\\$&');
};

module.exports = {
  sanitizeString,
  sanitizeObject,
  sanitizeSearchQuery,
  escapeForLike,
};
// ========== END ==========
