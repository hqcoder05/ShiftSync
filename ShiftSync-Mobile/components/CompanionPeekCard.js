import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ThreeIllustration from './ThreeIllustration';
import { colors } from '../theme/koreanPalette';

// The larger head and paws sit at the centre of the card edge, above its copy.
export default function CompanionPeekCard({ kind = 'fox', title, body, children, style, compact = false, testID, animated = true }) {
  const species = ['rabbit', 'raccoon', 'fox'].includes(kind) ? kind : 'fox';
  const artSize = compact ? 168 : 188;
  return <View testID={testID} style={[styles.outer, compact && styles.outerCompact, style]}>
    <View style={[styles.paper, compact && styles.paperCompact]}>
      <View style={[styles.copy, compact && styles.copyCompact]}>
        <Text accessibilityRole="header" style={[styles.title, compact && styles.titleCompact]}>{title}</Text>
      </View>
      {!!body && <Text numberOfLines={compact ? 2 : undefined} style={[styles.body, compact && styles.bodyCompact]}>{body}</Text>}
      {!!children && <View style={styles.actions}>{children}</View>}
    </View>
    <View pointerEvents="box-none" style={[styles.character, compact && styles.characterCompact]}>
      <ThreeIllustration kind={`peek-${species}`} size={artSize} animated={animated} interactive={animated} />
    </View>
  </View>;
}

const styles = StyleSheet.create({
  outer: { paddingTop: 78, marginTop: 10, position: 'relative' },
  outerCompact: { paddingTop: 70, marginTop: 8 },
  paper: { minHeight: 144, borderRadius: 23, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, paddingHorizontal: 18, paddingTop: 48, paddingBottom: 16, shadowColor: colors.ink, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.04, shadowRadius: 13, elevation: 2 },
  paperCompact: { minHeight: 106, borderRadius: 19, paddingHorizontal: 16, paddingTop: 44, paddingBottom: 14 },
  copy: { minHeight: 27, justifyContent: 'center' },
  copyCompact: { minHeight: 21 },
  title: { fontSize: 20, lineHeight: 27, letterSpacing: -0.35, fontWeight: '700', color: colors.ink, textAlign: 'center' },
  titleCompact: { fontSize: 15, lineHeight: 21, letterSpacing: -0.1, fontWeight: '600' },
  body: { fontSize: 12, lineHeight: 18, color: colors.secondary, marginTop: 7, textAlign: 'center' },
  bodyCompact: { fontSize: 11, lineHeight: 17, marginTop: 5 },
  actions: { marginTop: 10 },
  character: { position: 'absolute', left: 0, right: 0, top: -26, height: 162, alignItems: 'center', overflow: 'hidden', zIndex: 2 },
  characterCompact: { top: -22, height: 145 },
});
