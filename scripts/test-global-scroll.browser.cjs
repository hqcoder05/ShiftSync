// Page-scoped session/API fixtures. Checks document scrolling across routed pages.
async page => {
  const checks = [];
  const errors = [];
  const assert = (ok, name) => { if (!ok) throw new Error(name); checks.push(name); };
  const onError = error => errors.push(error.message);
  page.on('pageerror', onError);
  const storeId = '11111111-1111-4111-8111-111111111111';
  await page.setViewportSize({ width: 1920, height: 600 });
  await page.goto('http://127.0.0.1:3000/login');
  await page.unroute('**/api/**');
  if (page.routeWebSocket) await page.routeWebSocket('**/ws/**', ws => ws.close());
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    const json = path === '/api/stores' || path === '/api/stores/directory'
      ? { content: [{ id: storeId, name: 'MOCK · Oak & Moss', category: 'FOOD_BEVERAGE' }] }
      : path.endsWith('/layout') ? { length: 22.2, width: 14.22, height: 3.5 }
      : path.endsWith('/unread-count') ? { unreadCount: 0 } : [];
    return route.fulfill({ status: 200, json });
  });
  await page.evaluate(id => {
    localStorage.clear();
    Object.entries({ accessToken: 'PLAYWRIGHT_MOCK_NOT_A_REAL_SESSION', userRole: 'MANAGER', userName: 'Nguyễn Việt Quốc', selectedStoreId: id }).forEach(([key, value]) => localStorage.setItem(key, value));
  }, storeId);
  const state = () => page.evaluate(() => ({ y: scrollY, max: document.scrollingElement.scrollHeight - document.scrollingElement.clientHeight, overflow: document.body.style.overflow }));
  const wheelToEnd = async () => {
    await page.mouse.move(page.viewportSize().width / 2, page.viewportSize().height / 2);
    await page.mouse.wheel(0, 10000);
    await page.waitForTimeout(200);
    let current = await state();
    if (current.y < current.max - 2) {
      await page.mouse.wheel(0, 10000);
      await page.waitForTimeout(200);
      current = await state();
    }
    return current;
  };
  try {
    await page.goto('http://127.0.0.1:3000/dashboard');
    await page.locator('.db').waitFor();
    let current = await wheelToEnd();
    assert(current.max > 0 && Math.abs(current.y - current.max) < 2, 'Dashboard reaches its final card with the mouse wheel');
    await page.evaluate(() => { document.body.style.overflow = 'hidden'; });
    await page.getByRole('button', { name: 'Cài đặt', exact: true }).click();
    await page.getByRole('link', { name: /Cấu hình cửa hàng/ }).click();
    await page.waitForURL('**/settings');
    await page.waitForFunction(() => document.body.style.overflow === '');
    current = await wheelToEnd();
    assert(current.max > 0 && Math.abs(current.y - current.max) < 2, 'Route change clears stale body lock and Settings reaches bottom');
    await page.goto('http://127.0.0.1:3000/requests');
    current = await wheelToEnd();
    assert(current.max > 0 && Math.abs(current.y - current.max) < 2, 'Requests reaches bottom');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://127.0.0.1:3000/dashboard');
    await page.getByRole('button', { name: 'Mở menu điều hướng' }).click();
    assert((await state()).overflow === 'hidden', 'Mobile drawer locks background only while open');
    await page.keyboard.press('Escape');
    assert((await state()).overflow === '', 'Closing drawer restores page scroll');
    await page.getByRole('button', { name: 'Tìm trang và chức năng' }).click();
    assert((await state()).overflow === 'hidden', 'Search dialog locks background only while open');
    await page.keyboard.press('Escape');
    assert((await state()).overflow === '', 'Closing search restores page scroll');
    current = await wheelToEnd();
    assert(current.max > 0 && Math.abs(current.y - current.max) < 2, 'Mobile dashboard reaches its final card');
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('http://127.0.0.1:3000/dashboard');
    assert(errors.length === 0, 'No uncaught browser errors');
    return { checks, errors, viewport: page.viewportSize(), final: await state() };
  } finally {
    page.off('pageerror', onError);
  }
}
