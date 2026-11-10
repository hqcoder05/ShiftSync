const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const output = path.resolve('output/peek-cards-2026-11-02');
fs.mkdirSync(output, { recursive: true });
(async () => {
  const root = process.cwd();
  const browser = await chromium.launch({ executablePath: path.resolve('qa-week2-2026-10-20/browsers/chromium-1248/chrome-win64/chrome.exe'), headless: true, args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1060, height: 410 } });
    await page.route('http://peek.local/**', route => {
      const requested = new URL(route.request().url()).pathname;
      if (requested === '/') return route.fulfill({ contentType: 'text/html', body: '<!doctype html><script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script>' });
      const file = path.resolve(root, '.' + requested);
      if (!file.startsWith(root + path.sep)) throw Error('Path escaped project');
      return route.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(file) });
    });
    await page.goto('http://peek.local/');
    const result = await page.evaluate(async () => {
      const THREE = await import('three');
      const { createAnimalScene, animateAnimalScene } = await import('/components/animalMascotScenes.js');
      const previews = (await import('/components/illustrationPreviews.js')).default;
      const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 20); camera.position.set(0, 1.5, 5.5); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
      const checks = [];
      for (const kind of ['peek-rabbit', 'peek-raccoon', 'peek-fox', 'notification-fox']) {
        const model = createAnimalScene(kind), character = model.userData.animals[0];
        let maxProjection = 0, minWave = Infinity, maxWave = -Infinity;
        for (let frame = 0; frame < 600; frame++) {
          const t = frame / 30;
          animateAnimalScene(model, t, 1 / 30, { engaged: frame % 180 < 120, x: Math.sin(t), y: Math.cos(t) });
          model.updateMatrixWorld(true);
          minWave = Math.min(minWave, character.userData.rig.arms[1].rotation.z); maxWave = Math.max(maxWave, character.userData.rig.arms[1].rotation.z);
          model.traverse(part => {
            if (!part.geometry) return;
            for (let ancestor = part; ancestor; ancestor = ancestor.parent) if (!ancestor.visible) return;
            part.geometry.computeBoundingBox(); const b = part.geometry.boundingBox;
            for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) {
              const p = new THREE.Vector3(x, y, z).applyMatrix4(part.matrixWorld).project(camera);
              if (![p.x, p.y, p.z].every(Number.isFinite)) throw Error(`${kind}: invalid transform`);
              maxProjection = Math.max(maxProjection, Math.abs(p.x), Math.abs(p.y));
            }
          });
        }
        if (maxProjection >= 1) throw Error(`${kind}: clipped ${maxProjection}`);
        if (maxWave - minWave < 0.45) throw Error(`${kind}: greeting is too subtle`);
        if (kind.startsWith('peek-') && (!character.userData.rig.legs.every(leg => !leg.visible) || !character.userData.rig.arms.every(arm => arm.userData.paw))) throw Error(`${kind}: missing card paws`);
        if (!previews[kind]?.uri) throw Error(`${kind}: missing fallback`);
        checks.push({ kind, poses: 600, maxProjection, waveRange: maxWave - minWave });
        const geometries = new Set(), materials = new Set();
        model.traverse(part => { if (part.geometry) geometries.add(part.geometry); if (part.material) materials.add(part.material); });
        geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); model.userData.disposableTextures.forEach(t => t.dispose());
      }
      document.body.style.cssText = 'margin:0;padding:24px;background:#f7f7f5;font-family:Arial,sans-serif;display:flex;gap:20px';
      for (const [kind, label] of [['rabbit','Thỏ'],['raccoon','Gấu mèo'],['fox','Cáo']]) {
        const outer = document.createElement('div'); outer.style.cssText = 'width:320px;position:relative;padding-top:42px;margin-top:10px';
        outer.innerHTML = `<div style="border:1px solid #e8e7e4;border-radius:23px;background:white;padding:20px 18px 16px;box-shadow:0 5px 13px #28313b0a"><div style="min-height:96px;padding-right:96px"><b style="font-size:20px;line-height:27px;color:#28313b">Tin mới đang chờ bạn</b><p style="font-size:12px;line-height:18px;color:#596572">Những cập nhật mới từ ca làm và đội ngũ.</p></div><div style="color:#a64028;font-size:12px;margin-top:10px;height:38px;display:flex;align-items:center">Tùy chỉnh thông báo →</div></div><div style="position:absolute;right:4px;top:-7px;height:113px;overflow:hidden"><img style="width:132px;height:132px" src="${previews[`peek-${kind}`].uri}"></div><p style="font-size:13px;text-align:center;color:#596572">${label}</p>`;
        document.body.appendChild(outer);
      }
      await Promise.all(Array.from(document.images).map(image => image.decode()));
      return checks;
    });
    assert.equal(result.length, 4);
    await page.screenshot({ path: path.join(output, 'peek-card-preview.png') });
    fs.writeFileSync(path.join(output, 'checks.json'), JSON.stringify({ result: 'PASS', checks: result }, null, 2));
    console.log('PASS: 2400 peeking poses, actual paws and waving, frame bounds, offline fallback assets.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
