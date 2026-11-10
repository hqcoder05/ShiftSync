const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const output = path.resolve('output/costume-avatars-2026-11-02');
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ executablePath: path.resolve('qa-week2-2026-10-20/browsers/chromium-1248/chrome-win64/chrome.exe'), headless: true, args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.addInitScript(() => {
      localStorage.setItem('accessToken', 'avatar-interaction-fixture');
      localStorage.setItem('userEmail', 'avatar@example.invalid');
      localStorage.setItem('userRole', 'STAFF');
      const realNow = performance.now.bind(performance);
      window.__realAvatarNow = realNow;
      Object.defineProperty(performance, 'now', { configurable: true, value: () => window.__freezeAvatarClock ?? realNow() });
    });
    await context.route('**/api/**', route => {
      const p = new URL(route.request().url()).pathname;
      const headers = { 'access-control-allow-origin': '*', 'access-control-allow-methods': '*', 'access-control-allow-headers': '*' };
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
      let data = [];
      if (p === '/api/users/me') data = { id: 'avatar-fixture', email: 'avatar@example.invalid', fullName: 'Nhân vật thử nghiệm', avatarId: 'mew', systemRole: 'STAFF' };
      else if (p.endsWith('/stores')) data = [{ id: 's1', storeId: 's1', storeName: 'Cửa hàng', status: 'ACTIVE' }];
      else if (p.endsWith('/unread-count')) data = { unreadCount: 0 };
      else if (p.endsWith('/notifications/stream')) return route.fulfill({ headers, contentType: 'text/event-stream', body: 'event: connect\ndata: fixture\n\n' });
      return route.fulfill({ headers, json: data });
    });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(process.env.GRAPHIC_AVATAR_TEST_URL || 'http://localhost:8085', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.getByRole('button', { name: 'Mở hồ sơ cá nhân', exact: true }).waitFor({ timeout: 60000 });
    await page.getByRole('button', { name: 'Mở hồ sơ cá nhân', exact: true }).click();
    await page.getByRole('button', { name: 'Đổi ảnh đại diện', exact: true }).waitFor();
    const avatar = page.getByLabel('Ảnh đại diện nhân vật 3D', { exact: true }).filter({ has: page.locator('canvas') }).last();
    const canvas = avatar.locator('canvas');
    await canvas.waitFor();
    await page.waitForFunction(element => {
      for (let n = element; n && n.nodeType === 1; n = n.parentElement) if (Number(getComputedStyle(n).opacity) < 0.99) return false;
      return true;
    }, await canvas.elementHandle());
    await avatar.hover();
    await page.waitForTimeout(700);
    // Keep the 3D clock fixed: a left/right image difference now comes from
    // actual pointer tracking rather than the avatar's normal idle movement.
    await page.evaluate(() => { window.__freezeAvatarClock = window.__realAvatarNow(); });
    await page.waitForTimeout(100);
    const bounds = await avatar.boundingBox();
    await page.mouse.move(bounds.x + bounds.width * 0.15, bounds.y + bounds.height * 0.45);
    await page.waitForTimeout(150);
    const left = await canvas.screenshot({ path: path.join(output, 'live-look-left.png') });
    await page.mouse.move(bounds.x + bounds.width * 0.85, bounds.y + bounds.height * 0.45);
    await page.waitForTimeout(150);
    const right = await canvas.screenshot({ path: path.join(output, 'live-look-right.png') });
    assert.equal(left.equals(right), false, 'Live hover must change the avatar at the same 3D clock time');
    await page.evaluate(() => { delete window.__freezeAvatarClock; });
    // An avatar is passive artwork inside the existing edit button.
    assert.equal(await avatar.locator('[role="button"]').count(), 0);
    await page.getByRole('button', { name: 'Đổi ảnh đại diện', exact: true }).focus();
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: 'Đóng chọn ảnh đại diện', exact: true }).waitFor();
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(output, 'live-checks.json'), JSON.stringify({ result: 'PASS', checks: ['Pointer positions change the live portrait at a fixed animation clock', 'No nested buttons', 'Existing profile avatar button opens the picker with Enter', 'No runtime errors'] }, null, 2));
    console.log('PASS: live avatar hover tracking and keyboard edit button.');
    await context.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
