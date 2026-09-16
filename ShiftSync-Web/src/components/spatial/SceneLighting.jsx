
/**
 * SceneLighting
 * Clean enterprise architectural lighting:
 * - Hemisphere light for gentle sky/ground contrast
 * - Directional key light casting soft shadows
 * - Subtle warm fill light
 */
export default function SceneLighting() {
  return (
    <>
      {/* Gentle ambient / hemisphere fill */}
      <hemisphereLight
        skyColor="#FFFFFF"
        groundColor="#CBD5E1"
        intensity={0.65}
      />

      {/* Main directional sun / key light */}
      <directionalLight
        position={[18, 26, 16]}
        intensity={1.1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.5}
        shadow-camera-far={60}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-bias={-0.0005}
      />

      {/* Subtle soft directional fill from opposite side */}
      <directionalLight
        position={[-14, 15, -12]}
        intensity={0.35}
        color="#F8FAFC"
      />
    </>
  );
}
