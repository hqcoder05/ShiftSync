// Presentation only: API/cache values and notification routing keep their raw text.
// Construct property escapes at runtime so older JS engines can use the fallback.
let pictographs;
try {
  pictographs = new RegExp('[\\p{Extended_Pictographic}\\p{Regional_Indicator}\\p{Emoji_Modifier}]', 'gu');
} catch {
  pictographs = /[\u{1F000}-\u{1FAFF}\u2600-\u27BF\u231A-\u231B\u2328\u23CF\u23E9-\u23F3\u23F8-\u23FA\u2B05-\u2B07\u2B1B-\u2B1C\u2B50\u2B55\u2194-\u2199\u21A9-\u21AA\u3030\u303D\u3297\u3299\u00A9\u00AE\u203C\u2049\u2122\u2139\u24C2\u25AA-\u25AB\u25B6\u25C0\u25FB-\u25FE]/gu;
}

export function cleanNotificationText(value) {
  if (typeof value !== 'string') return '';
  return value
    // Keep the numeric meaning of keycaps while dropping their emoji rendering.
    .replace(/([0-9#*])\uFE0F?\u20E3/g, '$1')
    .replace(/[©®™]\uFE0F/g, ' ')
    .replace(pictographs, symbol => /[©®™]/.test(symbol) ? symbol : ' ')
    .replace(/[\u200D\uFE0E\uFE0F\u20E3\u{E0020}-\u{E007F}]/gu, '')
    .split(/\r?\n/)
    .map(line => line.replace(/[ \t\u00A0]+/g, ' ').replace(/ +([,.;:!?])/g, '$1').trim())
    .join('\n')
    .trim();
}

const legacyTranslations = new Map([
  ['attendance adjustment approved', 'Yêu cầu điều chỉnh chấm công đã được duyệt'],
  ['your attendance adjustment request has been approved.', 'Yêu cầu điều chỉnh chấm công của bạn đã được duyệt.'],
]);

// Old notifications remain in the database after the server switches to Vietnamese.
// Translate known legacy copy at display time without mutating cached/API data.
export function displayNotificationText(value) {
  const cleaned = cleanNotificationText(value);
  return legacyTranslations.get(cleaned.toLowerCase()) || cleaned;
}
