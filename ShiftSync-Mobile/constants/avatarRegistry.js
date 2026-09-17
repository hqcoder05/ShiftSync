/**
 * avatarRegistry.js
 * Canonical 17-Avatar System for ShiftSync Mobile.
 * 
 * Source of truth for all workforce character identities, 3D definitions,
 * role uniforms, skin/hair palettes, and fallback 2D assets.
 */

export const AVATAR_ROSTER = [
  {
    id: 'dilan',
    name: 'Dilan Jon',
    role: 'Barista Lead',
    department: 'Pha chế (Barista)',
    roleCategory: 'barista',
    gender: 'Nam',
    source: require('../assets/avatar-dilan-jon.png'),
    badgeText: 'Lead',
    palette: {
      skin: '#FDE68A',      // Warm
      hair: '#27272A',      // Dark
      shirt: '#F8FAFC',     // White
      outfit: '#78350F',    // Espresso apron
      pants: '#334155',     // Navy trousers
      shoes: '#FFFFFF',
      accent: '#B45309',
    },
    props: { headwear: 'beret', tool: 'pitcher' },
    description: 'Trưởng ca pha chế kinh nghiệm với trang phục tạp dề espresso và ca đánh sữa inox.'
  },
  {
    id: 'mew',
    name: 'Mew Ama',
    role: 'Head Barista',
    department: 'Pha chế (Barista)',
    roleCategory: 'barista',
    gender: 'Nữ',
    source: require('../assets/avatar-mew-ama.png'),
    badgeText: 'Expert',
    palette: {
      skin: '#FEE2E2',      // Fair
      hair: '#451A03',      // Brown
      shirt: '#F8FAFC',
      outfit: '#78350F',
      pants: '#18181B',
      shoes: '#FFFFFF',
      accent: '#D97706',
    },
    props: { headwear: 'beret', tool: 'none' },
    description: 'Chuyên gia pha chế phong cách thanh lịch với mũ nồi beret và tạp dề nâu đậm.'
  },
  {
    id: 'paul',
    name: 'Paul Lee',
    role: 'Senior Cashier',
    department: 'Thu ngân (Cashier)',
    roleCategory: 'cashier',
    gender: 'Nam',
    source: require('../assets/avatar-paul-lee.png'),
    badgeText: 'POS',
    palette: {
      skin: '#E2B788',      // Tan
      hair: '#27272A',      // Dark
      shirt: '#F8FAFC',
      outfit: '#0284C7',    // Cyan Navy
      pants: '#334155',
      shoes: '#27272A',
      accent: '#38BDF8',
    },
    props: { headwear: 'headset', tool: 'tablet' },
    description: 'Thu ngân kỳ cựu với tai nghe bộ đàm điều phối và máy tính bảng order POS di động.'
  },
  {
    id: 'thia',
    name: 'Thia Ago',
    role: 'Express Cashier',
    department: 'Thu ngân (Cashier)',
    roleCategory: 'cashier',
    gender: 'Nữ',
    source: require('../assets/avatar-thia-ago.png'),
    badgeText: 'POS',
    palette: {
      skin: '#FEE2E2',      // Fair
      hair: '#27272A',      // Dark
      shirt: '#F8FAFC',
      outfit: '#0284C7',    // Cyan Navy
      pants: '#18181B',
      shoes: '#FFFFFF',
      accent: '#38BDF8',
    },
    props: { headwear: 'headset', tool: 'tablet' },
    description: 'Nhân viên thu ngân nhanh nhẹn với đồng phục xanh dương và tablet nhận diện khách.'
  },
  {
    id: 'alex',
    name: 'Alex Morgan',
    role: 'Store Manager',
    department: 'Quản lý (Management)',
    roleCategory: 'manager',
    gender: 'Nam',
    source: require('../assets/avatar-paul-lee.png'),
    badgeText: 'Manager',
    palette: {
      skin: '#FDE68A',
      hair: '#27272A',
      shirt: '#FFFFFF',
      outfit: '#374151',    // Charcoal Blazer
      pants: '#1F2937',
      shoes: '#111827',
      accent: '#6366F1',    // Indigo lanyard
    },
    props: { headwear: 'hair', tool: 'tablet' },
    description: 'Giám đốc cửa hàng chuẩn chỉ với áo blazer xám than và dây đeo thẻ quản lý.'
  },
  {
    id: 'sarah',
    name: 'Sarah Jenkins',
    role: 'Shift Supervisor',
    department: 'Quản lý (Management)',
    roleCategory: 'manager',
    gender: 'Nữ',
    source: require('../assets/avatar-thia-ago.png'),
    badgeText: 'Supervisor',
    palette: {
      skin: '#FEE2E2',
      hair: '#451A03',
      shirt: '#FFFFFF',
      outfit: '#1E3A8A',    // Royal Navy Blazer
      pants: '#334155',
      shoes: '#1E293B',
      accent: '#3B82F6',
    },
    props: { headwear: 'hair', tool: 'clipboard' },
    description: 'Giám sát ca làm việc tận tâm với đồng phục vest thanh lịch và bảng kiểm kê ca.'
  },
  {
    id: 'gordon',
    name: 'Gordon Cole',
    role: 'Executive Chef',
    department: 'Bếp (Kitchen)',
    roleCategory: 'kitchen',
    gender: 'Nam',
    source: require('../assets/avatar-dilan-jon.png'),
    badgeText: 'Chef',
    palette: {
      skin: '#FEE2E2',
      hair: '#27272A',
      shirt: '#FFFFFF',
      outfit: '#FFFFFF',    // Crisp Chef White
      pants: '#18181B',
      shoes: '#27272A',
      accent: '#EF4444',
    },
    props: { headwear: 'toque', tool: 'none' },
    description: 'Bếp trưởng tiêu chuẩn quốc tế với mũ toque blanche trắng muốt và tạp dề bếp.'
  },
  {
    id: 'elena',
    name: 'Elena Rostova',
    role: 'Pastry Baker',
    department: 'Bếp (Kitchen)',
    roleCategory: 'kitchen',
    gender: 'Nữ',
    source: require('../assets/avatar-mew-ama.png'),
    badgeText: 'Baker',
    palette: {
      skin: '#FDE68A',
      hair: '#451A03',
      shirt: '#FFFFFF',
      outfit: '#F1F5F9',
      pants: '#475569',
      shoes: '#FFFFFF',
      accent: '#F59E0B',
    },
    props: { headwear: 'toque', tool: 'tray' },
    description: 'Thợ làm bánh ngọt thủ công với khay bánh thơm ngon và trang phục bếp gọn gàng.'
  },
  {
    id: 'marcus',
    name: 'Marcus Vance',
    role: 'Head of Security',
    department: 'An ninh (Security)',
    roleCategory: 'security',
    gender: 'Nam',
    source: require('../assets/avatar-paul-lee.png'),
    badgeText: 'Security',
    palette: {
      skin: '#E2B788',
      hair: '#27272A',
      shirt: '#0F172A',
      outfit: '#1E293B',    // Tactical Navy
      pants: '#0F172A',
      shoes: '#09090B',
      accent: '#F59E0B',    // Gold badge
    },
    props: { headwear: 'peakedCap', tool: 'none' },
    description: 'Đội trưởng an ninh uy nghiêm với mũ lưỡi trai quân phục và huy hiệu kim loại vàng.'
  },
  {
    id: 'kenji',
    name: 'Kenji Sato',
    role: 'Floor Guard',
    department: 'An ninh (Security)',
    roleCategory: 'security',
    gender: 'Nam',
    source: require('../assets/avatar-dilan-jon.png'),
    badgeText: 'Guard',
    palette: {
      skin: '#FDE68A',
      hair: '#27272A',
      shirt: '#1E293B',
      outfit: '#334155',
      pants: '#0F172A',
      shoes: '#18181B',
      accent: '#FBBF24',
    },
    props: { headwear: 'securityCap', tool: 'none' },
    description: 'Nhân viên bảo vệ sảnh chu đáo, duy trì trật tự và an toàn cho toàn bộ cửa hàng.'
  },
  {
    id: 'lucas',
    name: 'Lucas Silva',
    role: 'Warehouse Lead',
    department: 'Kho vận (Stock & Logistics)',
    roleCategory: 'stock',
    gender: 'Nam',
    source: require('../assets/avatar-paul-lee.png'),
    badgeText: 'Stock',
    palette: {
      skin: '#E2B788',
      hair: '#451A03',
      shirt: '#F8FAFC',
      outfit: '#EA580C',    // High-Vis Orange
      pants: '#1E293B',
      shoes: '#27272A',
      accent: '#FDBA74',
    },
    props: { headwear: 'cap', tool: 'clipboard' },
    description: 'Quản lý kho nguyên vật liệu năng động với áo phản quang cam và bìa kẹp xuất nhập kho.'
  },
  {
    id: 'maya',
    name: 'Maya Lin',
    role: 'Inventory Specialist',
    department: 'Kho vận (Stock & Logistics)',
    roleCategory: 'stock',
    gender: 'Nữ',
    source: require('../assets/avatar-mew-ama.png'),
    badgeText: 'Inventory',
    palette: {
      skin: '#FEE2E2',
      hair: '#27272A',
      shirt: '#F8FAFC',
      outfit: '#EA580C',
      pants: '#334155',
      shoes: '#FFFFFF',
      accent: '#FED7AA',
    },
    props: { headwear: 'cap', tool: 'tablet' },
    description: 'Chuyên viên kiểm kê tồn kho chính xác với áo bảo hộ và máy quét mã vạch di động.'
  },
  {
    id: 'chloe',
    name: 'Chloe Bennett',
    role: 'Head Server',
    department: 'Phục vụ (Service)',
    roleCategory: 'server',
    gender: 'Nữ',
    source: require('../assets/avatar-thia-ago.png'),
    badgeText: 'Server',
    palette: {
      skin: '#FEE2E2',
      hair: '#451A03',
      shirt: '#F8FAFC',
      outfit: '#10B981',    // Emerald Green Apron
      pants: '#18181B',
      shoes: '#FFFFFF',
      accent: '#34D399',
    },
    props: { headwear: 'hair', tool: 'tray' },
    description: 'Trưởng nhóm phục vụ bàn ân cần với tạp dề xanh ngọc bích và khay inox phục vụ.'
  },
  {
    id: 'david',
    name: 'David Kim',
    role: 'Dining Attendant',
    department: 'Phục vụ (Service)',
    roleCategory: 'server',
    gender: 'Nam',
    source: require('../assets/avatar-dilan-jon.png'),
    badgeText: 'Server',
    palette: {
      skin: '#FDE68A',
      hair: '#27272A',
      shirt: '#F8FAFC',
      outfit: '#10B981',
      pants: '#334155',
      shoes: '#FFFFFF',
      accent: '#6EE7B7',
    },
    props: { headwear: 'hair', tool: 'tray' },
    description: 'Nhân viên chăm sóc bàn ăn chu đáo, hỗ trợ tiếp đón khách hàng nhiệt tình.'
  },
  {
    id: 'olivia',
    name: 'Olivia Chen',
    role: 'Customer Care',
    department: 'Thu ngân (Cashier)',
    roleCategory: 'cashier',
    gender: 'Nữ',
    source: require('../assets/avatar-mew-ama.png'),
    badgeText: 'Care',
    palette: {
      skin: '#FEE2E2',
      hair: '#27272A',
      shirt: '#F8FAFC',
      outfit: '#2563EB',    // Royal Blue Uniform
      pants: '#1E293B',
      shoes: '#FFFFFF',
      accent: '#60A5FA',
    },
    props: { headwear: 'headset', tool: 'none' },
    description: 'Chuyên viên chăm sóc khách hàng và giải quyết yêu cầu với tai nghe tương tác trực tiếp.'
  },
  {
    id: 'ryan',
    name: 'Ryan Cooper',
    role: 'Logistics Runner',
    department: 'Kho vận (Stock & Logistics)',
    roleCategory: 'stock',
    gender: 'Nam',
    source: require('../assets/avatar-paul-lee.png'),
    badgeText: 'Runner',
    palette: {
      skin: '#E2B788',
      hair: '#27272A',
      shirt: '#1E293B',
      outfit: '#F97316',
      pants: '#0F172A',
      shoes: '#27272A',
      accent: '#FB923C',
    },
    props: { headwear: 'cap', tool: 'clipboard' },
    description: 'Nhân viên luân chuyển hàng hóa nhanh giữa các trạm kho và quầy pha chế.'
  },
  {
    id: 'sophia',
    name: 'Sophia Taylor',
    role: 'Artisan Barista',
    department: 'Pha chế (Barista)',
    roleCategory: 'barista',
    gender: 'Nữ',
    source: require('../assets/avatar-thia-ago.png'),
    badgeText: 'Artisan',
    palette: {
      skin: '#FDE68A',
      hair: '#451A03',
      shirt: '#F8FAFC',
      outfit: '#92400E',    // Warm Mocha Apron
      pants: '#18181B',
      shoes: '#FFFFFF',
      accent: '#F59E0B',
    },
    props: { headwear: 'beret', tool: 'pitcher' },
    description: 'Thợ pha chế cà phê nghệ thuật Latte Art tinh tế với mũ beret và tạp dề mocha.'
  }
];

export const CANONICAL_AVATAR_COUNT = AVATAR_ROSTER.length;

export function getAvatarById(id) {
  if (!id) return AVATAR_ROSTER[0];
  const found = AVATAR_ROSTER.find(a => a.id.toLowerCase() === String(id).toLowerCase());
  return found || AVATAR_ROSTER[0];
}

export function getAvatarForEmployee(employee) {
  if (!employee) return AVATAR_ROSTER[0];
  const name = (employee.fullName || employee.name || '').toLowerCase();
  
  if (name.includes('dilan')) return getAvatarById('dilan');
  if (name.includes('mew')) return getAvatarById('mew');
  if (name.includes('paul')) return getAvatarById('paul');
  if (name.includes('thia')) return getAvatarById('thia');
  if (name.includes('alex')) return getAvatarById('alex');
  if (name.includes('sarah')) return getAvatarById('sarah');
  if (name.includes('gordon')) return getAvatarById('gordon');
  if (name.includes('elena')) return getAvatarById('elena');
  if (name.includes('marcus')) return getAvatarById('marcus');
  if (name.includes('kenji')) return getAvatarById('kenji');
  if (name.includes('lucas')) return getAvatarById('lucas');
  if (name.includes('maya')) return getAvatarById('maya');
  if (name.includes('chloe')) return getAvatarById('chloe');
  if (name.includes('david')) return getAvatarById('david');
  if (name.includes('olivia')) return getAvatarById('olivia');
  if (name.includes('ryan')) return getAvatarById('ryan');
  if (name.includes('sophia')) return getAvatarById('sophia');

  const role = (employee.skillName || employee.role || employee.position || '').toLowerCase();
  if (role.includes('barista') || role.includes('pha chế')) return getAvatarById('dilan');
  if (role.includes('cashier') || role.includes('thu ngân')) return getAvatarById('paul');
  if (role.includes('bếp') || role.includes('kitchen') || role.includes('cook')) return getAvatarById('gordon');
  if (role.includes('kho') || role.includes('stock')) return getAvatarById('lucas');
  if (role.includes('an ninh') || role.includes('bảo vệ') || role.includes('security')) return getAvatarById('marcus');
  if (role.includes('quản lý') || role.includes('manager')) return getAvatarById('alex');
  if (role.includes('phục vụ') || role.includes('server')) return getAvatarById('chloe');

  return AVATAR_ROSTER[0];
}