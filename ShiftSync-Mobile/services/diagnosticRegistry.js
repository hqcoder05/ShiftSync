const makeResult = (name, stage, status, error = null) => ({
  name,
  stage,
  status,
  error: error ? String(error.message || error) : null,
  stack: error?.stack || null,
  timestamp: new Date().toISOString(),
});

const runImport = async (name, stage, loader, validate = () => true) => {
  try {
    const value = await loader();
    if (!validate(value)) throw new Error(`Module loaded but export validation failed: ${name}`);
    return makeResult(name, stage, 'PASS');
  } catch (error) {
    return makeResult(name, stage, 'FAIL', error);
  }
};

export async function runMobileDiagnostics() {
  const results = [];
  results.push(makeResult('CORE', 'CORE_RENDER', 'PASS'));
  results.push(await runImport('EXPO_MODULES', 'EXPO_MODULES_IMPORT', () => import('expo-modules-core'), (m) => typeof m.requireNativeModule === 'function'));
  results.push(await runImport('CAMERA_IMPORT', 'CAMERA_IMPORT', () => import('expo-camera'), (m) => typeof m.CameraView === 'function'));
  results.push(await runImport('THREE_IMPORT', 'THREE_IMPORT', () => import('three'), (m) => typeof m.Scene === 'function'));
  results.push(await runImport('EXPO_GL_IMPORT', 'EXPO_GL_IMPORT', () => import('expo-gl')));
  results.push(await runImport('R3F_IMPORT', 'R3F_IMPORT', () => import('@react-three/fiber/native'), (m) => typeof m.Canvas === 'function'));
  results.push(makeResult('CANVAS_MOUNT', 'CANVAS_MOUNT', 'SKIPPED'));
  results.push(makeResult('MINIMAL_SCENE', 'MINIMAL_SCENE', 'SKIPPED'));
  results.push(await runImport('AVATAR_3D_IMPORT', 'AVATAR_3D_IMPORT', () => import('../components/Avatar3D.native'), (m) => typeof m.default === 'function'));
  results.push(await runImport('FLOWER_3D_IMPORT', 'FLOWER_3D_IMPORT', () => import('../components/FlowerMascot3D.native'), (m) => typeof m.default === 'function'));
  return results;
}

