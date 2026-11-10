const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const root = process.cwd();
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || path.resolve('qa-week2-2026-10-20/browsers/chromium-1248/chrome-win64/chrome.exe'),
    headless: true, args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'],
  });
  try {
    const page = await browser.newPage();
    await page.route('http://illustrations.local/**', async route => {
      const requested = new URL(route.request().url()).pathname;
      if (requested === '/') return route.fulfill({ contentType: 'text/html', body: '<!doctype html><script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script>' });
      const file = path.resolve(root, '.' + requested);
      if (!file.startsWith(root + path.sep)) throw Error('Path escaped project root');
      return route.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(file) });
    });
    await page.goto('http://illustrations.local/');
    const previews = await page.evaluate(async () => {
      const THREE = await import('three');
      const { createIllustration } = await import('/components/illustrationScene.js');
      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
      renderer.setSize(384, 384); renderer.setPixelRatio(1);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
      const scene = new THREE.Scene();
      scene.add(new THREE.HemisphereLight('#FFF9EF', '#B5BAD8', 2.3));
      for (const [position, color, intensity] of [[[-3,5,5],'#FFF3DE',3],[[4,2,-1],'#E8EDFF',2]]) {
        const light = new THREE.DirectionalLight(color, intensity); light.position.set(...position); scene.add(light);
      }
      const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 20); camera.position.set(0,1.5,5.5); camera.lookAt(0,0,0);
      const result = {};
      for (const kind of ['income','calendar','clock','request','swap','messages','help','kiro','sora','hako','shift-buddies','rabbit','deer','frog','tiger','beaver','raccoon','fox','notification-fox','peek-rabbit','peek-raccoon','peek-fox']) {
        const width = kind === 'shift-buddies' ? 576 : 384;
        const height = kind === 'shift-buddies' ? 360 : 384;
        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        const model = createIllustration(kind); scene.add(model); renderer.render(scene,camera);
        result[kind] = { uri: renderer.domElement.toDataURL('image/png') }; scene.remove(model);
        const geometries = new Set(), materials = new Set();
        model.traverse(part => { if(part.geometry)geometries.add(part.geometry);if(part.material)materials.add(part.material); });
        geometries.forEach(item=>item.dispose());materials.forEach(item=>item.dispose());
        model.userData.disposableTextures?.forEach(item=>item.dispose());
      }
      renderer.dispose(); return result;
    });
    fs.writeFileSync('components/illustrationPreviews.js', '// Generated 3D previews. Run node scripts/generate-illustrations.cjs to update.\nexport default '+JSON.stringify(previews)+';\n');
    console.log('Rendered '+Object.keys(previews).length+' bundled 3D illustrations.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
