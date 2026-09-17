import React, { useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { AVATAR_ROSTER, getAvatarById } from '../constants/avatarRegistry';
import Avatar3DPreview from './Avatar3DPreview';

const CATEGORIES = [
  { key: 'all', label: 'Tất cả (17)' },
  { key: 'barista', label: 'Pha chế' },
  { key: 'cashier', label: 'Thu ngân' },
  { key: 'kitchen', label: 'Bếp' },
  { key: 'manager', label: 'Quản lý' },
  { key: 'security', label: 'An ninh' },
  { key: 'stock', label: 'Kho vận' },
  { key: 'server', label: 'Phục vụ' },
];

export default function AvatarCollectionModal({
  visible,
  currentAvatarId = 'dilan',
  onSelectAvatar,
  onClose,
}) {
  const [highlightedId, setHighlightedId] = useState(currentAvatarId || 'dilan');
  const [activeCategory, setActiveCategory] = useState('all');

  const highlightedAvatar = getAvatarById(highlightedId);

  const filteredAvatars = AVATAR_ROSTER.filter(a => {
    if (activeCategory === 'all') return true;
    return a.roleCategory === activeCategory;
  });

  const handleConfirmSelection = () => {
    if (onSelectAvatar) {
      onSelectAvatar(highlightedId);
    }
    if (onClose) {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Bộ sưu tập Avatar 3D</Text>
            <Text style={styles.headerSubtitle}>17 nhân vật chuẩn hóa - Xoay 360° tương tác</Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollBody} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* 3D Interactive Showcase */}
          <View style={styles.showcaseCard}>
            <View style={styles.previewContainer}>
              <Avatar3DPreview
                avatar={highlightedAvatar}
                size={220}
                autoRotate={false}
                showControls={true}
              />
            </View>

            {/* Character Info */}
            <View style={styles.characterInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.characterName}>{highlightedAvatar.name}</Text>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>{highlightedAvatar.badgeText}</Text>
                </View>
              </View>

              <Text style={styles.characterDept}>{highlightedAvatar.department} • {highlightedAvatar.gender}</Text>
              <Text style={styles.characterDesc}>{highlightedAvatar.description}</Text>

              <View style={styles.propsRow}>
                <Text style={styles.propTag}>Mũ: {highlightedAvatar.props?.headwear || 'Chuẩn'}</Text>
                <Text style={styles.propTag}>Dụng cụ: {highlightedAvatar.props?.tool || 'Không'}</Text>
              </View>
            </View>
          </View>

          {/* Department Filter Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.key}
                style={[
                  styles.filterPill,
                  activeCategory === cat.key && styles.filterPillActive,
                ]}
                onPress={() => setActiveCategory(cat.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    activeCategory === cat.key && styles.filterPillTextActive,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* 17-Avatar Grid */}
          <Text style={styles.sectionTitle}>Chọn nhân vật ({filteredAvatars.length} khả dụng)</Text>
          <View style={styles.grid}>
            {filteredAvatars.map(item => {
              const isSelected = item.id === highlightedId;
              const isCurrent = item.id === currentAvatarId;

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.gridCard,
                    isSelected && styles.gridCardSelected,
                  ]}
                  onPress={() => setHighlightedId(item.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardThumbWrapper}>
                    <Image source={item.source} style={styles.cardThumb} />
                    {isCurrent && (
                      <View style={styles.activeTag}>
                        <Text style={styles.activeTagText}>Đang dùng</Text>
                      </View>
                    )}
                    {isSelected && (
                      <View style={styles.selectedBadge}>
                        <Text style={styles.selectedBadgeText}>✓</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.cardRole} numberOfLines={1}>{item.role}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Footer Action Bar */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleConfirmSelection}
            activeOpacity={0.8}
          >
            <Text style={styles.saveButtonText}>
              Xác nhận chọn {highlightedAvatar.name}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#475569',
  },
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },
  showcaseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 16,
  },
  previewContainer: {
    marginBottom: 8,
  },
  characterInfo: {
    width: '100%',
    marginTop: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  characterName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  roleBadge: {
    backgroundColor: '#EAF6EA',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#51A33D',
  },
  characterDept: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0284C7',
    marginTop: 2,
  },
  characterDesc: {
    fontSize: 12,
    color: '#475569',
    marginTop: 6,
    lineHeight: 18,
  },
  propsRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  propTag: {
    fontSize: 11,
    color: '#64748B',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterScroll: {
    paddingBottom: 12,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterPillActive: {
    backgroundColor: '#51A33D',
    borderColor: '#51A33D',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 10,
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridCard: {
    width: '31%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  gridCardSelected: {
    borderColor: '#51A33D',
    backgroundColor: '#F4FAF3',
  },
  cardThumbWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 6,
  },
  cardThumb: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  activeTag: {
    position: 'absolute',
    bottom: -4,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  activeTagText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  selectedBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#51A33D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cardName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  cardRole: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 1,
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  saveButton: {
    backgroundColor: '#51A33D',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#51A33D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});