const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const out = path.resolve(process.env.UI_REFRESH_OUTPUT || 'output/message-notification-refresh-2026-11-02');
fs.mkdirSync(out, { recursive: true });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const longAnnouncement = 'Nhắc lịch họp đội ngũ. ' + 'Mọi người kiểm tra lịch làm và xác nhận công việc trước ca. '.repeat(6) + 'Hẹn gặp cả đội tại chi nhánh.';

async function fixture(context, role = 'STAFF') {
  await context.addInitScript(() => { localStorage.setItem('accessToken', 'messaging-ui-fixture'); localStorage.setItem('userEmail', 'message-ui@example.invalid'); localStorage.setItem('userRole', 'STAFF'); });
  const now = new Date().toISOString();
  const manager = { id: 'manager-linh', fullName: 'Linh Nguyễn', avatarId: 'thia', systemRole: 'MANAGER' };
  const mai = { id: 'staff-mai', fullName: 'Mai Phạm', avatarId: 'aurora', systemRole: 'STAFF' };
  const state = {
    failNextSend: true, failNextPublish: true, inboxError: false, sendPayloads: [], readPayloads: [], recipients: [], published: [],
    threads: [{ id: 'thread-linh', participant: manager, lastMessage: 'Ca sáng đã sẵn sàng', lastMessageAt: now, unreadCount: 2 }, { id: 'thread-huy', participant: { id: 'staff-huy', fullName: 'Huy Trần', avatarId: 'alex', systemRole: 'STAFF' }, lastMessage: 'Cảm ơn bạn nhé', lastMessageAt: now, unreadCount: 0 }],
    messages: [{ id: 'm1', sequence: 2, senderId: manager.id, senderName: manager.fullName, senderAvatarId: manager.avatarId, content: 'Bạn kiểm tra lịch giúp mình nhé.', createdAt: now }, { id: 'm2', sequence: 3, senderId: 'staff-redesign', senderName: 'Minh Anh', senderAvatarId: 'mew', content: 'Mình đã xem lịch rồi.', createdAt: now }],
    announcements: [{ id: 'a1', title: 'Nhắc lịch họp đội ngũ', content: longAnnouncement, authorName: manager.fullName, authorAvatarId: manager.avatarId, createdAt: now }],
  };
  await context.route('**/api/**', async route => {
    const request = route.request(), url = new URL(request.url()), p = url.pathname;
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-methods': '*', 'access-control-allow-headers': '*' };
    const fulfill = data => route.fulfill({ headers, json: data });
    const fail = message => route.fulfill({ status: 500, headers, json: { message } });
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (p === '/api/users/me') return fulfill({ id: 'staff-redesign', fullName: 'Minh Anh', email: 'message-ui@example.invalid', systemRole: role, avatarId: 'mew' });
    if (p.endsWith('/stores')) return fulfill([{ id: 's1', storeId: 's1', storeName: 'Cửa hàng Đồng Đội', status: 'ACTIVE' }, { id: 's2', storeId: 's2', storeName: 'Cửa hàng Trung tâm', status: 'ACTIVE' }]);
    if (p.endsWith('/messaging/contacts')) return fulfill([manager, mai, { id: 'staff-redesign', fullName: 'Minh Anh' }]);
    if (p.endsWith('/messaging/threads')) {
      if (request.method() === 'POST') { state.recipients.push(request.postDataJSON().recipientId); return fulfill({ id: 'thread-mai', participant: mai, unreadCount: 0 }); }
      if (state.inboxError) return fail('Chưa tải được hộp thư thử nghiệm.');
      return fulfill(state.threads);
    }
    if (p.endsWith('/threads/thread-linh/messages')) {
      if (request.method() === 'POST') {
        const payload = request.postDataJSON(); state.sendPayloads.push(payload); await pause(150);
        if (state.failNextSend) { state.failNextSend = false; return fail('Chưa gửi được tin nhắn thử nghiệm.'); }
        const message = { id: 'm3', sequence: 4, senderId: 'staff-redesign', senderName: 'Minh Anh', senderAvatarId: 'mew', content: payload.content, createdAt: now };
        state.messages = [...state.messages.filter(item => item.id !== message.id), message];
        state.threads[0] = { ...state.threads[0], lastMessage: payload.content, unreadCount: 0 };
        return fulfill(message);
      }
      if (url.searchParams.has('before')) return fulfill({ messages: [{ id: 'm0', sequence: 1, senderId: manager.id, senderName: manager.fullName, senderAvatarId: manager.avatarId, content: 'Tin nhắn trước ca.', createdAt: now }], nextBefore: null, hasMore: false });
      return fulfill({ messages: state.messages, nextBefore: 'older-cursor', hasMore: true });
    }
    if (/\/messaging\/threads\/[^/]+\/messages$/.test(p)) return fulfill({ messages: [], nextBefore: null, hasMore: false });
    if (/\/messaging\/threads\/[^/]+\/read$/.test(p)) { state.readPayloads.push(request.postDataJSON()); state.threads[0].unreadCount = 0; return fulfill({ unreadCount: 0 }); }
    if (p.endsWith('/messaging/announcements')) {
      if (request.method() === 'POST') {
        const payload = request.postDataJSON(); state.published.push(payload);
        if (state.failNextPublish) { state.failNextPublish = false; return fail('Chưa đăng được thông báo thử nghiệm.'); }
        const item = { id: 'a2', ...payload, authorName: 'Minh Anh', authorAvatarId: 'mew', createdAt: now }; state.announcements.unshift(item); return fulfill(item);
      }
      return fulfill(state.announcements);
    }
    if (p.endsWith('/messaging/unread-count')) return fulfill({ unreadCount: state.threads[0].unreadCount });
    if (p.endsWith('/unread-count')) return fulfill({ unreadCount: 0 });
    if (p.endsWith('/notifications/stream')) return route.fulfill({ headers, contentType: 'text/event-stream', body: 'event: connect\ndata: fixture\n\n' });
    return fulfill([]);
  });
  return state;
}

async function openInbox(page) {
  await page.goto('http://localhost:8085', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.getByRole('tab', { name: 'Nhắn tin', exact: true }).waitFor({ timeout: 60000 });
  await page.getByRole('tab', { name: 'Nhắn tin', exact: true }).click();
  await page.getByRole('button', { name: 'Nhắn tin với Linh Nguyễn, 2 tin chưa đọc', exact: true }).waitFor({ timeout: 60000 });
}
async function noOverflow(page, label) { assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, label); }

(async () => {
  const browser = await chromium.launch({ executablePath: path.resolve('qa-week2-2026-10-20/browsers/chromium-1248/chrome-win64/chrome.exe'), headless: true, args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
  const checks = [];
  try {
    if (process.argv.includes('--contacts-only')) {
      for (const width of [390, 320]) {
        const context = await browser.newContext({ viewport: { width, height: width === 320 ? 700 : 844 }, reducedMotion: 'no-preference' });
        await fixture(context); const page = await context.newPage(); await openInbox(page);
        await page.getByRole('button', { name: 'Soạn tin nhắn mới', exact: true }).click();
        const search = page.getByRole('textbox', { name: 'Tìm đồng nghiệp hoặc quản lý', exact: true });
        await search.fill('mai');
        await page.getByRole('button', { name: 'Nhắn tin với Mai Phạm', exact: true }).waitFor();
        await search.evaluate(element => element.blur()); await page.waitForTimeout(450);
        await page.screenshot({ path: path.join(out, `contacts-${width}.png`) });
        await context.close();
      }
      return;
    }
    for (const width of [390, 320]) {
      const context = await browser.newContext({ viewport: { width, height: width === 320 ? 700 : 844 }, reducedMotion: 'no-preference' });
      const state = await fixture(context);
      const page = await context.newPage(), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await openInbox(page); await page.waitForTimeout(650);
      await noOverflow(page, 'Inbox fits');
      const companionCard = page.getByTestId('messaging-companion-card').last();
      const raccoonBox = await companionCard.getByTestId('peek-raccoon-mascot').boundingBox();
      const companionBox = await companionCard.boundingBox();
      assert.ok(raccoonBox && companionBox && raccoonBox.width >= 180, 'Messaging raccoon is larger');
      assert.ok(Math.abs(raccoonBox.x + raccoonBox.width / 2 - companionBox.x - companionBox.width / 2) < 2, 'Messaging raccoon is centered on its card');
      await page.screenshot({ path: path.join(out, `messages-${width}.png`) });
      await page.getByRole('button', { name: 'Ẩn giới thiệu nhắn tin', exact: true }).click();
      await page.getByRole('button', { name: 'Nhắn tin với Linh Nguyễn, 2 tin chưa đọc', exact: true }).click();
      await page.getByText('Bạn kiểm tra lịch giúp mình nhé.', { exact: true }).waitFor();
      await page.getByText('Mình đã xem lịch rồi.', { exact: true }).waitFor();
      assert.equal(state.readPayloads[0]?.lastReadMessageId, 'm2');
      const input = page.getByRole('textbox', { name: 'Nội dung tin nhắn', exact: true });
      const send = page.getByRole('button', { name: 'Gửi tin nhắn', exact: true });
      await input.fill('Mình nhận ca sáng nhé.'); await send.click();
      await page.getByText('Chưa gửi được tin nhắn thử nghiệm.', { exact: true }).waitFor();
      assert.equal(await input.inputValue(), 'Mình nhận ca sáng nhé.', 'Failed send retains draft');
      await page.screenshot({ path: path.join(out, `conversation-error-${width}.png`) });
      const successfulSend = page.waitForResponse(response => response.url().endsWith('/threads/thread-linh/messages') && response.request().method() === 'POST' && response.ok());
      await send.click(); await successfulSend;
      await page.waitForFunction(element => element.value === '', await input.elementHandle());
      await page.getByTestId('messaging-message-m3').getByText('Mình nhận ca sáng nhé.', { exact: true }).waitFor();
      assert.equal(await input.inputValue(), '');
      assert.equal(state.sendPayloads.length, 2);
      assert.equal(state.sendPayloads[0].clientMessageId, state.sendPayloads[1].clientMessageId, 'Retry retains deduplication key');
      assert.equal(await page.getByTestId('messaging-message-m3').count(), 1, 'Only one sent message bubble is rendered');
      await noOverflow(page, 'Conversation fits');
      await page.screenshot({ path: path.join(out, `conversation-${width}.png`) });
      await page.getByText('Xem tin nhắn trước', { exact: true }).click();
      await page.getByText('Tin nhắn trước ca.', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Quay lại danh sách tin nhắn', exact: true }).click();
      await page.getByRole('button', { name: 'Nhắn tin với Linh Nguyễn', exact: true }).waitFor();
      await page.getByRole('button', { name: 'Soạn tin nhắn mới', exact: true }).click();
      const search = page.getByRole('textbox', { name: 'Tìm đồng nghiệp hoặc quản lý', exact: true });
      await search.fill('mai');
      await page.getByRole('button', { name: 'Nhắn tin với Mai Phạm', exact: true }).waitFor();
      await search.evaluate(element => element.blur()); await page.waitForTimeout(350);
      await noOverflow(page, 'Contact picker fits');
      await page.screenshot({ path: path.join(out, `contacts-${width}.png`) });
      await page.getByRole('button', { name: 'Nhắn tin với Mai Phạm', exact: true }).click();
      await page.getByText('Bắt đầu cuộc trò chuyện', { exact: true }).waitFor();
      assert.deepEqual(state.recipients, ['staff-mai']);
      assert.equal(await page.getByRole('button', { name: 'Gửi tin nhắn', exact: true }).isDisabled(), true);
      await page.getByRole('button', { name: 'Quay lại danh sách tin nhắn', exact: true }).click();
      await page.getByRole('tab', { name: 'Thông báo chung', exact: true }).click();
      await page.getByText('Nhắc lịch họp đội ngũ', { exact: true }).waitFor();
      assert.equal(await page.getByRole('button', { name: 'Đăng thông báo chung', exact: true }).count(), 0, 'Staff cannot publish');
      await page.getByRole('button', { name: 'Xem toàn bộ thông báo', exact: true }).click();
      await page.getByText(longAnnouncement, { exact: true }).waitFor();
      await page.screenshot({ path: path.join(out, `announcements-${width}.png`) });
      await page.getByRole('button', { name: 'Thu gọn thông báo', exact: true }).click();
      assert.deepEqual(errors, []);
      checks.push(`${width}px: inbox/unread, mark-read contract, send failure draft and retry key, successful send, older messages, contacts/search/new thread, announcements and staff role, no overflow/runtime errors`);
      console.log('PASS', checks.at(-1)); await context.close();
    }
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const state = await fixture(context, 'MANAGER');
    const page = await context.newPage(); await openInbox(page);
    await page.waitForTimeout(200);
    assert.equal(await page.locator('canvas').count(), 0, 'Reduced-motion inbox has static 3D previews');
    await page.getByRole('tab', { name: 'Thông báo chung', exact: true }).click();
    await page.getByRole('button', { name: 'Đăng thông báo chung', exact: true }).click();
    const title = page.getByRole('textbox', { name: 'Tiêu đề thông báo', exact: true });
    const body = page.getByRole('textbox', { name: 'Nội dung thông báo chung', exact: true });
    await title.fill('Họp trước ca'); await body.fill('Cả đội gặp nhau lúc 08:00 tại chi nhánh.');
    await page.getByRole('button', { name: 'Đăng thông báo', exact: true }).click();
    await page.getByText('Chưa đăng được thông báo thử nghiệm.', { exact: true }).waitFor();
    assert.equal(await title.inputValue(), 'Họp trước ca');
    assert.equal(await body.inputValue(), 'Cả đội gặp nhau lúc 08:00 tại chi nhánh.');
    await page.screenshot({ path: path.join(out, 'publish-manager-390.png') });
    await page.getByRole('button', { name: 'Đăng thông báo', exact: true }).click();
    await page.getByText('Họp trước ca', { exact: true }).waitFor();
    assert.equal(state.published.length, 2);
    checks.push('Manager: reduced motion and publish failure retains form, successful authorized publish');
    await context.close();
    fs.writeFileSync(path.join(out, 'messaging-checks.json'), JSON.stringify({ result: 'PASS', evidence: 'Intercepted API fixtures only; no messages or announcements sent to real accounts.', checks }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
