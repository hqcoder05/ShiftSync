import React, { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ThreeIllustration from './ThreeIllustration';
import previews from './illustrationPreviews';
import { ANIMAL_COMPANIONS } from './animalCompanionCatalog';
import { colors } from '../theme/koreanPalette';
import { ensureTouchTarget } from '../utils/touchTarget';

export default function AnimalCompanionGallery({ onOpenScreen }) {
  const { width, height } = useWindowDimensions();
  const [visible, setVisible] = useState(false);
  const [selectedKind, setSelectedKind] = useState('rabbit');
  const [reducedMotion, setReducedMotion] = useState(true);
  const selected = ANIMAL_COMPANIONS.find(item => item.kind === selectedKind) || ANIMAL_COMPANIONS[0];
  const stageSize = width < 350 ? 156 : 176;

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) setReducedMotion(value); }).catch(() => {});
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => { mounted = false; listener.remove(); };
  }, []);

  const openPage = () => {
    setVisible(false);
    onOpenScreen?.(selected.route);
  };

  return <>
    <Pressable
      testID="animal-companion-entry"
      accessibilityRole="button"
      accessibilityLabel="Gặp 7 bạn đồng hành"
      accessibilityHint="Xem thỏ, hươu, ếch, hổ, hải ly, gấu mèo và cáo"
      onPress={() => setVisible(true)}
      style={ensureTouchTarget(({ pressed }) => [styles.entry, pressed && styles.pressed])}
    >
      <View accessible={false} importantForAccessibility="no-hide-descendants" style={styles.entryArt}>
        {['rabbit', 'deer', 'fox'].map((kind, index) => <Image
          key={kind}
          source={previews[kind]}
          resizeMode="contain"
          style={[styles.entryAnimal, { left: index * 24, zIndex: 3 - index }]}
        />)}
      </View>
      <View style={styles.entryCopy}>
        <Text style={styles.entryTitle}>7 bạn đồng hành</Text>
        <Text style={styles.entrySubtitle}>Chạm để gặp đủ các bạn</Text>
      </View>
      <Ionicons name="chevron-forward" size={17} color={colors.muted} accessible={false} />
    </Pressable>

    <Modal visible={visible} transparent animationType={reducedMotion ? 'none' : 'fade'} onRequestClose={() => setVisible(false)} statusBarTranslucent>
      <View style={styles.overlay}>
        <View
          testID="animal-companion-gallery"
          accessibilityViewIsModal
          style={[styles.sheet, { width: Math.min(430, width - 28), maxHeight: height * 0.9 }]}
        >
          <View style={styles.header}>
            <View style={styles.headingCopy}>
              <Text accessibilityRole="header" style={styles.title}>Bạn đồng hành</Text>
              <Text style={styles.subtitle}>Gặp đủ 7 người bạn nhỏ</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Đóng bộ bạn đồng hành"
              onPress={() => setVisible(false)}
              style={ensureTouchTarget(({ pressed }) => [styles.close, pressed && styles.pressed])}
            ><Ionicons name="close" size={22} color={colors.secondary} accessible={false} /></Pressable>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator>
            <View style={styles.spotlight}>
              {visible && <ThreeIllustration key={selected.kind} kind={selected.kind} size={stageSize} animated interactive />}
              <View style={styles.spotlightCopy}>
                <Text accessibilityLiveRegion="polite" style={styles.animalName}>{selected.name}</Text>
                <Text style={styles.touchHint}>Chạm hoặc rê chuột để chào</Text>
                <Text style={styles.locationLabel}>Bạn cũng gặp mình tại</Text>
                <Text style={styles.location}>{selected.location}</Text>
              </View>
            </View>
            <View style={styles.grid}>
              {ANIMAL_COMPANIONS.map(item => {
                const isSelected = selectedKind === item.kind;
                return <Pressable
                  key={item.kind}
                  testID={`animal-choice-${item.kind}`}
                  accessibilityRole="button"
                  accessibilityLabel={item.greeting}
                  accessibilityState={{ selected: isSelected }}
                  aria-selected={isSelected}
                  onPress={() => setSelectedKind(item.kind)}
                  style={ensureTouchTarget(({ pressed }) => [styles.choice, isSelected && styles.choiceSelected, pressed && styles.pressed])}
                >
                  <Image accessible={false} source={previews[item.kind]} resizeMode="contain" style={styles.choiceImage} />
                  <Text style={[styles.choiceName, isSelected && styles.choiceNameSelected]}>{item.name}</Text>
                </Pressable>;
              })}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Đến trang ${selected.page}`}
              onPress={openPage}
              style={ensureTouchTarget(({ pressed }) => [styles.openPage, pressed && styles.pressed])}
            >
              <Text style={styles.openPageText}>Đến trang {selected.page}</Text>
              <Ionicons name="arrow-forward" size={17} color={colors.white} accessible={false} />
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  entry: { marginHorizontal: 16, marginTop: 14, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', gap: 10 },
  entryArt: { width: 108, height: 74 },
  entryAnimal: { position: 'absolute', top: 0, width: 60, height: 74 },
  entryCopy: { flex: 1, minWidth: 0 },
  entryTitle: { fontSize: 14, lineHeight: 21, fontWeight: '600', color: colors.ink },
  entrySubtitle: { fontSize: 11, lineHeight: 17, color: colors.muted, marginTop: 4 },
  pressed: { opacity: 0.75 },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#28313B80', paddingVertical: 18 },
  sheet: { backgroundColor: colors.surface, borderRadius: 24, overflow: 'hidden' },
  header: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 18, paddingRight: 8, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  headingCopy: { flex: 1, minWidth: 0 },
  title: { fontSize: 19, lineHeight: 26, fontWeight: '600', color: colors.ink },
  subtitle: { fontSize: 11, lineHeight: 17, color: colors.muted, marginTop: 3 },
  close: { alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  scroll: { flexGrow: 0, flexShrink: 1 },
  content: { padding: 14, paddingBottom: 10 },
  spotlight: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.canvas, borderRadius: 18, paddingVertical: 7, paddingRight: 12 },
  spotlightCopy: { flex: 1, minWidth: 0 },
  animalName: { fontSize: 21, lineHeight: 28, color: colors.ink, fontWeight: '600' },
  touchHint: { fontSize: 10, lineHeight: 16, color: colors.muted, marginTop: 5 },
  locationLabel: { fontSize: 10, lineHeight: 16, color: colors.muted, marginTop: 12 },
  location: { fontSize: 11, lineHeight: 17, color: colors.primaryStrong, fontWeight: '500', marginTop: 3 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  choice: { width: '31%', flexGrow: 0, minHeight: 110, borderRadius: 14, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', paddingVertical: 5, paddingHorizontal: 3 },
  choiceSelected: { borderColor: colors.primary, backgroundColor: colors.peach },
  choiceImage: { width: 70, height: 78 },
  choiceName: { color: colors.secondary, fontSize: 11, lineHeight: 17, textAlign: 'center' },
  choiceNameSelected: { color: colors.primaryStrong, fontWeight: '600' },
  footer: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  openPage: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 50, borderRadius: 13, backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 10 },
  openPageText: { color: colors.white, flexShrink: 1, fontSize: 13, lineHeight: 19, fontWeight: '600', textAlign: 'center' },
});
