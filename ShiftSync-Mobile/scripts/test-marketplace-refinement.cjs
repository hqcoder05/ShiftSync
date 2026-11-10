const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const output = path.resolve(process.env.UI_REFRESH_OUTPUT || 'output/mascot-marketplace-refinement-2026-11-03');
fs.mkdirSync(output, { recursive: true });
const report = { evidence: 'Chromium software WebGL, intercepted API fixtures; no real account changes or physical-device test.', checks: [] };
const base = process.env.MASCOT_TEST_URL || 'http://localhost:8085';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

const makeShift = (id, startTime, endTime, skillName, date = '2030-11-04') => ({
  id, storeId: 's1', storeName: 'Cửa hàng Trung tâm', shiftDate: date,
  startTime, endTime, skillName, status: 'PUBLISHED',
  skillRequirements: [{ skillId: skillName, skillName, requiredStaff: 2, assignedCount: 0 }], shiftAssignments: [],
});

async function fixture(context, empty) {
  await context.addInitScript(() => {
    localStorage.setItem('accessToken', 'market-refinement-fixture');
    localStorage.setItem('userEmail', 'market@example.invalid');
    localStorage.setItem('userRole', 'STAFF');
  });
  const state = {
    empty, listError: false, proposalFailure: false, proposalWrites: [], claimWrites: [],
    profileGets: 0, scheduleGets: 0,
    proposals: [{ id: 'p1', status: 'PENDING', proposedByName: 'Quản lý chi nhánh', workforceRequestId: 'HT-101', createdAt: '2030-11-01T01:00:00Z' }],
    shifts: [makeShift('morning', '08:00:00', '12:00:00', 'Pha chế'), makeShift('afternoon', '13:00:00', '17:00:00', 'Thu ngân'), makeShift('night', '19:00:00', '23:00:00', 'Pha chế'), makeShift('conflict', '09:00:00', '12:00:00', 'Phục vụ', '2030-11-05')],
    mine: [{ ...makeShift('existing', '10:00:00', '14:00:00', 'Phục vụ', '2030-11-05'), staffId: 'staff-market', shiftAssignments: [{ staffId: 'staff-market' }] }],
  };
  await context.route('**/api/**', async route => {
    const request = route.request(), p = new URL(request.url()).pathname;
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-methods': '*', 'access-control-allow-headers': '*' };
    const fulfill = json => route.fulfill({ headers, json });
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (p === '/api/users/me') { state.profileGets++; return fulfill({ id: 'staff-market', email: 'market@example.invalid', fullName: 'Minh Anh', systemRole: 'STAFF', avatarId: 'mew' }); }
    if (/\/workforce-proposals\/p1\/respond$/.test(p)) {
      state.proposalWrites.push(request.postDataJSON());
      await pause(200);
      if (state.proposalFailure) return route.fulfill({ status: 500, headers, json: { message: 'Fixture failure' } });
      state.proposals[0].status = request.postDataJSON().accepted ? 'ACCEPTED' : 'DECLINED';
      return fulfill(state.proposals[0]);
    }
    if (p.endsWith('/workforce-proposals')) return fulfill(state.empty ? [] : state.proposals);
    if (p.endsWith('/marketplace/shifts/morning/claim')) {
      state.claimWrites.push(p);
      state.shifts = state.shifts.filter(item => item.id !== 'morning');
      return fulfill({});
    }
    if (p.endsWith('/marketplace/shifts')) {
      if (state.listError) return route.fulfill({ status: 500, headers, json: { message: 'Fixture market failure' } });
      return fulfill(state.empty ? [] : state.shifts);
    }
    if (p === '/api/users/me/shifts') { state.scheduleGets++; return fulfill(state.empty ? [] : state.mine); }
    if (p === '/api/stores/s1/shifts') return fulfill(state.shifts);
    if (p.endsWith('/stores')) return fulfill([{ id: 's1', storeId: 's1', name: 'Cửa hàng Trung tâm', storeName: 'Cửa hàng Trung tâm', status: 'ACTIVE', contractType: { maxWeeklyHours: 40 } }]);
    if (p === '/api/stores/s1') return fulfill({ id: 's1', name: 'Cửa hàng Trung tâm' });
    if (p.endsWith('/configuration')) return fulfill({ geofenceRadiusM: 200 });
    if (p.endsWith('/messaging/unread-count') || p.endsWith('/unread-count')) return fulfill({ unreadCount: 0 });
    if (p.endsWith('/notifications/stream')) return route.fulfill({ headers, contentType: 'text/event-stream', body: 'event: connect\ndata: fixture\n\n' });
    return fulfill([]);
  });
  return state;
}

async function openMarket(page) {
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.getByRole('tab', { name: 'Thêm', exact: true }).waitFor({ timeout: 90000 });
  await page.getByRole('tab', { name: 'Thêm', exact: true }).click();
  await page.getByRole('button', { name: 'Chợ ca', exact: true }).waitFor({ timeout: 120000 });
  await page.getByRole('button', { name: 'Chợ ca', exact: true }).click();
  const screen = page.getByTestId('market-screen').last();
  await screen.getByText('Tìm ca phù hợp với bạn', { exact: true }).waitFor({ timeout: 60000 });
  return screen;
}
async function fit(page, screen, label) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, label + ': no page overflow');
  const boxes = await screen.locator('[data-testid^="market-shift-"], [data-testid^="market-proposal-"]').evaluateAll(els => els.map(el => ({ x: el.getBoundingClientRect().x, right: el.getBoundingClientRect().right })));
  assert.ok(boxes.every(box => box.x >= -1 && box.right <= page.viewportSize().width + 1), label + ': cards fit screen');
}
async function shot(page, name) {
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(output, name + '.png') });
}

async function run(browser, width) {
  const context = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: 'no-preference', hasTouch: true });
  const page = await context.newPage();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  try {
    const state = await fixture(context, true);
    const screen = await openMarket(page);
    await screen.getByText('Hiện chưa có ca mở nào', { exact: true }).waitFor();
    await shot(page, `marketplace-empty-top-${width}`);
    await screen.getByText('Hiện chưa có ca mở nào', { exact: true }).scrollIntoViewIfNeeded();
    await shot(page, `marketplace-empty-${width}`);
    await fit(page, screen, width + ' empty');
    state.empty = false;
    await screen.getByRole('button', { name: 'Làm mới chợ ca', exact: true }).click();
    await screen.getByTestId('market-shift-morning').waitFor();
    await screen.getByText('Tìm ca phù hợp với bạn', { exact: true }).scrollIntoViewIfNeeded();
    await shot(page, `marketplace-populated-top-${width}`);
    const filter = screen.getByTestId('market-filters');
    await filter.scrollIntoViewIfNeeded();
    await shot(page, `marketplace-filters-${width}`);
    await filter.getByRole('button', { name: 'Lọc vị trí: Pha chế', exact: true }).click();
    await screen.getByText('Hiển thị 2/4 ca mở', { exact: true }).waitFor();
    await filter.getByRole('button', { name: 'Lọc giờ bắt đầu ca: Tối', exact: true }).click();
    await screen.getByText('Hiển thị 1/4 ca mở', { exact: true }).waitFor();
    assert.equal(await screen.getByTestId('market-shift-night').count(), 1);
    assert.equal(await screen.getByTestId('market-shift-morning').count(), 0);
    await filter.getByRole('button', { name: 'Lọc giờ bắt đầu ca: Chiều', exact: true }).click();
    await screen.getByText('Không có ca phù hợp bộ lọc', { exact: true }).waitFor();
    await filter.getByRole('button', { name: 'Xóa bộ lọc', exact: true }).click();
    await screen.getByText('Hiển thị 4/4 ca mở', { exact: true }).waitFor();
    await screen.getByTestId('market-shift-morning').scrollIntoViewIfNeeded();
    await shot(page, `marketplace-shifts-${width}`);
    await fit(page, screen, width + ' populated');
    report.checks.push(`${width}px: empty/populated marketplace, larger tiger, cards fit, role/time filtering and reset`);

    if (width === 390) {
      const proposal = screen.getByTestId('market-proposal-p1');
      state.proposalFailure = true;
      await proposal.getByRole('button', { name: 'Nhận đề xuất hỗ trợ', exact: true }).click();
      await page.getByText('Nhận đề xuất?', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Nhận', exact: true }).click();
      await page.getByText('Không thể phản hồi', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Đã hiểu', exact: true }).click();
      await page.waitForFunction(element => element.getAttribute('aria-disabled') !== 'true', await proposal.getByRole('button', { name: 'Nhận đề xuất hỗ trợ', exact: true }).elementHandle());
      assert.equal(await proposal.getByRole('button', { name: 'Nhận đề xuất hỗ trợ', exact: true }).isEnabled(), true);
      state.proposalFailure = false;
      await proposal.getByRole('button', { name: 'Nhận đề xuất hỗ trợ', exact: true }).click();
      await page.getByRole('button', { name: 'Nhận', exact: true }).click();
      await page.getByText('Đã nhận đề xuất hỗ trợ.', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Đã hiểu', exact: true }).click();
      await proposal.getByText('Đã nhận', { exact: true }).waitFor();
      assert.deepEqual(state.proposalWrites, [{ accepted: true }, { accepted: true }]);
      report.checks.push('Proposal failure remains retryable; accepted payload and refreshed accepted state preserved');

      await screen.getByTestId('market-shift-conflict').getByRole('button', { name: 'Kiểm tra trùng lịch với dữ liệu mới nhất', exact: true }).click();
      await page.getByRole('button', { name: 'Đồng ý nhận ca', exact: true }).click();
      await page.getByText('Trùng lịch làm', { exact: true }).waitFor();
      assert.deepEqual(state.claimWrites, [], 'Fresh conflict prevents a claim write');
      await shot(page, 'marketplace-conflict-390');
      const dismiss = page.getByRole('button', { name: 'Đã hiểu, kiểm tra lại ca làm', exact: true });
      await dismiss.click();
      const previousProfiles = state.profileGets, previousSchedules = state.scheduleGets;
      await screen.getByTestId('market-shift-morning').getByRole('button').last().click();
      await page.getByRole('button', { name: 'Đồng ý nhận ca', exact: true }).click();
      await page.getByText('Đăng ký thành công', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Ở lại Sàn ca', exact: true }).click();
      assert.equal(state.claimWrites.length, 1);
      assert.ok(state.profileGets > previousProfiles && state.scheduleGets > previousSchedules, 'Claim checks current account and schedule');
      assert.equal(await screen.getByTestId('market-shift-morning').count(), 0, 'Successful claim refreshes available cards');
      report.checks.push('Fresh conflict blocks claim; eligible claim rechecks account/schedule, submits once and refreshes cards');

      state.listError = true;
      await screen.getByRole('button', { name: 'Làm mới chợ ca', exact: true }).click();
      await screen.getByText('Không tải được ca mở', { exact: true }).waitFor();
      await screen.getByText('Không tải được ca mở', { exact: true }).scrollIntoViewIfNeeded();
      await shot(page, 'marketplace-error-390');
      state.listError = false;
      await screen.getByRole('button', { name: 'Thử lại', exact: true }).click();
      await screen.getByTestId('market-shift-afternoon').waitFor();
      report.checks.push('Load error has a distinct retry state; retry restores available shifts');
    }
    assert.deepEqual(errors, [], width + ': no runtime errors');
    console.log('PASS marketplace ' + width + 'px');
  } catch (error) {
    await page.screenshot({ path: path.join(output, `marketplace-failure-${width}.png`) }).catch(() => {});
    throw error;
  } finally { await context.close(); }
}

(async () => {
  const browser = await chromium.launch({ executablePath: path.resolve('qa-week2-2026-10-20/browsers/chromium-1248/chrome-win64/chrome.exe'), headless: true, args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    for (const width of [390, 320]) await run(browser, width);
    fs.writeFileSync(path.join(output, 'marketplace-checks.json'), JSON.stringify(report, null, 2) + '\n');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
