import { colors as uiColors } from '../theme/koreanPalette';
import { Ionicons } from '@expo/vector-icons';
export default function BackIcon({ size = 25, color = uiColors.secondary }) {
  return <Ionicons name="chevron-back" size={size} color={color} accessible={false} />;
}
