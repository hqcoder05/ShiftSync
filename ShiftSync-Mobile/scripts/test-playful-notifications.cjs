const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const root = process.cwd();
const base = process.env.MASCOT_TEST_URL || 'http://localhost:8085';
const output = path.resolve(process.env.UI_REFRESH_OUTPUT || 'output/playful-notifications-2026-11-01');
fs.mkdirSync(output, { recursive: true });
const report = { evidence: 'Chromium/software WebGL with intercepted API fixtures; not a physical Android/iOS or operating-system push-permission test.', checks: [] };
let currentPage;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const deferred = () => { let release; const promise = new Promise(resolve => { release = resolve; }); return { promise, release }; };

async function fixture(context, options = {}) {
  await context.addInitScript(() => {
    localStorage.setItem('accessToken', 'playful-fixture');
    localStorage.setItem('userEmail', 'playful@example.invalid');
    localStorage.setItem('userRole', 'STAFF');
  });
  const state = {
    read: false, empty: !!options.empty, listError: !!options.listError,
    failMarkAll: false, failPreference: false, preferenceMode: 'ok', gate: deferred(),
    preferenceGets: 0, preferenceWrites: [], markAllCalls: 0,
    preferences: [
      { notificationType: 'SCHEDULE_PUBLISHED', enabled: true },
      { notificationType: 'SHIFT_SWAP_UPDATED', enabled: false },
      { notificationType: 'PAYROLL_COMPLETED', enabled: true },
    ],
  };
  await context.route('**/api/**', async route => {
    const request = route.request(), pathname = new URL(request.url()).pathname;
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-methods': '*', 'access-control-allow-headers': '*' };
    const fulfill = data => route.fulfill({ headers, json: data });
    const fail = message => route.fulfill({ status: 500, headers, json: { message } });
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (pathname.endsWith('/notification-preferences')) {
      if (request.method() === 'GET') {
        state.preferenceGets += 1;
        const mode = state.preferenceMode;
        if (mode === 'hold') await state.gate.promise;
        if (mode === 'error') return fail('Không tải được tùy chọn thử nghiệm.');
        return fulfill(state.preferences);
      }
      const payload = request.postDataJSON();
      state.preferenceWrites.push(payload);
      await pause(120);
      if (state.failPreference) { state.failPreference = false; return fail('Không lưu được tùy chọn thử nghiệm.'); }
      state.preferences = state.preferences.map(item => item.notificationType === payload.notificationType ? { ...item, enabled: payload.enabled } : item);
      return fulfill(payload);
    }
    if (pathname.endsWith('/notifications/read-all')) {
      state.markAllCalls += 1;
      if (state.failMarkAll) return fail('Không đánh dấu được thông báo thử nghiệm.');
      state.read = true; return fulfill({});
    }
    if (/\/notifications\/[^/]+\/read$/.test(pathname)) return fulfill({});
    if (pathname.endsWith('/notifications/stream')) return route.fulfill({ headers, contentType: 'text/event-stream', body: 'event: connect\ndata: fixture\n\n' });
    if (pathname.endsWith('/notifications')) {
      if (state.listError) return fail('Không tải được danh sách thông báo thử nghiệm.');
      return fulfill(state.empty ? [] : [
        { id: 'notification-unread', title: '✅ Ca làm mới của bạn', message: '📅 Quản lý đã cập nhật lịch làm 08:00–16:30 tại Cửa hàng Đồng Đội.', type: 'SCHEDULE_PUBLISHED', read: state.read, createdAt: new Date().toISOString() },
        { id: 'notification-read', title: '💸 Phiếu lương đã sẵn sàng', message: 'Bạn có thể xem chi tiết kỳ lương 5.305.000 đ vừa phát hành.', type: 'PAYROLL_COMPLETED', read: true, createdAt: new Date(Date.now() - 86400000).toISOString() },
      ]);
    }
    if (pathname.endsWith('/messaging/unread-count')) return fulfill({ unreadCount: 0 });
    if (pathname.endsWith('/unread-count')) return fulfill({ unreadCount: state.empty || state.read ? 0 : 1 });
    if (pathname === '/api/users/me') return fulfill({ id: 'staff-playful', email: 'playful@example.invalid', fullName: 'Minh Anh', systemRole: 'STAFF', avatarId: 'mew' });
    if (pathname.endsWith('/stores')) return fulfill([{ id: 's1', storeId: 's1', name: 'Cửa hàng Đồng Đội', storeName: 'Cửa hàng Đồng Đội', status: 'ACTIVE' }]);
    if (pathname === '/api/stores/s1') return fulfill({ id: 's1', name: 'Cửa hàng Đồng Đội' });
    if (pathname.endsWith('/configuration')) return fulfill({ geofenceRadiusM: 200 });
    return fulfill([]);
  });
  return state;
}

async function openNotifications(page) {
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.getByRole('button', { name: 'Xem thông báo', exact: true }).waitFor({ timeout: 60000 });
  await page.getByRole('button', { name: 'Xem thông báo', exact: true }).click();
  await page.getByRole('button', { name: 'Cài đặt thông báo', exact: true }).waitFor({ timeout: 60000 });
}
async function assertSwitch(page, locator, checked) {
  await locator.waitFor();
  await page.waitForFunction(({ element, value }) => {
    const actual = element.getAttribute('aria-checked');
    return actual == null ? element.checked === value : actual === String(value);
  }, { element: await locator.elementHandle(), value: checked }, { timeout: 10000 });
}
async function assertNoOverflow(page, label) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, label + ': no page width overflow');
}
async function waitForInlinePreview(page, scope) {
  await page.waitForFunction(element => [...element.querySelectorAll('img')].some(image => image.complete && image.naturalWidth > 0 && image.currentSrc.startsWith('data:image/')), await scope.elementHandle(), { timeout: 30000 });
}
async function waitForHero(page) {
  const hero = page.getByTestId('notification-companion-hero').last();
  await hero.waitFor({ timeout: 60000 });
  await hero.scrollIntoViewIfNeeded();
  return hero;
}

async function notificationChecks(browser, width, height) {
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: true, reducedMotion: 'no-preference' });
  try {
    const state = await fixture(context);
    const page = await context.newPage(), errors = [];
    currentPage = page;
    page.on('pageerror', error => errors.push(error.message));
    await openNotifications(page);
    await page.getByText('Chưa đọc (1)', { exact: true }).waitFor();
    const hero = await waitForHero(page);
    const entry = page.getByRole('button').filter({ hasText: 'Ca làm mới của bạn' }).last();
    await entry.waitFor();
    assert.equal(await entry.locator('svg,img').count(), 0, 'Individual notification entry remains icon-free');
    const displayedNotification = await entry.innerText();
    assert.ok(!/[✅📅💸]/u.test(displayedNotification), 'Emoji from backend strings are removed from the displayed notification');
    assert.ok(displayedNotification.includes('08:00–16:30'), 'Notification time remains intact');
    const fox = hero.getByTestId('peek-fox-mascot');
    const foxBox = await fox.boundingBox(), heroBox = await hero.boundingBox();
    assert.ok(foxBox && heroBox && foxBox.width >= 160, 'Notification fox is larger');
    assert.ok(Math.abs(foxBox.x + foxBox.width / 2 - heroBox.x - heroBox.width / 2) < 2, 'Notification fox is centered on its card');
    await assertNoOverflow(page, `${width}px notification list`);
    await page.screenshot({ path: path.join(output, `notification-list-${width}.png`) });

    state.preferenceMode = 'hold';
    await page.getByRole('button', { name: 'Cài đặt thông báo', exact: true }).click();
    const modal = page.getByTestId('notification-settings-modal').last();
    await modal.waitFor();
    await modal.getByRole('heading', { name: 'Cài đặt thông báo', exact: true }).waitFor();
    await modal.getByTestId('notification-settings-loading').waitFor();
    await page.screenshot({ path: path.join(output, `notification-settings-loading-${width}.png`) });
    state.preferenceMode = 'ok'; state.gate.release();
    const schedule = modal.getByRole('switch', { name: 'Thông báo lịch làm', exact: true });
    await assertSwitch(page, schedule, true);
    const reminder = modal.getByRole('switch', { name: 'Nhắc ca trước 60 và 30 phút', exact: true });
    assert.equal(await reminder.isDisabled(), true, 'Web local reminders are accurately disabled');
    assert.equal(await modal.getByText('SCHEDULE_PUBLISHED', { exact: true }).count(), 0, 'Raw server enums are replaced with readable labels');
    await assertNoOverflow(page, `${width}px settings`);
    const cardBox = await modal.boundingBox();
    assert.ok(cardBox && cardBox.width <= width && cardBox.height <= height, 'Settings modal fits the viewport');
    await page.screenshot({ path: path.join(output, `notification-settings-${width}.png`) });

    await schedule.click();
    await assertSwitch(page, schedule, false);
    assert.deepEqual(state.preferenceWrites.at(-1), { notificationType: 'SCHEDULE_PUBLISHED', enabled: false });
    state.failPreference = true;
    const failedWrite = page.waitForResponse(response => response.url().endsWith('/notification-preferences') && response.request().method() === 'PUT' && response.status() === 500);
    await schedule.click();
    await failedWrite;
    await page.waitForTimeout(100);
    await assertSwitch(page, schedule, false);
    assert.deepEqual(state.preferenceWrites.at(-1), { notificationType: 'SCHEDULE_PUBLISHED', enabled: true });
    await modal.getByRole('button', { name: 'Xong', exact: true }).click();
    await modal.waitFor({ state: 'hidden' });

    state.preferenceMode = 'error';
    await page.getByRole('button', { name: 'Cài đặt thông báo', exact: true }).click();
    await modal.getByRole('button', { name: 'Thử lại cài đặt thông báo', exact: true }).waitFor();
    await assertSwitch(page, schedule, false);
    await page.screenshot({ path: path.join(output, `notification-settings-error-${width}.png`) });
    const getCount = state.preferenceGets;
    state.preferenceMode = 'ok';
    await modal.getByRole('button', { name: 'Thử lại cài đặt thông báo', exact: true }).click();
    await assertSwitch(page, schedule, false);
    await page.waitForFunction(() => !document.querySelector('[data-testid="notification-settings-loading"]'), null, { timeout: 10000 });
    assert.ok(state.preferenceGets > getCount, 'Retry makes a new preference request');
    await modal.getByRole('button', { name: 'Đóng cài đặt thông báo', exact: true }).click();
    await modal.waitFor({ state: 'hidden' });
    report.checks.push(`${width}×${height} settings: loading, readable options, successful PUT, failed PUT retains prior value, error/retry, web reminder disabled, close/done`);

    state.failMarkAll = true;
    const failedReadAll = page.waitForResponse(response => response.url().endsWith('/notifications/read-all') && response.status() === 500);
    await page.getByText('Đã đọc hết', { exact: true }).click();
    await failedReadAll;
    await page.waitForTimeout(100);
    await page.getByText('Chưa đọc (1)', { exact: true }).waitFor();
    await entry.waitFor();
    state.failMarkAll = false;
    await page.getByText('Đã đọc hết', { exact: true }).click();
    await page.getByText('Chưa đọc (0)', { exact: true }).waitFor();
    await page.getByRole('button').filter({ hasText: 'Phiếu lương đã sẵn sàng' }).last().waitFor();
    await entry.waitFor();
    assert.equal(state.markAllCalls, 2, 'A failed read-all is retriable and only a success changes the filter');
    await page.screenshot({ path: path.join(output, `notification-read-all-${width}.png`) });
    await page.getByText('Chưa đọc (0)', { exact: true }).click();
    await page.getByText('Bạn đã xem hết!', { exact: true }).waitFor();
    await page.getByText('Tất cả (2)', { exact: true }).waitFor();
    await page.screenshot({ path: path.join(output, `notification-caught-up-${width}.png`) });
    assert.deepEqual(errors, [], 'Notification and settings interactions produce no runtime errors');
    report.checks.push(`${width}×${height} notifications: playful header, icon-free rows, failed read-all preserved, successful read-all selects All, persistent filters and caught-up state`);
    console.log(`PASS ${width}px playful notifications/settings`);
  } catch (error) {
    await currentPage?.screenshot({ path: path.join(output, `failure-${width}.png`) }).catch(() => {});
    throw error;
  } finally { await context.close(); }
}

async function stateChecks(browser) {
  for (const [label, options] of [['empty', { empty: true }], ['error', { listError: true }], ['reduced-motion', {}]]) {
    const reduced = label === 'reduced-motion';
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
    try {
      await fixture(context, options);
      const page = await context.newPage(); currentPage = page;
      await openNotifications(page);
      if (label === 'error') {
        await page.getByText('Chưa tải được thông báo', { exact: true }).waitFor();
        assert.equal(await page.getByText('Bạn đã xem hết!', { exact: true }).count(), 0, 'List failure never looks like successful catch-up');
        await page.getByRole('button', { name: 'Thử lại', exact: true }).waitFor();
      } else if (label === 'empty') {
        await page.getByText('Chưa đọc (0)', { exact: true }).waitFor();
        await page.getByText('Tất cả (0)', { exact: true }).click();
        await page.getByText('Chưa có thông báo nào', { exact: true }).waitFor();
      } else {
        const hero = await waitForHero(page);
        await waitForInlinePreview(page, hero);
        assert.equal(await hero.locator('canvas').count(), 0, 'Reduced-motion notification hero is static');
        await page.getByRole('button', { name: 'Cài đặt thông báo', exact: true }).click();
        const modal = page.getByTestId('notification-settings-modal').last(); await modal.waitFor();
        await modal.getByRole('switch', { name: 'Thông báo lịch làm', exact: true }).waitFor();
        await waitForInlinePreview(page, modal);
        assert.equal(await modal.locator('canvas').count(), 0, 'Reduced-motion settings hero is static');
      }
      await assertNoOverflow(page, label);
      await page.screenshot({ path: path.join(output, `notification-${label}-390.png`) });
      report.checks.push(`Notification ${label}: distinct truthful state and fitting layout${reduced ? ', inline previews without live canvas' : ''}`);
    } finally { await context.close(); }
  }
}

async function animalRenderChecks(browser) {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await page.route('http://animal-scenes.local/**', route => {
      const pathname = new URL(route.request().url()).pathname;
      if (pathname === '/') return route.fulfill({ contentType: 'text/html', body: '<!doctype html><script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script>' });
      const file = path.resolve(root, '.' + pathname);
      if (!file.startsWith(root + path.sep)) throw Error('Animal scene fixture escaped project root');
      return route.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(file) });
    });
    await page.goto('http://animal-scenes.local/');
    const rendered = await page.evaluate(async () => {
      const THREE = await import('three');
      const { createAnimalScene, animateAnimalScene } = await import('/components/animalMascotScenes.js');
      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
      renderer.setSize(384, 384); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
      const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 20); camera.position.set(0, 1.5, 5.5); camera.lookAt(0, 0, 0);
      const scene = new THREE.Scene(); scene.add(new THREE.HemisphereLight('#FFF9EF', '#B5BAD8', 2.3));
      for (const [position, color, intensity] of [[[-3, 5, 5], '#FFF3DE', 3], [[4, 2, -1], '#E8EDFF', 2]]) {
        const light = new THREE.DirectionalLight(color, intensity); light.position.set(...position); scene.add(light);
      }
      const result = [];
      for (const kind of ['rabbit', 'deer', 'frog', 'tiger', 'beaver', 'raccoon', 'fox']) for (const engaged of [false, true]) {
        const model = createAnimalScene(kind);
        if (!model?.userData?.isAnimalScene) throw Error('Missing animal scene flag: ' + kind);
        scene.add(model);
        for (let frame = 0; frame < 168; frame++) animateAnimalScene(model, frame / 60, 1 / 60, { engaged, x: engaged ? 0.6 : 0, y: engaged ? -0.3 : 0 });
        renderer.render(scene, camera);
        const box = new THREE.Box3().setFromObject(model);
        result.push({ kind, engaged, image: renderer.domElement.toDataURL('image/png'), bounds: [box.min.toArray(), box.max.toArray()] });
        scene.remove(model);
        const geometries = new Set(), materials = new Set();
        model.traverse(part => { if (part.geometry) geometries.add(part.geometry); if (part.material) materials.add(part.material); });
        geometries.forEach(item => item.dispose()); materials.forEach(item => item.dispose()); model.userData.disposableTextures?.forEach(item => item.dispose());
      }
      renderer.dispose(); return result;
    });
    assert.equal(new Set(rendered.filter(item => !item.engaged).map(item => item.image)).size, 7, 'All seven new animals have distinct rendered appearances');
    for (const kind of ['rabbit', 'deer', 'frog', 'tiger', 'beaver', 'raccoon', 'fox']) {
      const pair = rendered.filter(item => item.kind === kind);
      assert.notEqual(pair[0].image, pair[1].image, kind + ' responds at the same animation timestamp');
    }
    for (const item of rendered) {
      assert.ok(item.bounds.flat().every(Number.isFinite), item.kind + ' finite pose');
      fs.writeFileSync(path.join(output, `scene-${item.kind}${item.engaged ? '-greeting' : ''}.png`), Buffer.from(item.image.split(',')[1], 'base64'));
    }
    report.checks.push('Procedural animals: seven distinct 3D appearances, finite poses and same-clock greeting changes');
  } finally { await context.close(); }
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || path.resolve('qa-week2-2026-10-20/browsers/chromium-1248/chrome-win64/chrome.exe'), headless: true, args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    await animalRenderChecks(browser);
    for (const [width, height] of [[390, 844], [320, 700]]) await notificationChecks(browser, width, height);
    await stateChecks(browser);
    fs.writeFileSync(path.join(output, 'checks.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(`PASS ${report.checks.length} playful notification checks`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
