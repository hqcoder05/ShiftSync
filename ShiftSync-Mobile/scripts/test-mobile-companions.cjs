const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const root = process.cwd();
const base = process.env.MASCOT_TEST_URL || 'http://localhost:8085';
const output = path.resolve('output/mobile-companions-2026-11-01');
fs.mkdirSync(output, { recursive: true });
const report = { evidence: 'Chromium with software WebGL, intercepted API fixtures and a populated schedule; not a physical Android/iOS test.', checks: [] };

function vietnamDateKey() {
  const parts = new Map(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).map(part => [part.type, part.value]));
  return `${parts.get('year')}-${parts.get('month')}-${parts.get('day')}`;
}

async function fixture(context) {
  await context.addInitScript(() => {
    localStorage.setItem('accessToken', 'companions-fixture');
    localStorage.setItem('userEmail', 'companions@example.invalid');
    localStorage.setItem('userRole', 'STAFF');
  });
  const today = vietnamDateKey();
  const shift = { id: 'shift-companions', shiftId: 'shift-companions', assignmentId: 'assignment-companions', staffId: 'staff-companions', storeId: 's1', storeName: 'Cửa hàng Đồng Đội', storeAddress: '12 Đường Đồng Đội', shiftDate: today, startTime: '08:00:00', endTime: '16:00:00', status: 'PUBLISHED', skillName: 'Pha chế', zoneName: 'Quầy pha chế', shiftAssignments: [{ id: 'assignment-companions', staffId: 'staff-companions', staffName: 'Minh Anh', skillName: 'Pha chế', zoneName: 'Quầy pha chế' }] };
  await context.route('**/api/**', async route => {
    const pathname = new URL(route.request().url()).pathname;
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-methods': '*', 'access-control-allow-headers': '*' };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    let data = [];
    if (pathname === '/api/users/me') data = { id: 'staff-companions', email: 'companions@example.invalid', fullName: 'Minh Anh', systemRole: 'STAFF', avatarId: 'mew' };
    else if (pathname.endsWith('/stores')) data = [{ id: 's1', storeId: 's1', name: 'Cửa hàng Đồng Đội', storeName: 'Cửa hàng Đồng Đội', status: 'ACTIVE' }];
    else if (pathname === '/api/stores/s1') data = { id: 's1', name: 'Cửa hàng Đồng Đội' };
    else if (pathname.endsWith('/configuration')) data = { geofenceRadiusM: 200 };
    else if (pathname.endsWith('/unread-count')) data = { unreadCount: 0 };
    else if (pathname.endsWith('/notifications/stream')) return route.fulfill({ headers, contentType: 'text/event-stream', body: 'event: connect\ndata: fixture\n\n' });
    else if (pathname === '/api/users/me/shifts' || pathname === '/api/stores/s1/shifts') data = [shift];
    else if (pathname.endsWith('/payslips')) data = [{ id: 'p1', staffId: 'staff-companions', storeId: 's1', storeName: 'Cửa hàng Đồng Đội', periodStartDate: '2026-10-01', periodEndDate: '2026-10-31', periodStatus: 'PAID', totalAmount: 5000000, baseAmount: 4500000, otAmount: 500000, holidayAmount: 0, totalHours: 120 }];
    return route.fulfill({ headers, json: data });
  });
}

// Covered native-stack routes remain CSS-visible; their inactive illustrations
// have no canvas, which distinguishes them from the active animation.
const liveMascot = (page, id) => page.getByTestId(id).filter({ has: page.locator('canvas') }).last();

async function readyCanvas(page, mascot) {
  await mascot.waitFor({ state: 'visible', timeout: 60000 });
  await mascot.scrollIntoViewIfNeeded();
  const canvas = mascot.locator('canvas').first();
  await canvas.waitFor({ state: 'attached', timeout: 30000 });
  await page.waitForFunction(element => {
    const box = element.getBoundingClientRect();
    if (box.width < 40 || box.height < 40) return false;
    for (let node = element; node && node.nodeType === 1; node = node.parentElement) if (Number(getComputedStyle(node).opacity) < 0.95) return false;
    return true;
  }, await canvas.elementHandle(), { timeout: 30000 });
  await page.waitForTimeout(150);
  return canvas;
}

async function changesOverTime(page, canvas, description) {
  const before = await canvas.screenshot();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await page.waitForTimeout(350);
    if (!before.equals(await canvas.screenshot())) return;
  }
  assert.fail(description);
}

async function appChecks(browser, width) {
  const context = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: 'no-preference', hasTouch: true });
  try {
    await fixture(context);
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.getByRole('button', { name: 'Xem thông báo', exact: true }).waitFor({ timeout: 60000 });
    const income = liveMascot(page, 'income-mascot');
    const incomeCanvas = await readyCanvas(page, income);
    assert.equal(await income.getAttribute('aria-label'), 'Chào linh vật thu nhập', 'The existing green income companion retains its action');
    await changesOverTime(page, incomeCanvas, 'The original green companion continues to animate');
    assert.ok(await page.getByText(/5\.000\.000/).count(), 'Income data is preserved');

    await page.getByRole('tab', { name: 'Lịch làm', exact: true }).click();
    await page.getByRole('tab', { name: 'Ca của tôi', exact: true }).waitFor({ timeout: 60000 });
    await page.getByRole('button', { name: /, có ca làm/ }).first().waitFor({ timeout: 30000 });
    const pair = liveMascot(page, 'shift-buddies-mascot');
    const pairCanvas = await readyCanvas(page, pair);
    assert.equal(await pair.getAttribute('aria-label'), 'Chào Kiro và Sora');
    await page.mouse.move(1, 1);
    await changesOverTime(page, pairCanvas, 'Kiro and Sora interact during idle animation');
    await page.screenshot({ path: path.join(output, `schedule-pair-idle-${width}.png`) });
    await pair.hover();
    await page.waitForTimeout(700);
    await changesOverTime(page, pairCanvas, 'The pair continues moving during a hover greeting');
    await page.screenshot({ path: path.join(output, `schedule-pair-greeting-${width}.png`) });
    await pair.tap();
    await pair.focus();
    assert.equal(await pair.evaluate(element => element === document.activeElement), true, 'The pair is keyboard accessible');
    await page.keyboard.press('Enter');
    await page.getByRole('tab', { name: 'Ca của tôi', exact: true }).waitFor();
    assert.equal(await page.getByText('Tuần này chưa có lịch làm', { exact: true }).count(), 0, 'Pair is available on a populated schedule, not only its empty state');
    await page.getByRole('button', { name: 'Mở lịch chọn ngày', exact: true }).click();
    await page.getByRole('button', { name: 'Hôm nay', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Đóng', exact: true }).last().click();
    await page.getByRole('tab', { name: 'Lịch chi nhánh', exact: true }).click();
    await page.getByRole('tab', { name: 'Ca của tôi', exact: true }).click();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'Pair does not overflow the schedule');
    report.checks.push(`${width}px populated schedule: Kiro/Sora idle interaction, hover, touch, keyboard greeting, calendar and schedule tabs work`);

    await page.getByRole('tab', { name: 'Nhắn tin', exact: true }).click();
    await page.getByRole('button', { name: 'Ẩn giới thiệu nhắn tin', exact: true }).waitFor({ timeout: 60000 });
    const hako = liveMascot(page, 'hako-mascot');
    const hakoCanvas = await readyCanvas(page, hako);
    assert.equal(await hako.getAttribute('aria-label'), 'Chào Hako');
    await page.mouse.move(1, 1);
    await changesOverTime(page, hakoCanvas, 'Hako is a live 3D animation');
    await hako.hover();
    await page.waitForTimeout(700);
    await hako.tap();
    await hako.focus();
    await page.keyboard.press('Enter');
    await page.screenshot({ path: path.join(output, `messaging-hako-greeting-${width}.png`) });
    await page.getByRole('button', { name: 'Soạn tin nhắn mới', exact: true }).click();
    await page.getByRole('button', { name: 'Đóng soạn tin nhắn', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Đóng soạn tin nhắn', exact: true }).click();
    await page.getByRole('button', { name: 'Ẩn giới thiệu nhắn tin', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Ẩn giới thiệu nhắn tin', exact: true }).click();
    const compactHako = liveMascot(page, 'hako-mascot');
    await changesOverTime(page, await readyCanvas(page, compactHako), 'Hako remains live in the compact banner after onboarding is dismissed');
    await page.screenshot({ path: path.join(output, `messaging-hako-compact-${width}.png`) });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'Hako does not overflow messaging');
    assert.deepEqual(errors, [], 'No browser runtime errors across all three new characters and the preserved green character');
    report.checks.push(`${width}px messaging: Hako greets, remains visible after onboarding dismissal, message composer still works, green companion preserved`);
    console.log(`PASS ${width}px mobile companion scenes and interactions`);
  } finally { await context.close(); }
}

async function reducedMotionChecks(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  try {
    await fixture(context);
    const page = await context.newPage();
    await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.getByRole('tab', { name: 'Lịch làm', exact: true }).waitFor({ timeout: 60000 });
    for (const [tab, id, name] of [['Lịch làm', 'shift-buddies-mascot', 'pair'], ['Nhắn tin', 'hako-mascot', 'hako']]) {
      await page.getByRole('tab', { name: tab, exact: true }).click();
      const mascot = page.getByTestId(id).filter({ visible: true }).last();
      await mascot.waitFor({ timeout: 60000 });
      await mascot.scrollIntoViewIfNeeded();
      await page.waitForFunction(element => !element.querySelector('canvas') && [...element.querySelectorAll('img')].some(image => image.complete && image.naturalWidth > 0), await mascot.elementHandle(), { timeout: 30000 });
      assert.equal(await mascot.locator('canvas').count(), 0, 'Reduced-motion companion uses its bundled preview');
      await page.screenshot({ path: path.join(output, `reduced-motion-${name}-390.png`) });
    }
    report.checks.push('Reduced motion: pair and Hako have loaded inline previews and no live canvas');
  } finally { await context.close(); }
}

async function directSceneChecks(browser) {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await page.route('http://companion-scenes.local/**', route => {
      const pathname = new URL(route.request().url()).pathname;
      if (pathname === '/') return route.fulfill({ contentType: 'text/html', body: '<!doctype html><script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script>' });
      const file = path.resolve(root, '.' + pathname);
      if (!file.startsWith(root + path.sep)) throw Error('Scene fixture escaped project root');
      return route.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(file) });
    });
    await page.goto('http://companion-scenes.local/');
    const rendered = await page.evaluate(async () => {
      const THREE = await import('three');
      const { createCompanionScene, animateCompanionScene } = await import('/components/companionMascotScenes.js');
      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
      renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
      const scene = new THREE.Scene();
      scene.add(new THREE.HemisphereLight('#FFF9EF', '#B5BAD8', 2.3));
      for (const [position, color, intensity] of [[[-3, 5, 5], '#FFF3DE', 3], [[4, 2, -1], '#E8EDFF', 2]]) {
        const light = new THREE.DirectionalLight(color, intensity); light.position.set(...position); scene.add(light);
      }
      const results = [];
      const poses = [['kiro', 2.8, false, 'kiro'], ['sora', 2.8, false, 'sora'], ['hako', 2.8, false, 'hako'], ['hako', 2.8, true, 'hako-greeting'], ['shift-buddies', 2.8, false, 'pair-idle'], ['shift-buddies', 2.8, true, 'pair-greeting'], ['shift-buddies', 5.5, false, 'pair-partner-response']];
      for (const [kind, time, engaged, label] of poses) {
        const paired = kind === 'shift-buddies';
        renderer.setSize(paired ? 600 : 384, paired ? 390 : 384);
        const camera = new THREE.PerspectiveCamera(32, paired ? 600 / 390 : 1, 0.1, 20);
        camera.position.set(0, 1.5, 5.5); camera.lookAt(0, 0, 0);
        const model = createCompanionScene(kind);
        if (!model?.userData?.isCompanionScene) throw Error('Missing companion scene flag for ' + kind);
        if (!Array.isArray(model.userData.characters) || model.userData.characters.length !== (paired ? 2 : 1)) throw Error('Unexpected companion count for ' + kind);
        scene.add(model);
        const frameCount = Math.round(time * 60);
        for (let frame = 0; frame < frameCount; frame++) animateCompanionScene(model, frame / 60, 1 / 60, { engaged, x: engaged ? 0.7 : 0, y: engaged ? -0.35 : 0 });
        renderer.render(scene, camera);
        const box = new THREE.Box3().setFromObject(model);
        results.push({ label, image: renderer.domElement.toDataURL('image/png'), bounds: [box.min.toArray(), box.max.toArray()] });
        scene.remove(model);
        const geometries = new Set(), materials = new Set();
        model.traverse(part => { if (part.geometry) geometries.add(part.geometry); if (part.material) materials.add(part.material); });
        geometries.forEach(item => item.dispose()); materials.forEach(item => item.dispose());
        model.userData.disposableTextures?.forEach(item => item.dispose());
      }
      renderer.dispose(); return results;
    });
    const images = Object.fromEntries(rendered.map(result => [result.label, result.image]));
    assert.equal(new Set(['kiro', 'sora', 'hako'].map(kind => images[kind])).size, 3, 'All three companions have distinct rendered appearances');
    assert.notEqual(images['pair-idle'], images['pair-greeting'], 'At the same timestamp, greeting changes the pair beyond ordinary idle motion');
    assert.notEqual(images['pair-idle'], images['pair-partner-response'], 'The pair advances through its coordinated idle interaction');
    assert.notEqual(images.hako, images['hako-greeting'], 'At the same timestamp, Hako reacts to greeting');
    for (const result of rendered) {
      assert.ok(result.bounds.flat().every(Number.isFinite), result.label + ' has finite animated geometry');
      fs.writeFileSync(path.join(output, 'scene-' + result.label + '.png'), Buffer.from(result.image.split(',')[1], 'base64'));
    }
    report.checks.push('Procedural render: three distinct single characters, paired two-character scene, finite poses, same-clock greeting changes, evolving partner interaction');
  } finally { await context.close(); }
}

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || path.resolve('qa-week2-2026-10-20/browsers/chromium-1248/chrome-win64/chrome.exe'),
    headless: true, args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  try {
    await directSceneChecks(browser);
    for (const width of [390, 320]) await appChecks(browser, width);
    await reducedMotionChecks(browser);
    fs.writeFileSync(path.join(output, 'checks.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(`PASS ${report.checks.length} companion checks`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
