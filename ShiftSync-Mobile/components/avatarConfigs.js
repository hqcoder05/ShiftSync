/**
 * avatarConfigs.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Danh mục 18 Avatar 3D Low-Poly phong phú, đa dạng tuyệt đối về diện mạo,
 * màu da, kiểu tóc, phụ kiện (mũ len beanie, mũ lưỡi trai, tai nghe gaming,
 * kính trí thức, râu quai nón...) và biểu cảm phong phú (chớp mắt, nháy mắt,
 * ngạc nhiên 'oh', cười tươi) cho toàn bộ hệ thống ShiftSync.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const AVATAR_OPTIONS = [
  {
    id: 'dilan',
    label: 'Dilan',
    icon: '⚡',
    description: 'Tóc ngắn cá tính, mắt quả hạnh',
    props: {
      skinColor: '#F4C5A3',
      hairColor: '#2b2b2b',
      hairStyle: 'short',
      eyeColor: '#3A86FF',
      eyeShape: 'almond',
      noseStyle: 'button',
      mouthStyle: 'smile',
      accessory: 'none',
    },
  },
  {
    id: 'mew',
    label: 'Mew',
    icon: '🐱',
    description: 'Búi tóc cam san hô, mắt tròn hiền hòa',
    props: {
      skinColor: '#FFDDBB',
      hairColor: '#FF5722',
      hairStyle: 'bun',
      eyeColor: '#4CAF50',
      eyeShape: 'round',
      noseStyle: 'button',
      mouthStyle: 'smile',
      accessory: 'none',
    },
  },
  {
    id: 'paul',
    label: 'Paul',
    icon: '🔥',
    description: 'Mohawk mạnh mẽ, nụ cười tươi',
    props: {
      skinColor: '#795548',
      hairColor: '#111111',
      hairStyle: 'mohawk',
      eyeColor: '#795548',
      eyeShape: 'almond',
      noseStyle: 'broad',
      mouthStyle: 'grin',
      accessory: 'none',
    },
  },
  {
    id: 'thia',
    label: 'Thia',
    icon: '✨',
    description: 'Tóc dài bồng bềnh, cười nhếch mép nhẹ',
    props: {
      skinColor: '#C68642',
      hairColor: '#3E2723',
      hairStyle: 'long',
      eyeColor: '#FF9800',
      eyeShape: 'wide',
      noseStyle: 'pointed',
      mouthStyle: 'smirk',
      accessory: 'none',
    },
  },
  {
    id: 'alex',
    label: 'Alex',
    icon: '🌊',
    description: 'Tóc xoăn xanh lam năng động, mắt to tròn',
    props: {
      skinColor: '#E0AC69',
      hairColor: '#1E88E5',
      hairStyle: 'curly',
      eyeColor: '#00BCD4',
      eyeShape: 'round',
      noseStyle: 'pointed',
      mouthStyle: 'smile',
      accessory: 'none',
    },
  },
  {
    id: 'kai',
    label: 'Kai',
    icon: '🎯',
    description: 'Tóc nhọn xám bạc, mắt ngọc bích sắc sảo',
    props: {
      skinColor: '#FFE0BD',
      hairColor: '#607D8B',
      hairStyle: 'spiky',
      eyeColor: '#009688',
      eyeShape: 'almond',
      noseStyle: 'pointed',
      mouthStyle: 'smirk',
      accessory: 'none',
    },
  },
  {
    id: 'maya',
    label: 'Maya',
    icon: '🌙',
    description: 'Tóc sóng tím huyền bí, làn da nâu cuốn hút',
    props: {
      skinColor: '#8D5524',
      hairColor: '#673AB7',
      hairStyle: 'wavy',
      eyeColor: '#E91E63',
      eyeShape: 'wide',
      noseStyle: 'button',
      mouthStyle: 'smile',
      accessory: 'none',
    },
  },
  {
    id: 'leo',
    label: 'Leo',
    icon: '🦁',
    description: 'Vương miện tóc Afro độc đáo, nụ cười vui tươi',
    props: {
      skinColor: '#D79E75',
      hairColor: '#212121',
      hairStyle: 'afro',
      eyeColor: '#FFC107',
      eyeShape: 'round',
      noseStyle: 'broad',
      mouthStyle: 'grin',
      accessory: 'none',
    },
  },
  {
    id: 'zack',
    label: 'Zack',
    icon: '🚀',
    description: 'Tóc ngắn hiện đại, mắt xanh băng rạng ngời',
    props: {
      skinColor: '#F5CBA7',
      hairColor: '#4E342E',
      hairStyle: 'short',
      eyeColor: '#29B6F6',
      eyeShape: 'wide',
      noseStyle: 'pointed',
      mouthStyle: 'open',
      accessory: 'none',
    },
  },
  // ── 8 NHÂN VẬT MỚI ĐỘC ĐÁO & KHÁC BIỆT ──
  {
    id: 'felix',
    label: 'Felix',
    icon: '🧶',
    description: 'Mũ len Beanie vàng mù tạt cá tính',
    props: {
      skinColor: '#FBE4D8',
      hairColor: '#3E2723',
      hairStyle: 'beanie',
      accessoryColor: '#FBC02D',
      eyeColor: '#43A047',
      eyeShape: 'round',
      noseStyle: 'button',
      mouthStyle: 'smile',
      accessory: 'beanie',
    },
  },
  {
    id: 'kenji',
    label: 'Kenji',
    icon: '🧢',
    description: 'Mũ lưỡi trai snapback thể thao sành điệu',
    props: {
      skinColor: '#E5B995',
      hairColor: '#212121',
      hairStyle: 'cap',
      accessoryColor: '#D32F2F',
      eyeColor: '#37474F',
      eyeShape: 'almond',
      noseStyle: 'pointed',
      mouthStyle: 'smirk',
      accessory: 'cap',
    },
  },
  {
    id: 'chloe',
    label: 'Chloe',
    icon: '🌿',
    description: 'Tóc Bob vàng bạch kim thời thượng',
    props: {
      skinColor: '#FFF0E5',
      hairColor: '#F0E68C',
      hairStyle: 'bob',
      eyeColor: '#8E24AA',
      eyeShape: 'wide',
      noseStyle: 'button',
      mouthStyle: 'smile',
      accessory: 'none',
    },
  },
  {
    id: 'aria',
    label: 'Aria',
    icon: '🎀',
    description: 'Đuôi ngựa cao đỏ rượu vang rực lửa',
    props: {
      skinColor: '#F5D0B5',
      hairColor: '#C2185B',
      hairStyle: 'ponytail',
      eyeColor: '#FF6F00',
      eyeShape: 'almond',
      noseStyle: 'pointed',
      mouthStyle: 'grin',
      accessory: 'none',
    },
  },
  {
    id: 'malik',
    label: 'Malik',
    icon: '⭐',
    description: 'Tóc bện Dreadlocks mạnh mẽ, da ngăm khỏe khoắn',
    props: {
      skinColor: '#5D4037',
      hairColor: '#1A1A1A',
      hairStyle: 'dreadlocks',
      eyeColor: '#FFA000',
      eyeShape: 'round',
      noseStyle: 'broad',
      mouthStyle: 'grin',
      accessory: 'none',
    },
  },
  {
    id: 'rin',
    label: 'Rin',
    icon: '🎧',
    description: 'Tai nghe gaming phát sáng, tóc xanh mint',
    props: {
      skinColor: '#FFE7D9',
      hairColor: '#00BFA5',
      hairStyle: 'short',
      accessoryColor: '#6200EA',
      eyeColor: '#00E676',
      eyeShape: 'wide',
      noseStyle: 'button',
      mouthStyle: 'smile',
      accessory: 'headphones',
    },
  },
  {
    id: 'victor',
    label: 'Victor',
    icon: '👓',
    description: 'Kính gọng tri thức, phong thái học giả',
    props: {
      skinColor: '#F2C9AC',
      hairColor: '#37474F',
      hairStyle: 'short',
      accessoryColor: '#263238',
      eyeColor: '#0288D1',
      eyeShape: 'almond',
      noseStyle: 'pointed',
      mouthStyle: 'smile',
      accessory: 'glasses',
    },
  },
  {
    id: 'marcus',
    label: 'Marcus',
    icon: '🧔',
    description: 'Râu quai nón phong trần lịch lãm',
    props: {
      skinColor: '#BA8C63',
      hairColor: '#3E2723',
      hairStyle: 'wavy',
      accessoryColor: '#3E2723',
      eyeColor: '#4E342E',
      eyeShape: 'almond',
      noseStyle: 'broad',
      mouthStyle: 'smirk',
      accessory: 'beard',
    },
  },
];

export function getAvatar3DProps(id) {
  const found = AVATAR_OPTIONS.find(a => a.id === id);
  if (found) return found.props;
  // Fallback map by name or default
  if (id && typeof id === 'string') {
    const lower = id.toLowerCase();
    const matched = AVATAR_OPTIONS.find(a => lower.includes(a.id) || a.id.includes(lower));
    if (matched) return matched.props;
  }
  return AVATAR_OPTIONS[0].props;
}

export function getAvatarById(id) {
  const found = AVATAR_OPTIONS.find(a => a.id === id);
  if (found) return found;
  if (id && typeof id === 'string') {
    const lower = id.toLowerCase();
    const matched = AVATAR_OPTIONS.find(a => lower.includes(a.id) || a.id.includes(lower));
    if (matched) return matched;
  }
  return AVATAR_OPTIONS[0];
}

export function getAvatarForEmployee(emp) {
  if (!emp) return 'dilan';
  if (typeof emp === 'string') return emp;
  if (emp.avatarId) return emp.avatarId;
  const name = emp.fullName || emp.name || emp.email || '';
  if (!name) return 'dilan';
  const charCode = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const index = charCode % AVATAR_OPTIONS.length;
  return AVATAR_OPTIONS[index].id;
}

