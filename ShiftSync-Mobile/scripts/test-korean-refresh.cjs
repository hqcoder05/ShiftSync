const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { transformSync } = require('@babel/core');
const { chromium } = require('playwright');
const out = path.resolve(process.env.UI_REFRESH_OUTPUT || 'output/low-poly-korean-2026-11-02');
fs.mkdirSync(out, { recursive: true });
const moduleCode = transformSync(fs.readFileSync('utils/displayText.js', 'utf8'), { configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code;
const moduleScope = { exports: {} };
vm.runInNewContext(moduleCode, { module: moduleScope, exports: moduleScope.exports });
const { readableText } = moduleScope.exports;
const mojibake = value => new TextDecoder('windows-1252').decode(new TextEncoder().encode(value));
for (const value of ['Nguyễn Minh Anh', '123 Hai Bà Trưng, Phường Bến Nghé, Quận 1', 'Cửa hàng Đồng Đội']) {
  assert.equal(readableText(mojibake(value)), value);
  assert.equal(readableText(value), value);
}
assert.equal(readableText('Nguy?n Minh Anh'), 'Nguy?n Minh Anh', 'Lost characters are never guessed');
assert.equal(readableText('Andre\u0301'), 'André', 'NFC keeps combining accents readable');

(async () => {
  const browser = await chromium.launch({ executablePath: path.resolve('qa-week2-2026-10-20/browsers/chromium-1248/chrome-win64/chrome.exe'), headless: true, args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
  const checks = ['UTF-8 mojibake recovery, intact Unicode and literal question marks preserved'];
  try {
    for (const width of [390, 320]) {
      let avatarId = 'mew', fullName = 'Nguyễn Minh Anh', savedAvatar = null;
      const context = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: 'reduce' });
      await context.addInitScript(() => { localStorage.setItem('accessToken', 'refresh-fixture'); localStorage.setItem('userEmail', 'refresh@example.invalid'); localStorage.setItem('userRole', 'STAFF'); });
      await context.route('**/api/**', async route => {
        const request = route.request(), p = new URL(request.url()).pathname;
        const headers = { 'access-control-allow-origin': '*', 'access-control-allow-methods': '*', 'access-control-allow-headers': '*' };
        if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
        let data = [];
        if (p === '/api/users/me') data = { id: 'refresh-staff', email: 'refresh@example.invalid', fullName: mojibake(fullName), systemRole: 'STAFF', avatarId, phone: '0912345678', birthDate: '2001-01-20', birthPlace: 'TP. Hồ Chí Minh', gender: 'FEMALE' };
        else if (p.endsWith('/me/avatar')) { savedAvatar = request.postDataJSON().avatarId; avatarId = savedAvatar; data = { id: 'refresh-staff', avatarId }; }
        else if (p.endsWith('/stores')) data = [{ id: 's1', storeId: 's1', name: 'Highlands Coffee · Flagship', address: mojibake('123 Hai Bà Trưng, Phường Bến Nghé, Quận 1'), status: 'ACTIVE', skillName: 'Pha chế' }];
        else if (p.endsWith('/unread-count')) data = { unreadCount: 0 };
        else if (p.endsWith('/notifications/stream')) return route.fulfill({ headers, contentType: 'text/event-stream', body: 'event: connect\ndata: fixture\n\n' });
        return route.fulfill({ headers, json: data });
      });
      const page = await context.newPage(), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('http://localhost:8085', { waitUntil: 'domcontentloaded', timeout: 120000 });
      await page.getByRole('button', { name: 'Mở hồ sơ cá nhân', exact: true }).waitFor({ timeout: 60000 });
      await page.getByText('Nguyễn Minh Anh', { exact: true }).last().waitFor();
      await page.screenshot({ path: path.join(out, `dashboard-${width}.png`) });
      await page.getByRole('button', { name: 'Mở hồ sơ cá nhân', exact: true }).click();
      await page.getByRole('button', { name: 'Đổi ảnh đại diện', exact: true }).waitFor({ timeout: 60000 });
      await page.getByText('Nguyễn Minh Anh', { exact: true }).last().waitFor().catch(async error => {
        await page.screenshot({ path: path.join(out, `profile-failure-${width}.png`) });
        console.log('Profile failure state:', (await page.locator('body').innerText()).slice(-2400), errors);
        throw error;
      });
      assert.equal(await page.getByText('123 Hai Bà Trưng, Phường Bến Nghé, Quận 1', { exact: true }).count(), 1);
      assert.equal(await page.getByText('Nữ', { exact: true }).count(), 1);
      assert.equal(await page.getByText('20/01/2001', { exact: true }).count(), 1);
      await page.screenshot({ path: path.join(out, `profile-${width}.png`) });
      await page.getByRole('button', { name: 'Đổi ảnh đại diện', exact: true }).click();
      await page.getByRole('button', { name: 'Đóng chọn ảnh đại diện', exact: true }).waitFor();
      await page.getByText('20 nhân vật', { exact: true }).waitFor();
      await page.getByRole('radio', { name: 'Ảnh đại diện Cá Mập', exact: true }).click();
      await page.getByRole('button', { name: 'Dùng ảnh đại diện Cá Mập', exact: true }).waitFor();
      await page.screenshot({ path: path.join(out, `avatar-picker-${width}.png`) });
      await page.getByRole('button', { name: 'Dùng ảnh đại diện Cá Mập', exact: true }).click();
      await page.waitForFunction(() => !document.querySelector('[role="dialog"]'));
      await page.getByText('Đã đồng bộ', { exact: true }).waitFor();
      assert.equal(savedAvatar, 'alex', 'Chosen avatar is written to the real API contract');
      assert.equal(await page.locator('canvas').count(), 0, 'Reduced motion uses static matching portraits');
      // A new manager-provided name must appear after returning to the profile.
      await page.getByRole('tab', { name: 'Trang chủ', exact: true }).click();
      fullName = 'Nguyễn Minh Anh · Cập nhật';
      await page.getByRole('button', { name: 'Mở hồ sơ cá nhân', exact: true }).click();
      await page.getByText(fullName, { exact: true }).last().waitFor();
      await page.getByRole('button', { name: 'Đổi ảnh đại diện', exact: true }).click();
      await page.getByRole('radio', { name: 'Ảnh đại diện Cá Mập, đang sử dụng', exact: true }).waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      assert.deepEqual(errors, [], 'No runtime errors');
      checks.push(`${width}px: manager Unicode data, actual profile values, picker save/persistence, focus refresh, reduced motion, no horizontal overflow`);
      await context.close();
    }
    fs.writeFileSync(path.join(out, 'profile-checks.json'), JSON.stringify({ result: 'PASS', checks }, null, 2));
    console.log(checks.join('\n'));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
