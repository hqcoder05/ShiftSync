const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const output = path.resolve('output/animal-visibility-2026-11-02');
fs.mkdirSync(output, { recursive: true });
const animals = [
  ['rabbit', 'Thỏ', 'Yêu cầu của tôi'], ['deer', 'Hươu', 'Thời gian rảnh'],
  ['frog', 'Ếch', 'Chấm công'], ['tiger', 'Hổ', 'Chợ ca'],
  ['beaver', 'Hải ly', 'Trung tâm trợ giúp'], ['raccoon', 'Gấu mèo', 'Hoạt động của tôi'],
  ['fox', 'Cáo', 'Thông báo'],
];
const dateParts = new Map(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).map(part => [part.type, part.value]));
const today = `${dateParts.get('year')}-${dateParts.get('month')}-${dateParts.get('day')}`;

(async () => {
  const browser = await chromium.launch({ executablePath: path.resolve('qa-week2-2026-10-20/browsers/chromium-1248/chrome-win64/chrome.exe'), headless: true, args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
  const checks = [];
  try {
    for (const [width, height, reducedMotion] of [[390, 844, 'no-preference'], [320, 700, 'no-preference'], [320, 700, 'reduce']]) {
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion, geolocation: { latitude: 10.7769, longitude: 106.7009 }, permissions: ['geolocation'] });
      await context.addInitScript(() => { localStorage.setItem('accessToken', 'animal-fixture'); localStorage.setItem('userEmail', 'animal@example.invalid'); localStorage.setItem('userRole', 'STAFF'); });
      const shift = { id: 'animal-shift', shiftId: 'animal-shift', assignmentId: 'animal-assignment', staffId: 'staff-animals', storeId: 's1', storeName: 'Cửa hàng Đồng Đội', shiftDate: today, startTime: '00:00:00', endTime: '23:59:00', status: 'PUBLISHED', zoneName: 'Quầy pha chế', shiftAssignments: [{ id: 'animal-assignment', staffId: 'staff-animals', zoneName: 'Quầy pha chế' }] };
      let mutations = 0;
      await context.route('**/api/**', async route => {
        const request = route.request(), p = new URL(request.url()).pathname;
        const headers = { 'access-control-allow-origin': '*', 'access-control-allow-methods': '*', 'access-control-allow-headers': '*' };
        if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
        if (!['GET', 'HEAD'].includes(request.method())) mutations++;
        let data = [];
        if (p === '/api/users/me') data = { id: 'staff-animals', fullName: 'Minh Anh', email: 'animal@example.invalid', systemRole: 'STAFF', avatarId: 'mew' };
        else if (p.endsWith('/stores')) data = [{ id: 's1', storeId: 's1', name: 'Cửa hàng Đồng Đội', storeName: 'Cửa hàng Đồng Đội', status: 'ACTIVE' }];
        else if (p === '/api/stores/s1') data = { id: 's1', name: 'Cửa hàng Đồng Đội', latitude: 10.7769, longitude: 106.7009 };
        else if (p.endsWith('/configuration')) data = { geofenceRadiusM: 200 };
        else if (p.endsWith('/unread-count')) data = { unreadCount: 0 };
        else if (p.endsWith('/notifications/stream')) return route.fulfill({ headers, contentType: 'text/event-stream', body: 'event: connect\ndata: fixture\n\n' });
        else if (p === '/api/users/me/shifts' || p === '/api/stores/s1/shifts') data = [shift];
        else if (p === '/api/requests') data = [{ id: 'existing-request', requesterId: 'staff-animals', storeId: 's1', requestType: 'Yêu cầu hỗ trợ', typeCategory: 'support', status: 'PENDING', startDate: today, endDate: today, content: 'Yêu cầu đã có dữ liệu' }];
        else if (p.endsWith('/leave-requests/balances/my')) data = { year: 2026, remainingDays: 8, usedDays: 2, pendingDays: 1 };
        return route.fulfill({ headers, json: data });
      });
      const page = await context.newPage(), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('http://localhost:8085', { waitUntil: 'domcontentloaded', timeout: 120000 });
      const entry = page.getByTestId('animal-companion-entry');
      await entry.waitFor({ timeout: 60000 });
      await entry.scrollIntoViewIfNeeded();
      const closedCanvasCount = await page.locator('canvas').count();
      await page.screenshot({ path: path.join(output, `home-${width}-${reducedMotion}.png`) });
      await entry.click();
      const gallery = page.getByTestId('animal-companion-gallery');
      await gallery.waitFor();
      assert.equal(await gallery.locator('[data-testid^="animal-choice-"]').count(), 7);
      assert.equal(await gallery.locator('[data-testid^="animal-choice-"] img').evaluateAll(images => images.length === 7 && images.every(image => image.complete && image.naturalWidth > 0)), true, 'All seven animal previews are bundled and loaded');
      for (const [kind, name, screen] of animals) {
        await gallery.getByTestId(`animal-choice-${kind}`).click();
        await gallery.getByRole('button', { name: `Đến trang ${screen}`, exact: true }).waitFor();
        const scene = gallery.getByTestId(`${kind}-mascot`);
        await scene.waitFor();
        if (reducedMotion === 'reduce') assert.equal(await gallery.locator('canvas').count(), 0);
        else {
          const canvas = scene.locator('canvas');
          await canvas.waitFor();
          await page.waitForTimeout(450);
          assert.equal(await gallery.locator('canvas').count(), 1, 'Only the selected animal allocates live 3D');
          const before = await canvas.screenshot();
          await scene.hover(); await scene.click(); await page.waitForTimeout(400);
          const after = await canvas.screenshot();
          assert.equal(before.equals(after), false, `${name} moves and responds to interaction`);
        }
      }
      await page.screenshot({ path: path.join(output, `gallery-${width}-${reducedMotion}.png`) });
      await page.getByRole('button', { name: 'Đóng bộ bạn đồng hành', exact: true }).click();
      await gallery.waitFor({ state: 'hidden' });
      assert.equal(await page.locator('canvas').count(), closedCanvasCount, 'Closing the gallery disposes its live scene');
      const routesToCheck = width === 390 ? animals : animals.filter(([kind]) => ['rabbit', 'frog'].includes(kind));
      for (const [kind, name, screen] of routesToCheck) {
        await page.getByTestId('animal-companion-entry').click();
        await gallery.getByTestId(`animal-choice-${kind}`).click();
        await gallery.getByRole('button', { name: `Đến trang ${screen}`, exact: true }).click();
        await gallery.waitFor({ state: 'hidden' });
        await page.waitForTimeout(700);
        const id = kind === 'fox' ? 'notification-fox-mascot' : `${kind}-mascot`;
        const scene = page.getByTestId(id).last();
        await scene.waitFor({ timeout: 60000 });
        if (reducedMotion !== 'reduce') await scene.locator('canvas').waitFor();
        await scene.scrollIntoViewIfNeeded();
        if (kind === 'rabbit') {
          await page.getByText('Yêu cầu hỗ trợ', { exact: true }).first().waitFor();
          assert.equal(await page.getByText('Chưa có yêu cầu nào.', { exact: true }).count(), 0, 'Rabbit remains with existing requests');
        }
        if (kind === 'frog') await page.getByRole('button', { name: 'Bắt đầu ca, chụp ảnh vào ca', exact: true }).waitFor();
        await page.screenshot({ path: path.join(output, `${kind}-page-${width}-${reducedMotion}.png`) });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
        if (kind === 'frog') await page.getByRole('button', { name: 'Quay lại lịch làm', exact: true }).click();
        if (kind === 'fox') await page.getByRole('button', { name: 'Đóng thông báo', exact: true }).click();
        else await page.getByRole('tab', { name: 'Trang chủ', exact: true }).click();
        await page.getByTestId('animal-companion-entry').waitFor();
      }
      assert.deepEqual(errors, []);
      assert.equal(mutations, 0, 'Viewing animals and navigating makes no API mutations');
      checks.push(`${width}x${height} ${reducedMotion}: all 7 visible/selectable, motion preference, scene cleanup, page navigation and animals with real data, no overflow/runtime errors/API writes`);
      console.log('PASS', checks.at(-1));
      await context.close();
    }
    fs.writeFileSync(path.join(output, 'checks.json'), JSON.stringify({ result: 'PASS', evidence: 'Web Chromium fixtures with an assigned shift and existing request; not a physical device test.', checks }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
