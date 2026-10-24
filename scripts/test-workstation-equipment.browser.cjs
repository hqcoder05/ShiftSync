// Run with the connected Playwright browser_run_code tool. All inventory below is test fixtures.
async (page) => {
 await page.goto('http://127.0.0.1:3000/login');
 const pending = [];
 const calls = [];
 await page.route('**/api/stores/*/workstations/*/equipment', async route => {
  const url = route.request().url(); calls.push(url);
  if (url.includes('/slow/')) { pending.push(route); return; }
  if (url.includes('/error/')) return route.fulfill({ status: 500, json: {} });
  if (url.includes('/empty/')) return route.fulfill({ json: [] });
  return route.fulfill({ json: [{ id: 'fixture', name: 'Test POS', code: 'T1', type: 'POS', status: 'MAINTENANCE' }] });
 });
 await page.evaluate(async () => {
  const reactModule = await import('/node_modules/.vite/deps/react.js');
  const React = reactModule.default || reactModule;
  const clientModule = await import('/node_modules/.vite/deps/react-dom_client.js');
  const { createRoot } = clientModule.default || clientModule;
  const { default: Equipment } = await import('/src/features/spatial-workspace/components/WorkstationEquipment.jsx');
  const host = document.createElement('div'); host.id = 'equipment-test'; document.body.append(host);
  const root = createRoot(host);
  window.mountEquipment = (storeId, workstationId) => root.render(React.createElement(Equipment, { storeId, workstationId }));
  window.mountEquipment('slow', 'station1');
 });
 const panel = page.locator('#equipment-test');
 await panel.getByRole('status').waitFor();
 await page.waitForTimeout(100);
 await page.evaluate(() => window.mountEquipment('empty', 'station2'));
 await panel.getByText('Trạm chưa có thiết bị được ghi nhận.').waitFor();
 for (const route of pending) await route.fulfill({ json: [{ id: 'stale', name: 'STALE DATA' }] }).catch(() => {});
 if ((await panel.innerText()).includes('STALE')) throw new Error('Stale response leaked');
 await page.evaluate(() => window.mountEquipment('good', 'station3'));
 await panel.getByText('Test POS', { exact: true }).waitFor();
 if (!(await panel.innerText()).includes('Bảo trì')) throw new Error('Missing equipment status');
 await page.evaluate(() => window.mountEquipment('error', 'station4'));
 await panel.getByRole('alert').waitFor();
 const count = calls.length;
 await panel.getByRole('button', { name: 'Thử lại' }).click();
 await page.waitForFunction(() => document.querySelector('#equipment-test [role="alert"]'));
 if (calls.length <= count) throw new Error('Retry did not request inventory');
 await page.evaluate(() => window.mountEquipment(null, null));
 await panel.getByText('Chưa chọn trạm.').waitFor();
 await page.unroute('**/api/stores/*/workstations/*/equipment');
 return { passed: ['loading', 'empty', 'store/station switch and stale response', 'equipment and status', 'API error', 'retry', 'clear selection'], calls: calls.length };
}
