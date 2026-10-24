// Component integration fixture. Run with browser_run_code_unsafe, against the local Vite server.
async (page) => {
 await page.setViewportSize({ width: 1920, height: 1080 });
 await page.goto('http://127.0.0.1:3000/login');
 const records = [];
 let saveCalls = 0;
 await page.route('**/api/stores/ui-test/workstations/*/equipment**', async route => {
  const method = route.request().method();
  if (method === 'GET') return route.fulfill({ json: records });
  saveCalls++;
  const data = route.request().postDataJSON();
  if (data.code === 'DUPLICATE') return route.fulfill({ status: 409, json: {} });
  if (data.code === 'ERROR') return route.fulfill({ status: 500, json: {} });
  const item = { ...data, id: 'equipment-fixture', workstationId: 'station' };
  records.splice(0, records.length, item);
  return route.fulfill({ json: item });
 });
 await page.evaluate(async () => {
  const rm = await import('/node_modules/.vite/deps/react.js'); const React = rm.default || rm;
  const cm = await import('/node_modules/.vite/deps/react-dom_client.js'); const { createRoot } = cm.default || cm;
  const { default: Toolbar } = await import('/src/features/spatial-workspace/components/SpatialToolbar.jsx');
  const { default: Inspector } = await import('/src/features/spatial-workspace/components/SpatialInspector.jsx');
  document.documentElement.dataset.theme='light';
  document.body.style.overflow='hidden';
  const host = document.createElement('div'); host.id='explorer-ui-fixture';
  Object.assign(host.style,{position:'fixed',inset:'0',zIndex:'9999',background:'var(--ss-bg)',overflow:'hidden'}); document.body.append(host);
  const root = createRoot(host);
  window.uiCalls = [];
  window.uiState = { mode:'OVERVIEW', open:true, editable:true, layers:{showFurniture:true,showStaff:true,showAttendance:true} };
  const station = {id:'station',name:'Trạm kiểm thử giao diện',code:'TEST',zoneName:'Khu vực kiểm thử',capacity:1};
  const zone = {id:'zone',name:'Khu vực kiểm thử'};
  window.renderUi = () => {
   const state = window.uiState;
   const changeMode = mode => { state.mode=mode; window.uiCalls.push(mode); window.renderUi(); };
   root.render(React.createElement(React.Fragment,null,
    React.createElement(Toolbar,{storeName:'Store Explorer · Kiểm thử giao diện',zonesCount:1,staffCount:0,currentMode:state.mode,selectedZone:zone,selectedWorkstation:station,isDrawerOpen:state.open,layers:state.layers,
     onToggleDrawer:()=>{state.open=!state.open;window.renderUi();},
     onOverviewCamera:()=>changeMode('OVERVIEW'),onFocusSelectedZone:()=>changeMode('FOCUS_ZONE'),onFocusSelectedWorkstation:()=>changeMode('FOCUS_WORKSTATION'),onResetCamera:()=>changeMode('OVERVIEW'),
     onToggleLayer:key=>{state.layers={...state.layers,[key]:!state.layers[key]};window.renderUi();}}),
    React.createElement(Inspector,{isOpen:state.open,onClose:()=>{state.open=false;window.renderUi();},storeId:'ui-test',selectedWorkstation:station,workstations:[station],zones:[zone],canEditLayout:state.editable,workstationOccupancies:new Map(),onClearSelection:()=>{},onFocusWorkstation:()=>changeMode('FOCUS_WORKSTATION')})
   ));
  };window.renderUi();
 });
 await page.getByRole('group',{name:'Nội dung trạm'}).getByRole('button',{name:'Thiết bị',exact:true}).click();
 const panel = page.getByRole('region',{name:'Thiết bị tại trạm'});
 await panel.getByText(/Trạm chưa có thiết bị/).waitFor();
 await page.locator('#btn-mode-zone').click();
 if (await page.locator('#btn-mode-zone').getAttribute('aria-pressed') !== 'true') throw new Error('Zone mode not active');
 await page.locator('#btn-mode-workstation').click();
 if (await page.locator('#btn-mode-workstation').getAttribute('aria-pressed') !== 'true') throw new Error('Station mode not active');
 const attendance = page.getByRole('button',{name:'Điểm danh',exact:true});
 await attendance.click();
 const layers = await page.evaluate(()=>window.uiState.layers);
 if (layers.showAttendance || !layers.showStaff || !layers.showFurniture) throw new Error('Layers not independent');
 await page.locator('#btn-toggle-layers').click();
 await page.getByLabel('Tùy chọn không gian').waitFor();
 await page.keyboard.press('Escape');
 if (await page.getByLabel('Tùy chọn không gian').count()) throw new Error('Escape does not close options');
 await panel.getByRole('button',{name:'Thêm thiết bị',exact:true}).click();
 const form = panel.getByRole('form');
 await form.getByLabel('Tên thiết bị').fill('Thiết bị kiểm thử');
 await form.getByLabel('Mã thiết bị').fill('DUPLICATE');
 await form.getByLabel('Loại thiết bị').fill('POS');
 await form.getByRole('button',{name:'Lưu thiết bị'}).click();
 await form.getByRole('alert').filter({hasText:'Mã thiết bị đã tồn tại'}).waitFor();
 await form.getByLabel('Mã thiết bị').fill('ERROR');
 await form.getByRole('button',{name:'Lưu thiết bị'}).click();
 await form.getByRole('alert').filter({hasText:'Không lưu được'}).waitFor();
 if (await form.getByLabel('Tên thiết bị').inputValue() !== 'Thiết bị kiểm thử') throw new Error('Draft lost on error');
 await form.getByLabel('Mã thiết bị').fill('POS-TEST');
 await form.getByRole('button',{name:'Lưu thiết bị'}).click();
 await panel.getByText('Đã thêm thiết bị.',{exact:true}).waitFor();
 await panel.getByRole('button',{name:'Sửa Thiết bị kiểm thử'}).click();
 await form.getByLabel('Trạng thái',{exact:true}).selectOption('MAINTENANCE');
 await form.getByRole('button',{name:'Lưu thiết bị'}).click();
 await panel.getByText('Đã cập nhật thiết bị.',{exact:true}).waitFor();
 await panel.getByText('Bảo trì',{exact:true}).waitFor();
 await page.screenshot({path:'D:/ThucTapTotNghiep/ShiftSync/.playwright-mcp/explorer-ui-wide.png'});
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'D:/ThucTapTotNghiep/ShiftSync/.playwright-mcp/explorer-ui-narrow.png'});
 const overflow = await page.evaluate(()=>{const host=document.querySelector('#explorer-ui-fixture');return host.scrollWidth>host.clientWidth;});
 if (overflow) throw new Error('Narrow viewport overflows horizontally');
 await page.evaluate(()=>{window.uiState.editable=false;window.renderUi();});
 if (await panel.getByRole('button',{name:'Thêm thiết bị',exact:true}).count() || await panel.getByRole('button',{name:'Sửa Thiết bị kiểm thử'}).count()) throw new Error('Viewer has editing controls');
 await page.evaluate(()=>document.documentElement.dataset.theme='dark');
 await page.screenshot({path:'D:/ThucTapTotNghiep/ShiftSync/.playwright-mcp/explorer-ui-dark.png'});
 await page.unroute('**/api/stores/ui-test/workstations/*/equipment**');
 return {passed:['camera mode actions','independent layer toggles','options Escape','empty inventory','create','edit status','duplicate code error','API error preserves draft','viewer read-only','narrow overflow'],saveCalls};
}
