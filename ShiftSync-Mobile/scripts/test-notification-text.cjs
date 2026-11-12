const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { transformSync } = require('@babel/core');

const source = transformSync(fs.readFileSync('utils/notificationText.js', 'utf8'), {
  configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'],
}).code;
function load(forceFallback = false) {
  const m = { exports: {} };
  class LegacyRegExp extends RegExp {
    constructor(pattern, flags) {
      if (String(pattern).includes('\\p{')) throw new SyntaxError('Unicode properties unavailable');
      super(pattern, flags);
    }
  }
  vm.runInNewContext(source, { module: m, exports: m.exports, RegExp: forceFallback ? LegacyRegExp : RegExp });
  return m.exports;
}
const cases = [
  ['✅ Bạn đã được phân công ca', 'Bạn đã được phân công ca'],
  ['📅 Lịch làm mới tại chi nhánh 🏡', 'Lịch làm mới tại chi nhánh'],
  ['💸 Phiếu lương: 5.305.000 đ / 45.000 ₫ mỗi giờ.', 'Phiếu lương: 5.305.000 đ / 45.000 ₫ mỗi giờ.'],
  ['👨‍👩‍👧‍👦 Cùng đội ngũ 👩🏽‍💻 nhận ca 👍🏽', 'Cùng đội ngũ nhận ca'],
  ['🇻🇳 Hệ thống 🇰🇷', 'Hệ thống'],
  ['Ca 1️⃣ lúc 08:00 → 16:30 ngày 02/11/2026', 'Ca 1 lúc 08:00 → 16:30 ngày 02/11/2026'],
  ['🎉 Chúc mừng🎉!', 'Chúc mừng!'],
  ['Lịch📅ca mới', 'Lịch ca mới'],
  ['✅ Dòng thứ nhất\r\n\r\n📅 Dòng thứ hai: 08:00–16:30.', 'Dòng thứ nhất\n\nDòng thứ hai: 08:00–16:30.'],
  ['Nghỉ phép (đã duyệt), số ngày: 2 • Cửa hàng A/B & C — 100%.', 'Nghỉ phép (đã duyệt), số ngày: 2 • Cửa hàng A/B & C — 100%.'],
  ['© ShiftSync ® ™ | giá: 50.000đ', '© ShiftSync ® ™ | giá: 50.000đ'],
  ['©️ ®️ ™️', ''],
  ['🏴\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F} Tin mới', 'Tin mới'],
  ['✅ 📅 💸 👩🏽‍💻 🇻🇳', ''],
  ['', ''], [null, ''], [undefined, ''], [123, ''],
];
for (const mode of [false, true]) {
  const { cleanNotificationText: clean, displayNotificationText: display } = load(mode);
  for (const [input, expected] of cases) assert.equal(clean(input), expected, `${mode ? 'fallback' : 'Unicode'}: ${input}`);
  assert.equal(display('Attendance Adjustment Approved'), 'Yêu cầu điều chỉnh chấm công đã được duyệt');
  assert.equal(display('Your attendance adjustment request has been approved.'), 'Yêu cầu điều chỉnh chấm công của bạn đã được duyệt.');
  const raw = Object.freeze({ title: '✅ Lịch làm mới', message: '📅 Ca 08:00–16:30' });
  clean(raw.title); clean(raw.message);
  assert.deepEqual(raw, { title: '✅ Lịch làm mới', message: '📅 Ca 08:00–16:30' });
}
console.log(`PASS ${cases.length * 2 + 2} notification display-text checks (Unicode + fallback engines)`);
