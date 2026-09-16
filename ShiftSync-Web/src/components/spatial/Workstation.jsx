
/**
 * Workstation
 * Minimalist, modern architectural furniture representing key store workstations.
 */
export default function Workstation({ type = 'counter', position = [0, 0, 0], rotation = [0, 0, 0] }) {
  if (type === 'barista') {
    return (
      <group position={position} rotation={rotation}>
        {/* Main Barista Counter Table */}
        <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.4, 0.9, 0.9]} />
          <meshStandardMaterial color="#E2E8F0" roughness={0.4} />
        </mesh>
        {/* Counter Top Wood/Granite */}
        <mesh position={[0, 0.92, 0]} castShadow>
          <boxGeometry args={[2.5, 0.05, 1.0]} />
          <meshStandardMaterial color="#334155" roughness={0.3} />
        </mesh>
        {/* Espresso Machine */}
        <mesh position={[-0.4, 1.15, 0]} castShadow>
          <boxGeometry args={[0.7, 0.4, 0.5]} />
          <meshStandardMaterial color="#64748B" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Coffee Grinder */}
        <mesh position={[0.4, 1.18, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.15, 0.45, 12]} />
          <meshStandardMaterial color="#1E293B" metalness={0.7} roughness={0.3} />
        </mesh>
      </group>
    );
  }

  if (type === 'pos') {
    return (
      <group position={position} rotation={rotation}>
        {/* Checkout Counter */}
        <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.8, 0.9, 0.8]} />
          <meshStandardMaterial color="#F1F5F9" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.92, 0]} castShadow>
          <boxGeometry args={[1.9, 0.04, 0.85]} />
          <meshStandardMaterial color="#0284C7" roughness={0.3} />
        </mesh>
        {/* POS Screen */}
        <mesh position={[0, 1.12, 0]} rotation={[0.2, 0, 0]} castShadow>
          <boxGeometry args={[0.38, 0.28, 0.04]} />
          <meshStandardMaterial color="#0F172A" roughness={0.2} />
        </mesh>
        {/* POS Stand */}
        <mesh position={[0, 0.98, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.05, 0.12, 8]} />
          <meshStandardMaterial color="#64748B" metalness={0.5} />
        </mesh>
      </group>
    );
  }

  if (type === 'kitchen') {
    return (
      <group position={position} rotation={rotation}>
        {/* Stainless Steel Prep Table */}
        <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.2, 0.88, 1.0]} />
          <meshStandardMaterial color="#CBD5E1" metalness={0.85} roughness={0.2} />
        </mesh>
        {/* Shelf unit */}
        <mesh position={[0, 1.3, -0.35]} castShadow>
          <boxGeometry args={[2.0, 0.04, 0.3]} />
          <meshStandardMaterial color="#94A3B8" metalness={0.8} roughness={0.3} />
        </mesh>
      </group>
    );
  }

  if (type === 'dining') {
    return (
      <group position={position} rotation={rotation}>
        {/* Dining Table */}
        <mesh position={[0, 0.38, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.7, 0.7, 0.05, 16]} />
          <meshStandardMaterial color="#E2E8F0" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.18, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 0.36, 8]} />
          <meshStandardMaterial color="#64748B" />
        </mesh>
        <mesh position={[0, 0.01, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 0.02, 16]} />
          <meshStandardMaterial color="#94A3B8" />
        </mesh>
      </group>
    );
  }

  // Retail Product & Shoe Display Rack
  if (type === 'display') {
    return (
      <group position={position} rotation={rotation}>
        {/* Tiered Display Base */}
        <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.0, 0.5, 0.9]} />
          <meshStandardMaterial color="#F8FAFC" roughness={0.3} />
        </mesh>
        {/* Tier 2 Shelf */}
        <mesh position={[0, 0.65, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.6, 0.3, 0.6]} />
          <meshStandardMaterial color="#E2E8F0" roughness={0.35} />
        </mesh>
        {/* Tier 3 Pedestal */}
        <mesh position={[0, 0.95, 0]} castShadow>
          <boxGeometry args={[1.2, 0.3, 0.35]} />
          <meshStandardMaterial color="#8B5CF6" roughness={0.4} />
        </mesh>
        {/* Spotlights / Accent rail */}
        <mesh position={[-0.7, 1.4, 0]} castShadow>
          <cylinderGeometry args={[0.02, 0.02, 0.8, 8]} />
          <meshStandardMaterial color="#334155" metalness={0.7} />
        </mesh>
        <mesh position={[0.7, 1.4, 0]} castShadow>
          <cylinderGeometry args={[0.02, 0.02, 0.8, 8]} />
          <meshStandardMaterial color="#334155" metalness={0.7} />
        </mesh>
      </group>
    );
  }

  // Salon Styling & Beauty Mirror Station
  if (type === 'styling') {
    return (
      <group position={position} rotation={rotation}>
        {/* Vanity Table */}
        <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.6, 0.84, 0.6]} />
          <meshStandardMaterial color="#1E293B" roughness={0.4} />
        </mesh>
        {/* Marble Countertop */}
        <mesh position={[0, 0.86, 0]} castShadow>
          <boxGeometry args={[1.65, 0.04, 0.65]} />
          <meshStandardMaterial color="#F1F5F9" roughness={0.2} />
        </mesh>
        {/* Tall Illuminated Mirror Frame */}
        <mesh position={[0, 1.45, -0.28]} castShadow>
          <boxGeometry args={[1.4, 1.15, 0.04]} />
          <meshStandardMaterial color="#EC4899" roughness={0.3} metalness={0.2} />
        </mesh>
        {/* Mirror Reflective Glass */}
        <mesh position={[0, 1.45, -0.25]}>
          <boxGeometry args={[1.26, 1.01, 0.02]} />
          <meshStandardMaterial color="#E0F2FE" roughness={0.1} metalness={0.9} />
        </mesh>
        {/* Styling Chair */}
        <mesh position={[0, 0.28, 0.55]} castShadow>
          <cylinderGeometry args={[0.26, 0.26, 0.08, 16]} />
          <meshStandardMaterial color="#334155" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.14, 0.55]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 0.28, 8]} />
          <meshStandardMaterial color="#CBD5E1" metalness={0.8} />
        </mesh>
      </group>
    );
  }

  // Storage / Warehouse Industrial Shelves
  if (type === 'storage') {
    return (
      <group position={position} rotation={rotation}>
        {/* Steel Rack Posts */}
        {[-0.85, 0.85].map((x, i) => (
          <group key={i} position={[x, 0.9, 0]}>
            <mesh position={[0, 0, -0.3]} castShadow>
              <boxGeometry args={[0.06, 1.8, 0.06]} />
              <meshStandardMaterial color="#475569" metalness={0.6} />
            </mesh>
            <mesh position={[0, 0, 0.3]} castShadow>
              <boxGeometry args={[0.06, 1.8, 0.06]} />
              <meshStandardMaterial color="#475569" metalness={0.6} />
            </mesh>
          </group>
        ))}
        {/* Shelving Boards */}
        {[0.1, 0.65, 1.2, 1.75].map((y, idx) => (
          <mesh key={idx} position={[0, y, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.8, 0.04, 0.7]} />
            <meshStandardMaterial color="#94A3B8" metalness={0.5} roughness={0.4} />
          </mesh>
        ))}
        {/* Storage Boxes */}
        <mesh position={[-0.4, 0.35, 0]} castShadow>
          <boxGeometry args={[0.45, 0.38, 0.5]} />
          <meshStandardMaterial color="#D97706" roughness={0.7} />
        </mesh>
        <mesh position={[0.3, 0.35, 0]} castShadow>
          <boxGeometry args={[0.55, 0.38, 0.5]} />
          <meshStandardMaterial color="#B45309" roughness={0.7} />
        </mesh>
        <mesh position={[0.1, 0.9, 0]} castShadow>
          <boxGeometry args={[0.5, 0.35, 0.45]} />
          <meshStandardMaterial color="#D97706" roughness={0.7} />
        </mesh>
      </group>
    );
  }

  // Customer Service / Reception Desk
  if (type === 'service') {
    return (
      <group position={position} rotation={rotation}>
        <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.0, 1.0, 0.75]} />
          <meshStandardMaterial color="#0F172A" roughness={0.4} />
        </mesh>
        <mesh position={[0, 1.02, 0]} castShadow>
          <boxGeometry args={[2.1, 0.05, 0.8]} />
          <meshStandardMaterial color="#0D9488" roughness={0.3} />
        </mesh>
        {/* Service Badge / Sign */}
        <mesh position={[0, 0.7, 0.39]}>
          <planeGeometry args={[0.6, 0.2]} />
          <meshStandardMaterial color="#10B981" />
        </mesh>
      </group>
    );
  }

  // Generic Modern Workstation Desk
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.6, 0.8, 0.8]} />
        <meshStandardMaterial color="#E2E8F0" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.82, 0]} castShadow>
        <boxGeometry args={[1.7, 0.04, 0.85]} />
        <meshStandardMaterial color="#64748B" roughness={0.3} />
      </mesh>
    </group>
  );
}
