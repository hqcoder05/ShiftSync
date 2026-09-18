import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  PanResponder,
  Platform,
  TouchableOpacity,
} from 'react-native';
import Svg, { Rect, Path, G, Defs, LinearGradient, Stop, Circle } from 'react-native-svg';
import Avatar3D from './Avatar3D';

/**
 * EmployeeCard3D.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Thẻ nhân viên 3D siêu chân thực (Ultra-Realistic 3D Smart Badge):
 *  - Cảm giác 3D ngay cả khi KHÔNG xoay:
 *      + Góc nghiêng phối cảnh 3D tự nhiên (Resting Isometric Tilt & Idle Float)
 *      + Khe bấm dây đeo (Lanyard slot / Metal clasp cutout) tạo hình dáng thẻ đeo vật lý
 *      + Viền vát nổi 3D (3D Bevel) & Hiệu ứng phản quang bóng kính (Glossy specular reflection)
 *      + Đổ bóng 2 tầng sâu thẳm (Layered depth drop-shadow)
 *      + Hiệu ứng rê chuột 3D Parallax mượt mà trên Web (hover tilt)
 *  - Mặt trước: Giữ trọn vẹn thông tin nhân viên (Avatar 3D, Tên, Mã NV, Cửa hàng, Địa chỉ)
 *  - Mặt sau: Thay thế hoàn toàn bằng THÔNG TIN CÁ NHÂN (Ngày sinh, Nơi sinh, SĐT, Giới tính, Email)
 *             Kèm nút "Chỉnh sửa thông tin" và "Lật mặt trước"
 */
export default function EmployeeCard3D({
  profile = {},
  selectedAvatarId = 'dilan',
  getAvatar3DProps,
  onOpenAvatarPicker,
  onEditPersonalInfo,
}) {
  const [isFlipped, setIsFlipped] = useState(false);
  const animatedValue = useRef(new Animated.Value(0)).current;
  const tiltX = useRef(new Animated.Value(0)).current;
  const tiltY = useRef(new Animated.Value(0)).current;
  const idleAnim = useRef(new Animated.Value(0)).current;

  // Hiệu ứng idle float nhẹ nhàng tạo độ sâu không gian 3D liên tục
  useEffect(() => {
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(idleAnim, {
          toValue: 1,
          duration: 3200,
          useNativeDriver: true,
        }),
        Animated.timing(idleAnim, {
          toValue: 0,
          duration: 3200,
          useNativeDriver: true,
        }),
      ])
    );
    floatLoop.start();
    return () => floatLoop.stop();
  }, []);

  // Lật thẻ 180°
  const handleFlip = () => {
    const toValue = isFlipped ? 0 : 180;
    Animated.spring(animatedValue, {
      toValue,
      friction: 7,
      tension: 12,
      useNativeDriver: true,
    }).start();
    setIsFlipped(!isFlipped);
  };

  // PanResponder cho cảm ứng chạm trên Mobile
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 6 || Math.abs(gestureState.dy) > 6;
      },
      onPanResponderMove: (_, gestureState) => {
        const rotateY = Math.max(-18, Math.min(18, gestureState.dx * 0.12));
        const rotateX = Math.max(-16, Math.min(16, -gestureState.dy * 0.12));
        tiltY.setValue(rotateY);
        tiltX.setValue(rotateX);
      },
      onPanResponderRelease: () => {
        Animated.spring(tiltX, { toValue: 0, friction: 6, useNativeDriver: true }).start();
        Animated.spring(tiltY, { toValue: 0, friction: 6, useNativeDriver: true }).start();
      },
    })
  ).current;

  // Hỗ trợ Hover Parallax 3D trên Web
  const handleWebMouseMove = (e) => {
    if (Platform.OS !== 'web') return;
    try {
      const rect = e.currentTarget?.getBoundingClientRect?.();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotY = ((x - centerX) / centerX) * 14;
      const rotX = -((y - centerY) / centerY) * 12;
      tiltY.setValue(rotY);
      tiltX.setValue(rotX);
    } catch (_) {}
  };

  const handleWebMouseLeave = () => {
    if (Platform.OS !== 'web') return;
    Animated.spring(tiltX, { toValue: 0, friction: 6, useNativeDriver: true }).start();
    Animated.spring(tiltY, { toValue: 0, friction: 6, useNativeDriver: true }).start();
  };

  // Kết hợp góc nghiêng idle float (3° -> 5.5°) và góc nghiêng tương tác (tiltX, tiltY)
  const idleRotateX = idleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [2.5, 5],
  });

  const idleRotateY = idleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-4.5, -1.5],
  });

  const idleTranslateY = idleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-3, 3],
  });

  // Interpolate góc xoay lật mặt trước và mặt sau
  const frontRotateY = Animated.add(Animated.add(tiltY, idleRotateY), animatedValue).interpolate({
    inputRange: [-20, 0, 180, 200],
    outputRange: ['-20deg', '0deg', '180deg', '200deg'],
  });

  const backRotateY = Animated.add(Animated.add(tiltY, idleRotateY), animatedValue).interpolate({
    inputRange: [-20, 0, 180, 200],
    outputRange: ['160deg', '180deg', '360deg', '380deg'],
  });

  const totalRotateX = Animated.add(tiltX, idleRotateX).interpolate({
    inputRange: [-20, 20],
    outputRange: ['-20deg', '20deg'],
  });

  // Opacity lật để chống glitch khi qua 90°
  const frontOpacity = animatedValue.interpolate({
    inputRange: [89, 90],
    outputRange: [1, 0],
  });

  const backOpacity = animatedValue.interpolate({
    inputRange: [90, 91],
    outputRange: [0, 1],
  });

  const frontAnimatedStyle = {
    transform: [
      { perspective: 1400 },
      { translateY: idleTranslateY },
      { rotateX: totalRotateX },
      { rotateY: frontRotateY },
    ],
    opacity: frontOpacity,
  };

  const backAnimatedStyle = {
    transform: [
      { perspective: 1400 },
      { translateY: idleTranslateY },
      { rotateX: totalRotateX },
      { rotateY: backRotateY },
    ],
    opacity: backOpacity,
  };

  const staffCode = profile.staffCode || 'NV-472EE9';
  const fullName = profile.fullName || 'Nhân viên';
  const position = profile.position || 'Chưa phân công vị trí';
  const storeName = profile.storeName || 'highlands';
  const storeAddress = profile.storeAddress || 'Phường Tây Thạnh, Thành phố Hồ Chí Minh, 72009, Việt Nam';

  // Thông tin cá nhân mặt sau
  const birthDate = profile.birthDate || 'Chưa cập nhật';
  const birthPlace = profile.birthPlace || 'Chưa cập nhật';
  const phone = profile.phone || 'Chưa cập nhật';
  const gender = profile.gender || 'Chưa cập nhật';
  const email = profile.email || 'Chưa cập nhật';

  return (
    <View
      style={styles.cardWrapper}
      {...(Platform.OS === 'web'
        ? {
            onMouseMove: handleWebMouseMove,
            onMouseLeave: handleWebMouseLeave,
          }
        : {})}
    >
      {/* ═══ KHE ĐEO DÂY THẺ (LANYARD SLOT / METAL CLASP) ═══ */}
      <View style={styles.lanyardClaspContainer}>
        <View style={styles.claspStrap} />
        <View style={styles.claspMetalClip}>
          <View style={styles.claspSlotHole} />
        </View>
      </View>

      {/* ═══ KHỐI ĐỔ BÓNG 3D PHÍA DƯỚI THẺ (SHADOW DEPTH BACKPLATE) ═══ */}
      <Animated.View
        style={[
          styles.shadowPlate,
          {
            transform: [
              { perspective: 1400 },
              { translateY: idleTranslateY },
              { rotateX: totalRotateX },
              { rotateY: isFlipped ? backRotateY : frontRotateY },
            ],
          },
        ]}
      />

      <View style={styles.cardContainer} {...panResponder.panHandlers}>
        {/* ══════════════════════════════════════════════════════════
            MẶT TRƯỚC (GIỮ NGUYÊN THÔNG TIN + GIAO DIỆN CHUẨN)
        ══════════════════════════════════════════════════════════ */}
        <Animated.View style={[styles.cardCommon, styles.cardFront, frontAnimatedStyle]}>
          {/* Lớp phản quang vệt sáng bóng kính (Gloss specular reflection) */}
          <View pointerEvents="none" style={styles.glossySheenLayer} />

          {/* Lỗ khoét thẻ đeo (Lanyard slot punched cutout) */}
          <View style={styles.cardPunchHoleWrap}>
            <View style={styles.cardPunchHoleInner} />
          </View>

          {/* Hàng Header: Chip bảo mật + Nút Lật 3D */}
          <View style={styles.frontTopRow}>
            {/* Chip thông minh vi mạch mạ vàng */}
            <View style={styles.smartChipBox}>
              <View style={styles.chipGoldPad}>
                <View style={styles.chipCircuitH} />
                <View style={styles.chipCircuitV} />
                <View style={styles.chipCore} />
              </View>
              <Text style={styles.smartChipText}>SMART ID</Text>
            </View>

            {/* Nút lật thẻ 3D */}
            <TouchableOpacity
              onPress={handleFlip}
              activeOpacity={0.8}
              style={styles.flipBadgeTop}
              accessibilityLabel="Lật thẻ mặt sau"
            >
              <Text style={styles.flipBadgeText}>3D Flip • Chạm để lật thẻ</Text>
            </TouchableOpacity>
          </View>

          {/* Avatar + Tên + Chức danh */}
          <View style={styles.nameLine}>
            <Pressable
              onPress={() => {
                if (onOpenAvatarPicker) onOpenAvatarPicker();
              }}
              style={styles.avatarWrapper}
              accessibilityLabel="Chọn ảnh đại diện"
            >
              <View style={styles.avatar}>
                <Avatar3D size={82} {...(getAvatar3DProps ? getAvatar3DProps(selectedAvatarId) : {})} />
              </View>
              <View style={styles.avatarEditBadge}>
                <Text style={styles.avatarEditIcon}>✎</Text>
              </View>
            </Pressable>

            <View style={{ flex: 1 }}>
              <Text style={styles.nameDisplay} numberOfLines={1}>
                {fullName}
              </Text>
              <Text style={styles.positionSubtitle} numberOfLines={1}>
                {position}
              </Text>
            </View>
          </View>

          <View style={styles.cardLine} />

          {/* Chi tiết công việc */}
          <View style={styles.workDetails}>
            <View style={styles.inlineWorkRow}>
              <Text style={styles.workLabel}>Cửa hàng:</Text>
              <Text style={styles.inlineWorkValue} numberOfLines={1}>
                {storeName}
              </Text>
            </View>

            <View style={styles.inlineWorkRow}>
              <Text style={styles.workLabel}>Mã nhân viên:</Text>
              <Text style={styles.inlineWorkValue}>{staffCode}</Text>
            </View>

            <View style={styles.inlineWorkRow}>
              <Text style={styles.workLabel}>Vị trí:</Text>
              <Text style={styles.inlineWorkValue}>{position}</Text>
            </View>

            <View style={styles.inlineWorkRow}>
              <Text style={styles.workLabel}>Địa chỉ làm việc:</Text>
              <Text style={styles.inlineWorkValue} numberOfLines={2}>
                {storeAddress}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* ══════════════════════════════════════════════════════════
            MẶT SAU (THAY THẾ BẰNG THÔNG TIN CÁ NHÂN)
        ══════════════════════════════════════════════════════════ */}
        <Animated.View style={[styles.cardCommon, styles.cardBack, backAnimatedStyle]}>
          {/* Lớp phản quang vệt sáng bóng kính */}
          <View pointerEvents="none" style={styles.glossySheenLayer} />

          {/* Lỗ khoét thẻ đeo */}
          <View style={styles.cardPunchHoleWrap}>
            <View style={styles.cardPunchHoleInner} />
          </View>

          {/* Header mặt sau */}
          <View style={styles.backTopHeader}>
            <View>
              <Text style={styles.backBrandTitle}>HỒ SƠ CÁ NHÂN</Text>
              <Text style={styles.backBrandSub}>DỮ LIỆU NHÂN VIÊN NỘI BỘ</Text>
            </View>

            <TouchableOpacity
              onPress={handleFlip}
              activeOpacity={0.8}
              style={styles.flipBadgeTop}
              accessibilityLabel="Quay lại mặt trước"
            >
              <Text style={styles.flipBadgeText}>Lật mặt trước ↺</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.backDivider} />

          {/* BẢNG THÔNG TIN CÁ NHÂN MẶT SAU (GỌN GÀNG, KHÔNG ICON EMOJI) */}
          <View style={styles.personalInfoGrid}>
            <View style={styles.infoRowItem}>
              <Text style={styles.infoRowLabel}>Ngày sinh:</Text>
              <Text style={styles.infoRowValue} numberOfLines={1}>
                {birthDate}
              </Text>
            </View>

            <View style={styles.infoRowItem}>
              <Text style={styles.infoRowLabel}>Nơi sinh:</Text>
              <Text style={styles.infoRowValue} numberOfLines={1}>
                {birthPlace}
              </Text>
            </View>

            <View style={styles.infoRowItem}>
              <Text style={styles.infoRowLabel}>Điện thoại:</Text>
              <Text style={styles.infoRowValue} numberOfLines={1}>
                {phone}
              </Text>
            </View>

            <View style={styles.infoRowItem}>
              <Text style={styles.infoRowLabel}>Giới tính:</Text>
              <Text style={styles.infoRowValue} numberOfLines={1}>
                {gender}
              </Text>
            </View>

            <View style={styles.infoRowItem}>
              <Text style={styles.infoRowLabel}>Email:</Text>
              <Text style={styles.infoRowValue} numberOfLines={1}>
                {email}
              </Text>
            </View>
          </View>

          {/* HÀNG HÀNH ĐỘNG DƯỚI CÙNG: CHỈNH SỬA THÔNG TIN */}
          <View style={styles.backActionFooter}>
            <TouchableOpacity
              style={styles.editInfoBtn}
              onPress={() => {
                if (onEditPersonalInfo) onEditPersonalInfo();
              }}
              activeOpacity={0.8}
              accessibilityLabel="Chỉnh sửa thông tin cá nhân"
            >
              <Text style={styles.editInfoBtnText}>Chỉnh sửa thông tin</Text>
            </TouchableOpacity>

            <View style={styles.securitySealWrap}>
              <Text style={styles.securitySealText}>VERIFIED ID</Text>
            </View>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 12,
    alignItems: 'center',
  },

  /* ═══ KHE KẸP DÂY ĐEO (LANYARD HOLDER) ═══ */
  lanyardClaspContainer: {
    alignItems: 'center',
    marginBottom: -6,
    zIndex: 10,
  },
  claspStrap: {
    width: 28,
    height: 14,
    backgroundColor: '#387328',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderWidth: 1,
    borderColor: '#2e5e21',
  },
  claspMetalClip: {
    width: 44,
    height: 16,
    backgroundColor: '#CBD5E1',
    borderRadius: 5,
    borderWidth: 1.2,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  claspSlotHole: {
    width: 22,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#475569',
  },

  /* ═══ KHỐI ĐỔ BÓNG TẦNG SÂU 3D ═══ */
  shadowPlate: {
    position: 'absolute',
    top: 24,
    left: 4,
    right: 4,
    height: 252,
    borderRadius: 20,
    backgroundColor: 'rgba(66, 133, 49, 0.18)',
    shadowColor: '#2d5a22',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
    zIndex: 0,
  },

  cardContainer: {
    width: '100%',
    height: 254,
    position: 'relative',
    zIndex: 1,
  },

  /* ═══ CHUẨN CHUNG 2 MẶT THẺ PVC ═══ */
  cardCommon: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    backgroundColor: '#FFF8E1',
    padding: 16,
    paddingTop: 12,
    backfaceVisibility: 'hidden',
    // Hiệu ứng viền vát 3D (3D Bevel highlight & shadow border)
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    borderBottomColor: 'rgba(66, 133, 49, 0.35)',
    borderRightColor: 'rgba(66, 133, 49, 0.25)',
    shadowColor: '#2e5e21',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
    overflow: 'hidden',
  },

  /* Vệt sáng bóng kính phản chiếu (Glossy specular reflection overlay) */
  glossySheenLayer: {
    position: 'absolute',
    top: -50,
    left: -60,
    width: 220,
    height: 380,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    transform: [{ rotate: '25deg' }],
  },

  /* Lỗ khoét dập lỗ đeo thẻ (Punched slot) */
  cardPunchHoleWrap: {
    position: 'absolute',
    top: 7,
    alignSelf: 'center',
    width: 34,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.8,
    borderColor: 'rgba(0, 0, 0, 0.12)',
  },
  cardPunchHoleInner: {
    width: 24,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#EFE6CA',
  },

  cardFront: {
    zIndex: 2,
  },

  cardBack: {
    zIndex: 1,
    backgroundColor: '#FFFDF5',
    borderColor: 'rgba(255, 255, 255, 0.9)',
    borderBottomColor: 'rgba(66, 133, 49, 0.4)',
    justifyContent: 'space-between',
  },

  /* ═══ MẶT TRƯỚC STYLES ═══ */
  frontTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 6,
  },
  smartChipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipGoldPad: {
    width: 26,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#EAB308',
    borderWidth: 1,
    borderColor: '#CA8A04',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipCircuitH: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: '#A16207',
  },
  chipCircuitV: {
    position: 'absolute',
    height: '100%',
    width: 1,
    backgroundColor: '#A16207',
  },
  chipCore: {
    width: 8,
    height: 8,
    borderRadius: 2,
    backgroundColor: '#CA8A04',
    borderWidth: 0.5,
    borderColor: '#FEF08A',
  },
  smartChipText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#854D0E',
    letterSpacing: 0.5,
  },
  flipBadgeTop: {
    backgroundColor: 'rgba(66, 133, 49, 0.12)',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 12,
    borderWidth: 0.8,
    borderColor: 'rgba(66, 133, 49, 0.25)',
  },
  flipBadgeText: {
    fontSize: 10.5,
    color: '#387328',
    fontWeight: '700',
  },

  nameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#428531',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFF8E1',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  avatarEditIcon: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
  },
  nameDisplay: {
    fontSize: 17.5,
    fontWeight: '700',
    color: '#1F2937',
  },
  positionSubtitle: {
    fontSize: 12.5,
    color: '#428531',
    fontWeight: '600',
    marginTop: 2,
  },
  cardLine: {
    height: 1,
    backgroundColor: '#EDE3C2',
    marginVertical: 8,
  },
  workDetails: {
    gap: 4.5,
  },
  inlineWorkRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  workLabel: {
    width: 105,
    fontSize: 11.5,
    color: '#555555',
  },
  inlineWorkValue: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '600',
    color: '#222222',
  },

  /* ═══ MẶT SAU STYLES (THÔNG TIN CÁ NHÂN) ═══ */
  backTopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  backTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shieldIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  shieldIconText: {
    fontSize: 14,
  },
  backBrandTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#1b3d17',
    letterSpacing: 0.6,
  },
  backBrandSub: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#428531',
    letterSpacing: 0.5,
  },
  backDivider: {
    height: 1,
    backgroundColor: '#E7DCB9',
    marginVertical: 7,
  },

  personalInfoGrid: {
    gap: 6,
  },
  infoRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingVertical: 5.5,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 0.8,
    borderColor: 'rgba(226, 232, 240, 0.95)',
  },
  infoRowLabel: {
    width: 95,
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  infoRowValue: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },

  backActionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 4,
  },
  editInfoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#428531',
    paddingHorizontal: 12,
    paddingVertical: 5.5,
    borderRadius: 10,
    gap: 6,
    shadowColor: '#428531',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  editInfoBtnIcon: {
    fontSize: 12,
    color: '#FFFFFF',
  },
  editInfoBtnText: {
    fontSize: 11.5,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  securitySealWrap: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 0.8,
    borderColor: '#CBD5E1',
  },
  securitySealText: {
    fontSize: 8.5,
    color: '#64748B',
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});
