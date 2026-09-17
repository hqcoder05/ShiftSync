import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Polygon, Rect, Stop } from 'react-native-svg';

/**
 * 3D Vector Geometry Helper
 */
function rotatePoint(x, y, z, rotX, rotY) {
  // Rotate around Y axis
  const cosY = Math.cos(rotY);
  const sinY = Math.sin(rotY);
  const x1 = x * cosY + z * sinY;
  const z1 = -x * sinY + z * cosY;

  // Rotate around X axis
  const cosX = Math.cos(rotX);
  const sinX = Math.sin(rotX);
  const y2 = y * cosX - z1 * sinX;
  const z2 = y * sinX + z1 * cosX;

  return { x: x1, y: y2, z: z2 };
}

function projectPoint(p, width, height, scale = 1.0, distance = 400) {
  const fov = distance / (distance + p.z);
  return {
    px: width / 2 + p.x * fov * scale,
    py: height / 2 - p.y * fov * scale,
    z: p.z,
  };
}

/**
 * Shade color based on polygon normal and light direction
 */
function shadeColor(color, factor) {
  let c = (color || '#FFFFFF').replace('#', '');
  if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  const num = parseInt(c, 16);
  if (isNaN(num)) return color;
  let r = (num >> 16) + Math.round(factor * 60);
  let g = ((num >> 8) & 0x00ff) + Math.round(factor * 60);
  let b = (num & 0x0000ff) + Math.round(factor * 60);
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));
  return '#' + (0x1000000 + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

/**
 * Builds 3D polygonal box mesh
 */
function createBoxMesh(x, y, z, w, h, d, color) {
  const hw = w / 2;
  const hh = h / 2;
  const hd = d / 2;

  const vertices = [
    { x: x - hw, y: y - hh, z: z - hd }, // 0
    { x: x + hw, y: y - hh, z: z - hd }, // 1
    { x: x + hw, y: y + hh, z: z - hd }, // 2
    { x: x - hw, y: y + hh, z: z - hd }, // 3
    { x: x - hw, y: y - hh, z: z + hd }, // 4
    { x: x + hw, y: y - hh, z: z + hd }, // 5
    { x: x + hw, y: y + hh, z: z + hd }, // 6
    { x: x - hw, y: y + hh, z: z + hd }, // 7
  ];

  return [
    { indices: [4, 5, 6, 7], color, normal: { x: 0, y: 0, z: 1 } },   // Front
    { indices: [1, 0, 3, 2], color, normal: { x: 0, y: 0, z: -1 } },  // Back
    { indices: [3, 2, 6, 7], color, normal: { x: 0, y: 1, z: 0 } },   // Top
    { indices: [0, 1, 5, 4], color, normal: { x: 0, y: -1, z: 0 } },  // Bottom
    { indices: [5, 1, 2, 6], color, normal: { x: 1, y: 0, z: 0 } },   // Right
    { indices: [0, 4, 7, 3], color, normal: { x: -1, y: 0, z: 0 } },  // Left
  ].map(face => ({ ...face, vertices }));
}

/**
 * Avatar3DPreview Component
 * Native 3D Polygon Rendering with 360 Rotation & Breathing Animation
 */
export default function Avatar3DPreview({
  avatar,
  size = 240,
  autoRotate = true,
  showControls = true,
}) {
  const [rotY, setRotY] = useState(0.35); // Horizontal rotation in radians
  const [rotX, setRotX] = useState(0.08); // Subtle vertical tilt
  const [isAutoSpinning, setIsAutoSpinning] = useState(autoRotate);
  const [time, setTime] = useState(0);

  const lastTouchRef = useRef({ x: 0, y: 0 });

  // Real-time animation loop for breathing and subtle idle sway
  useEffect(() => {
    let animId;
    let localTime = 0;
    const loop = () => {
      localTime += 0.04;
      setTime(localTime);
      if (isAutoSpinning) {
        setRotY(prev => (prev + 0.018) % (Math.PI * 2));
      }
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isAutoSpinning]);

  // Touch PanResponder for 360 rotation
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        setIsAutoSpinning(false);
        lastTouchRef.current = { x: evt.nativeEvent.pageX, y: evt.nativeEvent.pageY };
      },
      onPanResponderMove: (evt) => {
        const dx = evt.nativeEvent.pageX - lastTouchRef.current.x;
        const dy = evt.nativeEvent.pageY - lastTouchRef.current.y;
        lastTouchRef.current = { x: evt.nativeEvent.pageX, y: evt.nativeEvent.pageY };

        setRotY(prev => (prev + dx * 0.02) % (Math.PI * 2));
        setRotX(prev => Math.max(-0.4, Math.min(0.4, prev - dy * 0.015)));
      },
    })
  ).current;

  // Derive kinematics & breathing
  const bobbing = Math.sin(time * 2) * 3;
  const armSway = Math.sin(time * 2) * 0.08;

  // Generate 3D character mesh boxes
  const p = avatar?.palette || {
    skin: '#FDE68A',
    hair: '#27272A',
    shirt: '#F8FAFC',
    outfit: '#78350F',
    pants: '#334155',
    shoes: '#FFFFFF',
    accent: '#B45309',
  };

  const props = avatar?.props || {};

  // Build modular 3D character parts
  const meshParts = [
    // Legs & Shoes
    ...createBoxMesh(-18, -65, 0, 14, 50, 15, p.pants),
    ...createBoxMesh(18, -65, 0, 14, 50, 15, p.pants),
    ...createBoxMesh(-18, -94, 3, 16, 11, 20, p.shoes),
    ...createBoxMesh(18, -94, 3, 16, 11, 20, p.shoes),

    // Torso (Bobbing with breathing)
    ...createBoxMesh(0, -10 + bobbing, 0, 52, 64, 30, p.shirt),
    // Outfit overlay / Apron / Vest / Blazer
    ...createBoxMesh(0, -14 + bobbing, 2, 54, 56, 32, p.outfit),

    // Left Arm
    ...createBoxMesh(-34, -12 + bobbing, armSway * 14, 13, 44, 15, p.outfit),
    ...createBoxMesh(-34, -40 + bobbing, armSway * 14, 11, 13, 13, p.skin),

    // Right Arm
    ...createBoxMesh(34, -12 + bobbing, -armSway * 14, 13, 44, 15, p.outfit),
    ...createBoxMesh(34, -40 + bobbing, -armSway * 14, 11, 13, 13, p.skin),

    // Head (Bobbing & tilting)
    ...createBoxMesh(0, 46 + bobbing, 0, 44, 44, 40, p.skin),
    // Hair Cap
    ...createBoxMesh(0, 62 + bobbing, -2, 46, 18, 42, p.hair),
    ...createBoxMesh(0, 55 + bobbing, 19, 42, 11, 7, p.hair), // Bangs

    // Eyes
    ...createBoxMesh(-11, 44 + bobbing, 21, 5, 5, 2, '#0F172A'),
    ...createBoxMesh(11, 44 + bobbing, 21, 5, 5, 2, '#0F172A'),
    // Blush
    ...createBoxMesh(-15, 37 + bobbing, 20.5, 7, 3, 1, '#FB7185'),
    ...createBoxMesh(15, 37 + bobbing, 20.5, 7, 3, 1, '#FB7185'),
  ];

  // Headwear Prop
  if (props.headwear === 'beret') {
    meshParts.push(...createBoxMesh(3, 70 + bobbing, 0, 52, 13, 48, p.accent || '#78350F'));
  } else if (props.headwear === 'toque') {
    meshParts.push(...createBoxMesh(0, 77 + bobbing, 0, 42, 30, 38, '#FFFFFF'));
  } else if (props.headwear === 'peakedCap' || props.headwear === 'securityCap' || props.headwear === 'cap') {
    meshParts.push(...createBoxMesh(0, 66 + bobbing, 4, 48, 13, 44, p.outfit));
    meshParts.push(...createBoxMesh(0, 62 + bobbing, 26, 40, 4, 18, '#18181B')); // Visor
  } else if (props.headwear === 'headset') {
    meshParts.push(...createBoxMesh(0, 68 + bobbing, 0, 50, 4, 4, '#38BDF8'));
    meshParts.push(...createBoxMesh(24, 46 + bobbing, 0, 5, 13, 13, '#0284C7')); // Ear pad
  }

  // Arm Prop
  if (props.tool === 'pitcher') {
    meshParts.push(...createBoxMesh(36, -42 + bobbing, 10, 13, 18, 13, '#E2E8F0'));
  } else if (props.tool === 'tablet') {
    meshParts.push(...createBoxMesh(-37, -35 + bobbing, 14, 22, 28, 4, '#1E293B'));
    meshParts.push(...createBoxMesh(-37, -35 + bobbing, 16.5, 18, 24, 1, '#38BDF8')); // Screen
  } else if (props.tool === 'clipboard') {
    meshParts.push(...createBoxMesh(-37, -35 + bobbing, 14, 20, 26, 3, '#78350F'));
    meshParts.push(...createBoxMesh(-37, -35 + bobbing, 16, 16, 20, 1, '#F8FAFC')); // Paper
  } else if (props.tool === 'tray') {
    meshParts.push(...createBoxMesh(0, -30 + bobbing, 24, 40, 3, 28, '#E2E8F0'));
  }

  // Transform, project, lighting & Z-Sort all faces
  const lightDir = { x: 0.55, y: 0.8, z: 0.65 };
  const lightMag = Math.sqrt(lightDir.x ** 2 + lightDir.y ** 2 + lightDir.z ** 2);
  const normLight = { x: lightDir.x / lightMag, y: lightDir.y / lightMag, z: lightDir.z / lightMag };

  const renderedFaces = [];
  meshParts.forEach(face => {
    // Rotate vertices
    const rotatedVerts = face.vertices.map(v => rotatePoint(v.x, v.y, v.z, rotX, rotY));

    // Rotate normal
    const rotNormal = rotatePoint(face.normal.x, face.normal.y, face.normal.z, rotX, rotY);

    // Backface culling: skip faces pointing away from the camera
    if (rotNormal.z <= -0.05) return;

    // Calculate center Z for painter's algorithm
    let avgZ = 0;
    const projectedVerts = face.indices.map(idx => {
      const rv = rotatedVerts[idx];
      avgZ += rv.z;
      return projectPoint(rv, size, size, 0.95, 450);
    });
    avgZ /= face.indices.length;

    // Diffuse lighting intensity
    const dot = Math.max(0, rotNormal.x * normLight.x + rotNormal.y * normLight.y + rotNormal.z * normLight.z);
    const shaded = shadeColor(face.color, (dot - 0.5) * 0.7);

    // SVG Polygon points string
    const pointsStr = projectedVerts.map(pt => `${pt.px.toFixed(1)},${pt.py.toFixed(1)}`).join(' ');

    renderedFaces.push({
      points: pointsStr,
      color: shaded,
      z: avgZ,
    });
  });

  // Sort back-to-front
  renderedFaces.sort((a, b) => a.z - b.z);

  const rotDegrees = Math.round((((rotY % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) * (180 / Math.PI));

  return (
    <View style={[styles.container, { width: size }]}>
      {/* 3D Viewport with PanResponder */}
      <View style={[styles.canvasWrapper, { width: size, height: size }]} {...panResponder.panHandlers}>
        <Svg width={size} height={size}>
          <Defs>
            <LinearGradient id="shadowGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#0F172A" stopOpacity="0.35" />
              <Stop offset="100%" stopColor="#0F172A" stopOpacity="0" />
            </LinearGradient>
          </Defs>

          {/* Ground Contact Shadow */}
          <Ellipse
            cx={size / 2}
            cy={size / 2 + 95}
            rx={45}
            ry={12}
            fill="url(#shadowGrad)"
          />

          {/* 3D Polygonal Faces */}
          {renderedFaces.map((f, i) => (
            <Polygon key={i} points={f.points} fill={f.color} />
          ))}
        </Svg>
      </View>

      {/* 360 Interaction Control Pill */}
      {showControls && (
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={[styles.badgePill, isAutoSpinning && styles.badgePillActive]}
            onPress={() => setIsAutoSpinning(prev => !prev)}
            activeOpacity={0.7}
          >
            <Text style={[styles.badgeText, isAutoSpinning && styles.badgeTextActive]}>
              {isAutoSpinning ? '❚❚ Tạm dừng xoay' : '↻ Tự động xoay 360°'}
            </Text>
          </TouchableOpacity>

          <View style={styles.angleIndicator}>
            <Text style={styles.angleText}>{rotDegrees}°</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  canvasWrapper: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 4,
    marginTop: 8,
  },
  badgePill: {
    backgroundColor: '#EEF2F6',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  badgePillActive: {
    backgroundColor: '#51A33D',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  badgeTextActive: {
    color: '#FFFFFF',
  },
  angleIndicator: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  angleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
});