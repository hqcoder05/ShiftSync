import { StyleSheet } from 'react-native';
import { colors, resolveUiColor } from './koreanPalette';

export { colors, resolveUiColor } from './koreanPalette';
export const raisedSurface = {
  shadowColor: colors.ink, shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.018, shadowRadius: 12, elevation: 1,
};
const panels = new Set(['card', 'shiftCard', 'slotCard', 'reportCard', 'requestItemCard',
  'historyItemCard', 'proposalCard', 'supportCard', 'profileCard', 'emptyCard', 'bannerCard',
  'formContainer', 'detailModalCard', 'selectedColleagueCard', 'incomingSwapCard']);
const headings = new Set(['headerTitle', 'screenTitle', 'monthTitleText', 'timeOffHeaderTitle', 'formHeaderTitle']);
const fields = new Set(['input', 'searchInput', 'modalTextInput', 'descriptionInput', 'reasonInput', 'passwordField']);

// Shared presentation rules; individual screens retain their layout and states.
export function createAppStyles(definitions) {
  return StyleSheet.create(Object.fromEntries(Object.entries(definitions).map(([name, original]) => {
    const style = Object.fromEntries(Object.entries(original).map(([key, value]) =>
      [key, typeof value === 'string' && /color$/i.test(key) ? resolveUiColor(value) : value]));
    if (style.color === colors.orange) style.color = colors.primaryStrong;
    if (style.color === colors.success) style.color = colors.successText;
    if (style.color === colors.danger) style.color = colors.dangerText;
    if (style.color === colors.warning) style.color = colors.warningText;
    if (headings.has(name)) Object.assign(style, { color: colors.ink, fontWeight: '600', letterSpacing: -0.35 });
    if (panels.has(name) && (!style.backgroundColor || ['#FFF', '#FFFFFF', colors.surface].includes(style.backgroundColor.toUpperCase()))) {
      Object.assign(style, raisedSurface, { borderRadius: 20, borderColor: colors.line, borderWidth: StyleSheet.hairlineWidth, backgroundColor: colors.surface });
    }
    if (fields.has(name) && style.borderWidth) Object.assign(style, { borderRadius: 13, borderColor: colors.lineStrong });
    if (/(?:btn|button)$/i.test(name) && style.backgroundColor === colors.orange) {
      Object.assign(style, { borderRadius: 13, borderBottomWidth: 0 });
    }
    return [name, style];
  })));
}
