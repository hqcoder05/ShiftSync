const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const root = process.cwd();
const base = process.env.MASCOT_TEST_URL || 'http://localhost:8085';
const output = path.resolve('output/income-mascot-2026-11-01');
fs.mkdirSync(output, { recursive: true });
const report = { evidence: 'Chromium with software WebGL and intercepted API fixtures; not a physical Android/iOS test.', checks: [] };

async function fixture(context) {
  await context.addInitScript(() => {
    localStorage.setItem('accessToken', 'mascot-fixture');
    localStorage.setItem('userEmail', 'mascot@example.invalid');
    localStorage.setItem('userRole', 'STAFF');
  });
  await context.route('**/api/**', async route => {
    const pathname = new URL(route.request().url()).pathname;
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-methods': '*', 'access-control-allow-headers': '*' };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    let data = [];
    if (pathname === '/api/users/me') data = { id: 'staff-mascot', email: 'mascot@example.invalid', fullName: 'Minh Anh', systemRole: 'STAFF', avatarId: 'mew' };
    else if (pathname.endsWith('/stores')) data = [{ id: 's1', storeId: 's1', name: 'Cửa hàng Trung tâm', storeName: 'Cửa hàng Trung tâm', status: 'ACTIVE' }];
    else if (pathname === '/api/stores/s1') data = { id: 's1', name: 'Cửa hàng Trung tâm' };
    else if (pathname.endsWith('/configuration')) data = { geofenceRadiusM: 200 };
    else if (pathname.endsWith('/unread-count')) data = { unreadCount: 0 };
    else if (pathname.endsWith('/notifications/stream')) return route.fulfill({ headers, contentType: 'text/event-stream', body: 'event: connect\ndata: fixture\n\n' });
    else if (pathname.endsWith('/payslips')) data = [{ id: 'p1', staffId: 'staff-mascot', storeId: 's1', storeName: 'Cửa hàng Trung tâm', periodStartDate: '2026-10-01', periodEndDate: '2026-10-31', periodStatus: 'PAID', totalAmount: 5000000, baseAmount: 4500000, otAmount: 500000, holidayAmount: 0, totalHours: 120 }];
    else if (pathname.endsWith('/attendance/me')) data = [{ id: 'a1', staffId: 'staff-mascot', storeId: 's1', storeName: 'Cửa hàng Trung tâm', zoneName: 'Pha chế', shiftDate: '2026-10-20', scheduledStart: '08:30:00', scheduledEnd: '16:30:00', checkInTime: '2026-10-20T01:30:00Z', checkOutTime: '2026-10-20T09:30:00Z', status: 'PRESENT' }];
    return route.fulfill({ headers, json: data });
  });
}

// Covered React Navigation routes can remain CSS-visible while their focus is
// false. A canvas identifies the currently active animated mascot.
const liveMascot = page => page.getByTestId('income-mascot').filter({ has: page.locator('canvas') }).last();

async function readyCanvas(page, mascot) {
  await mascot.waitFor({ state: 'visible', timeout: 30000 });
  await mascot.scrollIntoViewIfNeeded();
  const canvas = mascot.locator('canvas').first();
  await canvas.waitFor({ state: 'attached', timeout: 30000 });
  await page.waitForFunction(element => {
    const box = element.getBoundingClientRect();
    if (box.width < 40 || box.height < 40) return false;
    for (let node = element; node && node.nodeType === 1; node = node.parentElement) {
      if (Number(getComputedStyle(node).opacity) < 0.95) return false;
    }
    return true;
  }, await canvas.elementHandle(), { timeout: 30000 });
  await page.waitForTimeout(150);
  return canvas;
}

async function changesOverTime(page, canvas, description) {
  const initial = await canvas.screenshot();
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await page.waitForTimeout(350);
    if (!initial.equals(await canvas.screenshot())) return;
  }
  assert.fail(description);
}

async function appChecks(browser, width) {
  const context = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: 'no-preference' });
  try {
    await fixture(context);
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.getByRole('button', { name: 'Xem thông báo', exact: true }).waitFor({ timeout: 60000 });
    const mascot = liveMascot(page);
    const button = mascot;
    let canvas = await readyCanvas(page, mascot);
    await page.mouse.move(1, 1);
    await changesOverTime(page, canvas, 'The income mascot must move while idle');
    await page.screenshot({ path: path.join(output, `dashboard-idle-${width}.png`) });
    await button.hover({ position: { x: 85, y: 35 } });
    await page.waitForTimeout(750);
    await changesOverTime(page, canvas, 'The income mascot must continue waving on hover');
    await page.screenshot({ path: path.join(output, `dashboard-hover-wave-${width}.png`) });
    await button.click();
    await page.getByRole('button', { name: 'Xem thông báo', exact: true }).waitFor();
    assert.ok(await page.getByText(/5\.000\.000/).count(), 'Clicking the mascot retains the income amount and dashboard');
    await button.focus();
    assert.equal(await button.evaluate(element => element === document.activeElement), true, 'Mascot accepts keyboard focus');
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: 'Xem thông báo', exact: true }).waitFor();
    report.checks.push(`${width}px dashboard: visible WebGL mascot, idle motion, hover/wave, click and keyboard greeting without navigation`);

    await page.getByRole('tab', { name: 'Thêm', exact: true }).click();
    await page.getByRole('button', { name: 'Phiếu lương', exact: true }).click();
    await page.getByRole('button', { name: 'Phiếu lương tháng 10/2026', exact: true }).waitFor({ timeout: 60000 });
    canvas = await readyCanvas(page, liveMascot(page));
    await changesOverTime(page, canvas, 'The payroll list mascot must animate');
    await page.screenshot({ path: path.join(output, `payroll-list-${width}.png`) });
    await page.getByRole('button', { name: 'Phiếu lương tháng 10/2026', exact: true }).click();
    await page.getByRole('heading', { name: 'Chi tiết lương', exact: true }).waitFor();
    const detailMascot = liveMascot(page);
    canvas = await readyCanvas(page, detailMascot);
    await detailMascot.hover();
    await page.waitForTimeout(650);
    await page.screenshot({ path: path.join(output, `payroll-detail-wave-${width}.png`) });
    await detailMascot.click();
    await page.getByRole('heading', { name: 'Chi tiết lương', exact: true }).waitFor();
    assert.ok(await page.getByText(/5\.000\.000/).count(), 'Detail earnings survive mascot interaction');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'Mascot and greeting stay within the mobile page width');
    assert.deepEqual(errors, [], 'No browser runtime errors');
    report.checks.push(`${width}px payroll list/detail: replacement mascot animates and reacts without changing financial data or navigation`);
    console.log(`PASS ${width}px income mascot interactions and payroll integration`);
  } finally { await context.close(); }
}

async function reducedMotionCheck(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  try {
    await fixture(context);
    const page = await context.newPage();
    await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.getByRole('button', { name: 'Xem thông báo', exact: true }).waitFor({ timeout: 60000 });
    const mascot = page.getByTestId('income-mascot').filter({ visible: true }).first();
    await mascot.scrollIntoViewIfNeeded();
    await page.waitForFunction(element => !element.querySelector('canvas') && [...element.querySelectorAll('img')].some(image => image.complete && image.naturalWidth > 0), await mascot.elementHandle(), { timeout: 10000 });
    assert.equal(await page.locator('canvas').count(), 0, 'Reduced motion keeps both mascot and profile portrait static');
    await page.screenshot({ path: path.join(output, 'reduced-motion-390.png') });
    report.checks.push('Reduced motion: bundled character preview loads and animated WebGL views stop');
  } finally { await context.close(); }
}

async function sameTimeSceneCheck(browser) {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await page.route('http://mascot-scene.local/**', route => {
      const pathname = new URL(route.request().url()).pathname;
      if (pathname === '/') return route.fulfill({ contentType: 'text/html', body: '<!doctype html><script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script>' });
      const file = path.resolve(root, '.' + pathname);
      if (!file.startsWith(root + path.sep)) throw Error('Scene fixture escaped project root');
      return route.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(file) });
    });
    await page.goto('http://mascot-scene.local/');
    const result = await page.evaluate(async () => {
      const THREE = await import('three');
      const { createIncomeMascot, animateIncomeMascot } = await import('/components/incomeMascotScene.js');
      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
      renderer.setSize(384, 384);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 20);
      camera.position.set(0, 1.5, 5.5); camera.lookAt(0, 0, 0);
      const scene = new THREE.Scene();
      scene.add(new THREE.HemisphereLight('#FFF9EF', '#B5BAD8', 2.3));
      for (const [position, color, intensity] of [[[-3, 5, 5], '#FFF3DE', 3], [[4, 2, -1], '#E8EDFF', 2]]) {
        const light = new THREE.DirectionalLight(color, intensity); light.position.set(...position); scene.add(light);
      }
      const poses = [];
      for (const engaged of [false, true]) {
        const model = createIncomeMascot();
        if (!model.userData.isMascot) throw Error('Income scene is not the requested mascot');
        scene.add(model);
        for (let frame = 0; frame < 150; frame++) animateIncomeMascot(model, frame / 60, 1 / 60, { engaged, x: engaged ? 0.7 : 0, y: engaged ? -0.35 : 0 });
        renderer.render(scene, camera);
        const box = new THREE.Box3().setFromObject(model);
        poses.push({ image: renderer.domElement.toDataURL('image/png'), bounds: [box.min.toArray(), box.max.toArray()] });
        scene.remove(model);
        const geometries = new Set(), materials = new Set();
        model.traverse(part => { if (part.geometry) geometries.add(part.geometry); if (part.material) materials.add(part.material); });
        geometries.forEach(item => item.dispose()); materials.forEach(item => item.dispose());
        model.userData.disposableTextures?.forEach(texture => texture.dispose());
      }
      renderer.dispose();
      return poses;
    });
    assert.notEqual(result[0].image, result[1].image, 'At identical animation time, hover must visibly change the pose');
    for (const pose of result) assert.ok(pose.bounds.flat().every(Number.isFinite), 'Mascot pose coordinates remain finite');
    for (const [index, name] of ['scene-idle', 'scene-greeting'].entries()) fs.writeFileSync(path.join(output, name + '.png'), Buffer.from(result[index].image.split(',')[1], 'base64'));
    report.checks.push('Direct 3D rendering at identical timestamps confirms interaction changes the pose beyond idle animation');
  } finally { await context.close(); }
}

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || path.resolve('qa-week2-2026-10-20/browsers/chromium-1248/chrome-win64/chrome.exe'),
    headless: true,
    args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  try {
    await sameTimeSceneCheck(browser);
    for (const width of [390, 320]) await appChecks(browser, width);
    await reducedMotionCheck(browser);
    fs.writeFileSync(path.join(output, 'checks.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(`PASS ${report.checks.length} focused mascot checks`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
