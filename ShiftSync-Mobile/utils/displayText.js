// Recover UTF-8 text that was read as Windows-1252. Never guess missing '?' letters.
const WINDOWS_1252 = '€\u0081‚ƒ„…†‡ˆ‰Š‹Œ\u008dŽ\u008f\u0090‘’“”•–—˜™š›œ\u009džŸ';
const brokenUtf8 = /(?:Ã.|Â.|Ä.|Æ.|á[º»]|â[€€™œš]|ðŸ)/;

export function readableText(value) {
  if (typeof value !== 'string') return value;
  const repair = token => {
    if (!brokenUtf8.test(token)) return token;
    const bytes = [];
    for (const char of token) {
      const code = char.codePointAt(0);
      const mapped = WINDOWS_1252.indexOf(char);
      if (code <= 255) bytes.push(code);
      else if (mapped >= 0) bytes.push(128 + mapped);
      else return token;
    }
    try {
      const decoded = decodeURIComponent(bytes.map(byte => `%${byte.toString(16).padStart(2, '0')}`).join(''));
      return decoded.includes('\uFFFD') ? token : decoded;
    } catch { return token; }
  };
  // A mojibake sequence may contain NBSP (the final byte in 'à'); retain it.
  return value.split(/([ \t\r\n]+)/).map(repair).join('').normalize('NFC');
}

const displayFields = new Set(['fullName', 'name', 'storeName', 'storeAddress', 'address', 'birthPlace', 'skillName']);
export function readableProfile(data) {
  if (Array.isArray(data)) return data.map(readableProfile);
  if (!data || typeof data !== 'object') return data;
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key,
    displayFields.has(key) ? readableText(value) : value && typeof value === 'object' ? readableProfile(value) : value]));
}
